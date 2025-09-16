# SWGROI:release:2025-09-07
param([string]$OutDir = "$PSScriptRoot\..\..\artifacts")
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$zip = Join-Path $OutDir "deploy.zip"
if (Test-Path $zip) { Remove-Item $zip }
$root = Split-Path -Parent $PSScriptRoot
$proj = Split-Path -Leaf $root
Write-Host "Empaquetando $proj"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($root, $zip)
Write-Host "Listo: $zip"

