<#
Mueve MySql.Data.dll desde la carpeta con acento 'librerías' a la carpeta 'Librerias' sin acento.
Ejecútalo desde la raíz del repositorio con PowerShell (pwsh) como:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\move_dll.ps1
#>

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $repoRoot '..\librerías\MySql.Data.dll'
$altSrc = Join-Path $repoRoot '..\librerias\MySql.Data.dll'
$dstDir = Join-Path $repoRoot '..\Librerias'

# Normaliza rutas si el script se ejecuta desde scripts/ (ajusta)
if (!(Test-Path $src) -and (Test-Path $altSrc)) {
    $src = $altSrc
}

if (!(Test-Path $src)) {
    Write-Host "No se encontró MySql.Data.dll en 'librerías' ni en 'librerias'. Busca manualmente." -ForegroundColor Yellow
    exit 1
}

New-Item -ItemType Directory -Force -Path $dstDir | Out-Null

$dst = Join-Path $dstDir 'MySql.Data.dll'
Move-Item -Path $src -Destination $dst -Force

Write-Host "Movido: $src -> $dst" -ForegroundColor Green
