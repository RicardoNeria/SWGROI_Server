# PR: Migración BEM (prefijo `ui-`) — componentes y piloto

Rama: `migracion/bem-ui-componentes-step1`

Resumen

Este PR introduce la primera fase de la migración de clases CSS a la convención BEM con prefijo `ui-`. Cambios principales:

- Índice de estilos ya existente: `wwwroot/Styles/componentes/componentes.css` (parciales importadas).
- Se añadió clases `ui-*` de forma conservadora en múltiples páginas HTML (no se eliminaron clases legacy). Lotes aplicados:
  - Lote #1: `admin.html`, `reportes.html`, `cotizaciones.html`, `ventas.html`, `asignaciones.html`, `tickets.html`.
  - Lote #2: `index.html`, `login.html`, `veravisos.html`, `retroalimentacion.html`, `tecnicos.html`, `recuperar.html`.
- Ajustes menores en `componentes.css`: estilos base para `ui-card`, `ui-main`, `ui-tabla`, `ui-filtros`, `ui-paginacion` y `ui-auth-form` para proporcionar una base visual coherente mientras se completa la migración.

Archivos modificados (representativo)

- wwwroot/admin.html
- wwwroot/reportes.html
- wwwroot/cotizaciones.html
- wwwroot/ventas.html
- wwwroot/asignaciones.html
- wwwroot/tickets.html
- wwwroot/index.html
- wwwroot/login.html
- wwwroot/veravisos.html
- wwwroot/retroalimentacion.html
- wwwroot/tecnicos.html
- wwwroot/recuperar.html
- wwwroot/Styles/componentes/componentes.css

Checklist de PR (comprobar antes de merge)

- [ ] Revisar diffs HTML y confirmar que no se eliminaron clases legacy críticas.
- [ ] Ejecutar la aplicación en un entorno de pruebas y revisar visualmente: index, login, avisos, tickets, reportes, admin.
- [ ] Ajustar parciales en `wwwroot/Styles/componentes/` según resultados visuales (formularios, tablas, filtros, card, modal).
- [ ] Añadir capturas de pantalla (QA) al PR para demostrar equivalencia visual.
- [ ] Ejecutar pruebas manuales en rutas críticas (login, crear ticket, asignar, reportes).

Notas

- Realicé una verificación estática que confirma que la mayoría de las páginas ya enlazan `/Styles/componentes/componentes.css`.
- No se realizaron cambios en código C# ni en la configuración del proyecto.
- La compilación local fue verificada y fue exitosa.

Instrucciones para reviewers

1. Checkout a la rama `migracion/bem-ui-componentes-step1`.
2. Ejecutar `dotnet build` y luego levantar la aplicación (si aplica) para probar visualmente.
3. Revisar los cambios en las páginas indicadas y dejar comentarios puntuales sobre estilos que deban ajustarse.

---

Si quieres que proceda a abrir el PR en el remoto (GitHub/GitLab) puedo preparar el título/descripción final y ejecutar `git add/commit/push` (necesitaré confirmación).