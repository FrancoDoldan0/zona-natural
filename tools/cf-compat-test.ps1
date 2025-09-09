# tools/cf-compat-test.ps1
param(
  [string[]]$Roots = @("app","src","lib"),
  [switch]$FailOnWarn  # si lo pasás, termina con exit 1 ante WARN también
)

$ErrorActionPreference = "Stop"

# --- Config ---
$EXTS   = @("*.ts","*.tsx")
$IGNORE = @("\node_modules\", "\.next\", "\.git\")
$NODE_CORE = @(
  'fs','fs/promises','path','os','crypto','stream','buffer','zlib','http','https',
  'net','tls','dns','url','worker_threads','child_process','perf_hooks','vm','inspector',
  'dgram','repl','readline','util/types'
)
$BAD_PKGS = @(
  'sharp','multer','formidable','node-fetch','pg','mysql','oracledb','sqlite3','better-sqlite3',
  'bcrypt','aws-sdk','firebase-admin'
)

function Should-Scan([string]$p){ foreach($ig in $IGNORE){ if($p -like "*$ig*"){ return $false } }; return $true }
function LinesUntil([string]$text,[int]$idx){ return ($text.Substring(0,[Math]::Min($idx,$text.Length)).Split("`n").Count) }
function Show([string]$sev,[string]$file,[int]$line,[string]$msg,[string]$snippet){
  $color = if($sev -eq "ERROR"){"Red"} elseif($sev -eq "WARN"){"Yellow"} else {"Gray"}
  Write-Host ""
  Write-Host ("[{0}] {1}:{2}" -f $sev, $file, $line) -ForegroundColor $color
  Write-Host ("  - {0}" -f $msg)
  if($snippet){ Write-Host ("  - {0}" -f $snippet.Trim()) }
}

$files = foreach($r in $Roots){
  if(Test-Path $r){
    Get-ChildItem -Path $r -Recurse -Include $EXTS -File -ErrorAction SilentlyContinue |
      Where-Object { Should-Scan $_.FullName }
  }
}

[int]$err = 0; [int]$warn = 0

# Patrones en here-strings para evitar escapes de comillas
$assignPattern = @'
(?<decl>(const|let)\s+(?<v>[A-Za-z_]\w*)\s*=\s*await\s+[^\r\n;]*?\.json\s*\(\s*\))
'@

$importRegex = @'
^\s*(import\s+[^;]*from\s*['"](?<mod>[^'"]+)['"]|require\s*\(\s*['"](?<mod2>[^'"]+)['"]\s*\)|import\s*\(\s*['"](?<mod3>[^'"]+)['"]\s*\))
'@

$runtimeNodeRegex = @'
export\s+const\s+runtime\s*=\s*["']nodejs["']
'@

foreach($f in $files){
  # Ignorar el helper de env (tiene fallback a process.env a propósito)
  if ($f.FullName -match '(^|\\|/)lib(\\|/)cf-env\.ts$') { continue }

  $t = Get-Content -LiteralPath $f.FullName -Raw

  # 1) .json() sin genérico (req.json/res.json). Evita NextResponse.json({...})
  $m1 = [regex]::Matches(
    $t, $assignPattern,
    [Text.RegularExpressions.RegexOptions]::Singleline -bor [Text.RegularExpressions.RegexOptions]::IgnoreCase
  )
  foreach($m in $m1){
    # Chequear que NO tenga genérico: .json<...>()
    $start = $m.Index; $prefix = $t.Substring([Math]::Max(0,$start-80), [Math]::Min(80,$start))
    if($prefix -match '\.json\s*<'){ continue } # typado OK
    # Evitar NextResponse.json({...})
    if($m.Value -match 'NextResponse\.json\s*\('){ continue }
    $line = LinesUntil $t $m.Index
    Show "ERROR" $f.FullName $line ".json() sin genérico devuelve unknown en Workers." ("asignación: " + $m.Groups['decl'].Value.Trim())
    $err++
  }

  # 2) Imports de Node core y packages problemáticos
  $m2 = [regex]::Matches($t, $importRegex, [Text.RegularExpressions.RegexOptions]::Multiline)
  foreach($im in $m2){
    $mod = $im.Groups['mod'].Value; if(-not $mod){ $mod = $im.Groups['mod2'].Value }; if(-not $mod){ $mod = $im.Groups['mod3'].Value }
    if(-not $mod){ continue }
    $modNorm = $mod
    if($mod -like "node:*"){ $modNorm = $mod.Substring(5) }

    if($NODE_CORE -contains $modNorm){
      $line = LinesUntil $t $im.Index
      Show "ERROR" $f.FullName $line ("Import de Node core '{0}' no disponible en Workers/Edge." -f $mod) ("import/require: " + $im.Value.Trim())
      $err++
    } elseif($BAD_PKGS -contains $mod){
      $line = LinesUntil $t $im.Index
      Show "WARN"  $f.FullName $line ("Paquete potencialmente incompatible en Edge: '{0}'." -f $mod) ("import: " + $im.Value.Trim())
      $warn++
    }

    # Prisma client Node (no type-only)
    if($mod -eq "@prisma/client" -and $im.Value -notmatch "import\s+type"){
      $line = LinesUntil $t $im.Index
      Show "WARN"  $f.FullName $line "Prisma Client Node no corre en Workers; usa Accelerate/Data Proxy o drivers HTTP." ("import: " + $im.Value.Trim())
      $warn++
    }

    # Avisar solo si importan lib/prisma (NO prisma-edge)
    if($mod -match '(^|/|\\)lib/prisma$'){
      $line = LinesUntil $t $im.Index
      Show "WARN"  $f.FullName $line "Uso de prisma local: verifica que sea compatible con Edge (Accelerate/Data Proxy)." ("import: " + $im.Value.Trim())
      $warn++
    }
  }

  # 3) Globales Node (afinado a secretos no públicos)
  $globals = @(
    @{pat='process\.env\.(?!NEXT_PUBLIC_|NODE_ENV\b)[A-Z0-9_]+\b'; msg='process.env.* en Edge (no NEXT_PUBLIC/NODE_ENV): usa getEnv() o bindings.'},
    @{pat='(?<![A-Za-z0-9_])Buffer(?![A-Za-z0-9_])'; msg='Buffer en Edge: preferí TextEncoder/Decoder o Web Streams.'},
    @{pat='__dirname|__filename'; msg='__dirname/__filename no existen en Edge.'},
    @{pat='(?<![A-Za-z0-9_])global\.'; msg='global.*: usa globalThis en Edge.'}
  )
  foreach($g in $globals){
    $gm = [regex]::Matches($t, $g.pat)
    foreach($hit in $gm){
      $line = LinesUntil $t $hit.Index
      Show "WARN" $f.FullName $line $g.msg ("coincidencia: " + $hit.Value)
      $warn++
    }
  }

  # 4) runtime nodejs
  $m4 = [regex]::Matches($t, $runtimeNodeRegex, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  foreach($h in $m4){
    $line = LinesUntil $t $h.Index
    Show "ERROR" $f.FullName $line "runtime 'nodejs' no soportado en Cloudflare Pages/Workers. Usá 'edge' o elimina la export." ($h.Value.Trim())
    $err++
  }
}

Write-Host ""
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host ("  - ERRORES: {0}" -f $err) -ForegroundColor Red
Write-Host ("  - WARNINGS: {0}" -f $warn) -ForegroundColor Yellow

if($err -gt 0){ exit 1 }
if($FailOnWarn -and $warn -gt 0){ exit 1 }
