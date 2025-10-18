# SWGROI Server - Lista de Archivos VPS

## 📁 ARCHIVOS ESENCIALES PARA COPIAR AL VPS

### 🎯 **RUTA EN VPS:** `C:\SWGROI\SWGROI_Despliegue_Web\publish\`

### ✅ **ARCHIVOS OBLIGATORIOS:**

#### **1. Ejecutable Principal**
- `SWGROI_Server.exe` - Servidor principal
- `SWGROI_Server.exe.config` - Configuración del servidor (.NET Framework)
- `SWGROI_Server.pdb` - Símbolos de depuración (opcional)

#### **2. Carpeta Web**
- `wwwroot\` - **CARPETA COMPLETA** con todos los archivos web
  - `login.html`
  - `menu.html`
  - `Styles\` (todos los CSS)
  - `Scripts\` (todos los JS)
  - `Imagenes\` (todas las imágenes)

#### **3. Librerías .NET (.dll)**
- `MySql.Data.dll` - Conexión MySQL
- `ClosedXML.dll` - Manejo Excel
- `Microsoft.Data.SqlClient.dll` - SQL Server
- `System.Text.Json.dll` - JSON
- Todas las demás DLL en la carpeta publish

#### **4. Scripts de Control**
- `iniciar_VPS_CONTABO.bat` - Inicio principal
- `iniciar_DIAGNOSTICO_VPS.bat` - Con diagnóstico
- `verificar_VPS_CONTABO.bat` - Verificación de archivos
- `limpiar_conexiones_VPS.bat` - Limpieza de conexiones
- `configurar_firewall_VPS.bat` - Configuración firewall

## 🚀 **PASOS PARA DEPLOYMENT:**

### **1. Crear estructura en VPS:**
```cmd
mkdir "C:\SWGROI\SWGROI_Despliegue_Web\publish"
```

### **2. Copiar archivos desde carpeta `publish\`:**
- Copiar TODO el contenido de la carpeta `publish\`
- No olvidar la carpeta `wwwroot\` completa

### **3. Configurar firewall (como Administrador):**
```cmd
C:\SWGROI\SWGROI_Despliegue_Web\publish\configurar_firewall_VPS.bat
```

### **4. Verificar instalación:**
```cmd
C:\SWGROI\SWGROI_Despliegue_Web\publish\verificar_VPS_CONTABO.bat
```

### **5. Iniciar servidor:**
```cmd
C:\SWGROI\SWGROI_Despliegue_Web\publish\iniciar_DIAGNOSTICO_VPS.bat
```

## 🌐 **URL DE ACCESO:**
`http://75.119.128.78:8891/login.html`

## ⚠️ **REQUISITOS VPS:**
- Windows Server/Windows 10+
- .NET Framework 4.8
- Puerto 8891 disponible
- Permisos de administrador para firewall

## 🔧 **SOLUCIÓN ERR_CONNECTION_REFUSED:**
1. Verificar que el servidor esté ejecutándose
2. Configurar firewall de Windows
3. Verificar puerto 8891 disponible
4. Comprobar IP pública: 75.119.128.78
5. Revisar configuración de red del VPS (Contabo)

## 📊 **ARCHIVOS NO NECESARIOS:**
- `SWGROI_Server.deps.json` ❌ (Solo .NET Core)
- `SWGROI_Server.runtimeconfig.json` ❌ (Solo .NET Core)
- Carpetas de idiomas (`es\`, `fr\`, etc.) ⚠️ (Opcionales)