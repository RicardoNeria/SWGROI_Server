# 🚨 CHECKLIST DE PROBLEMAS COMUNES EN VPS

## ❌ PROBLEMA 1: Copia incompleta
**Síntomas**: Pocos archivos, faltan DLLs
**Causa**: Windows Defender, antivirus, o permisos
**Solución**: 
```powershell
# En VPS, verificar si llegaron todos los archivos
Get-ChildItem C:\SWGROI\SWGROI_Despliegue_Web\publish -Recurse | Measure-Object
# Debería mostrar ~303 archivos
```

## ❌ PROBLEMA 2: Estructura incorrecta
**Síntomas**: wwwroot en subcarpeta
**Causa**: Copia anidada
**Verificar**:
```
C:\SWGROI\SWGROI_Despliegue_Web\publish\
├── SWGROI_Server.exe     ← DEBE estar aquí
└── wwwroot\              ← DEBE estar aquí, NO en subcarpeta
```

## ❌ PROBLEMA 3: Archivos bloqueados por antivirus
**Síntomas**: .exe se elimina automáticamente
**Solución**: Agregar excepción en Windows Defender

## ❌ PROBLEMA 4: Permisos incorrectos
**Síntomas**: Access denied al ejecutar
**Solución**:
```powershell
# Dar permisos completos
icacls "C:\SWGROI\SWGROI_Despliegue_Web\publish" /grant Everyone:F /T
```

## ❌ PROBLEMA 5: Puerto ocupado o bloqueado
**Síntomas**: Ejecutable inicia pero no responde web
**Verificar**:
```powershell
netstat -an | findstr ":8080"  # O el puerto que uses
```

## ❌ PROBLEMA 6: Configuración de base de datos
**Síntomas**: Error de conexión MySQL
**Verificar**: app.config tiene la cadena de conexión correcta

## ❌ PROBLEMA 7: .NET Framework faltante
**Síntomas**: "No se puede ejecutar la aplicación"
**Solución**: Instalar .NET Framework 4.8 en VPS