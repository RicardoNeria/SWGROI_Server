@echo off
echo ==========================================
echo   CONFIGURAR FIREWALL WINDOWS - SWGROI
echo ==========================================
echo.
echo ⚠️  ESTE SCRIPT REQUIERE PERMISOS DE ADMINISTRADOR
echo.

:: Verificar si se ejecuta como administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERROR: Se requieren permisos de Administrador
    echo.
    echo 🔧 SOLUCIÓN:
    echo    1. Clic derecho en este script
    echo    2. Seleccionar "Ejecutar como administrador"
    echo.
    pause
    exit /b 1
)

echo ✅ Ejecutándose como Administrador
echo.

echo 🔧 Configurando reglas de firewall para SWGROI...
echo.

:: Eliminar reglas previas si existen
echo 🧹 Eliminando reglas previas...
netsh advfirewall firewall delete rule name="SWGROI HTTP Entrada" >nul 2>&1
netsh advfirewall firewall delete rule name="SWGROI HTTP Salida" >nul 2>&1
netsh advfirewall firewall delete rule name="SWGROI Server Puerto 8891" >nul 2>&1

:: Crear regla para puerto 8891 entrada
echo 📥 Creando regla de entrada puerto 8891...
netsh advfirewall firewall add rule name="SWGROI HTTP Entrada" dir=in action=allow protocol=TCP localport=8891

:: Crear regla para puerto 8891 salida  
echo 📤 Creando regla de salida puerto 8891...
netsh advfirewall firewall add rule name="SWGROI HTTP Salida" dir=out action=allow protocol=TCP localport=8891

:: Crear regla específica para el ejecutable
echo 🔓 Permitiendo SWGROI_Server.exe...
netsh advfirewall firewall add rule name="SWGROI Server Puerto 8891" dir=in action=allow program="C:\SWGROI\SWGROI_Despliegue_Web\publish\SWGROI_Server.exe" enable=yes

echo.
echo ✅ CONFIGURACIÓN COMPLETADA
echo.
echo 📋 Reglas creadas:
echo    ✅ SWGROI HTTP Entrada (Puerto 8891 TCP)
echo    ✅ SWGROI HTTP Salida (Puerto 8891 TCP)  
echo    ✅ SWGROI Server Puerto 8891 (Ejecutable específico)
echo.

echo 🔍 Verificando reglas activas...
netsh advfirewall firewall show rule name="SWGROI HTTP Entrada"
echo.
netsh advfirewall firewall show rule name="SWGROI HTTP Salida"
echo.
netsh advfirewall firewall show rule name="SWGROI Server Puerto 8891"

echo.
echo 🌐 Ahora intenta acceder a: http://75.119.128.78:8891/login.html
echo.
echo 💡 Si sigue sin funcionar, verifica:
echo    - Router/Firewall externo del VPS
echo    - Configuración de red del proveedor (Contabo)
echo    - IP pública correcta: 75.119.128.78
echo.
pause