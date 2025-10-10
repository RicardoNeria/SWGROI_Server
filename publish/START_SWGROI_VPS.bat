@echo off
echo ==========================================
echo   SWGROI Server VPS - Contabo (FORZADO)
echo ==========================================
echo.

:: Cambiar al directorio correcto del VPS
cd /d "C:\SWGROI\SWGROI_Despliegue_Web\publish"

:: Verificar archivos esenciales
if not exist "SWGROI_Server.exe" (
    echo ❌ ERROR: SWGROI_Server.exe no encontrado en %cd%
    echo 📋 Copiar archivos desde publish: SWGROI_Server.exe + wwwroot + DLLs
    pause & exit /b 1
)

if not exist "wwwroot" (
    echo ❌ ERROR: Carpeta wwwroot faltante
    pause & exit /b 1
)

:: Limpiar puerto si está ocupado
echo 🔧 Liberando puerto 8891...
taskkill /F /IM "SWGROI_Server.exe" 2>nul
timeout /t 2 /nobreak > nul

:: Verificar puerto disponible
netstat -an | findstr ":8891" > nul
if %ERRORLEVEL% equ 0 (
    echo ⚠️  Puerto 8891 aún ocupado, esperando...
    timeout /t 3 /nobreak > nul
)

:: Mostrar información
echo ✅ Archivos OK - Iniciando servidor VPS...
echo 🎯 Modo: PRODUCCIÓN FORZADA (VPS)
echo 🌐 URL: http://75.119.128.78:8891/login.html
echo 🌍 Accesible desde internet
echo 📅 %date% %time%
echo ⚡ Presiona Ctrl+C para detener
echo ═══════════════════════════════════════════
echo.

:: Iniciar servidor con manejo de errores
"SWGROI_Server.exe"

:: Manejo de salida
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Error %ERRORLEVEL% - Posibles causas:
    echo    • Puerto ocupado → Reiniciar este script
    echo    • Firewall activo → Ejecutar como Administrador  
    echo    • .NET Framework faltante → Instalar .NET 4.8
    pause
) else (
    echo ✅ Servidor detenido correctamente
)