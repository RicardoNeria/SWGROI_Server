# 🚀 PUBLICACIÓN COMPLETA PARA VPS - MÉTODO DEFINITIVO
# Este script recopila TODOS los archivos necesarios en la carpeta publish

param(
    [string]$PublishPath = "publish",
    [switch]$VerifyOnly = $false,
    [switch]$Verbose = $false
)

Write-Host "🚀 PUBLICACIÓN COMPLETA PARA VPS" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Método: Recopilación completa de archivos" -ForegroundColor White
Write-Host "Destino: $PublishPath\" -ForegroundColor White
Write-Host ""

if ($VerifyOnly) {
    Write-Host "🔍 MODO VERIFICACIÓN - No se publicará" -ForegroundColor Yellow
    Write-Host ""
}

# 1. Verificar dependencias y herramientas
Write-Host "📋 1. Verificando herramientas necesarias..." -ForegroundColor Yellow

# Verificar dotnet
try {
    $dotnetVersion = dotnet --version
    Write-Host "   ✅ .NET SDK: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ .NET SDK no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar MSBuild
$msbuildPath = ""
$msbuildPaths = @(
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\Professional\MSBuild\Current\Bin\MSBuild.exe",
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe",
    "${env:ProgramFiles}\Microsoft Visual Studio\2022\Enterprise\MSBuild\Current\Bin\MSBuild.exe",
    "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2019\Professional\MSBuild\Current\Bin\MSBuild.exe"
)

foreach ($path in $msbuildPaths) {
    if (Test-Path $path) {
        $msbuildPath = $path
        Write-Host "   ✅ MSBuild encontrado: $(Split-Path (Split-Path $path))" -ForegroundColor Green
        break
    }
}

if (-not $msbuildPath) {
    Write-Host "   ⚠️  MSBuild no encontrado, usando dotnet build" -ForegroundColor Yellow
}

# 2. Limpiar directorio de publicación
if (-not $VerifyOnly) {
    Write-Host "`n🧹 2. Preparando directorio de publicación..." -ForegroundColor Yellow
    
    if (Test-Path $PublishPath) {
        Remove-Item $PublishPath -Recurse -Force
        Write-Host "   ✅ Directorio anterior eliminado" -ForegroundColor Green
    }
    
    New-Item -ItemType Directory -Path $PublishPath -Force | Out-Null
    Write-Host "   ✅ Directorio $PublishPath creado" -ForegroundColor Green
}

# 3. Compilar proyecto
Write-Host "`n🔨 3. Compilando proyecto..." -ForegroundColor Yellow

if (-not $VerifyOnly) {
    try {
        if ($msbuildPath) {
            # Usar MSBuild si está disponible
            & $msbuildPath SWGROI_Server.csproj /p:Configuration=Release /p:OutputPath="$PublishPath\" /t:Build /verbosity:minimal
        } else {
            # Usar dotnet build como fallback
            dotnet build SWGROI_Server.csproj -c Release -o $PublishPath
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Compilación exitosa" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Error en compilación" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "   ❌ Error en compilación: $_" -ForegroundColor Red
        exit 1
    }
}

# 4. Copiar archivos wwwroot completos
Write-Host "`n📁 4. Copiando archivos wwwroot..." -ForegroundColor Yellow

if (-not $VerifyOnly) {
    $wwwrootSource = "wwwroot"
    $wwwrootDest = Join-Path $PublishPath "wwwroot"
    
    if (Test-Path $wwwrootSource) {
        # Copiar toda la carpeta wwwroot recursivamente
        Copy-Item $wwwrootSource $wwwrootDest -Recurse -Force
        
        $copiedFiles = (Get-ChildItem $wwwrootDest -Recurse -File).Count
        Write-Host "   ✅ Copiados $copiedFiles archivos de wwwroot" -ForegroundColor Green
        
        if ($Verbose) {
            Write-Host "   📋 Archivos críticos copiados:" -ForegroundColor Gray
            $criticalFiles = @("index.html", "login.html", "documentos.html", "Styles\main.css", "Scripts\main.js")
            foreach ($file in $criticalFiles) {
                $fullPath = Join-Path $wwwrootDest $file
                if (Test-Path $fullPath) {
                    Write-Host "      ✅ $file" -ForegroundColor Green
                } else {
                    Write-Host "      ⚠️  $file (no encontrado)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "   ❌ Carpeta wwwroot no encontrada" -ForegroundColor Red
        exit 1
    }
}

# 5. Copiar archivos de configuración
Write-Host "`n⚙️  5. Copiando archivos de configuración..." -ForegroundColor Yellow

if (-not $VerifyOnly) {
    $configFiles = @(
        "app.config",
        "SWGROI_Server.exe.config"
    )
    
    foreach ($configFile in $configFiles) {
        if (Test-Path $configFile) {
            Copy-Item $configFile $PublishPath -Force
            Write-Host "   ✅ Copiado: $configFile" -ForegroundColor Green
        } elseif (Test-Path "bin\Release\net48\$configFile") {
            Copy-Item "bin\Release\net48\$configFile" $PublishPath -Force
            Write-Host "   ✅ Copiado desde bin: $configFile" -ForegroundColor Green
        }
    }
}

# 6. Copiar dependencias críticas
Write-Host "`n📚 6. Copiando dependencias..." -ForegroundColor Yellow

if (-not $VerifyOnly) {
    $binPath = "bin\Release\net48"
    
    if (Test-Path $binPath) {
        # Copiar todas las DLL
        $dllFiles = Get-ChildItem $binPath -Filter "*.dll" -File
        foreach ($dll in $dllFiles) {
            $destPath = Join-Path $PublishPath $dll.Name
            if (-not (Test-Path $destPath)) {
                Copy-Item $dll.FullName $PublishPath -Force
                if ($Verbose) {
                    Write-Host "   ✅ $($dll.Name)" -ForegroundColor Green
                }
            }
        }
        Write-Host "   ✅ Copiadas $($dllFiles.Count) dependencias (.dll)" -ForegroundColor Green
        
        # Copiar archivos PDB para debugging (opcional)
        $pdbFiles = Get-ChildItem $binPath -Filter "*.pdb" -File
        foreach ($pdb in $pdbFiles) {
            Copy-Item $pdb.FullName $PublishPath -Force
        }
        if ($pdbFiles.Count -gt 0) {
            Write-Host "   ✅ Copiados $($pdbFiles.Count) archivos de debug (.pdb)" -ForegroundColor Green
        }
        
        # Copiar archivos XML de documentación
        $xmlFiles = Get-ChildItem $binPath -Filter "*.xml" -File
        foreach ($xml in $xmlFiles) {
            Copy-Item $xml.FullName $PublishPath -Force
        }
        if ($xmlFiles.Count -gt 0) {
            Write-Host "   ✅ Copiados $($xmlFiles.Count) archivos de documentación (.xml)" -ForegroundColor Green
        }
    }
}

# 7. Verificar archivos críticos para VPS
Write-Host "`n🔍 7. Verificando archivos críticos para VPS..." -ForegroundColor Yellow

$exeExists = Test-Path "$PublishPath\SWGROI_Server.exe"
$wwwrootExists = Test-Path "$PublishPath\wwwroot"
$configExists = Test-Path "$PublishPath\app.config"

Write-Host "   Ejecutable principal:" -ForegroundColor White
Write-Host "      SWGROI_Server.exe: $(if($exeExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($exeExists){'Green'}else{'Red'})

Write-Host "   Archivos web:" -ForegroundColor White
Write-Host "      wwwroot/: $(if($wwwrootExists){'✅ Presente'}else{'❌ FALTA'})" -ForegroundColor $(if($wwwrootExists){'Green'}else{'Red'})

if ($wwwrootExists) {
    $wwwrootFileCount = (Get-ChildItem "$PublishPath\wwwroot" -Recurse -File).Count
    Write-Host "      Archivos totales: $wwwrootFileCount" -ForegroundColor $(if($wwwrootFileCount -gt 100){'Green'}else{'Yellow'})
}

Write-Host "   Configuración:" -ForegroundColor White
Write-Host "      app.config: $(if($configExists){'✅ Presente'}else{'⚠️  Verificar'})" -ForegroundColor $(if($configExists){'Green'}else{'Yellow'})

# 8. Simulación RequestRouter crítica
if ($wwwrootExists) {
    Write-Host "`n🚨 8. VERIFICACIÓN CRÍTICA - RequestRouter Simulation:" -ForegroundColor Red
    Write-Host "   RequestRouter.cs busca archivos en esta secuencia:" -ForegroundColor White
    Write-Host "   1º: [DirectorioEjecutable]\wwwroot\" -ForegroundColor Gray
    Write-Host "   2º: [Busca 5 niveles hacia arriba]" -ForegroundColor Gray
    
    # Simular AppDomain.CurrentDomain.BaseDirectory (donde está el .exe)
    $baseDir = $PublishPath
    $testFiles = @("index.html", "login.html", "documentos.html")
    
    Write-Host "`n   🎯 PRUEBA: ¿RequestRouter encontrará los archivos?" -ForegroundColor White
    $allTestsPassed = $true
    
    foreach ($testFile in $testFiles) {
        # Ruta que RequestRouter intentará primero
        $primaryPath = Join-Path $baseDir "wwwroot\$testFile"
        $pathWorks = Test-Path $primaryPath
        
        Write-Host "      $testFile`: $(if($pathWorks){'✅ ENCONTRADO'}else{'❌ NO ENCONTRADO'})" -ForegroundColor $(if($pathWorks){'Green'}else{'Red'})
        
        if (-not $pathWorks) { $allTestsPassed = $false }
    }
    
    if ($allTestsPassed) {
        Write-Host "`n   ✅ ESTRUCTURA PERFECTA: RequestRouter encontrará todos los archivos" -ForegroundColor Green -BackgroundColor Black
        Write-Host "   📍 wwwroot está en la ubicación ÓPTIMA junto al .exe" -ForegroundColor Green
    } else {
        Write-Host "`n   🚨 ERROR CRÍTICO: RequestRouter fallará en el VPS" -ForegroundColor Red -BackgroundColor Black
        Write-Host "   ❌ Los archivos web NO serán accesibles" -ForegroundColor Red
    }
}

# 9. Listar contenido final
Write-Host "`n📋 9. Contenido final de $PublishPath\" -ForegroundColor Yellow

if (Test-Path $PublishPath) {
    $allFiles = Get-ChildItem $PublishPath -File | Select-Object Name, Length, LastWriteTime
    $allFolders = Get-ChildItem $PublishPath -Directory | Select-Object Name
    
    Write-Host "   📁 Carpetas ($($allFolders.Count)):" -ForegroundColor Cyan
    foreach ($folder in $allFolders) {
        Write-Host "      📁 $($folder.Name)" -ForegroundColor Gray
    }
    
    Write-Host "   📄 Archivos principales ($($allFiles.Count)):" -ForegroundColor Cyan
    foreach ($file in $allFiles | Sort-Object Name) {
        $sizeKB = [math]::Round($file.Length / 1024, 1)
        Write-Host "      📄 $($file.Name) ($sizeKB KB)" -ForegroundColor Gray
    }
    
    # Estadísticas totales
    $totalFiles = (Get-ChildItem $PublishPath -Recurse -File).Count
    $totalSize = (Get-ChildItem $PublishPath -Recurse -File | Measure-Object Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    
    Write-Host "`n   📊 RESUMEN TOTAL:" -ForegroundColor Cyan
    Write-Host "      Archivos totales: $totalFiles" -ForegroundColor Green
    Write-Host "      Tamaño total: $totalSizeMB MB" -ForegroundColor Green
}

# 10. Instrucciones finales para VPS
Write-Host "`n📦 10. INSTRUCCIONES PARA VPS:" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎯 CARPETA LISTA: $PublishPath\" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "1. Detén el servicio SWGROI en el VPS" -ForegroundColor White
Write-Host "2. Haz backup completo de la carpeta actual del VPS" -ForegroundColor White
Write-Host "3. Copia TODO el contenido de '$PublishPath\' al VPS" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. 🎯 ESTRUCTURA FINAL en el VPS:" -ForegroundColor Yellow
Write-Host "   /ruta/del/servidor/" -ForegroundColor Gray
Write-Host "   ├── SWGROI_Server.exe          ← Ejecutable principal" -ForegroundColor Gray
Write-Host "   ├── *.dll                      ← Dependencias" -ForegroundColor Gray
Write-Host "   ├── app.config                 ← Configuración" -ForegroundColor Gray
Write-Host "   └── wwwroot/                   ← 🚨 Archivos web (junto al .exe)" -ForegroundColor Yellow
Write-Host "       ├── index.html" -ForegroundColor Gray
Write-Host "       ├── login.html" -ForegroundColor Gray
Write-Host "       ├── documentos.html" -ForegroundColor Gray
Write-Host "       ├── Styles/" -ForegroundColor Gray
Write-Host "       ├── Scripts/" -ForegroundColor Gray
Write-Host "       └── Imagenes/" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Inicia el servicio SWGROI en el VPS" -ForegroundColor White
Write-Host ""
Write-Host "💡 VERIFICACIÓN EN VPS:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:8080/index.html" -ForegroundColor Gray
Write-Host "   (Debe responder con la página principal)" -ForegroundColor Gray

# Resultado final
if ($exeExists -and $wwwrootExists) {
    Write-Host "`n🎉 PUBLICACIÓN COMPLETA LISTA PARA VPS" -ForegroundColor Green -BackgroundColor Black
    Write-Host "   Todos los archivos recopilados en: $PublishPath\" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  REVISA LOS ERRORES ANTES DE DESPLEGAR" -ForegroundColor Red -BackgroundColor Black
    Write-Host "   Faltan archivos críticos" -ForegroundColor Red
}

Write-Host ""