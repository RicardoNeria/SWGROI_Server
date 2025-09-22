# 📋 Guía de Componentes SWGROI - Sistema Unificado BEM

## 🎯 Objetivo

Esta guía documenta todos los componentes extraídos y unificados del sistema SWGROI, diseñados bajo metodología BEM estricta para garantizar reutilización, escalabilidad y consistencia visual en todos los módulos.

## 🧱 Estructura de Componentes

### Layout Principal (`ui-layout`)
```html
<body class="ui-layout ui-layout--no-topbar">
    <aside class="ui-sidebar">...</aside>
    <main class="ui-layout__main">...</main>
</body>
```

### Sidebar Unificado (`ui-sidebar`)
- **Altura:** 100vh sin scroll
- **Ancho:** 300px fijo
- **Iconos:** Emojis unificados
- **Estados:** active, hover, focus-visible

### Botones Unificados (`ui-button`)
- **Variantes:** primary, secondary, ghost, danger, text
- **Tamaños:** sm, normal, lg, block
- **Iconos:** Emojis con clase `.ui-button__icon`
- **Estados:** active, disabled, loading, focus-visible

### Filtros (`ui-filters`)
- **Estructura:** form + campos + acciones
- **Elementos:** input, select, button
- **Accesibilidad:** aria-label, role="search"

### Tablas (`ui-tabla`)
- **Wrapper:** `.ui-tabla-wrap` con scroll horizontal
- **Estructura:** head, body, row, cell
- **Acciones:** `.ui-tabla__cell--acciones`
- **Zebra striping:** automático

### Paginación (`ui-paginacion`)
- **Elementos:** info + controles
- **Botones:** anterior/siguiente con emojis
- **Estados:** disabled, active
- **ARIA:** navigation, labels descriptivos

### Modales (`ui-modal`)
- **Overlay:** `.ui-modal-overlay` con backdrop
- **Estructura:** header + body + actions
- **Accesibilidad:** role="dialog", aria-modal, focus trap

### Métricas/KPIs (`ui-metrics`)
- **Layout:** flexbox responsivo
- **Elementos:** title + value
- **Variantes:** compact

### Formularios (`ui-form`)
- **Grupos:** `.ui-form-group`
- **Elementos:** label, field, input, feedback
- **Validación:** estados is-valid/is-invalid
- **Contadores:** caracteres restantes

## 🎨 Iconografía Unificada

### Acciones Principales
- ➕ Agregar/Crear
- ✏️ Editar
- 🗑️ Eliminar
- 💾 Guardar
- ❌ Cancelar
- ✅ Confirmar

### Navegación
- 🏠 Inicio/Menú
- 🔍 Buscar
- 🧹 Limpiar
- 📤 Exportar
- 🔄 Actualizar
- ⬅️ Anterior
- ➡️ Siguiente

### Estados y Módulos
- 🛡️ Administración
- 📢 Avisos
- 🎯 Objetivo/Meta
- 📋 Listado
- 📊 Métricas
- 🚪 Logout

## 🔧 Uso de la Plantilla Base

### 1. Seleccionar plantilla CSS apropiada
```html
<!-- Módulo administrativo completo -->
<link rel="stylesheet" href="/Styles/componentes/modulo-admin.css">

<!-- Formulario simple -->
<link rel="stylesheet" href="/Styles/componentes/modulo-simple.css">

<!-- Listado con tablas -->
<link rel="stylesheet" href="/Styles/componentes/modulo-tablas.css">
```

### 2. Copiar estructura base
```bash
cp /Styles/componentes/plantilla-modulo-base.html nuevo-modulo.html
```

### 3. Personalizar contenido
- Cambiar título y emoji del módulo
- Actualizar breadcrumbs
- Configurar KPIs específicos
- Definir filtros necesarios
- Personalizar columnas de tabla

### 3. Implementar funciones JS
```javascript
function aplicarFiltros() {
    // Lógica específica del módulo
}

function guardarElemento() {
    // API calls específicos
}
```

### 4. Mantener IDs para JS
- Conservar IDs existentes que usa el JavaScript
- Mapear nuevos elementos con `id` descriptivos
- Usar `aria-controls` para relaciones

## 📐 Metodología BEM Estricta

### Nomenclatura
```css
.ui-bloque { }
.ui-bloque__elemento { }
.ui-bloque--modificador { }
.ui-bloque__elemento--modificador { }
```

### Ejemplos Prácticos
```html
<!-- Botón con icono -->
<button class="ui-button ui-button--primary">
    <span class="ui-button__icon">💾</span>
    Guardar
</button>

<!-- Tabla con acciones -->
<td class="ui-tabla__cell ui-tabla__cell--acciones">
    <button class="ui-button ui-button--sm ui-button--secondary">
        <span class="ui-button__icon">✏️</span>
    </button>
</td>

<!-- Paginación completa -->
<div class="ui-paginacion ui-paginacion--compact">
    <span class="ui-paginacion__info">...</span>
    <div class="ui-paginacion__controles">
        <button class="ui-paginacion__btn">...</button>
    </div>
</div>
```

## ♿ Accesibilidad Garantizada

### Focus Management
- `:focus-visible` en todos los elementos interactivos
- `outline` consistente y visible
- `outline-offset` para mejor separación

### ARIA Landmarks
- `role="navigation"` en sidebar y paginación
- `role="search"` en filtros
- `role="dialog"` en modales
- `aria-current="page"` en navegación activa

### Screen Readers
- `aria-label` descriptivo en botones de acción
- `aria-describedby` para feedback de formularios
- `aria-live="polite"` en mensajes dinámicos
- `aria-controls` para relaciones elemento-objetivo

### Keyboard Navigation
- `tabindex` apropiado
- Focus trap en modales
- Escape para cerrar modales
- Enter/Space para activar botones

## 🚀 Beneficios del Sistema

### ⏱️ Ahorro de Tiempo
- **80% menos tiempo** en desarrollo de nuevos módulos
- Estructura HTML lista para usar
- CSS predefinido y probado
- JavaScript base funcional

### 🎨 Consistencia Visual
- Espaciado unificado con tokens CSS
- Colores y tipografía centralizados
- Comportamientos homogéneos
- Iconografía coherente

### 🔄 Reutilización
- Componentes independientes
- Sin dependencias externas
- Fácil mantenimiento
- Escalabilidad garantizada

### 📊 Mantenibilidad
- Un solo punto de cambio por componente
- Documentación integrada
- Nomenclatura predecible
- Estructura lógica

## 📋 Checklist de Implementación

### Antes de crear un nuevo módulo:
- [ ] Revisar plantilla base
- [ ] Identificar componentes necesarios
- [ ] Definir funciones JavaScript específicas
- [ ] Mapear endpoints de API

### Durante el desarrollo:
- [ ] Mantener metodología BEM
- [ ] Preservar IDs para JavaScript
- [ ] Aplicar ARIA labels apropiados
- [ ] Usar emojis consistentes

### Antes de entregar:
- [ ] Verificar accesibilidad con teclado
- [ ] Probar con screen readers
- [ ] Validar responsive design
- [ ] Confirmar funcionalidad JS

## 🎨 Plantillas CSS Temáticas

### Uso rápido según tipo de módulo:

```html
<!-- Para módulos administrativos completos -->
<link rel="stylesheet" href="/Styles/componentes/modulo-admin.css">

<!-- Para formularios simples -->
<link rel="stylesheet" href="/Styles/componentes/modulo-simple.css">

<!-- Para listados y reportes -->
<link rel="stylesheet" href="/Styles/componentes/modulo-tablas.css">

<!-- Para dashboards principales -->
<link rel="stylesheet" href="/Styles/componentes/modulo-dashboard.css">

<!-- Para autenticación -->
<link rel="stylesheet" href="/Styles/componentes/modulo-auth.css">
```

### 📋 Guía de Selección:

| Tipo de Módulo | Plantilla | Componentes Incluidos |
|----------------|-----------|----------------------|
| **Admin/Usuarios** | `modulo-admin.css` | TODOS los componentes |
| **Formularios** | `modulo-simple.css` | Layout + Forms + Botones |
| **Listados/Reportes** | `modulo-tablas.css` | Tablas + Filtros + Métricas |
| **Dashboard/Menú** | `modulo-dashboard.css` | Cards + KPIs + Tablero |
| **Login/Auth** | `modulo-auth.css` | Auth + Captcha + Forms |

## 🔗 Archivos de Referencia

### Plantillas HTML:
- **Completa:** `plantilla-modulo-base.html`
- **Componentes:** `sidebar.html`, `tabla.html`, `modal.html`

### CSS Modular:
- **Todo incluido:** `componentes.css`
- **Temáticos:** `modulo-admin.css`, `modulo-simple.css`, etc.
- **Individuales:** `botones.css`, `tablas.css`, `formularios.css`

## 📞 Soporte

Para dudas sobre implementación o extensión de componentes, consultar:
1. Esta documentación
2. Archivos de componentes en `/Styles/componentes/`
3. Módulos de referencia: admin.html, avisos.html, ventas.html