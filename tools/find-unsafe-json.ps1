# tools/find-unsafe-json.ps1
# Busca usos de await *.json() sin genérico y reporta dónde se usan las props del resultado.
$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$include = @("app", "src")
$exts = @("*.ts","*.tsx")
$ignore = @("\node_modules\", "\.next\", "\.git\")

function Should-Scan([string]$path){
  foreach($ig in $ignore){ if($path -like "*$ig*"){ return $false } }
  return $true
}

$files = foreach($inc in $include){
  Get-ChildItem -Path (Join-Path $root $inc) -Recurse -Include $exts -File -ErrorAction SilentlyContinue |
    Where-Object { Should-Scan $_.FullName }
}

if(-not $files){ Write-Host "No se encontraron archivos .ts/.tsx en app/ o src/"; exit 0 }

# Patrón: const VAR = await ... .json()
$assignPattern = '(?<kind>const|let)\s+(?<v>[A-Za-z_]\w*)\s*=\s*await\s+[^\r\n;]*?\.json\s*\(\s*\)'

[int]$total = 0
foreach($f in $files){
  $text = Get-Content -Raw -LiteralPath $f.FullName
  $matches = [regex]::Matches($text, $assignPattern, 'IgnoreCase, Singleline')

  foreach($m in $matches){
    # Ver si usaron genérico: .json<...>(...)
    $prefix = $text.Substring([Math]::Max(0, $m.Index-60), [Math]::Min(60, $m.Index))
    $hasGeneric = $prefix -match '\.json\s*<'
    if($hasGeneric){ continue } # ya está tipado, OK

    $var = $m.Groups['v'].Value

    # Buscar usos del var. en un rango después de la asignación (para hint de riesgo)
    $afterStart = $m.Index + $m.Length
    $afterLen = [Math]::Min(4000, $text.Length - $afterStart)
    $after = if($afterLen -gt 0){ $text.Substring($afterStart, $afterLen) } else { "" }

    $propUses = [regex]::Matches($after, [regex]::Escape($var) + '\s*\.', 'IgnoreCase')
    $line = ($text.Substring(0, $m.Index).Split("`n").Count)

    $total++
    Write-Host ""
    Write-Host "[json-untype] $($f.FullName):$line" -ForegroundColor Yellow
    Write-Host ("  - asignación: {0}" -f ($m.Value.Trim())) 
    if($propUses.Count -gt 0){
      Write-Host ("  - probables usos de propiedades de '{0}': {1}" -f $var, $propUses.Count) -ForegroundColor Red
    } else {
      Write-Host ("  - sin usos directos de propiedades después (igual revisar)") -ForegroundColor DarkYellow
    }
  }
}

if($total -eq 0){
  Write-Host "✔ No se encontraron usos de .json() sin genérico. (¡Bien!)" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host ("Encontradas {0} ocurrencia(s) de .json() sin genérico. Revisa y tipa cada caso." -f $total) -ForegroundColor Red
  exit 1
}
