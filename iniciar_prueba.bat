@echo off
echo ====================================
echo SWGROI - Inicio Rapido para Pruebas
echo ====================================

echo.
echo Configurando variables para web...
set COOKIE_SAMESITE=Lax
set COOKIE_SECURE=false
set FORCE_HTTPS=false

echo Variables configuradas:
echo - COOKIE_SAMESITE: %COOKIE_SAMESITE%
echo - COOKIE_SECURE: %COOKIE_SECURE%
echo - FORCE_HTTPS: %FORCE_HTTPS%

echo.
echo Iniciando servidor SWGROI...
echo Abrir en navegador: http://localhost:8080/login.html
echo.

cd /d "%~dp0"
"bin\Debug\net48\SWGROI_Server.exe"

pause