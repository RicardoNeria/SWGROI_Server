@echo off
setlocal enabledelayedexpansion

:: ====== PEDIR RAMA ======
set /p BRANCH=¿A qué rama deseas subir los cambios? (ej. main): 

:: ====== VALIDAR REMOTO ======
git ls-remote --exit-code --heads origin %BRANCH% >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: La rama "%BRANCH%" no existe en el repositorio remoto.
    echo Por favor, verifica el nombre o crea la rama en GitHub.
    pause
    exit /b
)

:: ====== CAMBIAR A LA RAMA ======
git rev-parse --verify %BRANCH% >nul 2>&1
if errorlevel 1 (
    echo ⚠️ La rama local "%BRANCH%" no existe. Se creará y rastreará desde el remoto...
    git checkout -b %BRANCH% origin/%BRANCH%
) else (
    git checkout %BRANCH%
)

:: ====== BACKUP FUERA DEL REPO ======
if not exist "backups" mkdir backups
for /f %%i in ('powershell -NoLogo -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set fecha=%%i
set "BACKUP_FILE=backups\backup_publicacion_%fecha%.zip"
set "TMP_ZIP=%TEMP%\swgroi_backup_%fecha%.zip"

echo 📦 Generando respaldo: %BACKUP_FILE% ...
powershell -NoLogo -NoProfile -Command ^
  "$src = Get-ChildItem -LiteralPath . -Force | Where-Object { $_.Name -ne '.git' -and $_.Name -ne 'backups' } | ForEach-Object FullName; " ^
  "$tmp = '%TMP_ZIP%'; if(Test-Path $tmp){Remove-Item $tmp -Force}; " ^
  "Compress-Archive -Path $src -DestinationPath $tmp -CompressionLevel Optimal -Force; " ^
  "Move-Item -Force $tmp '%BACKUP_FILE%';"

if not exist "%BACKUP_FILE%" (
    echo ❌ Error al crear el respaldo.
    pause & exit /b
)
echo ✅ Respaldo creado correctamente.
echo.

:: ====== AGREGAR Y COMITEAR CAMBIOS ======
git status --short
git add -A
git status --short

git diff --cached --quiet
if errorlevel 1 (
    :askmsg
    set "COMMIT_MSG="
    set /p COMMIT_MSG=📝 Escribe el mensaje del commit: 
    if not defined COMMIT_MSG (
        echo ⚠️ El mensaje no puede estar vacío. Inténtalo de nuevo.
        goto askmsg
    )
    git commit -m "%COMMIT_MSG%"
)

    git commit -m "%COMMIT_MSG%"
    echo ⏳ Realizando pull con rebase para evitar conflictos...
    git pull --rebase origin %BRANCH%
    if errorlevel 1 (
        echo ❌ Conflictos detectados. Resuélvelos y vuelve a ejecutar.
        pause & exit /b
    )
    echo ⏫ Subiendo cambios a la rama %BRANCH%...
    git push origin %BRANCH%
    echo.
    echo ✅ Cambios publicados exitosamente en la rama "%BRANCH%".
) else (
    echo ⚠️ No se detectaron cambios. Nada fue publicado.
)

echo 📁 Respaldo disponible en: %BACKUP_FILE%
endlocal
pause
