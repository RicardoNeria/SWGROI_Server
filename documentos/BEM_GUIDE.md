# Guía de Convención BEM (UI)

Esta guía define nuestro estándar de nomenclatura BEM con prefijo `ui-` para componentes de interfaz.

## Convención
- Bloques: `ui-<bloque>`
- Elementos: `ui-<bloque>__<elemento>`
- Modificadores: `ui-<bloque>--<modificador>`

Ejemplo: `ui-formulario ui-formulario--seguimiento`, `ui-formulario__campo`, `ui-formulario__acciones`.

## Mapeo de componentes comunes
- Filtros
  - Bloque: `ui-filtros`
  - Elementos: `__campo`, `__select`, `__accion`
- Formulario
  - Bloque: `ui-formulario`
  - Elementos: `__campo`, `__acciones`
  - Mods sugeridos: `--seguimiento`, `--compacto`
- Tabla
  - Bloque: `ui-tabla`
  - Elementos: `__head`, `__body`
- Paginación
  - Bloque: `ui-paginacion`
  - Elementos: `__controles`
- Modal
  - Bloque: `ui-modal`
  - Elementos: `__header`, `__body`, `__actions`
  - Overlay: `ui-modal-overlay`
- Contenedor scrollable
  - Bloque: `ui-desplazable`

## Reglas
1. Mantener clases legacy durante la transición (no romper).
2. Evitar anidar BEM innecesario. Mantener bloques independientes.
3. Preferir modificadores en bloque cuando cambie el comportamiento global.
4. Evitar reglas CSS vacías; incluir mínimo una propiedad.

## Checklist para PRs (UI)
- [ ] ¿El HTML usa `ui-<bloque>`, `__<elemento>`, `--<mod>` donde corresponde?
- [ ] ¿Se conservaron las clases legacy si aún no existen equivalentes en CSS?
- [ ] ¿Hay selectores BEM correspondientes en los parciales CSS?
- [ ] ¿`componentes.css` está cargado en el HTML tocado?
- [ ] ¿Rutas `Styles/Scripts` usan capitalización consistente?
- [ ] ¿No se introdujeron reglas CSS vacías?

## Ejemplo mínimo
```html
<form class="ui-formulario ui-formulario--seguimiento">
  <div class="ui-formulario__campo">...</div>
  <div class="ui-formulario__acciones">...</div>
</form>

<div class="ui-filtros">
  <div class="ui-filtros__campo">...</div>
  <select class="ui-filtros__select"></select>
  <button class="ui-filtros__accion">Buscar</button>
</div>

<table class="ui-tabla">
  <thead class="ui-tabla__head">...</thead>
  <tbody class="ui-tabla__body">...</tbody>
</table>
```
