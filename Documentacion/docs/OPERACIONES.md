# Operaciones: Respaldo y restauración

## Respaldo automático (24h)
- Script: `ops/backup/db_backup.ps1`
- Programar tarea: `ops/backup/setup_task.bat` (diario 02:30)
- Variables: `DB_USER`, `DB_PASSWORD`, `DB_NAME` (default `swgroi_db`), retención 7 días.

## Restaurar
1. Copie el archivo `.sql.gz` al servidor.
2. Descomprima: `gzip -d SWGROI_backup_YYYYMMDD_HHMM.sql.gz`
3. Restaure: `mysql -u root -p swgroi_db < SWGROI_backup_YYYYMMDD_HHMM.sql`

