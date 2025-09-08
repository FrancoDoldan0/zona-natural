# tools/fix-unsafe-json.ps1
param([switch]$DryRun)

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$include = @("app","src")
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

# Reemplaza SOLO ".json()" sin genérico; NO toca ".json<...>()" ni ".json({...})"
$pattern = '\.json(?!\s*<)\s*\(\s*\)'
$replacement = '.json<any>()'

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$bk = "__backup__\fix_json_$stamp"
if(-not $DryRun){ New-Item -ItemType Directory -Force $bk | Out-Null }

$changed = 0
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

foreach($f in $files){
  $text = Get-Content -Raw -LiteralPath $f.FullName
  $matches = [regex]::Matches($text, $pattern)
  if($matches.Count -gt 0){
    Write-Host "[fix] $($f.FullName)  (+$($matches.Count))"
    if(-not $DryRun){
      Copy-Item $f.FullName (Join-Path $bk ($f.FullName -replace '[:\\]','_')) -Force
      $new = [regex]::Replace($text, $pattern, $replacement)
      [IO.File]::WriteAllText($f.FullName, $new, $Utf8NoBom)
    }
    $changed++
  }
}

if($changed -eq 0){
  Write-Host "✔ No había .json() sin genérico para corregir."
} else {
  Write-Host "Hecho. Archivos modificados: $changed (backup en $bk)"
}
