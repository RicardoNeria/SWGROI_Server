# 🚨 PUNTO CRÍTICO: RequestRouter.cs y Estructura de wwwroot en VPS

## 📋 Problema Identificado

El archivo `RequestRouter.cs` contiene una lógica de búsqueda flexible para localizar la carpeta `wwwroot`, diseñada para facilitar el desarrollo local, pero que puede causar problemas en producción.

### 🔍 Análisis del Código

```csharp
// Línea 190: RequestRouter.cs
string baseDir = AppDomain.CurrentDomain.BaseDirectory;
string rutaArchivo = Path.Combine(baseDir, "wwwroot", rutaOriginal.Replace("/", Path.DirectorySeparatorChar.ToString()));

// Si el ejecutable se ejecuta desde bin/Debug/netX, es común que la carpeta wwwroot esté en el padre del proyecto.
// Buscamos hacia arriba hasta 5 niveles para localizar una carpeta wwwroot en el árbol de directorios
if (!File.Exists(rutaArchivo))
{
    try
    {
        var dir = new DirectoryInfo(baseDir);
        for (int i = 0; i < 6 && dir != null; i++)
        {
            var candidate = Path.Combine(dir.FullName, "wwwroot", rutaOriginal.Replace("/", Path.DirectorySeparatorChar.ToString()));
            if (File.Exists(candidate))
            {
                rutaArchivo = candidate;
                break;
            }
            dir = dir.Parent;
        }
    }
    catch { }
}
```

### 🎯 Secuencia de Búsqueda

1. **Primera búsqueda**: `[DirectorioEjecutable]\wwwroot\archivo.html`
2. **Fallback**: Busca hacia arriba hasta 5 niveles para encontrar `wwwroot`

## ⚠️ Riesgos en Producción (VPS)

### ❌ Estructura Problemática:
```
/servidor/
├── aplicacion/
│   └── SWGROI_Server.exe     ← Ejecutable aquí
└── recursos/
    └── wwwroot/              ← wwwroot separado
        ├── index.html
        └── ...
```

**Resultado**: 
- ❌ RequestRouter NO encuentra archivos en la primera búsqueda
- ❌ Inicia búsqueda lenta hacia arriba
- ❌ Puede no encontrar wwwroot si está en ubicación inesperada
- ❌ Servidor web falla silenciosamente

### ✅ Estructura Correcta:
```
/servidor/
├── SWGROI_Server.exe         ← Ejecutable
├── SWGROI_Server.dll
├── [otros .dll/.config]
└── wwwroot/                  ← wwwroot JUNTO al .exe
    ├── index.html            ← Encontrado en 1er intento
    ├── login.html
    ├── Styles/
    ├── Scripts/
    └── Imagenes/
```

**Resultado**:
- ✅ RequestRouter encuentra archivos inmediatamente
- ✅ Sin búsquedas lentas
- ✅ Rendimiento óptimo
- ✅ Servidor web funciona confiablemente

## 🛠️ Solución Implementada

### 1. Configuración .csproj Corregida:
```xml
<Content Include="wwwroot\**\*.*">
  <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
</Content>
```

### 2. Script de Publicación Mejorado:
`Publish-ToVPS.ps1` ahora incluye:
- ✅ Verificación de estructura crítica
- ✅ Simulación de RequestRouter.cs
- ✅ Validación que wwwroot esté junto al .exe
- ✅ Pruebas de archivos críticos

### 3. Script de Validación:
`Validate-CsprojConfig.ps1` verifica:
- ✅ Configuración .csproj correcta
- ✅ Compatibilidad con RequestRouter
- ✅ Estructura óptima para VPS

## 🔍 Verificación Manual

Para verificar que la estructura es correcta en el VPS:

```bash
# En el directorio del servidor, verificar:
ls -la
# Debe mostrar:
# SWGROI_Server.exe
# wwwroot/

# Verificar archivos críticos:
ls -la wwwroot/
# Debe mostrar:
# index.html
# login.html
# documentos.html
# Styles/
# Scripts/
# Imagenes/
```

## 🚀 Proceso de Despliegue Seguro

1. **Validar antes de publicar**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File Validate-CsprojConfig.ps1
   ```

2. **Publicar con verificación**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File Publish-ToVPS.ps1
   ```

3. **Verificar en VPS**: Asegurar que `wwwroot` esté junto a `SWGROI_Server.exe`

## 📊 Beneficios de la Estructura Correcta

| Aspecto | Estructura Incorrecta | Estructura Correcta |
|---------|----------------------|-------------------|
| **Búsqueda** | Hasta 6 intentos | 1 intento |
| **Rendimiento** | Lento | Óptimo |
| **Confiabilidad** | Puede fallar | Garantizado |
| **Mantenimiento** | Complejo | Simple |
| **Debugging** | Difícil | Fácil |

---

**🎯 CONCLUSIÓN**: La ubicación correcta de `wwwroot` junto al ejecutable es CRÍTICA para el funcionamiento del servidor web en el VPS. Nuestra configuración .csproj garantiza esta estructura automáticamente.