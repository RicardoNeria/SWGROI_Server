# Script de diagnóstico para SWGROI - Comparación Local vs Web
# Ejecutar en PowerShell: .\diagnostico_local.ps1

Write-Host "🔧 === DIAGNÓSTICO SWGROI LOCAL ===" -ForegroundColor Cyan
Write-Host "📅 Fecha: $(Get-Date)" -ForegroundColor Gray
Write-Host "🖥️  Equipo: $env:COMPUTERNAME" -ForegroundColor Gray
Write-Host ""

# 1. Verificar aplicación
Write-Host "🔍 1. Verificando aplicación SWGROI..." -ForegroundColor Yellow

$swgroiProcess = Get-Process -Name "SWGROI_Server" -ErrorAction SilentlyContinue
if ($swgroiProcess) {
    Write-Host "✅ SWGROI_Server está ejecutándose (PID: $($swgroiProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ SWGROI_Server NO está ejecutándose" -ForegroundColor Red
}

# 2. Verificar puertos
Write-Host ""
Write-Host "🔍 2. Verificando puertos..." -ForegroundColor Yellow

$port8080 = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($port8080) {
    Write-Host "✅ Puerto 8080 está en uso" -ForegroundColor Green
} else {
    Write-Host "❌ Puerto 8080 NO está en uso" -ForegroundColor Red
}

# 3. Test de conectividad local
Write-Host ""
Write-Host "🔍 3. Test de conectividad..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Respuesta local: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ No responde en localhost:8080" -ForegroundColor Red
}

# 4. Verificar base de datos (MySQL local)
Write-Host ""
Write-Host "🔍 4. Verificando MySQL local..." -ForegroundColor Yellow

$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService) {
    Write-Host "✅ Servicio MySQL encontrado: $($mysqlService.DisplayName) - $($mysqlService.Status)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Servicio MySQL no encontrado (XAMPP/WAMP?)" -ForegroundColor Yellow
}

# 5. Variables de entorno
Write-Host ""
Write-Host "🔍 5. Variables de entorno..." -ForegroundColor Yellow

$envVars = @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
foreach ($var in $envVars) {
    $value = [Environment]::GetEnvironmentVariable($var)
    if ($value) {
        Write-Host "✅ $var = $value" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $var = (no configurado)" -ForegroundColor Yellow
    }
}

# 6. Comparación con configuración web
Write-Host ""
Write-Host "🔧 === CONFIGURACIÓN WEB RECOMENDADA ===" -ForegroundColor Cyan
Write-Host "📋 En el VPS, configurar:" -ForegroundColor Gray
Write-Host "   DB_HOST=127.0.0.1" -ForegroundColor White
Write-Host "   DB_PORT=3306" -ForegroundColor White
Write-Host "   DB_NAME=swgroi_db" -ForegroundColor White
Write-Host "   DB_USER=root" -ForegroundColor White
Write-Host "   DB_PASSWORD=123456" -ForegroundColor White
Write-Host ""

# 7. Test de API del usuario
Write-Host "🔍 6. Test de API del usuario..." -ForegroundColor Yellow

try {
    $userResponse = Invoke-WebRequest -Uri "http://localhost:8080/menu/usuario" -TimeoutSec 5 -ErrorAction Stop
    $userJson = $userResponse.Content | ConvertFrom-Json
    Write-Host "✅ API /menu/usuario responde:" -ForegroundColor Green
    Write-Host "   Nombre: $($userJson.nombre)" -ForegroundColor White
    Write-Host "   Rol: $($userJson.rol)" -ForegroundColor White
    Write-Host "   Timestamp: $($userJson.timestamp)" -ForegroundColor White
} catch {
    Write-Host "❌ API /menu/usuario no responde: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 === RECOMENDACIONES ===" -ForegroundColor Cyan
Write-Host "1. Ejecutar el script SQL completo en el VPS" -ForegroundColor White
Write-Host "2. Verificar que el usuario 'admin' existe en la BD web" -ForegroundColor White
Write-Host "3. Comparar logs de aplicación local vs web" -ForegroundColor White
Write-Host "4. Verificar configuración de cookies/sesiones en HTTPS" -ForegroundColor White
Write-Host ""

Write-Host "✅ === DIAGNÓSTICO COMPLETADO ===" -ForegroundColor Cyan