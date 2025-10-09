# 📋 CHECKLIST DE DESPLIEGUE AL VPS - SWGROI

## 🔧 **CONFIGURACIÓN SIMPLIFICADA APLICADA**

### Configuración .csproj actualizada:
```xml
<!-- Configuración simplificada con patrón wildcard -->
<Content Include="wwwroot\**\*.*">
  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
</Content>
```

### 🚨 **PUNTO CRÍTICO: RequestRouter.cs y ubicación de wwwroot**

**Problema identificado**: `RequestRouter.cs` busca archivos estáticos con esta lógica:
1. **Primero**: `[DirectorioEjecutable]\wwwroot\archivo.html`
2. **Fallback**: Busca 5 niveles hacia arriba en el árbol de directorios

**Riesgo en VPS**: Si `wwwroot` no está junto al `.exe`, el servidor:
- Hará búsquedas lentas hacia arriba
- Puede no encontrar archivos
- Fallará silenciosamente

**✅ Solución garantizada**: Nuestra configuración coloca `wwwroot` junto al ejecutable.

### Script de validación disponible:
```powershell
# Verificar configuración antes del despliegue
powershell -ExecutionPolicy Bypass -File Validate-CsprojConfig.ps1
```

**✅ VENTAJAS**: Archivos nuevos se incluyen automáticamente, no hay bloqueos ni duplicados, estructura óptima para VPS.

## ✅ **PUNTO 1: Archivos en .csproj**

### ✅ **SOLUCIONADO** - Todos los archivos de `wwwroot/` están incluidos

El archivo `SWGROI_Server.csproj` ahora incluye:
- ✅ Todos los archivos individuales críticos 
- ✅ `wwwroot\assets\**\*.*` (archivos i18n)
- ✅ `wwwroot\Styles\componentes\*.css` (todos los CSS)
- ✅ `wwwroot\Styles\componentes\*.html` (templates) 
- ✅ `wwwroot\.nojekyll` (archivo especial)

**Verificación**: Ejecuta `powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1 -VerifyOnly`

---

## ✅ **PUNTO 2: Estructura de despliegue**

### ✅ **SOLUCIONADO** - Perfil de publicación creado

- **Perfil**: `Properties\PublishProfiles\VPS_Production.pubxml`
- **Garantiza**: `wwwroot\` queda junto a `SWGROI_Server.exe`
- **Configuración**: Copia TODOS los archivos, incluso los nuevos

---

## ✅ **PUNTO 3: Proceso de publicación**

### ✅ **AUTOMATIZADO** - Dos métodos disponibles

#### **MÉTODO 1: Visual Studio (Recomendado para desarrollo)**
**Perfil disponible**: `Properties\PublishProfiles\FolderProfile.pubxml`

**Pasos**:
1. Abrir `SWGROI_Server.sln` en Visual Studio
2. **Clic derecho** en proyecto `SWGROI_Server` → **"Publicar..."**
3. Usar perfil `FolderProfile` → **"Publicar"**
4. **Resultado**: Carpeta `bin\Release\net48\publish\` lista para VPS

#### **MÉTODO 2: PowerShell Script (Recomendado para producción)**
**Comando para publicar**:
```powershell
powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1
```

**El script hace**:
1. ✅ Verifica que todos los archivos estén en .csproj
2. ✅ Limpia publicación anterior
3. ✅ Compila con `dotnet publish`
4. ✅ **Simula RequestRouter.cs**: Verifica que encontrará archivos
5. ✅ Verifica estructura resultante
6. ✅ Muestra instrucciones específicas para VPS

**Ventaja del script**: Validación completa + verificación crítica de RequestRouter

---

## 🚀 **PROCESO COMPLETO DE DESPLIEGUE**

### En tu máquina local:

1. **Verificar antes de publicar**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1 -VerifyOnly
   ```

2. **Publicar nueva versión**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1
   ```

3. **Resultado**: Carpeta `publish\` con TODO lo necesario

### En el VPS:

1. **Detener servicio**: `net stop "SWGROI Service"` (o como esté configurado)
2. **Backup**: Copia la carpeta actual del servidor 
3. **Reemplazar**: Copia TODO el contenido de `publish\` al VPS
4. **Verificar estructura**:
   ```
   /ruta/servidor/
   ├── SWGROI_Server.exe ✅
   ├── SWGROI_Server.dll ✅
   ├── [otros .dll y .config] ✅
   └── wwwroot/ ✅
       ├── index.html ✅
       ├── Styles/ ✅
       ├── Scripts/ ✅
       └── Imagenes/ ✅
   ```
5. **Iniciar servicio**: `net start "SWGROI Service"`

---

## 🔧 **Comandos útiles**

```powershell
# Solo verificar (no publicar)
.\Publish-ToVPS.ps1 -VerifyOnly

# Publicar a carpeta específica  
.\Publish-ToVPS.ps1 -PublishPath "mi_publicacion"

# Publicar con Visual Studio (alternativa)
# Clic derecho en proyecto → Publicar → Usar perfil "VPS_Production"
```

---

## ⚠️ **IMPORTANTE**

- **NUNCA** copies archivos del proyecto directamente al VPS
- **SIEMPRE** usa la carpeta `publish\` generada
- **VERIFICA** que `wwwroot\` esté junto al `.exe` en el VPS
- **PRUEBA** la aplicación antes de cerrar la sesión del VPS

---

*✅ Todos los puntos verificados y automatizados*  
*📅 Última actualización: $(Get-Date -Format "yyyy-MM-dd HH:mm")*