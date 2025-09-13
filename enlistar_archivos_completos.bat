@echo off
setlocal enabledelayedexpansion

:: === CONFIGURACIÓN ===
set "REPO=https://github.com/RicardoNeria/SWGROI_Server"
set "OUTPUT=urls_archivos.txt"

echo ================================================
echo   🔗 GENERADOR DE URLS DE TODAS LAS RAMAS
echo ================================================
echo Repo: %REPO%
echo Archivo de salida: %OUTPUT%
echo.

:: === Limpiar archivo de salida si existe ===
if exist "%OUTPUT%" del "%OUTPUT%"

:: === Obtener lista de ramas remotas (sin HEAD) ===
for /f "tokens=*" %%b in ('git branch -r ^| findstr /v "HEAD"') do (
    set "BRANCH=%%b"
    set "BRANCH=!BRANCH:origin/=!"

    echo [Rama: !BRANCH!]>> "%OUTPUT%"

    :: Listar todos los archivos de la rama con git ls-tree
    for /f "tokens=*" %%f in ('git ls-tree -r --name-only origin/!BRANCH!') do (
        set "RELFILE=%%f"
        set "RELFILE=!RELFILE:\=/!"
        echo   %REPO%/blob/!BRANCH!/!RELFILE!>> "%OUTPUT%"
    )

    echo.>> "%OUTPUT%"
)

echo.
echo ✅ Archivo generado: %OUTPUT%
pause
