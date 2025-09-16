@echo off
REM SWGROI:backup:2025-09-07
SET SCRIPT=%~dp0db_backup.ps1
SCHTASKS /Create /TN "SWGROI_DB_BACKUP" /TR "powershell.exe -ExecutionPolicy Bypass -File \"%SCRIPT%\"" /SC DAILY /ST 02:30 /RL HIGHEST /F
echo Tarea programada creada: SWGROI_DB_BACKUP a las 02:30 diario

