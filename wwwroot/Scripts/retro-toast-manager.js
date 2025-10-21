/**
 * RETRO-TOAST-MANAGER.JS - Gestor de Notificaciones Toast
 * Módulo de Retroalimentación CCC - SWGROI
 * Sistema de notificaciones profesional y no intrusivo
 */

(function(window) {
    'use strict';

    // ================================
    // CONFIGURACIÓN Y CONSTANTES
    // ================================
    
    const CONFIG = {
        CONTAINER_ID: 'toast-container-retro',
        TOAST_CLASS: 'toast-retro',
        VISIBLE_CLASS: 'toast-retro--visible',
        LEAVING_CLASS: 'toast-retro--leaving',
        DEFAULT_DURATION: 6000,
        MAX_TOASTS: 4,
        ANIMATION_DURATION: 500,
        EXIT_ANIMATION_DURATION: 400,
        ICON_ANIMATION_DELAY: 200,
        CONTENT_ANIMATION_DELAY: 300
    };

    const ICONS = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    const TITLES = {
        success: 'Operación Exitosa',
        error: 'Error Detectado',
        info: 'Información',
        warning: 'Atención Requerida'
    };

    // ================================
    // VARIABLES GLOBALES
    // ================================
    
    let toastCount = 0;
    let activeToasts = new Map();

    // ================================
    // FUNCIÓN PRINCIPAL
    // ================================
    
    /**
     * Muestra una notificación Toast
     * @param {string} message - Mensaje principal a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @param {number|Object} durationOrOptions - Duración en ms o objeto de opciones
     * @returns {Object} Objeto con métodos para controlar el toast
     */
    function showRetroToast(message, type = 'info', durationOrOptions = CONFIG.DEFAULT_DURATION) {
        // Procesar opciones
        const options = typeof durationOrOptions === 'number' 
            ? { duration: durationOrOptions }
            : Object.assign({
                duration: CONFIG.DEFAULT_DURATION,
                title: null,
                closable: true,
                showProgress: false,
                onClick: null
            }, durationOrOptions || {});

        // Validar parámetros
        if (!message || typeof message !== 'string') {
            console.warn('RetroToast: mensaje requerido');
            return null;
        }

        if (!['success', 'error', 'info', 'warning'].includes(type)) {
            console.warn('RetroToast: tipo inválido, usando "info"');
            type = 'info';
        }

        // Crear container si no existe
        ensureContainer();

        // Limpiar toasts antiguos si hay demasiados
        cleanupOldToasts();

        // Crear el toast
        const toastId = ++toastCount;
        const toastElement = createToastElement(toastId, message, type, options);
        
        // Añadir al container
        const container = document.getElementById(CONFIG.CONTAINER_ID);
        container.appendChild(toastElement);

        // Registrar toast activo
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
        if (options.duration > 0) {
            setTimeout(() => {
                closeToast(toastId);
            }, options.duration);
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
            container.setAttribute('aria-label', 'Notificaciones del sistema');
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
        icon.className = 'toast-retro__icon';
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
        content.className = 'toast-retro__content';

        // Título con tipografía mejorada
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'toast-retro__title';
            title.textContent = options.title;
            content.appendChild(title);
        } else if (options.title !== false) {
            // Título por defecto basado en tipo
            const title = document.createElement('div');
            title.className = 'toast-retro__title';
            title.textContent = TITLES[type] || TITLES.info;
            content.appendChild(title);
        }

        // Mensaje con mejor legibilidad
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-retro__message';
        messageDiv.textContent = sanitizeText(message);
        content.appendChild(messageDiv);

        // Botón de cierre premium con micro-interacciones
        if (options.closable) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-retro__close';
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
        if (options.showProgress && options.duration > 0) {
            const progress = document.createElement('div');
            progress.className = 'toast-retro__progress';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'toast-retro__progress-bar';
            progressBar.style.animationDuration = `${options.duration}ms`;
            
            progress.appendChild(progressBar);
            toast.appendChild(progress);
        }

        // Click handler opcional
        if (options.onClick && typeof options.onClick === 'function') {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', (e) => {
                if (e.target.classList.contains('toast-retro__close')) return;
                options.onClick(e);
            });
        }

        // Ensamblar
        toast.appendChild(icon);
        toast.appendChild(content);

        return toast;
    }

    /**
     * Cierra un toast específico
     */
    function closeToast(id) {
        const toastControl = activeToasts.get(id);
        if (!toastControl) return;

        const element = toastControl.element;
        
        // Animación de salida
        element.classList.add(CONFIG.LEAVING_CLASS);
        
        // Remover después de la animación
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            activeToasts.delete(id);
        }, CONFIG.EXIT_ANIMATION_DURATION);
    }

    /**
     * Limpia toasts antiguos si hay demasiados
     */
    function cleanupOldToasts() {
        const activeToastIds = Array.from(activeToasts.keys());
        if (activeToastIds.length >= CONFIG.MAX_TOASTS) {
            // Cerrar los más antiguos
            const toastsToClose = activeToastIds
                .slice(0, activeToastIds.length - CONFIG.MAX_TOASTS + 1);
            toastsToClose.forEach(id => closeToast(id));
        }
    }

    /**
     * Mapea tipos a nombres de iconos para icon-loader
     */
    function getIconName(type) {
        const iconMap = {
            success: 'check',
            error: 'x',
            info: 'info',
            warning: 'warning'
        };
        return iconMap[type] || iconMap.info;
    }

    /**
     * Sanitiza texto para prevenir XSS
     */
    function sanitizeText(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[<>\"'&]/g, function(match) {
            const chars = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return chars[match];
        });
    }

    /**
     * Anuncia contenido a lectores de pantalla
     */
    function announceToScreenReader(message, type) {
        try {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            
            const prefix = TITLES[type] || '';
            announcement.textContent = `${prefix}: ${message}`;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                if (announcement.parentNode) {
                    announcement.parentNode.removeChild(announcement);
                }
            }, 1000);
        } catch (e) {
            // Fallar silenciosamente si hay problemas con accesibilidad
        }
    }

    // ================================
    // FUNCIONES DE CONVENIENCIA
    // ================================
    
    function showSuccessToast(message, options) {
        return showRetroToast(message, 'success', options);
    }

    function showErrorToast(message, options) {
        return showRetroToast(message, 'error', options);
    }

    function showInfoToast(message, options) {
        return showRetroToast(message, 'info', options);
    }

    function showWarningToast(message, options) {
        return showRetroToast(message, 'warning', options);
    }

    /**
     * Cierra todos los toasts activos
     */
    function closeAllToasts() {
        const activeToastIds = Array.from(activeToasts.keys());
        activeToastIds.forEach(id => closeToast(id));
    }

    /**
     * Obtiene el número de toasts activos
     */
    function getActiveToastCount() {
        return activeToasts.size;
    }

    // ================================
    // API PÚBLICA
    // ================================
    
    // Crear objeto global para el módulo de retroalimentación
    window.RetroToast = {
        show: showRetroToast,
        success: showSuccessToast,
        error: showErrorToast,
        info: showInfoToast,
        warning: showWarningToast,
        closeAll: closeAllToasts,
        getActiveCount: getActiveToastCount,
        
        // Configuración
        config: {
            setMaxToasts: (max) => { CONFIG.MAX_TOASTS = max; },
            setDefaultDuration: (duration) => { CONFIG.DEFAULT_DURATION = duration; }
        }
    };

    // También exponer función principal para compatibilidad
    window.showRetroToast = showRetroToast;

    // ================================
    // INTEGRACIÓN CON SISTEMAS EXISTENTES
    // ================================
    
    // Si existe el sistema SWGROI, integrarse
    if (window.SWGROI && window.SWGROI.UI) {
        window.SWGROI.UI.showRetroToast = showRetroToast;
        window.SWGROI.UI.RetroToast = window.RetroToast;
    }

    // Inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureContainer);
    } else {
        ensureContainer();
    }

})(window);