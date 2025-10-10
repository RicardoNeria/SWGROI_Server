@echo off
echo ==========================================
echo   SWGROI Server - LAUNCHER UNIVERSAL
echo ==========================================
echo.

:: Detectar entorno automáticamente
set "ES_LOCAL="
set "DIR_ACTUAL="

:: Verificar si estamos en un entorno de desarrollo (estructura típica)
if exist "bin\Debug\net48\SWGROI_Server.exe" (
    set "ES_LOCAL=1"
    cd /d "bin\Debug\net48"
    set "DIR_ACTUAL=%cd%"
    echo 🧪 DETECTADO: Entorno de desarrollo (Debug)
) else if exist "bin\Release\net48\SWGROI_Server.exe" (
    set "ES_LOCAL=1"
    cd /d "bin\Release\net48"
    set "DIR_ACTUAL=%cd%"
    echo 🧪 DETECTADO: Entorno de desarrollo (Release)
) else if exist "publish\SWGROI_Server.exe" (
    :: Verificar si estamos en un directorio de desarrollo
    echo %cd% | findstr /i "Visual Studio\|RESPALDOS_WEB\|andro" > nul
    if %ERRORLEVEL% equ 0 (
        set "ES_LOCAL=1"
        cd /d "publish"
        echo 🧪 DETECTADO: Entorno de desarrollo (Publish local)
    ) else (
        set "ES_LOCAL="
        cd /d "publish"
        echo 🚀 DETECTADO: Entorno de producción (Publish VPS)
    )
    set "DIR_ACTUAL=%cd%"
) else if exist "SWGROI_Server.exe" (
    :: Verificar por nombre de equipo/usuario/ruta
    echo %COMPUTERNAME% | findstr /i "RicardoNeria" > nul
    if %ERRORLEVEL% equ 0 (
        set "ES_LOCAL=1"
        echo 🧪 DETECTADO: Entorno de desarrollo (Máquina conocida)
    ) else (
        echo %cd% | findstr /i "SWGROI\\SWGROI_Despliegue_Web" > nul
        if %ERRORLEVEL% equ 0 (
            set "ES_LOCAL="
            echo 🚀 DETECTADO: Entorno de producción (Ruta VPS)
        ) else (
            set "ES_LOCAL=1"
            echo 🧪 DETECTADO: Entorno de desarrollo (Por descarte)
        )
    )
    set "DIR_ACTUAL=%cd%"
) else (
    echo ❌ ERROR: SWGROI_Server.exe no encontrado
    echo 📋 Verificar ubicación o compilar proyecto
    pause
    exit /b 1
)

:: Verificar wwwroot
if not exist "wwwroot" (
    echo ❌ ERROR: Carpeta wwwroot no encontrada en %DIR_ACTUAL%
    pause
    exit /b 1
)

:: Limpiar puerto
echo 🔧 Liberando puerto 8891...
taskkill /F /IM "SWGROI_Server.exe" 2>nul
timeout /t 1 /nobreak > nul

:: Mostrar información según entorno
echo.
echo ✅ Configuración detectada:
echo 📁 Directorio: %DIR_ACTUAL%
echo 💻 Equipo: %COMPUTERNAME%
echo 👤 Usuario: %USERNAME%

if defined ES_LOCAL (
    echo 🎯 Modo: DESARROLLO LOCAL
    echo 🌐 URL: http://localhost:8891/login.html
    echo 🔗 Solo accesible desde esta máquina
) else (
    echo 🎯 Modo: PRODUCCIÓN VPS
    echo 🌐 URL: http://75.119.128.78:8891/login.html
    echo 🌍 Accesible desde internet
)

echo 📅 %date% %time%
echo ⚡ Presiona Ctrl+C para detener
echo ═══════════════════════════════════════════
echo.

:: Iniciar servidor
"SWGROI_Server.exe"

:: Manejo de salida
echo.
echo ═══════════════════════════════════════════
if %ERRORLEVEL% neq 0 (
    echo ❌ Error %ERRORLEVEL%
    if defined ES_LOCAL (
        echo 🔍 Verificar: Base de datos MySQL, puerto 8891
    ) else (
        echo 🔍 Verificar: Firewall, permisos, red externa
    )
    pause
) else (
    echo ✅ Servidor detenido correctamente
)

echo 💡 Para forzar modo específico:
echo    START_SWGROI_LOCAL.bat  (forzar local)
echo    START_SWGROI_VPS.bat    (forzar VPS)
pause