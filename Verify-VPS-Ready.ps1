# 🔍 VERIFICACIÓN RÁPIDA - Carpeta publish lista para VPS

Write-Host "🔍 VERIFICACIÓN RÁPIDA DE PUBLICACIÓN VPS" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$publishPath = "publish"

if (-not (Test-Path $publishPath)) {
    Write-Host "❌ ERROR: Carpeta '$publishPath' no existe" -ForegroundColor Red
    Write-Host "Ejecuta primero: Publish-Complete-VPS.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 Verificando archivos críticos..." -ForegroundColor Yellow

# 1. Verificar ejecutable
$exeExists = Test-Path "$publishPath\SWGROI_Server.exe"
Write-Host "   SWGROI_Server.exe: $(if($exeExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($exeExists){'Green'}else{'Red'})

# 2. Verificar wwwroot
$wwwrootExists = Test-Path "$publishPath\wwwroot"
Write-Host "   wwwroot/: $(if($wwwrootExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($wwwrootExists){'Green'}else{'Red'})

if ($wwwrootExists) {
    $wwwrootFiles = (Get-ChildItem "$publishPath\wwwroot" -Recurse -File).Count
    Write-Host "   Archivos wwwroot: $wwwrootFiles" -ForegroundColor Green
    
    # Verificar archivos críticos
    $criticalFiles = @("index.html", "login.html", "documentos.html")
    Write-Host "   Archivos críticos:" -ForegroundColor White
    foreach ($file in $criticalFiles) {
        $exists = Test-Path "$publishPath\wwwroot\$file"
        Write-Host "      $file`: $(if($exists){'✅'}else{'❌'})" -ForegroundColor $(if($exists){'Green'}else{'Red'})
    }
}

# 3. Verificar configuración
$configExists = Test-Path "$publishPath\app.config"
Write-Host "   app.config: $(if($configExists){'✅ Presente'}else{'⚠️  Verificar'})" -ForegroundColor $(if($configExists){'Green'}else{'Yellow'})

# 4. Contar dependencias
$dllFiles = (Get-ChildItem "$publishPath" -Filter "*.dll" -File).Count
Write-Host "   Dependencias (.dll): $dllFiles archivos" -ForegroundColor Green

# 5. Estadísticas totales
$totalFiles = (Get-ChildItem "$publishPath" -Recurse -File).Count
$totalSize = (Get-ChildItem "$publishPath" -Recurse -File | Measure-Object Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "`n📊 RESUMEN:" -ForegroundColor Cyan
Write-Host "   Archivos totales: $totalFiles" -ForegroundColor White
Write-Host "   Tamaño total: $totalSizeMB MB" -ForegroundColor White

# 6. Estado de la publicación
if ($exeExists -and $wwwrootExists) {
    Write-Host "`n🎉 PUBLICACIÓN LISTA PARA VPS" -ForegroundColor Green -BackgroundColor Black
    Write-Host "   Carpeta: $publishPath\" -ForegroundColor Green
    Write-Host "   Estado: ✅ Completa y verificada" -ForegroundColor Green
    
    Write-Host "`n📋 PASOS PARA VPS:" -ForegroundColor Yellow
    Write-Host "   1. Detener servicio SWGROI en VPS" -ForegroundColor White
    Write-Host "   2. Hacer backup del VPS actual" -ForegroundColor White
    Write-Host "   3. Copiar TODO el contenido de '$publishPath\' al VPS" -ForegroundColor White
    Write-Host "   4. Verificar que wwwroot esté junto a SWGROI_Server.exe" -ForegroundColor White
    Write-Host "   5. Iniciar servicio SWGROI en VPS" -ForegroundColor White
} else {
    Write-Host "`n❌ PUBLICACIÓN INCOMPLETA" -ForegroundColor Red -BackgroundColor Black
    Write-Host "   Ejecuta: Publish-Complete-VPS.ps1" -ForegroundColor Red
}

Write-Host ""