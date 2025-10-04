# Despliegue en VPS Windows (IIS + HTTPS)

## Reverse proxy IIS
- Instale IIS + ARR + URL Rewrite.
- Cree sitio HTTPS con certificado (win-acme / Let's Encrypt).
- Apunte el proxy hacia `http://127.0.0.1:8888/` donde corre SWGROI (HttpListener).

## Reescrituras sugeridas
1. Forzar HTTPS (301).
2. Agregar encabezados al proxy:
   - `X-Forwarded-Proto: https`
   - (opcional) `X-Forwarded-For`

## HSTS
- En el sitio de IIS, agregue encabezado `Strict-Transport-Security: max-age=15552000; includeSubDomains` (6 meses).

## TLS
- Automatice renovación con win-acme (wacs.exe) en Tareas programadas.

