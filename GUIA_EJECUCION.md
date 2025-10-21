# SWGROI Server - Guía de Ejecución Local y VPS

## 🚀 **SCRIPTS DISPONIBLES**

### **1. START_SWGROI_AUTO.bat** ⭐ (RECOMENDADO)
**Detección automática de entorno**
- 🧠 **Inteligente**: Detecta automáticamente si es desarrollo o producción
- 🔍 **Métodos de detección**:
  - Estructura de directorios (`bin\Debug`, `Visual Studio`, etc.)
  - Nombre de máquina (`RicardoNeria`)
  - Usuario actual (`andro`)
  - Ruta de instalación (VPS vs desarrollo)
- 🎯 **Resultado**:
  - **Local**: `http://localhost:8891/login.html`
  - **VPS**: `http://75.119.128.78:8891/login.html`

### **2. START_SWGROI_LOCAL.bat** 🧪
**Forzar modo desarrollo local**
- 💻 **Solo localhost**: Siempre usa `localhost:8891`
- 📁 **Busca automáticamente** en: `publish\`, `bin\Debug\`, `bin\Release\`
- 🔧 **Ideal para**: Desarrollo, testing, depuración

### **3. START_SWGROI_VPS.bat** 🌍
**Forzar modo producción VPS**
- 🌐 **Solo VPS**: Siempre usa la IP pública `75.119.128.78:8891`
- 📍 **Ruta fija**: `C:\SWGROI\SWGROI_Despliegue_Web\publish\`
- 🚀 **Ideal para**: Servidor de producción Contabo

## 📋 **CONFIGURACIÓN AUTOMÁTICA EN CÓDIGO**

El sistema detecta automáticamente el entorno usando múltiples métodos:

```csharp
private static bool EsEntornoDesarrollo()
{
    // 1. Por estructura de directorios
    if (baseDir.Contains("\\bin\\Debug\\") || 
        baseDir.Contains("Visual Studio"))
        return true;
    
    // 2. Por nombre de máquina
    if (nombreMaquina == "RicardoNeria")
        return true;
        
    // 3. Por usuario
    if (usuario == "andro")
        return true;
        
    // 4. Por defecto: producción
    return false;
}
```

## 🎯 **CÓMO USAR**

### **Para Desarrollo Local:**
```cmd
# Opción 1: Detección automática (recomendado)
START_SWGROI_AUTO.bat

# Opción 2: Forzar local
START_SWGROI_LOCAL.bat
```

### **Para VPS Contabo:**
```cmd
# Opción 1: Detección automática 
START_SWGROI_AUTO.bat

# Opción 2: Forzar VPS
START_SWGROI_VPS.bat
```

## ✅ **VENTAJAS DEL SISTEMA**

- ✨ **Sin configuración manual** - Todo automático
- 🔄 **Un solo ejecutable** - Funciona en ambos entornos
- 🛡️ **Seguro** - Desarrollo solo en localhost, producción solo en IP pública
- 🧹 **Limpio** - Solo 3 scripts necesarios (antes teníamos 8+)
- 🎯 **Inteligente** - Detecta el entorno por múltiples métodos

## 🌐 **URLs RESULTANTES**

| Entorno | URL | Acceso |
|---------|-----|--------|
| **Desarrollo** | `http://localhost:8891/login.html` | Solo local |
| **Producción** | `http://75.119.128.78:8891/login.html` | Internet |

## 🔧 **ESTRUCTURA DETECTADA AUTOMÁTICAMENTE**

### **Desarrollo (localhost):**
- `Visual Studio 2022\RESPALDOS_WEB\...\bin\Debug\`
- `Visual Studio 2022\RESPALDOS_WEB\...\bin\Release\`
- `Visual Studio 2022\RESPALDOS_WEB\...\publish\`
- Máquina: `RicardoNeria`
- Usuario: `andro`

### **Producción (VPS):**
- `C:\SWGROI\SWGROI_Despliegue_Web\publish\`
- Máquina: `VM1270950` (Contabo)
- Usuario: `Administrator`

## 🚀 **RESULTADO FINAL**

✅ **Un solo sistema** que funciona automáticamente en:
- 💻 **Tu PC de desarrollo** (localhost)
- 🌍 **Tu VPS Contabo** (IP pública)
- 🔧 **Sin configuración manual** necesaria