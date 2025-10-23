@echo off
setlocal

echo ================================================
echo   🌿 CREAR RAMA HUERFANA VACIA Y PUBLICAR (SIN ALTERAR LOCAL)
echo ================================================

:: === 1) Pedir nombre de la rama ===
set /p NEW_BRANCH=📌 Nombre de la nueva rama vacía: 

if "%NEW_BRANCH%"=="" (
    echo ❌ No ingresaste un nombre de rama.
    pause & exit /b
)

:: === 2) Verificar si ya existe localmente ===
git show-ref --verify --quiet refs/heads/%NEW_BRANCH%
if not errorlevel 1 (
    echo ⚠️ La rama "%NEW_BRANCH%" ya existe localmente.
    pause & exit /b
)

:: === 3) Crear rama huérfana (sin historial)
git checkout --orphan %NEW_BRANCH%

:: === 4) Quitar todos los archivos del index de Git pero NO del disco
git rm -rf --cached . >nul 2>&1

:: === 5) Crear commit inicial vacío
git commit --allow-empty -m "Commit inicial en %NEW_BRANCH% (rama vacía)"

:: === 6) Publicar en GitHub
git push -u origin %NEW_BRANCH%

:: === 7) Volver a main para mantener intacto tu proyecto local
git checkout main

:: === Confirmación
echo.
echo ✅ Rama "%NEW_BRANCH%" creada y publicada como vacía en GitHub.
echo 🔹 Archivos locales intactos (ninguno eliminado de tu carpeta).
echo 🔹 main sigue activa en tu IDE.
pause
