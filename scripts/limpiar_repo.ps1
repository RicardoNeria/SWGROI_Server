<#
Limpia artefactos locales de compilación.
Ejecútalo desde la raíz del repo:
  pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\limpiar_repo.ps1
#>

Write-Host "Limpiando carpetas: bin/, obj/, .vs/ (local)" -ForegroundColor Cyan

$paths = @('.vs', 'bin', 'obj')
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Eliminando: $p" -ForegroundColor Yellow
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $p
    } else {
        Write-Host "No existe: $p" -ForegroundColor Gray
    }
}

Write-Host "Limpieza completa." -ForegroundColor Green
