/**
 * AVISOS-TOAST-MANAGER.JS - Gestor de Notificaciones Toast (Módulo Avisos)
 * Inspirado en docs-toast-manager.js y retro-toast.css
 */
(function(window) {
  'use strict';

  // ================================
  // CONFIGURACIÓN Y CONSTANTES (AVISOS)
  // ================================
  const CONFIG = {
    CONTAINER_ID: 'toast-container-avisos',
    TOAST_CLASS: 'toast-avisos',
    VISIBLE_CLASS: 'toast-avisos--visible',
    LEAVING_CLASS: 'toast-avisos--leaving',
    DEFAULT_DURATION: 6000,
    MAX_TOASTS: 4,
    ANIMATION_DURATION: 500,
    EXIT_ANIMATION_DURATION: 400
  };

  const ICONS = {
    success: '✔',
    error: '✖',
    info: 'ℹ️',
    warning: '⚠'
  };

  const TITLES = {
    success: 'Operación exitosa',
    error: 'Error en Avisos',
    info: 'Información',
    warning: 'Atención'
  };

  // ================================
  // ESTADO
  // ================================
  let toastCounter = 0;
  const activeToasts = new Map();

  // ================================
  // API PÚBLICA
  // ================================
  function showAvisosToast(message, type = 'info', options = {}) {
    if (!message || typeof message !== 'string') {
      console.warn('[AvisosToast] Mensaje inválido:', message);
      return null;
    }

    if (!['success', 'error', 'info', 'warning'].includes(type)) {
      console.warn('[AvisosToast] Tipo inválido:', type, 'usando "info"');
      type = 'info';
    }

    const finalOptions = {
      title: options.title,
      duration: options.duration !== undefined ? options.duration : CONFIG.DEFAULT_DURATION,
      closable: options.closable !== false,
      progress: options.progress !== false,
      ...options
    };

    const container = ensureContainer();

    // Limpiar si excedemos
    if (activeToasts.size >= CONFIG.MAX_TOASTS) {
      const oldest = activeToasts.keys().next().value;
      closeToast(oldest);
    }

    const id = ++toastCounter;
    const toastEl = createToastElement(id, message, type, finalOptions);
    container.appendChild(toastEl);

    const control = {
      id,
      element: toastEl,
      close: () => closeToast(id),
      isVisible: () => activeToasts.has(id)
    };

    activeToasts.set(id, control);

    // Mostrar con animación
    requestAnimationFrame(() => {
      toastEl.classList.add(CONFIG.VISIBLE_CLASS);
    });

    // Auto-close
    if (finalOptions.duration > 0) {
      setTimeout(() => closeToast(id), finalOptions.duration);
    }

    // Anunciar a lectores de pantalla
    announceToScreenReader(message, type);

    return control;
  }

  // ================================
  // AUXILIARES
  // ================================
  function ensureContainer() {
    let container = document.getElementById(CONFIG.CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONFIG.CONTAINER_ID;
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', 'Notificaciones del módulo de avisos');
      document.body.appendChild(container);
    }
    return container;
  }

  function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
  }

  function createToastElement(id, message, type, options) {
    const toast = document.createElement('div');
    toast.className = `${CONFIG.TOAST_CLASS} ${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('data-toast-id', id);

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      toast.style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', () => {
      toast.style.animationPlayState = 'running';
    });

    const icon = document.createElement('div');
    icon.className = `${CONFIG.TOAST_CLASS}__icon`;
    icon.setAttribute('aria-hidden', 'true');
    if (window.UI && window.UI.loadIcon) {
      const iconName = getIconName(type);
      window.UI.loadIcon(icon, iconName);
    } else {
      icon.textContent = ICONS[type] || ICONS.info;
    }

    const content = document.createElement('div');
    content.className = `${CONFIG.TOAST_CLASS}__content`;

    // Title
    if (options.title) {
      const title = document.createElement('div');
      title.className = `${CONFIG.TOAST_CLASS}__title`;
      title.textContent = options.title;
      content.appendChild(title);
    } else if (options.title !== false) {
      const title = document.createElement('div');
      title.className = `${CONFIG.TOAST_CLASS}__title`;
      title.textContent = TITLES[type] || TITLES.info;
      content.appendChild(title);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `${CONFIG.TOAST_CLASS}__message`;
    messageDiv.textContent = sanitizeText(message);
    content.appendChild(messageDiv);

    // Close button
    if (options.closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = `${CONFIG.TOAST_CLASS}__close`;
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Cerrar notificación');
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeBtn.style.transform = 'scale(0.95)';
        setTimeout(() => closeToast(id), 80);
      });
      toast.appendChild(closeBtn);
    }

    // Progress bar
    if (options.progress && options.duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.className = `${CONFIG.TOAST_CLASS}__progress`;
      const progressFill = document.createElement('div');
      progressFill.className = `${CONFIG.TOAST_CLASS}__progress-bar`;
      progressFill.style.animationDuration = `${options.duration}ms`;
      progressBar.appendChild(progressFill);
      toast.appendChild(progressBar);
    }

    // Assemble
    toast.appendChild(icon);
    toast.appendChild(content);

    return toast;
  }

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

  function getIconName(type) {
    const iconMap = {
      success: 'check',
      error: 'x',
      info: 'info',
      warning: 'alert'
    };
    return iconMap[type] || iconMap.info;
  }

  function announceToScreenReader(message, type) {
    try {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'assertive');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `${TITLES[type]}: ${message}`;
      document.body.appendChild(announcement);
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    } catch (e) {
      // silent
    }
  }

  function clearAllToasts() {
    Array.from(activeToasts.keys()).forEach(closeToast);
  }

  function getActiveToastCount() {
    return activeToasts.size;
  }

  function isToastActive(toastId) {
    return activeToasts.has(toastId);
  }

  // Estilos sr-only (si no existen)
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

  // Exportar API
  window.showAvisosToast = showAvisosToast;
  window.AvisosToast = {
    show: showAvisosToast,
    clearAll: clearAllToasts,
    getActiveCount: getActiveToastCount,
    isActive: isToastActive,
    version: '1.0.0'
  };

  console.log('[AvisosToast] Inicializado (alineado con DocsToast)');

})(window);
