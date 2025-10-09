# 🚀 GUÍA COMPLETA DE PUBLICACIÓN PARA VPS

## 📋 MÉTODOS DE PUBLICACIÓN DISPONIBLES

El proyecto SWGROI_Server tiene **TRES métodos** para generar una versión completa lista para VPS:

### 🎯 **MÉTODO 1: Recopilación Completa (RECOMENDADO PARA VPS)**
**Script**: `Publish-Complete-VPS.ps1` + `Verify-VPS-Ready.ps1`

#### Comando:
```powershell
# Publicación completa
powershell -ExecutionPolicy Bypass -File Publish-Complete-VPS.ps1

# Verificación rápida
powershell -ExecutionPolicy Bypass -File Verify-VPS-Ready.ps1
```

#### Resultado:
- **Carpeta generada**: `publish\`
- **Archivos incluidos**: 303 archivos totales (242 wwwroot + 44 dependencias + ejecutable)
- **Tamaño**: 26.23 MB
- **Verificación**: Simulación completa de RequestRouter.cs

#### Ventajas únicas:
- ✅ **Recopilación inteligente**: Detecta y usa MSBuild o dotnet automáticamente
- ✅ **Verificación avanzada**: Simula exactamente cómo RequestRouter buscará archivos
- ✅ **Diagnósticos detallados**: Reporta cada archivo copiado
- ✅ **Confiabilidad total**: Garantiza que TODOS los archivos estén presentes

---

### 🎯 **MÉTODO 2: Visual Studio (Recomendado para desarrollo)**
**Perfil disponible**: `FolderProfile.pubxml`

#### Pasos en Visual Studio:
1. Abrir `SWGROI_Server.sln` en Visual Studio
2. **Clic derecho** en el proyecto `SWGROI_Server`
3. Seleccionar **"Publicar..."**
4. Usar el perfil `FolderProfile` (se carga automáticamente)
5. Hacer clic en **"Publicar"**

#### Resultado:
- **Carpeta generada**: `bin\Release\net48\publish\`
- **Archivos incluidos**: 121 archivos de wwwroot + ejecutable + dependencias
- **Estructura correcta**: `wwwroot` junto a `SWGROI_Server.exe`

---

### 🎯 **MÉTODO 3: PowerShell Script Básico**
**Script disponible**: `Publish-ToVPS.ps1`

#### Comando:
```powershell
powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1
```

#### Ventajas del script:
- ✅ **Validación automática**: Verifica configuración antes de publicar
- ✅ **Simulación RequestRouter**: Prueba que encontrará archivos
- ✅ **Verificación crítica**: Confirma estructura correcta para VPS
- ✅ **Instrucciones específicas**: Guía detallada post-publicación

---

## 🔄 COMPARACIÓN DE MÉTODOS

| Aspecto | Visual Studio | PowerShell Script |
|---------|---------------|-------------------|
| **Facilidad** | Muy fácil (GUI) | Fácil (comando) |
| **Validación** | Básica | Completa |
| **Verificación VPS** | No | Sí |
| **Simulación RequestRouter** | No | Sí |
| **Instrucciones** | No | Sí |
| **Carpeta destino** | `bin\Release\net48\publish\` | `publish\` |

## 🚨 **ESTRUCTURA GARANTIZADA (AMBOS MÉTODOS)**

**Resultado en ambos casos**:
```
/carpeta_publicacion/
├── SWGROI_Server.exe         ← Ejecutable principal
├── SWGROI_Server.dll         ← Librería principal  
├── [dependencias .dll]       ← MySql, Azure, etc.
├── app.config                ← Configuración
└── wwwroot/                  ← 🎯 CRÍTICO: junto al .exe
    ├── index.html            ← 121 archivos totales
    ├── login.html
    ├── documentos.html
    ├── Styles/
    ├── Scripts/
    └── Imagenes/
```

## 📦 **INSTRUCCIONES PARA VPS (AMBOS MÉTODOS)**

### 1. Detener servicio en VPS
```bash
# En el VPS
sudo systemctl stop swgroi-server
# O detener el proceso manualmente
```

### 2. Hacer backup
```bash
# En el VPS
cp -r /ruta/actual/servidor /ruta/backup/servidor_$(date +%Y%m%d)
```

### 3. Copiar archivos
**Desde Visual Studio**: Copiar TODO el contenido de `bin\Release\net48\publish\`
**Desde PowerShell**: Copiar TODO el contenido de `publish\`

### 4. Verificar estructura en VPS
```bash
# Verificar que están juntos
ls -la /ruta/servidor/
# Debe mostrar: SWGROI_Server.exe y wwwroot/
```

### 5. Reiniciar servicio
```bash
# En el VPS
sudo systemctl start swgroi-server
# O iniciar el proceso manualmente
```

## 🔍 **VERIFICACIÓN POST-DESPLIEGUE**

### Prueba básica:
```bash
# Probar que el servidor responde
curl http://localhost:8080/index.html
```

### Verificación RequestRouter:
- ✅ `wwwroot` está junto al ejecutable
- ✅ Archivos encontrados inmediatamente (sin búsquedas lentas)
- ✅ Servidor web funcional

## 💡 **RECOMENDACIONES**

### Para desarrollo y pruebas:
- **Usar Visual Studio**: Más rápido para publicaciones frecuentes

### Para producción y auditoría:
- **Usar PowerShell Script**: Validación completa y documentación

### Para CI/CD:
- **Usar dotnet CLI**:
  ```bash
  dotnet publish SWGROI_Server.csproj -p:PublishProfile=FolderProfile -c Release
  ```

---

## ✅ **CONCLUSIÓN**

**AMBOS MÉTODOS** generan una carpeta completa con:
- ✅ Ejecutable + dependencias
- ✅ Todos los 121 archivos de wwwroot
- ✅ Estructura correcta para RequestRouter.cs
- ✅ Lista para copiar directamente al VPS

**NO** copies archivos del proyecto directamente, **siempre** usa uno de estos métodos de publicación.