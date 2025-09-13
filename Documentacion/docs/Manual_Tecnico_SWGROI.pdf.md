# Manual Técnico SWGROI (borrador)

## Arquitectura
- Backend: C# .NET Framework 4.8 con HttpListener.
- Frontend: HTML/CSS/JS nativos en `wwwroot/`.
- BD: MySQL 8.x.

## Rutas y contratos
- Login: `POST /login` { Usuario, Contrasena }
- Tickets: `POST /tickets`, `POST /tickets/actualizar`, `POST /tickets/eliminar`
- Avisos: `GET/POST/PUT/DELETE /avisos`

## Seguridad
- PBKDF2 para contraseñas; cookies por canal; CSRF en mutaciones.
- Autorización por roles.

## BD
- Migraciones en `db/migraciones/`. Ver `0001_inicial.sql` y `0002_auditoria.sql`.

## Despliegue
- Ver `docs/DEPLOY_VPS_WINDOWS.md` y `ops/release/pack.ps1`.

## Backup/Restore
- Ver `docs/OPERACIONES.md` y scripts en `ops/backup/`.

