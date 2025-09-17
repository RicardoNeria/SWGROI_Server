Sistema de Diseño SWGROI
=======================

```markdown
Sistema de Diseño SWGROI
=======================

Última actualización: 2025-09-17

Resumen rápido
--------------
Se añadió un sistema de diseño centralizado para aportar consistencia visual y estados de validación accesibles en los formularios.

Arquitectura de archivos
- `wwwroot/Styles/design_system.css` — archivo nuevo que contiene tokens (variables CSS), utilidades y reglas base para inputs, validaciones y componentes pequeños.
- `wwwroot/Styles/estilo_general.css` — actualizado para importar `design_system.css` al inicio; mantiene las reglas existentes del proyecto.
- `wwwroot/Scripts/form-ux.js` — script de mejora de UX en los formularios. Añade clases, wrappers (`.field-with-feedback`) y zonas de feedback cuando faltan.
- `wwwroot/Scripts/form-ux-validators.js` — validaciones y transformaciones específicas del dominio (por ejemplo, autouppercase para folios, formato numérico en blur).
- `wwwroot/Scripts/ui.js` — cargador global actualizado para inyectar dinámicamente las mejoras de formulario (no invasivo).

Objetivos conseguidos
- Validación visual inmediata (clases `.is-valid` / `.is-invalid`) y zona de mensajes (`.field-feedback`).
- Diseño consistente mediante variables (colores, tipografías, espaciado).
- Compatibilidad responsiva: utilidades mobile-first y grid para formularios.
- Cambios no invasivos en HTML: la mayor parte del comportamiento se aplica en tiempo de ejecución para evitar romper enlaces a backend o ids existentes.

Principales variables expuestas (ejemplos)
- Colores: `--ds-primary`, `--ds-secondary`, `--ds-success`, `--ds-danger`, `--ds-text`, `--ds-bg`.
- Tipografía: `--ds-font-family`, `--ds-font-size-base`.
- Espaciado y radio: `--ds-space`, `--ds-radius`, `--ds-radius-lg`.

Clases y utilidades importantes
- `.form-control` — base para inputs/selects/textarea: padding, border, transición.
- `.is-valid` / `.is-invalid` — estados visuales; además actualizan iconos y `aria-` attributes vía JS.
- `.field-with-feedback` — wrapper compacto que contiene el control y el icono de estado.
- `.field-feedback` — zona para mensajes de error/ayuda, con `aria-live="polite"` para accesibilidad.
- `.form-grid` / `.form-row` — utilidades responsive para distribuir campos en pantallas mayores.

Uso recomendado (rápido)
1. Preferir la carga del script global `ui.js` en el pie de página (`</body>`). Este script inyecta `form-ux.js` y `form-ux-validators.js` y mejora los formularios automáticamente.
2. Cuando sea posible, añadir `class="form-control"` a los campos en los HTML para garantizar estilos coherentes.
3. Para mensajes estáticos o ayuda, añadir un `div` debajo del campo con `class="field-feedback"` y `aria-live="polite"`.

Accesibilidad
- Las zonas de feedback usan `aria-live="polite"` y los estados visuales se acompañan de `aria-invalid="true"` cuando corresponda.

Páginas modificadas (ejemplos)
- `wwwroot/login.html` — campos mejorados y zonas de feedback añadidas; login.js actualizado para marcar estados.
- `wwwroot/tickets.html` — principales campos envueltos en `.field-with-feedback` y señales de ayuda añadidas.
- `wwwroot/ventas.html` — modal de ventas mejorado en el markup para mayor robustez (solo el modal). 

Nota importante: exclusiones
- `wwwroot/ventas_reporte.html` — solicitado explícitamente: este archivo NO fue modificado.

QA y comprobaciones rápidas
1. Abrir una página de formulario (por ejemplo `/login.html`).
2. Forzar un error (dejar required vacío) y comprobar que el borde se pone rojo y aparece un mensaje en `.field-feedback`.
3. Introducir un valor válido y comprobar que el campo pasa a `.is-valid` y que el mensaje cambia a estado success.
4. Probar en móvil (narrow viewport) y en escritorio: el layout debe reordenar campos según `form-grid`.

Cómo revertir cambios (si es necesario)
1. El cambio más simple es eliminar la inclusión de `/Scripts/ui.js` en la página o comentar la importación en `estilo_general.css`.
2. Para revertir a nivel de repositorio, usar git para resetear los archivos modificados: `git checkout -- <ruta_del_archivo>` para cada archivo afectado.

Próximos pasos sugeridos (opcional)
- Aplicar de manera permanente los wrappers `.field-with-feedback` en todos los formularios para reducir la dependencia del script runtime (esto implica más edits en HTML).
- Añadir pruebas visuales simples o snapshots para detectar regresiones en estilos.
- Crear un short-file `wwwroot/Styles/CHANGELOG_design.md` si se planean más iteraciones.

Contacto
- Si necesitas que aplique los wrappers de forma permanente en X páginas adicionales, dime cuáles y lo hago.

```
