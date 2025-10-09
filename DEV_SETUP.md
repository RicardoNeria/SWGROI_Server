# Instrucciones rápidas de desarrollo

Pasos recomendados después de clonar el repo:

1. Mover `MySql.Data.dll` (si aplica)
   - Si existe una carpeta llamada `librerías` con acento, mueve el DLL a la carpeta `Librerias` (sin acento).
   - Puedes usar el script:
     ```powershell
     pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\move_dll.ps1
     ```

2. Limpiar artefactos locales (opcional pero recomendado antes de compilar):
   ```powershell
   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\limpiar_repo.ps1
   ```

3. Para commitear y pushear cambios pequeños:
   ```powershell
   pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\prepare_commit.ps1 -Message "tu mensaje" -Branch main
   ```

4. Notas sobre archivos eliminados/renombrados
   - Algunos archivos de perfil de publicación que estaban duplicados en la raíz fueron movidos a `*.deleted` y hay un registro en `operaciones/backup/removed_files.txt`.
