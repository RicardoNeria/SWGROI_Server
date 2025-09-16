# Checklist de Pruebas de Humo (SWGROI)

Este checklist valida rápidamente que el despliegue es funcional, que la auditoría registra eventos y que las políticas de sesión/seguridad operan. Úsalo tras cada publicación en el VPS Contabo o en entorno local.

## 0) Pre-requisitos
- URL base: `http(s)://<host>:<puerto>/`
- Credenciales de prueba con rol Administrador (para Usuarios/Avisos).
- Acceso a MySQL (usuario con permisos de SELECT sobre `Auditoria`).
- PowerShell y `mysql` disponibles en el servidor/estación.

---

## 1) Salud básica del sitio
- Abrir `/<raíz>` redirige a `login.html` y carga sin errores de consola.
- Cargar un recurso estático (por ejemplo `/Styles/estilo_general.css`) responde 200 OK.

Comando opcional (PowerShell):
```
Invoke-WebRequest "http://localhost:8888/login.html" -UseBasicParsing | Select-Object StatusCode
```

---

## 2) Sesión y cookies
- Iniciar sesión con usuario válido.
- Verificar que el servidor emite cookies de sesión:
  - HTTP: `Set-Cookie: sessionid=...; Path=/; HttpOnly; SameSite=Lax`
  - HTTPS detrás de proxy: `Set-Cookie: ...; Path=/; HttpOnly; SameSite=None; Secure`
- Inactividad: esperar 31 minutos sin actividad. La siguiente petición autenticada debe exigir re-login.

---

## 3) Tickets (CRUD mínimo)
- Crear ticket con folio de prueba (ej: `AUD-HTKT-001`).
- Actualizar estado del mismo (`En Proceso` → `Cerrado`).
- Eliminar el ticket.

Verificación en auditoría (MySQL):
```
SELECT Entidad, Accion, JSON_EXTRACT(LlavePrimaria,'$.Id') AS Id,
       FechaHora, UsuarioAccion
FROM Auditoria
WHERE Entidad='tickets' AND JSON_EXTRACT(LlavePrimaria,'$.Id') IS NOT NULL
ORDER BY AuditoriaID DESC LIMIT 10;
```

Criterio: Deben existir filas con Accion `INSERT`, `UPDATE` y `DELETE` para el Id del folio usado.

---

## 4) Usuarios (solo Administrador)
- Crear usuario de prueba `audit.user` con rol `CCC`.
- Editar el rol a `Operaciones`.
- Eliminar el usuario.

Verificación:
```
SELECT Entidad, Accion, JSON_EXTRACT(LlavePrimaria,'$.IdUsuario') AS Id,
       JSON_EXTRACT(Despues,'$.Rol') AS RolNuevo,
       JSON_EXTRACT(Antes,'$.Rol')  AS RolPrevio,
       FechaHora
FROM Auditoria
WHERE Entidad='usuarios'
ORDER BY AuditoriaID DESC LIMIT 15;
```

---

## 5) Cotizaciones, Órdenes de Venta, Ventas Detalle
Si el flujo está disponible en UI, realizar un alta mínima por entidad. Si aún no hay UI completa, puede simularse con INSERTs controlados para verificar triggers.

Consultas de verificación:
```
-- Cotizaciones
SELECT Accion, JSON_EXTRACT(LlavePrimaria,'$.CotizacionID') AS Id, FechaHora
FROM Auditoria WHERE Entidad='Cotizaciones' ORDER BY AuditoriaID DESC LIMIT 10;

-- OrdenesVenta
SELECT Accion, JSON_EXTRACT(LlavePrimaria,'$.OVSR3') AS OVSR3, FechaHora
FROM Auditoria WHERE Entidad='OrdenesVenta' ORDER BY AuditoriaID DESC LIMIT 10;

-- VentasDetalle
SELECT Accion, JSON_EXTRACT(LlavePrimaria,'$.DetalleID') AS Id, FechaHora
FROM Auditoria WHERE Entidad='VentasDetalle' ORDER BY AuditoriaID DESC LIMIT 10;
```

---

## 6) CSRF y seguridad de mutaciones
- Intentar un POST de creación (por ejemplo `/tickets`) sin el header `X-CSRF-Token`.
- Resultado esperado: 403 con mensaje de CSRF inválido.

PowerShell ejemplo:
```
Invoke-WebRequest -Uri "http://localhost:8888/tickets" -Method POST -Body '{}' -ContentType 'application/json' -UseBasicParsing -ErrorAction SilentlyContinue | Select-Object StatusCode
```

---

## 7) Auditoría reciente (API)
- Consumir `GET /auditoria/ultimos?entidad=tickets&limit=50` (si está expuesto).
- Resultado: 200 y JSON con los últimos eventos.

---

## 8) Backups y restauración
- Ejecutar tarea/guion de backup (por ejemplo `ops/backup/db_backup.ps1`).
- Verificar que se generó `SWGROI_backup_YYYYMMDD_HHMM.sql.gz` en el directorio de salida.
- Descomprimir y validar que contiene DDL/DML legible.

Verificación:
```
Get-ChildItem ops/backup/out -Filter "SWGROI_backup_*.sql.gz"
```

---

## 9) Despliegue como servicio y logs
- Confirmar que el servicio (NSSM o similar) está `Running`.
- Revisar `logs/` para que exista un archivo del día y que se escriben eventos recientes.

---

## 10) Limpieza de datos de prueba
- Borrar usuarios y folios creados durante la prueba.
- Confirmar que no quedan elementos de auditoría con datos sensibles en `Mensaje`.

---

## 11) Resultado de la corrida
- Fecha/hora de inicio y fin.
- Ambiente (local / VPS Contabo / otro).
- Incidencias encontradas y enlaces a evidencias.
- Checklist final:
  - [ ] Login y navegación
  - [ ] Cookies y expiración
  - [ ] Tickets CRUD + auditoría
  - [ ] Usuarios CRUD + auditoría
  - [ ] Cotizaciones/OV/VD auditoría
  - [ ] CSRF protegiendo POST
  - [ ] Backup generado
  - [ ] Servicio Running y logs

> Guarda capturas en `docs/QA/Evidencias/` con patrón `HU-<modulo>-<n>-<resultado>.png` y referencia desde el reporte.
