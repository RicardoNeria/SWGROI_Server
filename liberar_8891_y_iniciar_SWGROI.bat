@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: Script para liberar el puerto 8891 de IIS/HTTP.SYS y ejecutar SWGROI_Server en ese puerto
:: Ejecutar como Administrador.

echo [INFO] Verificando privilegios de Administrador...
whoami /groups | find "S-1-16-12288" >nul
if errorlevel 1 (
  echo [ERROR] Este script debe ejecutarse como Administrador. Cierre y vuelva a abrir CMD/PowerShell como Administrador.
  pause
  exit /b 1
)

set PORT=8891
set BIND_PATTERN=:!PORT!:
set URL=http://+:%PORT%/
set IP_ADDR=75.119.128.78
set URL_IP=http://%IP_ADDR%:%PORT%/
set URL_LOCALHOST=http://localhost:%PORT%/
set URL_LOOP=http://127.0.0.1:%PORT%/

:: 1) Intentar remover bindings de IIS en el puerto
echo [INFO] Intentando remover bindings http en puerto %PORT% con PowerShell (WebAdministration)...
powershell -NoProfile -Command "Import-Module WebAdministration; $p=%PORT%; Get-WebBinding | Where-Object { $_.protocol -eq 'http' -and $_.bindingInformation -match (':' + $p + ':') } | ForEach-Object { $site = Split-Path $_.PSPath -Parent | Split-Path -Leaf; $parts = $_.bindingInformation.Split(':'); Remove-WebBinding -Name $site -Protocol http -Port $parts[1] -IPAddress $parts[0] -HostHeader $parts[2] -Confirm:\$false }" 2>nul

:: 2) Quitar cualquier reserva antigua y registrar URLACL para Everyone
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL%"') do (
  echo [INFO] Eliminando URLACL existente: %URL%
  netsh http delete urlacl url=%URL% >nul 2>&1
)
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL_IP%"') do (
  echo [INFO] Eliminando URLACL existente: %URL_IP%
  netsh http delete urlacl url=%URL_IP% >nul 2>&1
)
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL_LOCALHOST%"') do (
  echo [INFO] Eliminando URLACL existente: %URL_LOCALHOST%
  netsh http delete urlacl url=%URL_LOCALHOST% >nul 2>&1
)
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL_LOOP%"') do (
  echo [INFO] Eliminando URLACL existente: %URL_LOOP%
  netsh http delete urlacl url=%URL_LOOP% >nul 2>&1
)

:: Detectar nombre de grupo (Everyone/Todos) segun idioma del SO
set ACLUSER=Everyone
whoami /groups | find /i "\<Todos\>" >nul && set ACLUSER=Todos

echo [INFO] Agregando URLACL: %URL% para %ACLUSER% ...
netsh http add urlacl url=%URL% user=%ACLUSER% >nul 2>&1
if errorlevel 1 (
  echo [WARN] No se pudo agregar URLACL con %ACLUSER%, intentando con Everyone...
  netsh http add urlacl url=%URL% user=Everyone >nul 2>&1
)

echo [INFO] Agregando URLACL especifica: %URL_IP% para %ACLUSER% ...
netsh http add urlacl url=%URL_IP% user=%ACLUSER% >nul 2>&1
if errorlevel 1 (
  echo [WARN] No se pudo agregar URLACL con %ACLUSER% para %URL_IP%, intentando con Everyone...
  netsh http add urlacl url=%URL_IP% user=Everyone >nul 2>&1
)

:: 3) Abrir firewall para el puerto
netsh advfirewall firewall add rule name="SWGROI 8891" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1

:: 4) Mostrar estado del servicio HTTP para el puerto
echo [INFO] Estado HTTP.SYS (filtrado por %PORT%):
powershell -NoProfile -Command "netsh http show servicestate ^| Select-String -Pattern ':%PORT%','Registered','Listen'" 2>nul

:: 4.1) Cerrar instancias previas del servidor para evitar conflictos
for /f "tokens=1,*" %%P in ('tasklist ^| find /i "SWGROI_Server.exe"') do (
  echo [INFO] Cerrando instancia previa: %%P
  taskkill /IM SWGROI_Server.exe /F >nul 2>&1
)

:: 5) Ubicar ejecutable
set EXE=SWGROI_Server.exe
set PUBLISH1=%~dp0publish\%EXE%
set PUBLISH2=%~dp0%EXE%
set PUBLISH3=C:\SWGROI\SWGROI_Despliegue_Web\publish\%EXE%

if exist "%PUBLISH1%" set TARGET=%PUBLISH1%
if not defined TARGET if exist "%PUBLISH2%" set TARGET=%PUBLISH2%
if not defined TARGET if exist "%PUBLISH3%" set TARGET=%PUBLISH3%

if not defined TARGET (
  echo [ERROR] No se encontro %EXE% en:
  echo   %PUBLISH1%
  echo   %PUBLISH2%
  echo   %PUBLISH3%
  echo Publica la aplicacion o ajusta la ruta en este script.
  pause
  exit /b 2
)

echo [INFO] Iniciando SWGROI_Server en puerto %PORT%: "%TARGET%"
setx SWGROI_PORT %PORT% >nul
set SWGROI_PORT=%PORT%
setx SWGROI_ENV PROD >nul
set SWGROI_ENV=PROD

pushd "%~dp0"
start "SWGROI_Server %PORT%" /D "%~dp0" "%TARGET%"
popd

echo [OK] Lanzado. Si el navegador externo no responde, revisa la ventana del servidor para ver 'Prefijos activos'.
pause
endlocal
