@echo off
echo ================================================================
echo CONFIGURACIÓN COMPLETA SWGROI - BASE DE DATOS Y MÓDULOS WEB
echo ================================================================
echo.

echo 1. Configurando variables de entorno para MySQL...
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_NAME=swgroi_db
set DB_USER=root
set DB_PASSWORD=123456

echo    ✓ DB_HOST=%DB_HOST%
echo    ✓ DB_PORT=%DB_PORT%
echo    ✓ DB_NAME=%DB_NAME%
echo    ✓ DB_USER=%DB_USER%
echo    ✓ DB_PASSWORD=****** (configurado)
echo.

echo 2. Iniciando servidor SWGROI con base de datos integrada...
echo    ✓ Módulos Documentos y Retroalimentación reestructurados
echo    ✓ Base de datos fusionada con tablas de avisos, documentos, retroalimentación
echo    ✓ Enlaces web para encuestas de retroalimentación
echo    ✓ Métricas en tiempo real para widgets del menú
echo    ✓ Datos de prueba incluidos (2 tickets, 2 avisos)
echo.

echo IMPORTANTE:
echo - Asegúrese de tener MySQL Server ejecutándose en el puerto 3306
echo - El usuario 'root' debe tener permisos para crear bases de datos
echo - La base de datos 'swgroi_db' se creará automáticamente
echo.

pause
echo.
echo Iniciando servidor...
SWGROI_Server.exe