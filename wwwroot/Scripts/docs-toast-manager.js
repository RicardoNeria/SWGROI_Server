/**
 * DOCS-TOAST-MANAGER.JS - Gestor de Notificaciones Toast
 * Módulo de Documentos CCC - SWGROI
 * Sistema de notificaciones profesional y no intrusivo
 */

(function(window) {
    'use strict';

    // ================================
    // CONFIGURACIÓN Y CONSTANTES
    // ================================
    
    const CONFIG = {
        CONTAINER_ID: 'toast-container-docs',
        TOAST_CLASS: 'toast-docs',
        VISIBLE_CLASS: 'toast-docs--visible',
        LEAVING_CLASS: 'toast-docs--leaving',
        DEFAULT_DURATION: 6000,
        MAX_TOASTS: 4,
        ANIMATION_DURATION: 500,
        EXIT_ANIMATION_DURATION: 400,
        ICON_ANIMATION_DELAY: 200,
        CONTENT_ANIMATION_DELAY: 300
    };

    const ICONS = {
        success: '📄',
        error: '⚠',
        info: '📋',
        warning: '🔔'
    };

    const TITLES = {
        success: 'Documento Procesado',
        error: 'Error de Documento',
        info: 'Información de Archivo',
        warning: 'Atención Requerida'
    };

    // ================================
    // VARIABLES GLOBALES
    // ================================
    
    let toastCounter = 0;
    let activeToasts = new Map();

    // ================================
    // FUNCIÓN PRINCIPAL - PÚBLICA
    // ================================
    
    /**
     * Muestra una notificación toast para el módulo de documentos
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: 'success', 'error', 'info', 'warning'
     * @param {object} options - Opciones adicionales
     * @returns {object} Control del toast
     */
    function showDocsToast(message, type = 'info', options = {}) {
        // Validar parámetros
        if (!message || typeof message !== 'string') {
            console.warn('[DocsToast] Mensaje inválido:', message);
            return null;
        }

        if (!['success', 'error', 'info', 'warning'].includes(type)) {
            console.warn('[DocsToast] Tipo inválido:', type, 'usando "info"');
            type = 'info';
        }

        // Configuración por defecto
        const finalOptions = {
            title: options.title,
            duration: options.duration !== undefined ? options.duration : CONFIG.DEFAULT_DURATION,
            closable: options.closable !== false,
            progress: options.progress !== false,
            ...options
        };

        // Asegurar container
        const container = ensureContainer();
        
        // Limpiar toasts antiguos si excedemos el máximo
        if (activeToasts.size >= CONFIG.MAX_TOASTS) {
            const oldestToastId = activeToasts.keys().next().value;
            closeToast(oldestToastId);
        }

        // Crear toast
        const toastId = ++toastCounter;
        const toastElement = createToastElement(toastId, message, type, finalOptions);
        
        // Agregar al DOM
        container.appendChild(toastElement);

        // Control del toast
        const toastControl = {
            id: toastId,
            element: toastElement,
            close: () => closeToast(toastId),
            isVisible: () => activeToasts.has(toastId)
        };
        
        activeToasts.set(toastId, toastControl);

        // Mostrar con animación
        requestAnimationFrame(() => {
            toastElement.classList.add(CONFIG.VISIBLE_CLASS);
        });

        // Auto-close si se especifica duración
        if (finalOptions.duration > 0) {
            setTimeout(() => {
                closeToast(toastId);
            }, finalOptions.duration);
        }

        // Accesibilidad: anunciar contenido a lectores de pantalla
        announceToScreenReader(message, type);

        return toastControl;
    }

    // ================================
    // FUNCIONES AUXILIARES
    // ================================
    
    /**
     * Asegura que el container de toasts existe
     */
    function ensureContainer() {
        let container = document.getElementById(CONFIG.CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = CONFIG.CONTAINER_ID;
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-label', 'Notificaciones del módulo de documentos');
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Crea el elemento DOM del toast con efectos premium
     */
    function createToastElement(id, message, type, options) {
        const toast = document.createElement('div');
        toast.className = `${CONFIG.TOAST_CLASS} ${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('data-toast-id', id);

        // Efectos de hover mejorados
        toast.addEventListener('mouseenter', () => {
            toast.style.animationPlayState = 'paused';
        });
        
        toast.addEventListener('mouseleave', () => {
            toast.style.animationPlayState = 'running';
        });

        // Icono con animación mejorada
        const icon = document.createElement('div');
        icon.className = 'toast-docs__icon';
        icon.setAttribute('aria-hidden', 'true');
        
        // Usar icon-loader si está disponible, sino fallback premium
        if (window.UI && window.UI.loadIcon) {
            const iconName = getIconName(type);
            window.UI.loadIcon(icon, iconName);
        } else {
            icon.textContent = ICONS[type] || ICONS.info;
        }

        // Contenido con mejor estructura
        const content = document.createElement('div');
        content.className = 'toast-docs__content';

        // Título con tipografía mejorada
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'toast-docs__title';
            title.textContent = options.title;
            content.appendChild(title);
        } else if (options.title !== false) {
            // Título por defecto basado en tipo
            const title = document.createElement('div');
            title.className = 'toast-docs__title';
            title.textContent = TITLES[type] || TITLES.info;
            content.appendChild(title);
        }

        // Mensaje con mejor legibilidad
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-docs__message';
        messageDiv.textContent = sanitizeText(message);
        content.appendChild(messageDiv);

        // Botón de cierre premium con micro-interacciones
        if (options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-docs__close';
            closeBtn.setAttribute('type', 'button');
            closeBtn.setAttribute('aria-label', 'Cerrar notificación');
            closeBtn.innerHTML = '✕';
            
            // Efectos de hover mejorados
            closeBtn.addEventListener('mouseenter', () => {
                closeBtn.style.transform = 'scale(1.1) rotate(90deg)';
            });
            
            closeBtn.addEventListener('mouseleave', () => {
                closeBtn.style.transform = 'scale(1) rotate(0deg)';
            });
            
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeBtn.style.transform = 'scale(0.9) rotate(180deg)';
                setTimeout(() => closeToast(id), 100);
            });
            
            toast.appendChild(closeBtn);
        }

        // Barra de progreso opcional
        if (options.progress && options.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-docs__progress';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'toast-docs__progress-bar';
            progressFill.style.animationDuration = `${options.duration}ms`;
            
            progressBar.appendChild(progressFill);
            toast.appendChild(progressBar);
        }

        // Ensamblar elementos
        toast.appendChild(icon);
        toast.appendChild(content);

        return toast;
    }

    /**
     * Cierra un toast específico
     */
    function closeToast(toastId) {
        const toastControl = activeToasts.get(toastId);
        if (!toastControl) return;

        const toastElement = toastControl.element;
        toastElement.classList.add(CONFIG.LEAVING_CLASS);

        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
            activeToasts.delete(toastId);
        }, CONFIG.EXIT_ANIMATION_DURATION);
    }

    /**
     * Limpia el texto de caracteres peligrosos
     */
    function sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.textContent;
    }

    /**
     * Obtiene el nombre del icono para el loader externo
     */
    function getIconName(type) {
        const iconMap = {
            success: 'document-check',
            error: 'document-x',
            info: 'document-info',
            warning: 'document-alert'
        };
        return iconMap[type] || iconMap.info;
    }

    /**
     * Anuncia el contenido a lectores de pantalla
     */
    function announceToScreenReader(message, type) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = `${TITLES[type]}: ${message}`;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    // ================================
    // FUNCIONES ADICIONALES
    // ================================
    
    /**
     * Cierra todos los toasts activos
     */
    function clearAllToasts() {
        Array.from(activeToasts.keys()).forEach(closeToast);
    }

    /**
     * Obtiene la cantidad de toasts activos
     */
    function getActiveToastCount() {
        return activeToasts.size;
    }

    /**
     * Verifica si un toast específico está activo
     */
    function isToastActive(toastId) {
        return activeToasts.has(toastId);
    }

    // ================================
    // EXPORTAR API PÚBLICA
    // ================================
    
    // Función principal
    window.showDocsToast = showDocsToast;
    
    // Namespace con utilidades adicionales
    window.DocsToastManager = {
        show: showDocsToast,
        clearAll: clearAllToasts,
        getActiveCount: getActiveToastCount,
        isActive: isToastActive,
        version: '1.0.0'
    };

    // Estilos CSS para accesibilidad
    if (!document.querySelector('.sr-only-styles')) {
        const style = document.createElement('style');
        style.className = 'sr-only-styles';
        style.textContent = `
            .sr-only {
                position: absolute !important;
                width: 1px !important;
                height: 1px !important;
                padding: 0 !important;
                margin: -1px !important;
                overflow: hidden !important;
                clip: rect(0, 0, 0, 0) !important;
                white-space: nowrap !important;
                border: 0 !important;
            }
        `;
        document.head.appendChild(style);
    }

    console.log('[DocsToast] Sistema de notificaciones del módulo de documentos inicializado');

})(window);