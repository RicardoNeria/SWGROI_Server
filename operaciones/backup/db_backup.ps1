# SWGROI:backup:2025-09-07
param(
  [string]$MySqlUser = $env:DB_USER, 
  [string]$MySqlPass = $env:DB_PASSWORD, 
  [string]$DbName = $env:DB_NAME, 
  [string]$OutDir = "$PSScriptRoot\out",
  [int]$RetentionDays = 7
)

if (-not $DbName) { $DbName = 'swgroi_db' }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$ts = Get-Date -Format 'yyyyMMdd_HHmm'
$file = Join-Path $OutDir "SWGROI_backup_${ts}.sql"
$gz = "$file.gz"

Write-Host "MySQL dump a $file"
$env:MYSQL_PWD = $MySqlPass
& mysqldump --user=$MySqlUser --databases $DbName --routines --events --single-transaction --quick --default-character-set=utf8mb4 > $file
if ($LASTEXITCODE -ne 0) { Write-Error "mysqldump falló"; exit 1 }

Write-Host "Comprimir..."
if (Get-Command gzip -ErrorAction SilentlyContinue) {
  & gzip -f $file
} else {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $fs = [IO.File]::OpenRead($file)
  $out = [IO.File]::Create($gz)
  $gzip = New-Object System.IO.Compression.GZipStream($out, [IO.Compression.CompressionMode]::Compress)
  $fs.CopyTo($gzip); $gzip.Dispose(); $fs.Dispose(); $out.Dispose(); Remove-Item $file
}

Write-Host "Rotación: mantener $RetentionDays días"
Get-ChildItem $OutDir -Filter 'SWGROI_backup_*.sql.gz' | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Listo: $gz"

