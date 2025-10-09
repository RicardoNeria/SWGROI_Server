#!/bin/bash

# Script de diagnóstico y corrección para SWGROI en VPS
# Ejecutar: chmod +x diagnostico_web.sh && ./diagnostico_web.sh

echo "🔧 === DIAGNÓSTICO SWGROI VPS ==="
echo "📅 Fecha: $(date)"
echo "🖥️  Servidor: $(hostname)"
echo ""

# 1. Verificar MySQL
echo "🔍 1. Verificando MySQL..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL está ejecutándose"
    mysql --version
else
    echo "❌ MySQL no está ejecutándose"
    echo "   Intentando iniciar MySQL..."
    sudo systemctl start mysql
fi
echo ""

# 2. Verificar base de datos SWGROI
echo "🔍 2. Verificando base de datos SWGROI..."
DB_EXISTS=$(mysql -u root -p123456 -e "SHOW DATABASES LIKE 'swgroi_db';" 2>/dev/null | grep swgroi_db | wc -l)

if [ $DB_EXISTS -eq 1 ]; then
    echo "✅ Base de datos 'swgroi_db' existe"
    
    # Verificar tablas principales
    TABLES=$(mysql -u root -p123456 -D swgroi_db -e "SHOW TABLES;" 2>/dev/null | wc -l)
    echo "📊 Tablas en la BD: $((TABLES-1))"
    
    # Verificar usuarios
    USERS=$(mysql -u root -p123456 -D swgroi_db -e "SELECT COUNT(*) as total FROM usuarios;" 2>/dev/null | tail -1)
    echo "👥 Usuarios registrados: $USERS"
    
    # Verificar tablas específicas de módulos
    echo "🔍 Verificando tablas de módulos..."
    
    DOCUMENTOS=$(mysql -u root -p123456 -D swgroi_db -e "SHOW TABLES LIKE 'documentos';" 2>/dev/null | grep documentos | wc -l)
    echo "📄 Tabla documentos: $( [ $DOCUMENTOS -eq 1 ] && echo "✅ Existe" || echo "❌ No existe" )"
    
    CATEGORIAS=$(mysql -u root -p123456 -D swgroi_db -e "SHOW TABLES LIKE 'categorias_documento';" 2>/dev/null | grep categorias_documento | wc -l)
    echo "📁 Tabla categorias_documento: $( [ $CATEGORIAS -eq 1 ] && echo "✅ Existe" || echo "❌ No existe" )"
    
    RETRO=$(mysql -u root -p123456 -D swgroi_db -e "SHOW TABLES LIKE 'retroalimentacion';" 2>/dev/null | grep retroalimentacion | wc -l)
    echo "📝 Tabla retroalimentacion: $( [ $RETRO -eq 1 ] && echo "✅ Existe" || echo "❌ No existe" )"
    
    RESPUESTAS=$(mysql -u root -p123456 -D swgroi_db -e "SHOW TABLES LIKE 'respuestas_retroalimentacion';" 2>/dev/null | grep respuestas_retroalimentacion | wc -l)
    echo "💬 Tabla respuestas_retroalimentacion: $( [ $RESPUESTAS -eq 1 ] && echo "✅ Existe" || echo "❌ No existe" )"
    
    # Si faltan tablas de módulos, ejecutar script de corrección
    if [ $DOCUMENTOS -eq 0 ] || [ $CATEGORIAS -eq 0 ] || [ $RETRO -eq 0 ] || [ $RESPUESTAS -eq 0 ]; then
        echo "⚠️  Tablas de módulos faltantes. Necesitas ejecutar:"
        echo "   mysql -u root -p123456 swgroi_db < fix_modulos_web.sql"
    fi
    
    # Si no hay usuarios, crear admin
    if [ "$USERS" -eq 0 ]; then
        echo "⚠️  No hay usuarios. Creando usuario admin..."
        mysql -u root -p123456 -D swgroi_db -e "
        INSERT INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol) 
        VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');
        " 2>/dev/null
        echo "✅ Usuario admin creado: admin/admin123"
    else
        echo "ℹ️  Usuarios existentes:"
        mysql -u root -p123456 -D swgroi_db -e "SELECT Usuario, NombreCompleto, Rol FROM usuarios;" 2>/dev/null
    fi
else
    echo "❌ Base de datos 'swgroi_db' NO existe"
    echo "   🔧 Ejecuta el script SQL para crearla"
fi
echo ""

# 3. Verificar aplicación SWGROI
echo "🔍 3. Verificando aplicación SWGROI..."
if pgrep -f "SWGROI_Server" > /dev/null; then
    echo "✅ SWGROI_Server está ejecutándose"
    echo "📍 Procesos SWGROI:"
    ps aux | grep SWGROI_Server | grep -v grep
else
    echo "❌ SWGROI_Server NO está ejecutándose"
    echo "   📂 Verificando archivos..."
    if [ -f "/root/SWGROI_Server/SWGROI_Server.exe" ]; then
        echo "✅ Ejecutable encontrado: /root/SWGROI_Server/SWGROI_Server.exe"
    else
        echo "❌ Ejecutable NO encontrado en /root/SWGROI_Server/"
    fi
fi
echo ""

# 4. Verificar puertos
echo "🔍 4. Verificando puertos..."
if netstat -tlnp | grep ":8080" > /dev/null; then
    echo "✅ Puerto 8080 está en uso:"
    netstat -tlnp | grep ":8080"
else
    echo "❌ Puerto 8080 NO está en uso"
fi

if netstat -tlnp | grep ":3306" > /dev/null; then
    echo "✅ Puerto 3306 (MySQL) está en uso"
else
    echo "❌ Puerto 3306 (MySQL) NO está en uso"
fi
echo ""

# 5. Verificar logs
echo "🔍 5. Logs recientes..."
echo "📝 Últimas 10 líneas del log de aplicación:"
if [ -f "/root/SWGROI_Server/app.log" ]; then
    tail -10 /root/SWGROI_Server/app.log
else
    echo "   No se encontró archivo de log"
fi
echo ""

# 6. Test de conectividad
echo "🔍 6. Test de conectividad..."
echo "🌐 Probando conexión local..."
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:8080/ || echo "❌ No responde en localhost:8080"

# Probar módulos específicos
echo "🔍 Probando módulos específicos..."
echo "📄 Módulo Documentos:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:8080/documentos.html || echo "   ❌ No responde"

echo "📝 Módulo Retroalimentación:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:8080/retroalimentacion.html || echo "   ❌ No responde"

# Probar APIs
echo "🔍 Probando APIs de módulos..."
echo "📄 API Documentos (listar):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" "http://localhost:8080/documentos?op=listar" || echo "   ❌ No responde"

echo "📝 API Retroalimentación (form):"
curl -s -o /dev/null -w "   Status: %{http_code}\n" "http://localhost:8080/retroalimentacion?op=form&token=test" || echo "   ❌ No responde"

PUBLIC_IP=$(curl -s ifconfig.me)
echo "🌍 IP Pública: $PUBLIC_IP"
echo ""

# 7. Configuración recomendada
echo "🔧 === CONFIGURACIÓN RECOMENDADA ==="
echo "📋 Variables de entorno sugeridas:"
echo "   export DB_HOST=127.0.0.1"
echo "   export DB_PORT=3306"
echo "   export DB_NAME=swgroi_db"
echo "   export DB_USER=root"
echo "   export DB_PASSWORD=123456"
echo ""

echo "🚀 Comando para iniciar aplicación:"
echo "   cd /root/SWGROI_Server && nohup dotnet SWGROI_Server.dll > app.log 2>&1 &"
echo ""

echo "🔑 Credenciales por defecto:"
echo "   Usuario: admin"
echo "   Contraseña: admin123"
echo ""

echo "✅ === DIAGNÓSTICO COMPLETADO ==="