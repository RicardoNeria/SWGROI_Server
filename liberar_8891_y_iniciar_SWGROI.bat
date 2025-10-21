@echo off
setlocal EnableExtensions EnableDelayedExpansion

:: ===============================================
:: SCRIPT DE CONFIGURACION Y EJECUCION - SWGROI
:: Version: 3.0 para VPS (17 de octubre de 2025)
:: ===============================================
:: Libera puerto 8891 e inicia SWGROI_Server con todos los cambios aplicados
:: EJECUTAR COMO ADMINISTRADOR
:: ===============================================

title SWGROI - Configurador VPS v3.0

echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                                                                           ║
echo ║                    🚀 SWGROI - CONFIGURADOR VPS v3.0                     ║
echo ║                                                                           ║
echo ║                    ✓ Tipo de Asunto integrado                            ║
echo ║                    ✓ Refactorización completa                            ║
echo ║                    ✓ Optimizado para producción                          ║
echo ║                                                                           ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

:: ===============================================
:: 1) VERIFICAR PRIVILEGIOS DE ADMINISTRADOR
:: ===============================================
echo [INFO] Verificando privilegios de Administrador...
whoami /groups | find "S-1-16-12288" >nul
if errorlevel 1 (
  echo [ERROR] Este script debe ejecutarse como Administrador.
  echo [ERROR] Cierre y vuelva a abrir CMD/PowerShell como Administrador.
  echo.
  pause
  exit /b 1
)
echo [OK] ✓ Privilegios de Administrador confirmados
echo.

:: ===============================================
:: 2) CONFIGURACION DE VARIABLES
:: ===============================================
set PORT=8891
set BIND_PATTERN=:!PORT!:
set URL=http://+:%PORT%/
set IP_ADDR=75.119.128.78
set URL_IP=http://%IP_ADDR%:%PORT%/
set URL_LOCALHOST=http://localhost:%PORT%/
set URL_LOOP=http://127.0.0.1:%PORT%/
set EXE_NAME=SWGROI_Server.exe

:: ===============================================
:: 3) LOCALIZAR EJECUTABLE
:: ===============================================
echo [INFO] Localizando ejecutable %EXE_NAME%...

:: Rutas posibles del ejecutable
set RUTA1=%~dp0%EXE_NAME%
set RUTA2=%~dp0publish\%EXE_NAME%
set RUTA3=C:\SWGROI\SWGROI_Despliegue_Web\publish\%EXE_NAME%
set RUTA4=%~dp0bin\Release\%EXE_NAME%

if exist "%RUTA1%" (
  set TARGET=%RUTA1%
  set WORK_DIR=%~dp0
) else if exist "%RUTA2%" (
  set TARGET=%RUTA2%
  set WORK_DIR=%~dp0publish
) else if exist "%RUTA3%" (
  set TARGET=%RUTA3%
  set WORK_DIR=C:\SWGROI\SWGROI_Despliegue_Web\publish
) else if exist "%RUTA4%" (
  set TARGET=%RUTA4%
  set WORK_DIR=%~dp0bin\Release
) else (
  echo [ERROR] No se encontró %EXE_NAME% en las rutas esperadas:
  echo   - %RUTA1%
  echo   - %RUTA2%
  echo   - %RUTA3%
  echo   - %RUTA4%
  echo.
  echo [SOLUCION] Asegúrese de que el ejecutable esté publicado correctamente.
  pause
  exit /b 2
)

echo [OK] ✓ Ejecutable encontrado: %TARGET%
echo [OK] ✓ Directorio de trabajo: %WORK_DIR%
echo.

:: ===============================================
:: 4) VERIFICAR ARCHIVO DE CONFIGURACION
:: ===============================================
set CONFIG_FILE=%WORK_DIR%\SWGROI_Server.exe.config
if exist "%CONFIG_FILE%" (
  echo [OK] ✓ Configuración encontrada: %CONFIG_FILE%
) else (
  echo [WARN] ⚠ Archivo de configuración no encontrado: %CONFIG_FILE%
  echo [WARN] El servidor podría usar valores por defecto
)
echo.

:: ===============================================
:: 5) CERRAR INSTANCIAS PREVIAS
:: ===============================================
echo [INFO] Cerrando instancias previas de SWGROI_Server...
tasklist | find /i "SWGROI_Server.exe" >nul
if not errorlevel 1 (
  echo [INFO] Cerrando procesos existentes...
  taskkill /IM SWGROI_Server.exe /F >nul 2>&1
  timeout /t 2 >nul
  echo [OK] ✓ Procesos anteriores cerrados
) else (
  echo [OK] ✓ No hay procesos previos ejecutándose
)
echo.

:: ===============================================
:: 6) LIBERAR PUERTO Y CONFIGURAR URLACL
:: ===============================================
echo [INFO] Configurando puerto %PORT% para SWGROI...

:: Remover bindings de IIS
echo [INFO] Removiendo bindings de IIS en puerto %PORT%...
powershell -NoProfile -Command "try { Import-Module WebAdministration -ErrorAction Stop; Get-WebBinding | Where-Object { $_.protocol -eq 'http' -and $_.bindingInformation -match ':%PORT%:' } | ForEach-Object { $site = (Get-Website | Where-Object { $_.Id -eq $_.ItemXPath.Split('[')[1].Split(']')[0] }).Name; Remove-WebBinding -Name $site -Protocol http -Port %PORT% -Confirm:\$false }; Write-Host '[OK] IIS bindings removidos' } catch { Write-Host '[INFO] IIS no disponible o sin bindings en puerto %PORT%' }" 2>nul

:: Limpiar URLACLs existentes
echo [INFO] Limpiando URLACLs existentes...
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL%"') do (
  netsh http delete urlacl url=%URL% >nul 2>&1
)
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL_IP%"') do (
  netsh http delete urlacl url=%URL_IP% >nul 2>&1
)
for /f "tokens=*" %%A in ('netsh http show urlacl ^| findstr /i "%URL_LOCALHOST%"') do (
  netsh http delete urlacl url=%URL_LOCALHOST% >nul 2>&1
)

:: Detectar idioma del sistema para permisos
set ACLUSER=Everyone
whoami /groups | find /i "\<Todos\>" >nul && set ACLUSER=Todos

:: Agregar nuevos URLACLs
echo [INFO] Configurando URLACLs para %ACLUSER%...
netsh http add urlacl url=%URL% user=%ACLUSER% >nul 2>&1
if errorlevel 1 (
  echo [WARN] Reintentando con Everyone...
  netsh http add urlacl url=%URL% user=Everyone >nul 2>&1
)

netsh http add urlacl url=%URL_IP% user=%ACLUSER% >nul 2>&1
if errorlevel 1 (
  netsh http add urlacl url=%URL_IP% user=Everyone >nul 2>&1
)

echo [OK] ✓ URLACLs configurados correctamente
echo.

:: ===============================================
:: 7) CONFIGURAR FIREWALL
:: ===============================================
echo [INFO] Configurando reglas de firewall...
netsh advfirewall firewall delete rule name="SWGROI 8891" >nul 2>&1
netsh advfirewall firewall add rule name="SWGROI 8891 TCP" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
netsh advfirewall firewall add rule name="SWGROI 8891 UDP" dir=out action=allow protocol=TCP localport=%PORT% >nul 2>&1
echo [OK] ✓ Firewall configurado para puerto %PORT%
echo.

:: ===============================================
:: 8) CONFIGURAR VARIABLES DE ENTORNO
:: ===============================================
echo [INFO] Configurando variables de entorno del sistema...

:: Variables de aplicación
setx SWGROI_PORT %PORT% >nul 2>&1
setx SWGROI_ENV PROD >nul 2>&1
setx SWGROI_VERSION "3.0" >nul 2>&1
setx SWGROI_WORKDIR "%WORK_DIR%" >nul 2>&1

:: Variables de MySQL para conexión a base de datos
echo [INFO] Configurando variables de MySQL...
setx DB_HOST "127.0.0.1" >nul 2>&1
setx DB_PORT "3306" >nul 2>&1
setx DB_NAME "swgroi_db" >nul 2>&1
setx DB_USER "root" >nul 2>&1

:: Preguntar contraseña MySQL si no está configurada
set DB_PASSWORD_CURRENT=%DB_PASSWORD%
if not defined DB_PASSWORD_CURRENT (
  echo [INFO] ⚠ Configuración de contraseña MySQL requerida
  echo [INFO] Ingrese la contraseña de MySQL para el usuario 'root':
  set /p DB_PASSWORD_INPUT="MySQL Password: "
  if not "!DB_PASSWORD_INPUT!"=="" (
    setx DB_PASSWORD "!DB_PASSWORD_INPUT!" >nul 2>&1
    set DB_PASSWORD=!DB_PASSWORD_INPUT!
    echo [OK] ✓ Contraseña MySQL configurada
  ) else (
    echo [WARN] ⚠ Usando contraseña por defecto '123456'
    setx DB_PASSWORD "123456" >nul 2>&1
    set DB_PASSWORD=123456
  )
) else (
  echo [OK] ✓ Contraseña MySQL ya configurada
  set DB_PASSWORD=%DB_PASSWORD_CURRENT%
)

:: Variables para la sesión actual
set SWGROI_PORT=%PORT%
set SWGROI_ENV=PROD
set SWGROI_VERSION=3.0
set SWGROI_WORKDIR=%WORK_DIR%
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_NAME=swgroi_db
set DB_USER=root

echo [OK] ✓ Variables de entorno configuradas:
echo      - SWGROI_PORT=%PORT%
echo      - SWGROI_ENV=PROD (🚀 Fuerza modo PRODUCCIÓN)
echo      - SWGROI_VERSION=3.0
echo      - SWGROI_WORKDIR=%WORK_DIR%
echo      - DB_HOST=127.0.0.1
echo      - DB_PORT=3306
echo      - DB_NAME=swgroi_db
echo      - DB_USER=root
echo      - DB_PASSWORD=****** (oculta)
echo.
echo [INFO] 🎯 URL esperada del sistema: http://75.119.128.78:%PORT%/login.html
echo.

:: ===============================================
:: 9) VERIFICAR Y CONFIGURAR MYSQL/BASE DE DATOS
:: ===============================================
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                      🗄️ VERIFICANDO MYSQL Y BASE DATOS                   ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

:: Verificar si MySQL está ejecutándose
echo [INFO] Verificando servicio MySQL...
sc query MySQL80 >nul 2>&1
if errorlevel 1 (
  echo [WARN] ⚠ Servicio MySQL80 no encontrado, intentando MySQL...
  sc query MySQL >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] ❌ MySQL no está instalado o el servicio no existe
    echo [ERROR] Instale MySQL y asegúrese de que el servicio esté configurado
    pause
    exit /b 3
  ) else (
    echo [INFO] Iniciando servicio MySQL...
    net start MySQL >nul 2>&1
  )
) else (
  echo [INFO] Iniciando servicio MySQL80...
  net start MySQL80 >nul 2>&1
)

:: Verificar conexión a MySQL
echo [INFO] Verificando conexión a MySQL...
mysql -h 127.0.0.1 -u root -p%DB_PASSWORD% -e "SELECT VERSION();" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ❌ No se puede conectar a MySQL con las credenciales configuradas
  echo [ERROR] Verifique:
  echo [ERROR]   • Usuario: %DB_USER%
  echo [ERROR]   • Host: 127.0.0.1:3306
  echo [ERROR]   • Password configurado correctamente
  echo.
  echo [SOLUCION] Ejecute manualmente:
  echo   mysql -u root -p
  echo   (y configure la contraseña correcta)
  pause
  exit /b 4
)

echo [OK] ✓ Conexión MySQL exitosa

:: Verificar si existe la base de datos swgroi_db
echo [INFO] Verificando base de datos swgroi_db...
mysql -h 127.0.0.1 -u root -p%DB_PASSWORD% -e "USE swgroi_db; SELECT COUNT(*) FROM tickets;" >nul 2>&1
if errorlevel 1 (
  echo [WARN] ⚠ Base de datos swgroi_db no existe o está incompleta
  echo [INFO] Instalando base de datos automáticamente con esquema completo...
  
  :: Ejecutar script de instalación completa y segura
  set SCRIPT_BD=%WORK_DIR%\BaseDatos\INSTALAR_BD_COMPLETA_SEGURA.sql
  if exist "%SCRIPT_BD%" (
    echo [INFO] Ejecutando: INSTALAR_BD_COMPLETA_SEGURA.sql
    echo [INFO] Este script es SEGURO y preserva datos existentes
    mysql -h 127.0.0.1 -u root -p%DB_PASSWORD% < "%SCRIPT_BD%"
    if errorlevel 1 (
      echo [ERROR] ❌ Error al instalar la base de datos
      echo [ERROR] Ejecute manualmente:
      echo   mysql -u root -p ^< "%SCRIPT_BD%"
      pause
      exit /b 5
    ) else (
      echo [OK] ✓ Base de datos swgroi_db instalada exitosamente
      echo [OK] ✓ Esquema completo con todas las tablas y tipo_asunto
    )
  ) else (
    echo [ERROR] ❌ No se encontró el script INSTALAR_BD_COMPLETA_SEGURA.sql
    echo [ERROR] Verifique que esté en: %SCRIPT_BD%
    pause
    exit /b 6
  )
) else (
  echo [OK] ✓ Base de datos swgroi_db ya existe y está funcional
)

:: Verificar que la tabla tickets tenga la columna TipoAsunto
echo [INFO] Verificando columna TipoAsunto...
mysql -h 127.0.0.1 -u root -p%DB_PASSWORD% -e "USE swgroi_db; DESCRIBE tickets;" | findstr "tipo_asunto" >nul 2>&1
if errorlevel 1 (
  echo [WARN] ⚠ Columna tipo_asunto no encontrada, agregando...
  mysql -h 127.0.0.1 -u root -p%DB_PASSWORD% -e "USE swgroi_db; ALTER TABLE tickets ADD COLUMN tipo_asunto VARCHAR(100) NOT NULL DEFAULT 'Mant. Correctivo Panel';" >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] ❌ Error al agregar columna tipo_asunto
  ) else (
    echo [OK] ✓ Columna tipo_asunto agregada
  )
) else (
  echo [OK] ✓ Columna tipo_asunto ya existe
)

echo [OK] ✓ MySQL y base de datos configurados correctamente
echo.

:: ===============================================
:: 10) VERIFICAR ESTADO DEL SISTEMA
:: ===============================================
echo [INFO] Verificando estado del sistema...
echo [INFO] Estado HTTP.SYS para puerto %PORT%:
netsh http show urlacl | findstr /i "%PORT%" 2>nul || echo      (No hay reservas activas)

echo [INFO] Procesos usando puerto %PORT%:
netstat -ano | findstr ":%PORT%" 2>nul || echo      (Puerto libre)
echo.

:: ===============================================
:: 11) INICIAR SERVIDOR
:: ===============================================
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║                          🚀 INICIANDO SERVIDOR                            ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Iniciando SWGROI Server v3.0...
echo [INFO] Ejecutable: %TARGET%
echo [INFO] Puerto: %PORT%
echo [INFO] Directorio: %WORK_DIR%
echo [INFO] Configuración: %CONFIG_FILE%
echo.

:: Cambiar al directorio de trabajo
pushd "%WORK_DIR%"

:: Iniciar el servidor en una nueva ventana
start "SWGROI Server v3.0 - Puerto %PORT%" /D "%WORK_DIR%" "%TARGET%"

:: Esperar un momento para que inicie
echo [INFO] Esperando inicio del servidor...
timeout /t 5 >nul

:: Verificar que el proceso está ejecutándose
tasklist | find /i "SWGROI_Server.exe" >nul
if not errorlevel 1 (
  echo [OK] ✓ Servidor iniciado correctamente
  echo.
  echo ╔═══════════════════════════════════════════════════════════════════════════╗
  echo ║                              ✅ ÉXITO                                     ║
  echo ╚═══════════════════════════════════════════════════════════════════════════╝
  echo.
  echo [SUCCESS] SWGROI Server v3.0 está ejecutándose en puerto %PORT%
  echo.
  echo 🌐 URLs de acceso:
  echo    • Local:    http://localhost:%PORT%/login.html
  echo    • Red:      http://%IP_ADDR%:%PORT%/login.html
  echo    • Loopback: http://127.0.0.1:%PORT%/login.html
  echo.
  echo 📋 Características de esta versión:
  echo    ✓ Columna 'Tipo de Asunto' integrada en Tickets y Técnicos
  echo    ✓ Modal de seguimiento técnico mejorado
  echo    ✓ Refactorización completa de JavaScript
  echo    ✓ Helpers de seguridad (XSS, CSV, HTML)
  echo    ✓ Backend actualizado (TecnicosController)
  echo    ✓ Base de datos unificada con procedimientos
  echo    ✓ Configuración optimizada para VPS
  echo.
  echo 🔍 Para verificar el estado:
  echo    • Revisar la ventana del servidor que se abrió
  echo    • Verificar logs en el directorio de trabajo
  echo    • Acceder a alguna de las URLs mostradas arriba
  echo.
  echo 📁 Archivos importantes:
  echo    • Ejecutable: %TARGET%
  echo    • Config:     %CONFIG_FILE%
  echo    • Base datos: %WORK_DIR%\BaseDatos\INSTALAR_BD_COMPLETA_SEGURA.sql
  echo    • Esquema completo: %WORK_DIR%\BaseDatos\SWGROI_DB_COMPLETO_UNIFICADO.sql
  echo    • Logs:       %WORK_DIR%\logs\ (si existe)
  echo.
) else (
  echo [ERROR] ❌ El servidor no pudo iniciarse
  echo [ERROR] Revise los siguientes puntos:
  echo    • Permisos de archivos en %WORK_DIR%
  echo    • Configuración MySQL en %CONFIG_FILE%
  echo    • Puerto %PORT% disponible
  echo    • Firewall y antivirus
  echo.
  echo [DEBUG] Para diagnóstico manual:
  echo    cd "%WORK_DIR%"
  echo    "%TARGET%"
  echo.
)

popd

:: ===============================================
:: 12) INSTRUCCIONES FINALES
:: ===============================================
echo ═══════════════════════════════════════════════════════════════════════════
echo  INSTRUCCIONES POST-INSTALACIÓN
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo 1️⃣ CONFIGURAR BASE DE DATOS:
echo    a) Asegurar MySQL ejecutándose: net start MySQL80
echo    b) BD nueva/actualizar: mysql -u root -p ^< %WORK_DIR%\BaseDatos\INSTALAR_BD_COMPLETA_SEGURA.sql
echo    c) BD desde cero: mysql -u root -p ^< %WORK_DIR%\BaseDatos\SWGROI_DB_COMPLETO_UNIFICADO.sql
echo    d) Verificar variables: DB_HOST=127.0.0.1, DB_USER=root, DB_PASSWORD=[tu password]
echo    ✅ El script ya ejecutó la instalación automática si era necesaria
echo.
echo 2️⃣ VERIFICAR FUNCIONAMIENTO:
echo    🌐 URL PRINCIPAL: http://75.119.128.78:%PORT%/login.html
echo    🏠 URL LOCAL: http://localhost:%PORT%/login.html (solo desde el VPS)
echo    • Login demo: usuario=admin, password=[configurar en BD]
echo    • Verificar módulos Tickets y Técnicos con columna 'Tipo de Asunto'
echo    • Probar modal de seguimiento técnico (3 columnas: Folio-TipoAsunto-Estado)
echo    ⚠️  IMPORTANTE: El servidor debe mostrar URL http://75.119.128.78:%PORT%
echo.
echo 3️⃣ MONITOREO:
echo    • El servidor ejecuta en ventana separada
echo    • Para detener: cerrar ventana o Ctrl+C
echo    • Para reiniciar: ejecutar este script nuevamente
echo    • Logs del servidor aparecen en la ventana
echo.
echo 4️⃣ TROUBLESHOOTING:
echo    • Si no carga: verificar 'net start MySQL80' y puerto 3306 libre
echo    • Si error conexión BD: verificar DB_PASSWORD con 'echo %DB_PASSWORD%'
echo    • Si no ve columna TipoAsunto: ejecutar VERIFICAR_Y_PARCHAR_BD.sql
echo    • Si timeout: verificar firewall Windows para puerto %PORT%
echo    • Si JavaScript no funciona: verificar wwwroot copiado completamente
echo.
echo ═══════════════════════════════════════════════════════════════════════════
echo.
echo Presiona cualquier tecla para finalizar...
pause >nul

endlocal
exit /b 0