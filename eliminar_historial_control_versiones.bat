@echo off
setlocal

echo ================================================
echo   🧹 RESETEAR GIT Y ELIMINAR TODAS LAS RAMAS (SOLO main)
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
git push -f origin main

:: 5) Eliminar TODAS las ramas remotas excepto main
for /f "tokens=1,* delims=/" %%a in ('git ls-remote --heads origin ^| findstr /v "refs/heads/main"') do (
    for %%c in (%%b) do (
        if not "%%c"=="" (
            echo 🗑️ Eliminando rama remota %%c...
            git push origin --delete %%c
        )
    )
)

:: 6) Eliminar TODAS las ramas locales excepto main
for /f "tokens=*" %%l in ('git branch ^| findstr /v "main" ^| findstr /v "\*"') do (
    echo 🗑️ Eliminando rama local %%l...
    git branch -D %%l
)

:: 7) Asegurar tracking de main
git branch --set-upstream-to=origin/main main

:: Confirmación
echo.
echo ✅ Historial limpio, solo queda la rama main en local y remoto.
echo 🔹 Con esto, VS Code ya no debe mostrar "Publicar Branch".
pause
