/**
 * VENTAS-TOAST-MANAGER.JS - Gestor de Notificaciones Toast
 * Módulo de Ventas CCC - SWGROI
 * Estructura premium idéntica a Documentos/Retro/Avisos
 */

(function(window){
  'use strict';

  // Configuración premium
  const CONFIG = {
    CONTAINER_ID: 'toast-container-ventas',
    TOAST_CLASS: 'toast-ventas',
    VISIBLE_CLASS: 'toast-ventas--visible',
    LEAVING_CLASS: 'toast-ventas--leaving',
    DEFAULT_DURATION: 6000,
    EXIT_ANIMATION_DURATION: 400,
    MAX_TOASTS: 4
  };

  let toastCounter = 0;
  const activeToasts = new Map();

  const ICONS = { success: '💼', error: '✕', info: 'ℹ', warning: '⚠' };
  const TITLES = { success: 'Operación Exitosa', error: 'Error Detectado', info: 'Información', warning: 'Atención Requerida' };

  function ensureContainer(){
    let c = document.getElementById(CONFIG.CONTAINER_ID);
    if(!c){
      c = document.createElement('div');
      c.id = CONFIG.CONTAINER_ID;
      c.setAttribute('aria-live','polite');
      c.setAttribute('aria-atomic','true');
      document.body.appendChild(c);
    }
    return c;
  }

  function sanitizeText(text){
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
  }

  function announce(message, type){
    try{
      const el = document.createElement('div');
      el.setAttribute('aria-live','polite');
      el.setAttribute('aria-atomic','true');
      el.style.position='absolute'; el.style.left='-10000px'; el.style.width='1px'; el.style.height='1px'; el.style.overflow='hidden';
      el.textContent = `${TITLES[type]||''}: ${message}`;
      document.body.appendChild(el);
      setTimeout(()=> el.remove(), 1000);
    }catch(_){ }
  }

  function cleanupOldToasts(){
    const ids = Array.from(activeToasts.keys());
    if(ids.length >= CONFIG.MAX_TOASTS){
      const toClose = ids.slice(0, ids.length - CONFIG.MAX_TOASTS + 1);
      toClose.forEach(closeToast);
    }
  }

  function createToastElement(id, message, type, options){
    const t = document.createElement('div');
    const kind = (type||'info').toLowerCase();
    const finalKind = ['success','error','warning','info'].includes(kind) ? kind : 'info';
  t.className = `${CONFIG.TOAST_CLASS} ${finalKind}`;
  const isAssertive = (finalKind === 'error' || finalKind === 'warning');
  t.setAttribute('role', isAssertive ? 'alert' : 'status');
  t.setAttribute('aria-live', isAssertive ? 'assertive' : 'polite');
    t.setAttribute('data-toast-id', id);

    const icon = document.createElement('div');
    icon.className = 'toast-ventas__icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent = ICONS[finalKind] || ICONS.info;

    const content = document.createElement('div');
    content.className = 'toast-ventas__content';

    if (options.title !== false){
      const title = document.createElement('div');
      title.className = 'toast-ventas__title';
      title.textContent = String(options.title || TITLES[finalKind] || 'Mensaje');
      content.appendChild(title);
    }

    const body = document.createElement('div');
    body.className = 'toast-ventas__message';
    body.textContent = sanitizeText(String(message||''));
    content.appendChild(body);

    let closeBtn = null;
    if (options.closable){
      closeBtn = document.createElement('button');
      closeBtn.className = 'toast-ventas__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label','Cerrar notificación');
      closeBtn.innerHTML = '✕';
      closeBtn.addEventListener('mouseenter', ()=> closeBtn.style.transform='scale(1.1) rotate(90deg)');
      closeBtn.addEventListener('mouseleave', ()=> closeBtn.style.transform='scale(1) rotate(0deg)');
      closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeBtn.style.transform='scale(.9) rotate(180deg)'; setTimeout(()=> closeToast(id), 100); });
      t.appendChild(closeBtn);
    }

    if ((options.showProgress || options.progress) && options.duration > 0){
      const prog = document.createElement('div');
      prog.className = 'toast-ventas__progress';
      const fill = document.createElement('div');
      fill.className = 'toast-ventas__progress-bar';
      fill.style.animationDuration = `${options.duration}ms`;
      prog.appendChild(fill);
      t.appendChild(prog);
    }

    if (typeof options.onClick === 'function'){
      t.style.cursor = 'pointer';
      t.addEventListener('click', (e)=>{ if(e.target===closeBtn) return; options.onClick(e); });
    }

    t.appendChild(icon);
    t.appendChild(content);
    return { element: t, closeBtn };
  }

  function closeToast(id){
    const ctl = activeToasts.get(id);
    if(!ctl) return;
    const el = ctl.element;
    el.classList.add(CONFIG.LEAVING_CLASS);
    setTimeout(()=>{
      if (el && el.parentNode) el.parentNode.removeChild(el);
      activeToasts.delete(id);
    }, CONFIG.EXIT_ANIMATION_DURATION);
  }

  function showVentasToast(message, type='info', durationOrOptions=CONFIG.DEFAULT_DURATION, titleMaybe){
    if(!message || typeof message !== 'string'){ console.warn('[VentasToast] Mensaje inválido'); return null; }
    let options = (typeof durationOrOptions === 'number') ? { duration: Math.max(0, durationOrOptions) } : { ...(durationOrOptions||{}) };
    options = Object.assign({ duration: CONFIG.DEFAULT_DURATION, title: undefined, closable: true, showProgress: false, onClick: null }, options);
    if (titleMaybe != null && options.title === undefined) options.title = titleMaybe;
    if (options.progress !== undefined && options.showProgress === false) options.showProgress = !!options.progress;

    ensureContainer();
    cleanupOldToasts();
    const toastId = ++toastCounter;
    const { element, closeBtn } = createToastElement(toastId, message, type, options);
    document.getElementById(CONFIG.CONTAINER_ID).appendChild(element);

    const control = { id: toastId, element, close: ()=> closeToast(toastId), isVisible: ()=> activeToasts.has(toastId) };
    activeToasts.set(toastId, control);

    requestAnimationFrame(()=> element.classList.add(CONFIG.VISIBLE_CLASS));

    let hideTimer = null;
    if (options.duration > 0) hideTimer = setTimeout(()=> closeToast(toastId), options.duration);
    if (closeBtn){
      closeBtn.addEventListener('click', ()=>{ if(hideTimer) clearTimeout(hideTimer); closeToast(toastId); });
      closeBtn.addEventListener('keydown', (ev)=>{ if(ev.key==='Escape'){ ev.preventDefault(); if(hideTimer) clearTimeout(hideTimer); closeToast(toastId); }});
    }

    announce(message, (type||'info').toLowerCase());
    return control;
  }

  const VentasToast = {
    show: showVentasToast,
    success: (msg, opts)=> showVentasToast(msg, 'success', opts),
    error: (msg, opts)=> showVentasToast(msg, 'error', opts),
    info: (msg, opts)=> showVentasToast(msg, 'info', opts),
    warning: (msg, opts)=> showVentasToast(msg, 'warning', opts),
    closeAll: ()=> { Array.from(activeToasts.keys()).forEach(closeToast); },
    getActiveCount: ()=> activeToasts.size,
    config: {
      setDefaultDuration: (ms)=> { if(Number.isFinite(ms) && ms>=0) CONFIG.DEFAULT_DURATION = ms; },
      setMaxToasts: (n)=> { if(Number.isFinite(n) && n>0) CONFIG.MAX_TOASTS = n; }
    }
  };

  window.VentasToast = VentasToast;
  window.showVentasToast = showVentasToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureContainer);
  } else {
    ensureContainer();
  }

  document.addEventListener('keydown', (ev)=>{
    if(ev.key === 'Escape' && activeToasts.size){
      const ids = Array.from(activeToasts.keys());
      const lastId = ids[ids.length - 1];
      closeToast(lastId);
    }
  });

})(window);
