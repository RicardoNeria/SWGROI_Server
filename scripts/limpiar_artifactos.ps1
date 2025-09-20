Param(
    [switch]$Force
)

$paths = @(
    "$PSScriptRoot\..\bin",
    "$PSScriptRoot\..\obj",
    "$PSScriptRoot\..\objetos"
)

Write-Host "Script de limpieza de artefactos de build"
foreach ($p in $paths) {
    if (Test-Path $p) {
        if ($Force -or (Read-Host "Eliminar $p ? (y/N)") -match '^[Yy]') {
            Write-Host "Eliminando: $p"
            Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction Stop
        }
        else { Write-Host "Omitiendo: $p" }
    }
    else { Write-Host "No existe: $p" }
}

Write-Host "Limpieza completada. Recuerda revisar cambios y commitear si procede."
