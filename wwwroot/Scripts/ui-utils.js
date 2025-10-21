/**
 * SWGROI - Sistema Unificado de Mensajes v2.0
 * Manejo unificado de notificaciones, validaciones y mensajes
 * Sin afectar el layout de la página
 */

window.SWGROI = window.SWGROI || {};

/**
 * Sistema unificado de mensajes sin movimiento de página
 */
window.SWGROI.UI = {
    /**
     * Muestra un mensaje unificado usando el sistema ui-message
     * @param {string} texto - Texto del mensaje
     * @param {string} tipo - Tipo: success, error, warning, info
     * @param {string|HTMLElement} contenedor - ID o elemento contenedor (opcional)
     * @param {number} autoHide - Milisegundos para auto-ocultar (0 = no ocultar)
     */
    mostrarMensaje: function(texto, tipo = 'info', contenedor = null, autoHide = 4000) {
        let elemento = this._getOrCreateMensajeElement(contenedor);
        
        if (!elemento) {
            console.warn('SWGROI.UI: No se pudo crear contenedor para mensaje');
            return;
        }
        
        this._configurarMensaje(elemento, texto, tipo);
        this._mostrarElemento(elemento);
        
        // Auto-ocultar todos los mensajes después de 4 segundos
        if (autoHide > 0) {
            setTimeout(() => {
                this.ocultarMensaje(elemento);
            }, autoHide);
        }
        
        return elemento;
    },
    
    /**
     * Obtiene o crea un elemento de mensaje
     */
    _getOrCreateMensajeElement: function(contenedor) {
        let elemento;

        if (contenedor) {
            if (typeof contenedor === 'string') {
                elemento = document.getElementById(contenedor);
            } else {
                elemento = contenedor;
            }

            // Si nos pasaron un contenedor de mensajes, buscar/crear el .ui-message interno
            if (elemento && elemento.classList && elemento.classList.contains('ui-message-container')) {
                let interno = elemento.querySelector('.ui-message');
                if (!interno) {
                    interno = document.createElement('div');
                    interno.className = 'ui-message';
                    interno.setAttribute('role', 'alert');
                    interno.setAttribute('aria-live', 'polite');
                    elemento.appendChild(interno);
                }
                elemento = interno;
            }
        } else {
            // Buscar elemento de mensaje por defecto
            elemento = document.getElementById('mensaje') ||
                      document.getElementById('leyenda') ||
                      document.querySelector('.ui-message');
        }

        // Si no existe, crear uno dinámicamente
        if (!elemento) {
            elemento = this._crearElementoMensaje();
        }

        return elemento;
    },
    
    /**
     * Crea un elemento de mensaje dinámico
     */
    _crearElementoMensaje: function() {
        // Buscar un contenedor adecuado
        let container = document.querySelector('main') || 
                       document.querySelector('.ui-content') ||
                       document.querySelector('.ui-form') ||
                       document.body;
        
        // Crear contenedor de mensaje
        const messageContainer = document.createElement('div');
        messageContainer.className = 'ui-message-container';
        
        // Crear elemento de mensaje
        const elemento = document.createElement('div');
        elemento.id = 'mensaje-dinamico';
        elemento.className = 'ui-message';
        elemento.setAttribute('role', 'alert');
        elemento.setAttribute('aria-live', 'polite');
        
        messageContainer.appendChild(elemento);
        container.insertBefore(messageContainer, container.firstChild);
        
        return elemento;
    },
    
    /**
     * Configura el contenido del mensaje
     */
    _configurarMensaje: function(elemento, texto, tipo) {
        // Iconos para cada tipo
        const iconMap = {
            success: '✔',
            error: '✖',
            warning: '⚠',
            info: 'ℹ️'
        };
        
        const icon = iconMap[tipo] || iconMap.info;
        
        // Limpiar clases previas
        elemento.className = 'ui-message';
        elemento.classList.add(`ui-message--${tipo}`);
        
        // Crear o actualizar estructura
        let iconNode = elemento.querySelector('.ui-message__icon');
        let textNode = elemento.querySelector('.ui-message__text');
        
        if (!iconNode) {
            iconNode = document.createElement('span');
            iconNode.className = 'ui-message__icon';
            iconNode.setAttribute('aria-hidden', 'true');
            elemento.appendChild(iconNode);
        }
        
        if (!textNode) {
            textNode = document.createElement('span');
            textNode.className = 'ui-message__text';
            elemento.appendChild(textNode);
        }
        
        iconNode.textContent = icon;
        textNode.textContent = texto;
    },
    
    /**
     * Muestra el elemento con animación
     */
    _mostrarElemento: function(elemento) {
        // Asegurar que el elemento esté visible en el DOM
        elemento.style.display = 'flex';
        
        // Forzar reflow para que la transición funcione
        elemento.offsetHeight;
        
        // Aplicar clase de visibilidad
        elemento.classList.add('ui-message--visible');
    },
    
    /**
     * Oculta un mensaje con animación suave
     * @param {string|HTMLElement} elemento - ID o elemento a ocultar
     */
    ocultarMensaje: function(elemento) {
        if (typeof elemento === 'string') {
            elemento = document.getElementById(elemento);
        }
        
        if (!elemento) return;
        
        // Quitar clase de visibilidad
        elemento.classList.remove('ui-message--visible');
        
        // Esperar la transición antes de ocultar completamente
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 300);
    },
    
    /**
     * Muestra error en un campo específico (unificado)
     * @param {string} fieldName - Nombre del campo
     * @param {string} message - Mensaje de error
     * @param {number} autoHide - Milisegundos para auto-ocultar (0 = no ocultar)
     */
    mostrarErrorCampo: function(fieldName, message, autoHide = 4000) {
        const field = document.getElementById(fieldName);
        // soportar variantes comunes de id de feedback en el repo
        const feedback = document.getElementById(`${fieldName}-help`) ||
                         document.getElementById(`${fieldName}Feedback`) ||
                         document.getElementById(`${fieldName}-feedback`) ||
                         document.getElementById(`${fieldName}Help`);

        if (field) {
            field.classList.add('error');
            // intentamos añadir clase de error genérica usada en formas
            field.classList.add('ui-form__input--error');
        }

        if (feedback) {
            feedback.textContent = message;
            feedback.classList.add('show');

            // Auto-ocultar después del tiempo especificado
            if (autoHide > 0) {
                setTimeout(() => {
                    this.limpiarErrorCampo(fieldName);
                }, autoHide);
            }
        } else {
            // Si no hay feedback específico, mostrar mensaje global
            this.mostrarMensaje(message, 'error');
        }
    },
    
    /**
     * Limpia el error de un campo
     * @param {string} fieldName - Nombre del campo
     */
    limpiarErrorCampo: function(fieldName) {
        const field = document.getElementById(fieldName);
        const feedback = document.getElementById(`${fieldName}-help`) ||
                         document.getElementById(`${fieldName}Feedback`) ||
                         document.getElementById(`${fieldName}-feedback`) ||
                         document.getElementById(`${fieldName}Help`);

        if (field) {
            field.classList.remove('error');
            field.classList.remove('ui-form__input--error');
        }

        if (feedback) {
            feedback.textContent = '';
            feedback.classList.remove('show');
        }
    },

    /**
     * Muestra errores de un formulario. errors es un objeto { campo: mensaje }
     */
    mostrarErroresFormulario: function(errors, autoHide = 0) {
        if (!errors || typeof errors !== 'object') return;
        Object.entries(errors).forEach(([field, msg]) => {
            try {
                this.mostrarErrorCampo(field, msg, autoHide);
            } catch (e) {
                this.mostrarMensaje(msg, 'error');
            }
        });
    },

    limpiarErroresFormulario: function(formOrPrefix) {
        // Si se recibe un elemento o id, limpiar dentro de ese contenedor
        let container = null;
        if (!formOrPrefix) {
            container = document;
        } else if (typeof formOrPrefix === 'string') {
            container = document.getElementById(formOrPrefix) || document;
        } else if (formOrPrefix instanceof HTMLElement) {
            container = formOrPrefix;
        } else container = document;

        const feedbacks = container.querySelectorAll('[id$="-help"], [id$="Feedback"], [id*="feedback"], .ui-form__feedback');
        feedbacks.forEach(f => {
            f.textContent = '';
            f.classList.remove('show');
        });

        // Quitar clases de error de inputs dentro del contenedor
        const inputs = container.querySelectorAll('.ui-form__input--error, .error');
        inputs.forEach(i => {
            i.classList.remove('ui-form__input--error', 'error');
        });
    },
    
    /**
     * Inicializa mensajes existentes en la página
     */
    inicializarMensajes: function() {
        const mensajes = document.querySelectorAll('.ui-message');
        mensajes.forEach(mensaje => {
            // Asegurar que tengan la estructura correcta
            if (!mensaje.querySelector('.ui-message__icon') || !mensaje.querySelector('.ui-message__text')) {
                this._ensureMessageStructure(mensaje);
            }
        });
    },
    
    /**
     * Asegura que un mensaje tenga la estructura correcta
     */
    _ensureMessageStructure: function(mensaje) {
        if (!mensaje.querySelector('.ui-message__icon')) {
            const icon = document.createElement('span');
            icon.className = 'ui-message__icon';
            icon.setAttribute('aria-hidden', 'true');
            mensaje.insertBefore(icon, mensaje.firstChild);
        }
        
        if (!mensaje.querySelector('.ui-message__text')) {
            const text = document.createElement('span');
            text.className = 'ui-message__text';
            text.textContent = mensaje.textContent || '';
            mensaje.appendChild(text);
        }
    }
};

/**
 * Funciones de compatibilidad para código existente
 */
window.mostrarMensaje = window.SWGROI.UI.mostrarMensaje.bind(window.SWGROI.UI);
window.showFieldError = window.SWGROI.UI.mostrarErrorCampo.bind(window.SWGROI.UI);
window.clearFieldError = window.SWGROI.UI.limpiarErrorCampo.bind(window.SWGROI.UI);

/**
 * Inicialización automática cuando se carga el DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    window.SWGROI.UI.inicializarMensajes();
});

// ==============================
// Paginación unificada (helper)
// ==============================
(function(){
    function render(container, cfg){
        if (!container) return;
        const total = Number(cfg.total||0);
        const page  = Math.max(1, Number(cfg.page||1));
        const size  = Math.max(1, Number(cfg.size||10));
        const onChange = typeof cfg.onChange==='function' ? cfg.onChange : function(){};
        const totalPages = Math.max(1, Math.ceil(total/size));

        // Info label opcional
        if (cfg.infoLabel) {
            const inicio = total===0?0:((page-1)*size+1);
            const fin = Math.min(page*size, total);
            cfg.infoLabel.textContent = total===0? 'No hay resultados' : `Mostrando ${inicio}-${fin} de ${total}`;
        }

        // Render controles
        container.innerHTML = '';
        if (totalPages<=1) return;

        const mkBtn = (text, p) => {
            const b = document.createElement('button');
            b.className = 'ui-button ui-button--ghost ui-button--sm';
            b.setAttribute('data-page', String(p));
            b.textContent = text;
            if (p<1 || p>totalPages || p===page) b.disabled = (p===page);
            return b;
        };

        const prev = mkBtn('Anterior', page-1); container.appendChild(prev);
        for(let i=1;i<=totalPages;i++){
            if (i===1 || i===totalPages || Math.abs(i-page)<=2){
                const btn = mkBtn(String(i), i);
                if (i===page){ btn.className='ui-button ui-button--primary ui-button--sm'; btn.setAttribute('aria-current','page'); }
                container.appendChild(btn);
            } else if (Math.abs(i-page)===3) {
                const span = document.createElement('span'); span.className='ui-paginacion__ellipsis'; span.textContent='...'; container.appendChild(span);
            }
        }
        const next = mkBtn('Siguiente', page+1); container.appendChild(next);

        if (!container._bound){
            container.addEventListener('click', (e)=>{
                const b = e.target.closest('button[data-page]');
                if(!b) return; const p = parseInt(b.getAttribute('data-page')); if (isNaN(p)) return; onChange(p);
            });
            container._bound = true;
        }
    }
    window.SWGROI = window.SWGROI || {}; window.SWGROI.Pagination = { render };
})();