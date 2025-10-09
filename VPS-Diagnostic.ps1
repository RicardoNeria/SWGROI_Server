# 🚨 DIAGNÓSTICO REMOTO VPS - Verificar archivos faltantes
# Ejecutar este script EN EL VPS para diagnosticar problemas

param(
    [string]$RutaVPS = "C:\SWGROI\SWGROI_Despliegue_Web\publish"
)

Write-Host "🔍 DIAGNÓSTICO VPS - SWGROI Server" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Ruta a verificar: $RutaVPS" -ForegroundColor White
Write-Host ""

# 1. Verificar que la ruta existe
if (-not (Test-Path $RutaVPS)) {
    Write-Host "❌ ERROR CRÍTICO: La ruta $RutaVPS no existe" -ForegroundColor Red
    Write-Host "Solución: Crear la carpeta o verificar la ruta" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Ruta VPS existe" -ForegroundColor Green

# 2. Verificar archivos CRÍTICOS
Write-Host "`n🔥 VERIFICANDO ARCHIVOS CRÍTICOS:" -ForegroundColor Red

$archivosCriticos = @(
    @{Nombre="SWGROI_Server.exe"; Descripcion="Servidor web principal"; Critico=$true},
    @{Nombre="MySql.Data.dll"; Descripcion="Driver base de datos"; Critico=$true},
    @{Nombre="app.config"; Descripcion="Configuración aplicación"; Critico=$true},
    @{Nombre="SWGROI_Server.exe.config"; Descripcion="Config específica"; Critico=$true},
    @{Nombre="wwwroot\index.html"; Descripcion="Página principal"; Critico=$true},
    @{Nombre="wwwroot\login.html"; Descripcion="Página de login"; Critico=$true},
    @{Nombre="System.Text.Json.dll"; Descripcion="Procesamiento JSON"; Critico=$true},
    @{Nombre="Newtonsoft.Json.dll"; Descripcion="JSON alternativo"; Critico=$false}
)

$archivosOK = 0
$archivosFaltantes = @()

foreach ($archivo in $archivosCriticos) {
    $rutaCompleta = Join-Path $RutaVPS $archivo.Nombre
    $existe = Test-Path $rutaCompleta
    
    if ($existe) {
        $tamaño = (Get-Item $rutaCompleta).Length
        $tamañoKB = [math]::Round($tamaño / 1024, 1)
        Write-Host "   ✅ $($archivo.Nombre) ($tamañoKB KB)" -ForegroundColor Green
        $archivosOK++
    } else {
        $estado = if ($archivo.Critico) { "❌ CRÍTICO" } else { "⚠️  OPCIONAL" }
        $color = if ($archivo.Critico) { "Red" } else { "Yellow" }
        Write-Host "   $estado $($archivo.Nombre) - $($archivo.Descripcion)" -ForegroundColor $color
        $archivosFaltantes += $archivo
    }
}

# 3. Verificar carpeta wwwroot completa
Write-Host "`n📁 VERIFICANDO CARPETA WWWROOT:" -ForegroundColor Yellow

$rutaWwwroot = Join-Path $RutaVPS "wwwroot"
if (Test-Path $rutaWwwroot) {
    $archivosWwwroot = (Get-ChildItem $rutaWwwroot -Recurse -File).Count
    Write-Host "   ✅ Carpeta wwwroot existe con $archivosWwwroot archivos" -ForegroundColor Green
    
    # Verificar archivos web críticos
    $archivosWebCriticos = @("index.html", "login.html", "documentos.html", "Styles\main.css", "Scripts\main.js")
    foreach ($archivoWeb in $archivosWebCriticos) {
        $rutaArchivoWeb = Join-Path $rutaWwwroot $archivoWeb
        if (Test-Path $rutaArchivoWeb) {
            Write-Host "   ✅ $archivoWeb" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  $archivoWeb (puede afectar funcionalidad)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ CRÍTICO: Carpeta wwwroot NO existe" -ForegroundColor Red
    $archivosFaltantes += @{Nombre="wwwroot\"; Descripcion="Carpeta completa de archivos web"; Critico=$true}
}

# 4. Verificar DLLs importantes
Write-Host "`n🔧 VERIFICANDO DEPENDENCIAS (.dll):" -ForegroundColor Yellow

$dllsImportantes = @(
    "MySql.Data.dll",
    "System.Text.Json.dll", 
    "Microsoft.Data.SqlClient.dll",
    "System.Memory.dll",
    "System.Buffers.dll"
)

$dllsOK = 0
foreach ($dll in $dllsImportantes) {
    $rutaDLL = Join-Path $RutaVPS $dll
    if (Test-Path $rutaDLL) {
        Write-Host "   ✅ $dll" -ForegroundColor Green
        $dllsOK++
    } else {
        Write-Host "   ❌ $dll" -ForegroundColor Red
    }
}

# 5. Probar si el ejecutable puede iniciar
Write-Host "`n🚀 PROBANDO EJECUTABLE:" -ForegroundColor Yellow

$rutaEjecutable = Join-Path $RutaVPS "SWGROI_Server.exe"
if (Test-Path $rutaEjecutable) {
    try {
        $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($rutaEjecutable)
        Write-Host "   ✅ Ejecutable válido - Versión: $($versionInfo.FileVersion)" -ForegroundColor Green
        
        # Verificar dependencias del ejecutable
        Write-Host "   🔍 Verificando dependencias..." -ForegroundColor Gray
        
        # Intentar ejecutar con --help o --version (si existe)
        try {
            $proceso = Start-Process -FilePath $rutaEjecutable -ArgumentList "--help" -Wait -NoNewWindow -PassThru -RedirectStandardOutput "temp_output.txt" -RedirectStandardError "temp_error.txt" -ErrorAction SilentlyContinue
            
            if ($proceso.ExitCode -eq 0) {
                Write-Host "   ✅ Ejecutable responde correctamente" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Ejecutable tiene problemas de dependencias" -ForegroundColor Yellow
            }
            
            # Limpiar archivos temporales
            if (Test-Path "temp_output.txt") { Remove-Item "temp_output.txt" -Force }
            if (Test-Path "temp_error.txt") { Remove-Item "temp_error.txt" -Force }
            
        } catch {
            Write-Host "   ⚠️  No se pudo probar el ejecutable: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "   ❌ Ejecutable corrupto o inválido" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ CRÍTICO: SWGROI_Server.exe NO existe" -ForegroundColor Red
}

# 6. Verificar permisos
Write-Host "`n🔐 VERIFICANDO PERMISOS:" -ForegroundColor Yellow

try {
    $permisos = Get-Acl $RutaVPS
    Write-Host "   ✅ Se pueden leer permisos de la carpeta" -ForegroundColor Green
    
    if (Test-Path $rutaEjecutable) {
        $permisosEje = Get-Acl $rutaEjecutable
        Write-Host "   ✅ Se pueden leer permisos del ejecutable" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Problemas de permisos: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. Resumen y recomendaciones
Write-Host "`n📊 RESUMEN DEL DIAGNÓSTICO:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

$totalCriticos = ($archivosCriticos | Where-Object { $_.Critico }).Count
$criticosOK = $archivosOK

if ($archivosFaltantes.Count -eq 0) {
    Write-Host "🎉 TODOS LOS ARCHIVOS CRÍTICOS ESTÁN PRESENTES" -ForegroundColor Green -BackgroundColor Black
    Write-Host "   El problema puede ser de configuración o permisos" -ForegroundColor Green
} else {
    $criticosFaltantes = ($archivosFaltantes | Where-Object { $_.Critico }).Count
    
    Write-Host "❌ ARCHIVOS FALTANTES: $($archivosFaltantes.Count)" -ForegroundColor Red
    Write-Host "   Críticos faltantes: $criticosFaltantes" -ForegroundColor Red
    Write-Host "   Opcionales faltantes: $($archivosFaltantes.Count - $criticosFaltantes)" -ForegroundColor Yellow
    
    Write-Host "`n🔧 SOLUCIÓN RECOMENDADA:" -ForegroundColor Yellow
    Write-Host "1. En tu máquina local, ejecuta:" -ForegroundColor White
    Write-Host "   powershell -ExecutionPolicy Bypass -File Publish-Complete-VPS.ps1" -ForegroundColor Gray
    Write-Host "2. Copia TODA la carpeta 'publish' nuevamente al VPS" -ForegroundColor White
    Write-Host "3. Asegúrate de que la estructura sea:" -ForegroundColor White
    Write-Host "   $RutaVPS\" -ForegroundColor Gray
    Write-Host "   ├── SWGROI_Server.exe" -ForegroundColor Gray
    Write-Host "   ├── wwwroot\" -ForegroundColor Gray
    Write-Host "   └── *.dll (44 archivos)" -ForegroundColor Gray
}

# 8. Información adicional útil
Write-Host "`n💡 INFORMACIÓN ADICIONAL:" -ForegroundColor Cyan

$totalArchivos = (Get-ChildItem $RutaVPS -Recurse -File -ErrorAction SilentlyContinue).Count
$tamañoTotal = (Get-ChildItem $RutaVPS -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
$tamañoTotalMB = [math]::Round($tamañoTotal / 1MB, 2)

Write-Host "   Total archivos en VPS: $totalArchivos" -ForegroundColor White
Write-Host "   Tamaño total: $tamañoTotalMB MB" -ForegroundColor White
Write-Host "   Debería tener: ~303 archivos y ~26 MB" -ForegroundColor White

if ($totalArchivos -lt 200) {
    Write-Host "`n⚠️  ADVERTENCIA: Muy pocos archivos detectados" -ForegroundColor Red
    Write-Host "   Parece que la copia no se completó correctamente" -ForegroundColor Red
}

Write-Host "`n✅ Diagnóstico completado" -ForegroundColor Green
Write-Host "   Guarda este reporte para análisis" -ForegroundColor Gray