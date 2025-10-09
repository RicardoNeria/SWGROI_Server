# Script de Publicación para VPS - SWGROI Server
# Este script garantiza que todos los archivos se incluyan en la publicación

param(
    [string]$PublishPath = "publish",
    [switch]$VerifyOnly = $false
)

Write-Host "🚀 SCRIPT DE PUBLICACIÓN SWGROI SERVER" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 MÉTODOS DE PUBLICACIÓN DISPONIBLES:" -ForegroundColor Cyan
Write-Host "   1. 🎯 Visual Studio: Clic derecho → Publicar → FolderProfile" -ForegroundColor White
Write-Host "   2. 🎯 PowerShell Script: Este script (con validación avanzada)" -ForegroundColor White
Write-Host "   Ambos generan la MISMA estructura para VPS" -ForegroundColor Green
Write-Host ""

# 1. Verificar que todos los archivos wwwroot estén en .csproj
Write-Host "`n📋 1. Verificando archivos en .csproj..." -ForegroundColor Yellow

$allFiles = Get-ChildItem wwwroot -Recurse -File | ForEach-Object { 
    $_.FullName.Replace((Get-Location).Path + '\', '') 
}
$csprojContent = Get-Content SWGROI_Server.csproj -Raw
$missingFiles = @()

foreach ($file in $allFiles) {
    if ($csprojContent -notmatch [regex]::Escape($file) -and 
        $csprojContent -notmatch [regex]::Escape($file.Replace('\', '/')) -and
        $csprojContent -notmatch 'wwwroot\\[^"]*\*\*\\[^"]*\.\*') {
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "⚠️  ADVERTENCIA: Archivos que podrían faltar:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
    Write-Host "✅ Todos los archivos incluidos correctamente" -ForegroundColor Green
}

if ($VerifyOnly) {
    Write-Host "`n🔍 Modo verificación - No se publicará" -ForegroundColor Yellow
    return
}

# 2. Limpiar directorio de publicación anterior
Write-Host "`n🧹 2. Limpiando directorio anterior..." -ForegroundColor Yellow
if (Test-Path $PublishPath) {
    Remove-Item $PublishPath -Recurse -Force
    Write-Host "✅ Directorio anterior eliminado" -ForegroundColor Green
}

# 3. Compilar y publicar
Write-Host "`n🔨 3. Compilando y publicando..." -ForegroundColor Yellow
try {
    dotnet publish SWGROI_Server.csproj -c Release -o $PublishPath --framework net48
    Write-Host "✅ Compilación exitosa" -ForegroundColor Green
} catch {
    Write-Host "❌ Error en compilación: $_" -ForegroundColor Red
    exit 1
}

# 4. Verificar estructura resultante y simular RequestRouter
Write-Host "`n🔍 4. Verificando estructura de publicación..." -ForegroundColor Yellow

$exeExists = Test-Path "$PublishPath\SWGROI_Server.exe"
$wwwrootExists = Test-Path "$PublishPath\wwwroot"

Write-Host "   SWGROI_Server.exe: $(if($exeExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($exeExists){'Green'}else{'Red'})
Write-Host "   wwwroot/ folder: $(if($wwwrootExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($wwwrootExists){'Green'}else{'Red'})

if ($wwwrootExists) {
    $wwwrootFileCount = (Get-ChildItem "$PublishPath\wwwroot" -Recurse -File).Count
    Write-Host "   Archivos en wwwroot: $wwwrootFileCount" -ForegroundColor Green
    
    # 🚨 VERIFICACIÓN CRÍTICA: Simular la lógica de RequestRouter.cs
    Write-Host "`n🚨 VERIFICACIÓN CRÍTICA - RequestRouter Simulation:" -ForegroundColor Red
    Write-Host "   RequestRouter.cs busca wwwroot en esta secuencia:" -ForegroundColor White
    Write-Host "   1º: [DirectorioEjecutable]\wwwroot\" -ForegroundColor Gray
    Write-Host "   2º: [Busca 5 niveles hacia arriba]" -ForegroundColor Gray
    
    # Simular AppDomain.CurrentDomain.BaseDirectory (donde está el .exe)
    $baseDir = $PublishPath
    $testFiles = @("index.html", "login.html", "documentos.html")
    
    Write-Host "`n   🎯 PRUEBA: ¿RequestRouter encontrará los archivos?" -ForegroundColor White
    $allTestsPassed = $true
    
    foreach ($testFile in $testFiles) {
        # Ruta que RequestRouter intentará primero
        $primaryPath = Join-Path $baseDir "wwwroot\$testFile"
        $pathWorks = Test-Path $primaryPath
        
        Write-Host "      $testFile`: $(if($pathWorks){'✅ ENCONTRADO'}else{'❌ NO ENCONTRADO'})" -ForegroundColor $(if($pathWorks){'Green'}else{'Red'})
        
        if (-not $pathWorks) { $allTestsPassed = $false }
    }
    
    if ($allTestsPassed) {
        Write-Host "`n   ✅ ESTRUCTURA PERFECTA: RequestRouter encontrará todos los archivos" -ForegroundColor Green -BackgroundColor Black
        Write-Host "   📍 wwwroot está en la ubicación ÓPTIMA junto al .exe" -ForegroundColor Green
    } else {
        Write-Host "`n   🚨 ERROR CRÍTICO: RequestRouter fallará en el VPS" -ForegroundColor Red -BackgroundColor Black
        Write-Host "   ❌ Los archivos web NO serán accesibles" -ForegroundColor Red
    }
    
    # Verificar archivos críticos específicos
    Write-Host "`n   📋 Archivos críticos verificados:" -ForegroundColor White
    $criticalFiles = @(
        "wwwroot\index.html",
        "wwwroot\Styles\componentes\componentes.css",
        "wwwroot\Scripts\login.js",
        "wwwroot\Imagenes\CENTRALDEALARMAS.jpg"
    )
    
    foreach ($file in $criticalFiles) {
        $exists = Test-Path "$PublishPath\$file"
        Write-Host "      $file`: $(if($exists){'✅'}else{'❌ FALTA'})" -ForegroundColor $(if($exists){'Green'}else{'Red'})
    }
}

# 5. Resumen y instrucciones críticas para VPS
Write-Host "`n📦 5. INSTRUCCIONES CRÍTICAS PARA VPS:" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "🚨 ESTRUCTURA CRÍTICA: wwwroot DEBE estar junto al .exe" -ForegroundColor Red
Write-Host ""
Write-Host "1. Detén el servicio SWGROI en el VPS" -ForegroundColor White
Write-Host "2. Haz backup completo de la carpeta actual del VPS" -ForegroundColor White
Write-Host "3. Copia TODO el contenido de '$PublishPath\' al VPS" -ForegroundColor White
Write-Host ""
Write-Host "4. 🎯 ESTRUCTURA OBLIGATORIA en el VPS:" -ForegroundColor Yellow
Write-Host "   /ruta/del/servidor/" -ForegroundColor Gray
Write-Host "   ├── SWGROI_Server.exe          ← Ejecutable principal" -ForegroundColor Gray
Write-Host "   ├── SWGROI_Server.dll          ← Librería principal" -ForegroundColor Gray
Write-Host "   ├── [otros archivos .dll/.config]" -ForegroundColor Gray
Write-Host "   └── wwwroot/                   ← 🚨 DEBE estar aquí" -ForegroundColor Yellow
Write-Host "       ├── index.html            ← Página principal" -ForegroundColor Gray
Write-Host "       ├── login.html            ← Página de login" -ForegroundColor Gray
Write-Host "       ├── documentos.html       ← Módulo documentos" -ForegroundColor Gray
Write-Host "       ├── Styles/               ← CSS styles" -ForegroundColor Gray
Write-Host "       ├── Scripts/              ← JavaScript" -ForegroundColor Gray
Write-Host "       └── Imagenes/             ← Imágenes" -ForegroundColor Gray
Write-Host ""
Write-Host "5. ⚠️  VERIFICACIÓN OBLIGATORIA:" -ForegroundColor Red
Write-Host "   - wwwroot DEBE estar en el MISMO directorio que SWGROI_Server.exe" -ForegroundColor White
Write-Host "   - RequestRouter.cs busca primero en [DirectorioEje]\\wwwroot\\" -ForegroundColor White
Write-Host "   - Si no está ahí, busca 5 niveles hacia arriba (LENTO e INESTABLE)" -ForegroundColor White
Write-Host ""
Write-Host "6. Inicia el servicio SWGROI en el VPS" -ForegroundColor White
Write-Host ""
Write-Host "💡 CONSEJO: Si el servidor web no responde, verificar estructura de wwwroot" -ForegroundColor Yellow

if ($exeExists -and $wwwrootExists) {
    Write-Host "`n🎉 PUBLICACIÓN LISTA PARA VPS" -ForegroundColor Green -BackgroundColor Black
} else {
    Write-Host "`n⚠️  REVISA LOS ERRORES ANTES DE DESPLEGAR" -ForegroundColor Red -BackgroundColor Black
}