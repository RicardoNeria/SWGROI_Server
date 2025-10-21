/**
 * TOAST-PREMIUM.JS - Core unificado de notificaciones estilo premium
 * API: ToastPremium.show(message, type = 'info', options?)
 * options: { title?, duration?, closable?, progress?, icon?, theme? }
 */
(function(window){
  'use strict';

  const CONFIG = {
    CONTAINER_ID: 'toast-container-premium',
    TOAST_CLASS: 'tpr-toast',
    VISIBLE_CLASS: 'tpr-toast--visible',
    LEAVING_CLASS: 'tpr-toast--leaving',
    DEFAULT_DURATION: 6000,
    MAX_TOASTS: 4,
    EXIT_ANIM_MS: 300
  };

  const TITLES = { success: 'Operación exitosa', error: 'Error', info: 'Información', warning: 'Advertencia' };
  const THEMES = {
    success: { stripe:'#1fa774', tile:'#0f766e', text:'#0b3b2e', sub:'#23505a' },
    error:   { stripe:'#e11d48', tile:'#b91c1c', text:'#7f1d1d', sub:'#6b1d1d' },
    info:    { stripe:'#2563eb', tile:'#1d4ed8', text:'#0b3b2e', sub:'#23505a' },
    warning: { stripe:'#f59e0b', tile:'#d97706', text:'#7a4b00', sub:'#6a5a00' }
  };

  let seq = 0; const active = new Map();

  function show(message, type = 'info', options = {}){
    if (!message || typeof message !== 'string') return null;
    if (!THEMES[type]) type = 'info';

    const opts = {
      title: options.title === undefined ? TITLES[type] : options.title,
      duration: options.duration ?? CONFIG.DEFAULT_DURATION,
      closable: options.closable !== false,
      progress: options.progress !== false,
      icon: options.icon || null,
      iconName: options.iconName || 'document',
      theme: THEMES[type],
    };

    ensureStyles();
    const container = ensureContainer();
    if (active.size >= CONFIG.MAX_TOASTS){
      const oldest = active.keys().next().value; close(oldest);
    }

  const id = ++seq; const el = buildToastEl(id, message, type, opts);
    container.appendChild(el);
    const control = { id, element: el, close: () => close(id), isVisible: () => active.has(id) };
    active.set(id, control);
    requestAnimationFrame(() => el.classList.add(CONFIG.VISIBLE_CLASS));
    if (opts.duration > 0){ setTimeout(() => close(id), opts.duration); }
    announce(`${opts.title ? opts.title+': ' : ''}${message}`);
    return control;
  }

  function buildToastEl(id, message, type, opts){
    const t = document.createElement('div'); t.className = `${CONFIG.TOAST_CLASS} ${type}`; t.setAttribute('role','alert'); t.dataset.toastId = String(id);
    // Left stripe via pseudo element is in CSS; we also set CSS vars for theme
    t.style.setProperty('--tpr-stripe', opts.theme.stripe);
    t.style.setProperty('--tpr-tile', opts.theme.tile);
    t.style.setProperty('--tpr-text', opts.theme.text);
    t.style.setProperty('--tpr-sub', opts.theme.sub);

    const closeBtn = document.createElement('button'); closeBtn.className='tpr-toast__close'; closeBtn.type='button'; closeBtn.setAttribute('aria-label','Cerrar'); closeBtn.innerHTML='✕';
    if (opts.closable){ closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); close(id); }); t.appendChild(closeBtn); }

    const iconTile = document.createElement('div'); iconTile.className='tpr-toast__icon-tile';
    // Soporte de icon loader si existe
    if (!opts.icon && window.UI && typeof window.UI.loadIcon === 'function') {
      try { window.UI.loadIcon(iconTile, opts.iconName || 'document'); } catch(_e){ iconTile.innerHTML = defaultIcon(type); }
    } else {
      iconTile.innerHTML = opts.icon || defaultIcon(type);
    }
    t.appendChild(iconTile);

    const content = document.createElement('div'); content.className='tpr-toast__content';
    if (opts.title !== false){ const title = document.createElement('div'); title.className='tpr-toast__title'; title.textContent = opts.title || ''; content.appendChild(title); }
    const body = document.createElement('div'); body.className='tpr-toast__message'; body.textContent = message; content.appendChild(body);
    t.appendChild(content);

    if (opts.progress && opts.duration>0){ const bar = document.createElement('div'); bar.className='tpr-toast__progress'; const fill = document.createElement('div'); fill.className='tpr-toast__progress-bar'; fill.style.animationDuration = `${opts.duration}ms`; bar.appendChild(fill); t.appendChild(bar); }
    return t;
  }

  function close(id){ const c = active.get(id); if(!c) return; const el = c.element; el.classList.add(CONFIG.LEAVING_CLASS); setTimeout(()=>{ if(el.parentNode) el.parentNode.removeChild(el); active.delete(id); }, CONFIG.EXIT_ANIM_MS); }

  function ensureContainer(){ let c = document.getElementById(CONFIG.CONTAINER_ID); if (!c){ c = document.createElement('div'); c.id = CONFIG.CONTAINER_ID; c.setAttribute('aria-live','polite'); document.body.appendChild(c);} return c; }

  function ensureStyles(){ if (document.querySelector('.tpr-styles')) return; const s = document.createElement('style'); s.className='tpr-styles'; s.textContent = `
    #${CONFIG.CONTAINER_ID}{position:fixed;right:1.25rem;top:1.25rem;z-index:9999;display:flex;flex-direction:column;gap:0.9rem;padding:0.25rem;pointer-events:none}
    .${CONFIG.TOAST_CLASS}{position:relative;pointer-events:auto;display:flex;align-items:flex-start;gap:1rem;min-width:340px;max-width:560px;padding:1.1rem 1.25rem;border-radius:18px;background:#ffffff;box-shadow:0 24px 46px rgba(2,6,23,.14);opacity:0;transform:translateY(-12px);transition:transform 320ms cubic-bezier(.2,.9,.2,1),opacity 220ms ease}
    .${CONFIG.TOAST_CLASS}::before{content:'';position:absolute;left:12px;top:12px;bottom:12px;width:6px;border-radius:8px;background:var(--tpr-stripe,#0f766e)}
    .${CONFIG.TOAST_CLASS}.${'success'}::before{background:var(--tpr-stripe)}
    .${CONFIG.TOAST_CLASS}.${'error'}::before{background:var(--tpr-stripe)}
    .${CONFIG.TOAST_CLASS}.${'info'}::before{background:var(--tpr-stripe)}
    .${CONFIG.TOAST_CLASS}.${'warning'}::before{background:var(--tpr-stripe)}
  .${CONFIG.TOAST_CLASS} .tpr-toast__icon-tile{flex:0 0 56px;height:56px;width:56px;border-radius:14px;background:var(--tpr-tile,#0f766e);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -2px 6px rgba(0,0,0,.1)}
  .${CONFIG.TOAST_CLASS} .tpr-toast__icon-tile svg{display:block}
  .${CONFIG.TOAST_CLASS} .tpr-toast__content{flex:1;color:var(--tpr-sub,#23505a)}
  .${CONFIG.TOAST_CLASS} .tpr-toast__title{font-weight:700;color:var(--tpr-text,#0b3b2e);margin-bottom:.25rem;font-size:1.02rem}
    .${CONFIG.TOAST_CLASS} .tpr-toast__message{font-size:.97rem;line-height:1.3}
  .${CONFIG.TOAST_CLASS} .tpr-toast__close{position:absolute;left:-14px;top:10px;height:28px;width:28px;border-radius:8px;border:0;background:#eef2f7;color:#64748b;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,.06)}
  .${CONFIG.TOAST_CLASS} .tpr-toast__close:hover{filter:brightness(.98)}
    .${CONFIG.TOAST_CLASS} .tpr-toast__progress{height:6px;background:#f1f5f9;border-radius:999px;margin-top:.75rem;overflow:hidden}
    .${CONFIG.TOAST_CLASS} .tpr-toast__progress-bar{height:100%;background:linear-gradient(90deg,#4caf50,#2e7d32);animation-name:tprProgress;animation-timing-function:linear}
    .${CONFIG.TOAST_CLASS}.${CONFIG.VISIBLE_CLASS}{opacity:1}
    .${CONFIG.TOAST_CLASS}.${CONFIG.LEAVING_CLASS}{opacity:0;transform:translateY(-8px)}
    @keyframes tprProgress{from{width:100%}to{width:0%}}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  `; document.head.appendChild(s); }

  function defaultIcon(type){
    // simple inline SVG document icon; color filled white
    const svgDoc = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="white" fill-opacity=".95"/><path d="M14 2v6h6" fill="none" stroke="white" stroke-opacity=".95" stroke-width="2"/></svg>';
    return svgDoc;
  }

  function announce(text){ const a = document.createElement('div'); a.setAttribute('aria-live','assertive'); a.className='sr-only'; a.textContent=text; document.body.appendChild(a); setTimeout(()=>{ try{ document.body.removeChild(a);}catch{} }, 900); }

  window.ToastPremium = { show, clearAll: () => { Array.from(active.keys()).forEach(close); } };
  console.log('[ToastPremium] listo');
})(window);
