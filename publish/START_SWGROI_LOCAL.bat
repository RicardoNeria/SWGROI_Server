@echo off
echo ==========================================
echo   SWGROI Server - DESARROLLO LOCAL
echo ==========================================
echo.

:: Detectar si estamos en el directorio de desarrollo o publish
if exist "SWGROI_Server.exe" (
    set "DIR_ACTUAL=%cd%"
    echo ✅ Ejecutándose desde: %DIR_ACTUAL%
) else if exist "publish\SWGROI_Server.exe" (
    cd /d "publish"
    set "DIR_ACTUAL=%cd%"
    echo ✅ Cambiando a: %DIR_ACTUAL%
) else if exist "bin\Debug\net48\SWGROI_Server.exe" (
    cd /d "bin\Debug\net48"
    set "DIR_ACTUAL=%cd%"
    echo ✅ Cambiando a: %DIR_ACTUAL%
) else if exist "bin\Release\net48\SWGROI_Server.exe" (
    cd /d "bin\Release\net48"
    set "DIR_ACTUAL=%cd%"
    echo ✅ Cambiando a: %DIR_ACTUAL%
) else (
    echo ❌ ERROR: SWGROI_Server.exe no encontrado
    echo 📋 Compilar primero: dotnet build o dotnet publish
    pause
    exit /b 1
)

:: Verificar wwwroot
if not exist "wwwroot" (
    echo ❌ ERROR: Carpeta wwwroot no encontrada
    echo 📋 Verificar estructura del proyecto
    pause
    exit /b 1
)

:: Limpiar puerto si está ocupado
echo 🔧 Verificando puerto 8891...
taskkill /F /IM "SWGROI_Server.exe" 2>nul
timeout /t 1 /nobreak > nul

:: Verificar puerto disponible
netstat -an | findstr ":8891" > nul
if %ERRORLEVEL% equ 0 (
    echo ⚠️  Puerto 8891 ocupado, esperando liberación...
    timeout /t 3 /nobreak > nul
)

:: Mostrar información
echo ✅ Iniciando en modo DESARROLLO LOCAL...
echo 🌐 URL: http://localhost:8891/login.html
echo 💻 Máquina: %COMPUTERNAME%
echo 📁 Directorio: %DIR_ACTUAL%
echo 📅 %date% %time%
echo ⚡ Presiona Ctrl+C para detener
echo ═══════════════════════════════════════════
echo.

:: Iniciar servidor
"SWGROI_Server.exe"

:: Manejo de salida
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Error %ERRORLEVEL% - Posibles causas:
    echo    • Puerto ocupado → Reiniciar este script
    echo    • Base de datos no accesible
    echo    • Archivos de configuración faltantes
    pause
) else (
    echo ✅ Servidor detenido correctamente
    pause
)