@echo off
echo ===============================================
echo VERIFICACION MODULO CCC - RETROALIMENTACION
echo ===============================================
echo.

echo [1] Verificando archivos del modulo...
if exist "wwwroot\retro_ccc_admin.html" (
    echo    ✓ Pagina admin encontrada
) else (
    echo    ✗ ERROR: retro_ccc_admin.html NO encontrado
)

if exist "wwwroot\retroalimentacion.html" (
    echo    ✓ Formulario de encuesta encontrado
) else (
    echo    ✗ ERROR: retroalimentacion.html NO encontrado
)

if exist "Controladores\RetroalimentacionController.cs" (
    echo    ✓ Controlador encontrado
) else (
    echo    ✗ ERROR: RetroalimentacionController.cs NO encontrado
)

echo.
echo [2] Verificando estilos...
if exist "wwwroot\Styles\retro_ccc_admin.css" (
    echo    ✓ Estilos admin encontrados
) else (
    echo    ✗ ERROR: retro_ccc_admin.css NO encontrado
)

if exist "wwwroot\Styles\retroalimentacion.css" (
    echo    ✓ Estilos formulario encontrados
) else (
    echo    ✗ ERROR: retroalimentacion.css NO encontrado
)

echo.
echo [3] Verificando scripts JavaScript...
if exist "wwwroot\Scripts\retro_admin.js" (
    echo    ✓ Script admin encontrado
) else (
    echo    ✗ ERROR: retro_admin.js NO encontrado
)

if exist "wwwroot\Scripts\retroalimentacion.js" (
    echo    ✓ Script formulario encontrado
) else (
    echo    ✗ ERROR: retroalimentacion.js NO encontrado
)

echo.
echo ===============================================
echo CARACTERISTICAS MEJORADAS
echo ===============================================
echo ✓ Boton copiar con multiples metodos de fallback
echo ✓ Aspecto visual mejorado con gradientes y animaciones
echo ✓ Columna Cliente usa campo Cuenta del modulo ventas
echo ✓ Formulario con diseño moderno y responsivo
echo ✓ Validaciones y mensajes visuales mejorados
echo ✓ Barra de progreso animada
echo ✓ Estados de loading en botones
echo ✓ Soporte para alto contraste
echo.

echo PASOS PARA PROBAR:
echo 1. Iniciar servidor: SWGROI_Server.exe
echo 2. Abrir admin: http://localhost:8891/retro_ccc_admin.html
echo 3. Generar enlace con un folio de ticket valido
echo 4. Verificar que el boton copiar funciona
echo 5. Abrir el enlace generado para ver el formulario
echo.
pause