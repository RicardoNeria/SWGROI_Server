@echo off
echo ===============================================
echo VERIFICACION DE PUBLICACION SWGROI SERVER
echo ===============================================
echo.

echo [1] Verificando ejecutable principal...
if exist "SWGROI_Server.exe" (
    echo    ✓ SWGROI_Server.exe encontrado
    for %%I in (SWGROI_Server.exe) do echo      Fecha: %%~tI   Tamaño: %%~zI bytes
) else (
    echo    ✗ ERROR: SWGROI_Server.exe NO encontrado
)

echo.
echo [2] Verificando controladores críticos...
if exist "Controladores\TicketsController.cs" (
    echo    ✓ TicketsController.cs encontrado
) else (
    echo    ✗ ERROR: TicketsController.cs NO encontrado
)

if exist "Controladores\TecnicosController.cs" (
    echo    ✓ TecnicosController.cs encontrado  
) else (
    echo    ✗ ERROR: TecnicosController.cs NO encontrado
)

if exist "Controladores\SeguimientoController.cs" (
    echo    ✓ SeguimientoController.cs encontrado
) else (
    echo    ✗ ERROR: SeguimientoController.cs NO encontrado
)

echo.
echo [3] Verificando base de datos...
if exist "BaseDatos\SWGROI_DB_COMPLETO_UNIFICADO.sql" (
    echo    ✓ Base de datos unificada encontrada
) else (
    echo    ✗ ERROR: Base de datos unificada NO encontrada
)

echo.
echo [4] Verificando archivos de configuración...
if exist "SWGROI_Server.exe.config" (
    echo    ✓ SWGROI_Server.exe.config encontrado
) else (
    echo    ✗ ERROR: SWGROI_Server.exe.config NO encontrado
)

if exist "web.config" (
    echo    ✓ web.config encontrado
) else (
    echo    ✗ ERROR: web.config NO encontrado
)

echo.
echo [5] Verificando JavaScript actualizado...
if exist "wwwroot\Scripts\tickets.js" (
    echo    ✓ tickets.js encontrado
) else (
    echo    ✗ ERROR: tickets.js NO encontrado
)

if exist "wwwroot\Scripts\tecnicos.js" (
    echo    ✓ tecnicos.js encontrado
) else (
    echo    ✗ ERROR: tecnicos.js NO encontrado
)

echo.
echo ===============================================
echo VERIFICACION COMPLETADA
echo ===============================================
echo.
echo PASOS SIGUIENTES:
echo 1. Ejecutar: SWGROI_DB_COMPLETO_UNIFICADO.sql en MySQL
echo 2. Ejecutar: liberar_8891_y_iniciar_SWGROI.bat
echo 3. Verificar en navegador: http://localhost:8891
echo.
pause