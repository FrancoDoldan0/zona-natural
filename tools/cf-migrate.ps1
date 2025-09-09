param(
  [switch]$Prisma,     # Reemplaza lib/prisma -> lib/prisma-edge y crea instancia por request
  [switch]$Env,        # process.env -> getEnv() (saltea archivos 'use client')
  [switch]$Runtime,    # Asegura export const runtime = 'edge' en app/api/**
  [switch]$JsonAny,    # Parche mínimo: .json() -> .json<any>()
  [switch]$All,        # Ejecuta Prisma + Env + Runtime (JsonAny queda opcional)
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# --- helpers ---
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
function Write-Utf8([string]$Path,[string]$Content){
  $dir = Split-Path -Parent $Path; if($dir){ [IO.Directory]::CreateDirectory($dir) | Out-Null }
  [IO.File]::WriteAllText($Path,$Content,$Utf8NoBom)
}

function Should-Scan([string]$p){
  foreach($ig in @("\node_modules\", "\.next\", "\.git\")){ if($p -like "*$ig*"){ return $false } }
  return $true
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BK = "__backup__\cf_migrate_$stamp"
if(-not $DryRun){ New-Item -ItemType Directory -Force $BK | Out-Null }

function BackupFile([string]$file){
  if(-not (Test-Path $file)){ return }
  $dst = Join-Path $BK ($file -replace '[:\\]','_')
  Copy-Item $file $dst -Force
}

function InsertAfterImports([string]$text,[string]$snippet){
  $rx = [regex]'(?m)^(import\s.+?;\s*)+'
  $m = $rx.Match($text)
  if($m.Success){ return $text.Insert($m.Index + $m.Length, "`r`n$snippet`r`n") }
  return $snippet + "`r`n" + $text
}

# --- ensure helper files (no sobrescribe) ---
function Ensure-HelperFiles {
  $cfEnv = "lib/cf-env.ts"
  if(-not (Test-Path $cfEnv)){
    $content = @'
import { getRequestContext } from "@cloudflare/next-on-pages";
export type RuntimeEnv = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  WA_PHONE?: string;
};
export function getEnv(): RuntimeEnv {
  try { return getRequestContext().env as RuntimeEnv; }
  catch { return (typeof process !== "undefined" ? (process.env as any) : {}) || {}; }
}
'@
    if(-not $DryRun){ Write-Utf8 $cfEnv $content }
    Write-Host " [+] helper creado: $cfEnv"
  }
  $prismaEdge = "lib/prisma-edge.ts"
  if(-not (Test-Path $prismaEdge)){
    $content = @'
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { getEnv } from "./cf-env";

export function createPrisma() {
  const { DATABASE_URL } = getEnv();
  if (!DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  return new PrismaClient({ datasourceUrl: DATABASE_URL }).$extends(withAccelerate());
}
'@
    if(-not $DryRun){ Write-Utf8 $prismaEdge $content }
    Write-Host " [+] helper creado: $prismaEdge"
  }
}

# --- PHASE: Prisma Edge ---
function Phase-Prisma {
  $targets = Get-ChildItem app/api -Recurse -Include *.ts,*.tsx -File | Where-Object { Should-Scan $_.FullName }
  $plus = @()
  $count = 0
  foreach($f in $targets){
    $t = Get-Content -LiteralPath $f.FullName -Raw
    $orig = $t
    $hadPrismaImport = $false

    # Reemplazar import prisma (alias o relativo) por createPrisma
    $patterns = @(
      "import\s+\{\s*prisma\s*\}\s+from\s+['""]@/lib/prisma['""]\s*;?",
      "import\s+prisma\s+from\s+['""]@/lib/prisma['""]\s*;?",
      "import\s+\{\s*prisma\s*\}\s+from\s+['""]\.\.\/\.\.\/\.\.\/\.\.\/lib/prisma['""]\s*;?",
      "import\s+prisma\s+from\s+['""]\.\.\/\.\.\/\.\.\/\.\.\/lib/prisma['""]\s*;?"
    )
    foreach($p in $patterns){
      if($t -match $p){
        $hadPrismaImport = $true
        $t = [regex]::Replace($t, $p, "import { createPrisma } from '@/lib/prisma-edge';")
      }
    }

    # Si se usa prisma.X y no hay const prisma = createPrisma(); insertarlo
    if($hadPrismaImport -or $t -match "\bprisma\.\w"){
      if($t -notmatch "createPrisma\(\)"){
        $t = InsertAfterImports $t "const prisma = createPrisma();"
      }
    }

    if($t -ne $orig){
      $count++
      Write-Host " [Prisma] $($f.FullName)"
      if(-not $DryRun){ BackupFile $f.FullName; Write-Utf8 $f.FullName $t }
    }
  }
  Write-Host "   => archivos tocados: $count"
}

# --- PHASE: process.env -> getEnv() (saltea 'use client') ---
function Phase-Env {
  $targets = Get-ChildItem app,lib -Recurse -Include *.ts,*.tsx -File | Where-Object { Should-Scan $_.FullName }
  $count = 0
  foreach($f in $targets){
    $t = Get-Content -LiteralPath $f.FullName -Raw
if ($t -match '^\s*([''"])use client\1') { continue } # no tocar componentes cliente
    $orig = $t

    # Sólo variables NO públicas / NO NODE_ENV
    $rx = [regex]'process\.env\.(?!NEXT_PUBLIC_|NODE_ENV\b)([A-Z0-9_]+)'
    if($rx.IsMatch($t)){
      # asegurar import getEnv
      if($t -notmatch "from ['""]@/lib/cf-env['""]"){
        $t = InsertAfterImports $t "import { getEnv } from '@/lib/cf-env';"
      }
      $t = $rx.Replace($t, { param($m) "getEnv().$($m.Groups[1].Value)" })
    }

    if($t -ne $orig){
      $count++
      Write-Host " [ENV]    $($f.FullName)"
      if(-not $DryRun){ BackupFile $f.FullName; Write-Utf8 $f.FullName $t }
    }
  }
  Write-Host "   => archivos tocados: $count"
}

# --- PHASE: ensure runtime='edge' en app/api/**
function Phase-Runtime {
  $targets = Get-ChildItem app/api -Recurse -Include *.ts,*.tsx -File | Where-Object { Should-Scan $_.FullName }
  $count = 0
  foreach($f in $targets){
    $t = Get-Content -LiteralPath $f.FullName -Raw
    $orig = $t
    if($t -notmatch "export\s+const\s+runtime\s*=\s*['""]edge['""]"){
      # si declara nodejs, lo cambiamos; si no hay, lo agregamos
      if($t -match "export\s+const\s+runtime\s*=\s*['""]nodejs['""]"){
        $t = [regex]::Replace($t, "export\s+const\s+runtime\s*=\s*['""]nodejs['""]", "export const runtime = 'edge'")
      } else {
        $t = "export const runtime = 'edge';`r`n" + $t
      }
    }
    if($t -ne $orig){
      $count++
      Write-Host " [EDGE]   $($f.FullName)"
      if(-not $DryRun){ BackupFile $f.FullName; Write-Utf8 $f.FullName $t }
    }
  }
  Write-Host "   => archivos tocados: $count"
}

# --- PHASE: parche mínimo .json<any>()
function Phase-JsonAny {
  $targets = Get-ChildItem app,src -Recurse -Include *.ts,*.tsx -File | Where-Object { Should-Scan $_.FullName }
  $count = 0
  $pattern = [regex]'\.json(?!\s*<)\s*\(\s*\)' # sólo .json() sin genérico
  foreach($f in $targets){
    $t = Get-Content -LiteralPath $f.FullName -Raw
    $orig = $t
    if($pattern.IsMatch($t)){
      $t = $pattern.Replace($t, '.json<any>()')
    }
    if($t -ne $orig){
      $count++
      Write-Host " [JSON]   $($f.FullName)"
      if(-not $DryRun){ BackupFile $f.FullName; Write-Utf8 $f.FullName $t }
    }
  }
  Write-Host "   => archivos tocados: $count"
}

# --- RUN ---
if($All){ $Prisma = $true; $Env = $true; $Runtime = $true }
if($Prisma -or $Env){ Ensure-HelperFiles }

if($Prisma){ Phase-Prisma }
if($Env){ Phase-Env }
if($Runtime){ Phase-Runtime }
if($JsonAny){ Phase-JsonAny }

if(-not ($Prisma -or $Env -or $Runtime -or $JsonAny -or $All)){
  Write-Host "Nada para hacer. Pasa -Prisma, -Env, -Runtime, -JsonAny o -All."
}


