@echo off
setlocal

echo ================================================
echo   🧹 RESETEAR GIT (SOLO HISTORIAL, CONSERVA RAMAS)
echo ================================================

:: 1) Eliminar historial
rmdir /s /q .git
git init

:: 2) Configurar main
git branch -M main
git remote add origin https://github.com/RicardoNeria/SWGROI_Server.git

:: 3) Agregar archivos actuales y commit inicial
git add -A
set /p COMMIT_MSG=📝 Mensaje para commit inicial (ej. "Reset historial"): 
if "%COMMIT_MSG%"=="" set COMMIT_MSG=Reset historial
git commit -m "%COMMIT_MSG%"

:: 4) Publicar forzadamente main
echo 🚀 Publicando la rama main (forzado)...
git push -f origin main

:: 5) Asegurar tracking de main
git branch --set-upstream-to=origin/main main

:: Confirmación
echo.
echo ✅ Historial eliminado. Archivos actuales publicados en main.
echo 🔹 Todas las ramas se conservan. Solo se limpió el historial.
pause
