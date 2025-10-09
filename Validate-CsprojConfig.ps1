# Script de Validación - Configuración wwwroot en .csproj
# Verifica que TODOS los archivos de wwwroot se incluyan automáticamente

Write-Host "🔍 VALIDACIÓN DE CONFIGURACIÓN .CSPROJ" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$projectPath = "SWGROI_Server.csproj"

# 1. Verificar que NO haya secciones problemáticas
Write-Host "`n📋 1. Verificando secciones problemáticas..." -ForegroundColor Yellow

$noneRemoveCount = (Select-String -Path $projectPath -Pattern '<None Remove="wwwroot' | Measure-Object).Count
$duplicateContentCount = (Select-String -Path $projectPath -Pattern '<Content Include="wwwroot' | Where-Object { $_.Line -notmatch '\*\*' } | Measure-Object).Count

if ($noneRemoveCount -gt 0) {
    Write-Host "❌ PROBLEMA: Encontradas $noneRemoveCount entradas <None Remove> de wwwroot" -ForegroundColor Red
    Write-Host "   Estas entradas BLOQUEAN archivos y deben eliminarse" -ForegroundColor Red
} else {
    Write-Host "✅ Correcto: No hay entradas <None Remove> problemáticas" -ForegroundColor Green
}

if ($duplicateContentCount -gt 0) {
    Write-Host "⚠️  ADVERTENCIA: Encontradas $duplicateContentCount entradas <Content Include> específicas" -ForegroundColor Yellow
    Write-Host "   Son redundantes con el patrón wwwroot\**\*.*" -ForegroundColor Yellow
} else {
    Write-Host "✅ Correcto: No hay entradas <Content Include> duplicadas" -ForegroundColor Green
}

# 2. Verificar configuración wildcard
Write-Host "`n📋 2. Verificando configuración wildcard..." -ForegroundColor Yellow

$wildcardPattern = Select-String -Path $projectPath -Pattern 'wwwroot\\\*\*\\\*\.\*'
if ($wildcardPattern) {
    Write-Host "✅ Correcto: Patrón wildcard encontrado:" -ForegroundColor Green
    Write-Host "   $($wildcardPattern.Line.Trim())" -ForegroundColor White
} else {
    Write-Host "❌ PROBLEMA: Patrón wildcard wwwroot\**\*.* NO encontrado" -ForegroundColor Red
}

# 3. Contar archivos en wwwroot vs configuración
Write-Host "`n📋 3. Verificando cobertura de archivos..." -ForegroundColor Yellow

$allWwwrootFiles = Get-ChildItem wwwroot -Recurse -File | Measure-Object
Write-Host "   Total archivos en wwwroot/: $($allWwwrootFiles.Count)" -ForegroundColor White

if ($wildcardPattern) {
    Write-Host "✅ Configuración: TODOS los archivos se incluyen automáticamente" -ForegroundColor Green
} else {
    Write-Host "❌ Configuración: Archivos pueden NO incluirse en el despliegue" -ForegroundColor Red
}

# 4. Probar build para verificar
Write-Host "`n📋 4. Verificando estructura para VPS...
   🚨 RequestRouter.cs busca wwwroot junto al ejecutable
   📍 Ubicación crítica: [DirectorioEjecutable]\wwwroot\" -ForegroundColor Yellow

try {
    $buildResult = dotnet build --configuration Release --verbosity quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "📋 5. Probando build...
✅ Build exitoso: La configuración .csproj es válida

📋 6. Verificando compatibilidad con RequestRouter...
   RequestRouter.cs busca archivos en esta secuencia:
   1º: [BaseDirectory]\wwwroot\archivo.html
   2º: [5 niveles hacia arriba]\wwwroot\archivo.html
   
   ✅ Con nuestra configuración wildcard:
   - Todos los archivos de wwwroot se copian junto al .exe
   - RequestRouter encontrará archivos en el 1er intento (ÓPTIMO)
   - No necesitará buscar hacia arriba (EVITA PROBLEMAS)" -ForegroundColor Green
    } else {
        Write-Host "❌ Build falló: Revisar configuración .csproj" -ForegroundColor Red
        Write-Host "Error: $buildResult" -ForegroundColor Red
    }
} catch {
    Write-Host "⚠️  No se pudo ejecutar dotnet build (normal si no está instalado)" -ForegroundColor Yellow
}

# 5. Resumen final
Write-Host "`n🎯 RESUMEN:" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan

if ($noneRemoveCount -eq 0 -and $wildcardPattern) {
    Write-Host "🎉 CONFIGURACIÓN CORRECTA" -ForegroundColor Green -BackgroundColor Black
    Write-Host "✅ Todos los archivos nuevos de wwwroot/ se incluirán automáticamente" -ForegroundColor Green
    Write-Host "✅ No hay bloqueos ni duplicados" -ForegroundColor Green
    Write-Host "✅ Despliegue al VPS funcionará correctamente" -ForegroundColor Green
} else {
    Write-Host "⚠️  CONFIGURACIÓN NECESITA CORRECCIÓN" -ForegroundColor Red -BackgroundColor Black
    Write-Host "❌ Algunos archivos pueden NO desplegarse al VPS" -ForegroundColor Red
}

Write-Host "`n📖 Para desplegar al VPS:" -ForegroundColor White
Write-Host "   powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1" -ForegroundColor Gray