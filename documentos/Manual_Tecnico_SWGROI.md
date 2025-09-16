# Manual Técnico SWGROI

## Arquitectura
- Backend: C# .NET Framework 4.8 con HttpListener.
- Frontend: HTML/CSS/JS nativos en `wwwroot/`.
- Base de datos: MySQL 8.x.

## Rutas y contratos
- Login: `POST /login` { Usuario, Contrasena }
- Tickets: `POST /tickets`, `POST /tickets/actualizar`, `POST /tickets/eliminar`
- Avisos: `GET/POST/PUT/DELETE /avisos`

## Seguridad
- PBKDF2 para contraseñas; cookies por canal (Secure/HttpOnly/SameSite según HTTPS); CSRF en mutaciones.
- Autorización por roles en router (`Security/Authorization`).
- Auditoría en `Infrastructure/AuditLogger.cs` con inserción parametrizada.

## Base de datos
- Migraciones en `db/migraciones/`. Ver `0001_inicial.sql` y `0002_auditoria.sql`.
- Vista de reportes creada con `CREATE OR REPLACE`.

## Despliegue
- Ver `docs/DEPLOY_VPS_WINDOWS.md`.

## Backup/Restore
- Ver `docs/OPERACIONES.md` y scripts en `ops/backup/`.

## Logs
- Archivo diario en `logs/` con limpieza automática (>14 días).

