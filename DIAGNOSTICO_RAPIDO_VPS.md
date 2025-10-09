# 🚨 DIAGNÓSTICO RÁPIDO: ¿Por qué no carga el sitio en VPS?

## 🔍 VERIFICACIONES EN ORDEN DE IMPORTANCIA

### 1. ¿Están todos los archivos? (MÁS COMÚN)
```powershell
# EN VPS:
Get-ChildItem "C:\SWGROI\SWGROI_Despliegue_Web\publish" -Recurse | Measure-Object
# Debe mostrar: Count = 303 (aproximadamente)
```

### 2. ¿El ejecutable puede iniciar?
```powershell
# EN VPS:
cd "C:\SWGROI\SWGROI_Despliegue_Web\publish"
.\SWGROI_Server.exe
# Si da error inmediato = problema de dependencias
```

### 3. ¿Está bloqueado por antivirus?
```powershell
# EN VPS:
# Verificar si Windows Defender eliminó el .exe
Get-MpThreatDetection | Where-Object {$_.Resources -like "*SWGROI*"}
```

### 4. ¿La base de datos está configurada?
```powershell
# EN VPS:
# Verificar app.config
Get-Content "C:\SWGROI\SWGROI_Despliegue_Web\publish\app.config" | Select-String "connectionString"
```

### 5. ¿El puerto está libre?
```powershell
# EN VPS:
netstat -an | findstr ":8080"  # O el puerto que uses
# Si está ocupado = cambiar puerto o liberar
```

### 6. ¿Permisos correctos?
```powershell
# EN VPS:
icacls "C:\SWGROI\SWGROI_Despliegue_Web\publish\SWGROI_Server.exe"
# Debe tener permisos de ejecución
```

## 🎯 SOLUCIÓN RÁPIDA MÁS COMÚN:

**Problema**: Antivirus bloqueó el .exe
**Solución**:
```powershell
# EN VPS:
# 1. Agregar excepción en Windows Defender
Add-MpPreference -ExclusionPath "C:\SWGROI\SWGROI_Despliegue_Web\publish"

# 2. Restaurar archivo desde cuarentena o volver a copiar
```

## 🔧 SI NADA FUNCIONA:

### Método de instalación desde cero:
```powershell
# EN VPS:
# 1. Crear carpeta limpia
New-Item -ItemType Directory -Path "C:\SWGROI\NUEVO" -Force

# 2. Descomprimir ZIP en carpeta limpia
Expand-Archive -Path "SWGROI_VPS_Deploy.zip" -DestinationPath "C:\SWGROI\NUEVO" -Force

# 3. Probar desde la nueva ubicación
cd "C:\SWGROI\NUEVO"
.\SWGROI_Server.exe
```