# Despliegue en VPS Windows

## Configuración del servidor
- Instalar .NET Framework 4.8 o superior
- Configurar firewall para puerto 8888 (o el que uses)
- Crear servicio Windows para SWGROI_Server.exe

## Estructura de archivos en VPS
```
/ruta/servidor/
├── SWGROI_Server.exe ✅
├── SWGROI_Server.dll ✅
├── [archivos .dll y .config] ✅
└── wwwroot/ ✅
    ├── index.html
    ├── Styles/
    ├── Scripts/
    └── Imagenes/
```

## Seguridad básica
- Usar HTTPS con certificado válido
- Configurar encabezados de seguridad
- Mantener sistema actualizado

## Automatización
- Usar script `Publish-ToVPS.ps1` para despliegues
- Programar backups automáticos
- Monitorear logs del servicio

