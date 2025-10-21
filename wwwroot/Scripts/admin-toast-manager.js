/**
 * ADMIN-TOAST-MANAGER.JS - Gestor de Notificaciones Toast para módulo Admin
 * Basado en docs-toast-manager.js pero con mensajes y títulos adaptados
 */
(function(window) {
    'use strict';

    const CONFIG = {
        CONTAINER_ID: 'toast-container-admin',
        TOAST_CLASS: 'toast-admin',
        VISIBLE_CLASS: 'toast-admin--visible',
        LEAVING_CLASS: 'toast-admin--leaving',
        DEFAULT_DURATION: 5000,
        MAX_TOASTS: 4,
        ANIMATION_DURATION: 400,
        EXIT_ANIMATION_DURATION: 350
    };

    const ICONS = {
        success: '✔️',
        error: '⚠️',
        info: 'ℹ️',
        warning: '⚠️'
    };

    const TITLES = {
        success: 'Operación exitosa',
        error: 'Error',
        info: 'Información',
        warning: 'Advertencia'
    };

    let toastCounter = 0;
    let activeToasts = new Map();

    function showAdminToast(message, type = 'info', options = {}) {
        if (!message || typeof message !== 'string') { console.warn('[AdminToast] Mensaje inválido', message); return null; }
        if (!['success','error','info','warning'].includes(type)) type = 'info';

        const finalOptions = {
            title: options.title,
            duration: options.duration !== undefined ? options.duration : CONFIG.DEFAULT_DURATION,
            closable: options.closable !== false,
            progress: options.progress !== false,
            ...options
        };

        const container = ensureContainer();

        if (activeToasts.size >= CONFIG.MAX_TOASTS) {
            const oldest = activeToasts.keys().next().value;
            closeToast(oldest);
        }

        const id = ++toastCounter;
        const el = createToastElement(id, message, type, finalOptions);
        container.appendChild(el);

        const control = { id, element: el, close: () => closeToast(id), isVisible: () => activeToasts.has(id) };
        activeToasts.set(id, control);

        requestAnimationFrame(() => el.classList.add(CONFIG.VISIBLE_CLASS));

        if (finalOptions.duration > 0) {
            setTimeout(() => closeToast(id), finalOptions.duration);
        }

        announce(message, type);
        return control;
    }

    function ensureContainer() {
        let c = document.getElementById(CONFIG.CONTAINER_ID);
        if (!c) {
            c = document.createElement('div');
            c.id = CONFIG.CONTAINER_ID;
            c.setAttribute('aria-live', 'polite');
            c.setAttribute('aria-label', 'Notificaciones del módulo admin');
            document.body.appendChild(c);
        }
        return c;
    }

    function createToastElement(id, message, type, options) {
        const toast = document.createElement('div');
        toast.className = `${CONFIG.TOAST_CLASS} ${type}`;
        toast.setAttribute('role','alert');
        toast.setAttribute('data-toast-id', id);

        toast.addEventListener('mouseenter', () => { toast.style.animationPlayState = 'paused'; });
        toast.addEventListener('mouseleave', () => { toast.style.animationPlayState = 'running'; });

        const icon = document.createElement('div'); icon.className = 'toast-admin__icon';
        icon.setAttribute('aria-hidden','true');
        icon.textContent = ICONS[type] || ICONS.info;

        const content = document.createElement('div'); content.className = 'toast-admin__content';

        const titleDiv = document.createElement('div'); titleDiv.className = 'toast-admin__title';
        titleDiv.textContent = options.title === false ? '' : (options.title || TITLES[type] || '');
        if (titleDiv.textContent) content.appendChild(titleDiv);

        const msg = document.createElement('div'); msg.className = 'toast-admin__message'; msg.textContent = sanitize(message);
        content.appendChild(msg);

        if (options.closable) {
            const btn = document.createElement('button'); btn.className = 'toast-admin__close'; btn.type='button'; btn.setAttribute('aria-label','Cerrar'); btn.textContent='✕';
            btn.addEventListener('click', (e) => { e.preventDefault(); closeToast(id); });
            toast.appendChild(btn);
        }

        if (options.progress && options.duration > 0) {
            const progress = document.createElement('div'); progress.className='toast-admin__progress';
            const fill = document.createElement('div'); fill.className='toast-admin__progress-bar'; fill.style.animationDuration = `${options.duration}ms`;
            progress.appendChild(fill); toast.appendChild(progress);
        }

        toast.appendChild(icon); toast.appendChild(content);
        return toast;
    }

    function closeToast(id) {
        const c = activeToasts.get(id); if (!c) return;
        const el = c.element; el.classList.add(CONFIG.LEAVING_CLASS);
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); activeToasts.delete(id); }, CONFIG.EXIT_ANIMATION_DURATION);
    }

    function sanitize(t) { const d = document.createElement('div'); d.textContent = t; return d.textContent; }

    function announce(msg, type) {
        const a = document.createElement('div'); a.setAttribute('aria-live','assertive'); a.className='sr-only'; a.textContent = `${TITLES[type]}: ${msg}`;
        document.body.appendChild(a); setTimeout(() => { try{ document.body.removeChild(a);}catch{} }, 900);
    }

    window.AdminToastManager = { show: showAdminToast, clearAll: () => { Array.from(activeToasts.keys()).forEach(closeToast); }, version: '1.0.0' };

    // estilos inspirados en el diseño de ejemplo: tarjeta con borde izquierdo verde y sombra suave
    if (!document.querySelector('.toast-admin-styles')) {
        const style = document.createElement('style'); style.className = 'toast-admin-styles';
        style.textContent = `
            #toast-container-admin{position:fixed;right:1rem;top:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.75rem;padding:0.25rem;pointer-events:none}
            .toast-admin{pointer-events:auto;display:flex;align-items:flex-start;gap:0.75rem;min-width:300px;max-width:480px;padding:0.8rem;border-radius:12px;background:#ffffff;border-left:6px solid #e0f2f1;box-shadow:0 18px 40px rgba(2,6,23,0.12);opacity:0;transform:translateY(-12px);transition:transform 320ms cubic-bezier(.2,.9,.2,1),opacity 220ms ease}
            .toast-admin.success{border-left-color:#e6f4ea}
            .toast-admin.error{border-left-color:#fdecea}
            .toast-admin.info{border-left-color:#e8f0fe}
            .toast-admin.warning{border-left-color:#fff4e5}
            .toast-admin--visible{opacity:1;transform:translateY(0)}
            .toast-admin--leaving{opacity:0;transform:translateY(-8px)}
            .toast-admin__icon{flex:0 0 56px;height:56px;width:56px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(180deg, rgba(0,0,0,0.03), rgba(0,0,0,0.01));box-shadow:inset 0 -2px 6px rgba(0,0,0,0.02)}
            .toast-admin__content{flex:1;padding-top:2px}
            .toast-admin__title{font-weight:700;font-size:1rem;color:#0b3b2e;margin-bottom:0.15rem}
            .toast-admin__message{font-size:0.95rem;color:#23505a;line-height:1.25}
            .toast-admin__close{border:0;background:transparent;cursor:pointer;font-size:1rem;padding:0 0.25rem;color:rgba(0,0,0,0.45)}
            .toast-admin__close:focus{outline:2px solid rgba(0,0,0,0.08);border-radius:6px}
            .toast-admin__progress{height:6px;background:rgba(0,0,0,0.04);border-radius:999px;margin-top:8px;overflow:hidden}
            .toast-admin__progress-bar{height:100%;background:linear-gradient(90deg,#4caf50,#2e7d32);animation-name:progressAnim;animation-timing-function:linear}
            @keyframes progressAnim{from{width:100%}to{width:0%}}
            .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
        `;
        document.head.appendChild(style);
    }

    console.log('[AdminToast] Inicializado');

})(window);
