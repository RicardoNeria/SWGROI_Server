// UI utilidades: toasts, confirmación y validación de formularios
(function(){
  function createToast(msg, kind){
    const el = document.createElement('div');
    el.className = `toast toast--${kind}`;
    el.textContent = msg;
    document.body.appendChild(el);
    // fuerza reflow
    void el.offsetWidth; el.classList.add('toast--show');
    setTimeout(()=>{ el.classList.remove('toast--show'); setTimeout(()=> el.remove(), 200); }, 3000);
  }
  window.toastSuccess = function(msg){ createToast(msg||'Operación exitosa', 'success'); };
  window.toastError   = function(msg){ createToast(msg||'Ocurrió un error', 'error'); };

  window.confirmDialog = function(opts){
    const o = Object.assign({ title:'Confirmación', message:'¿Deseas continuar?', okText:'Aceptar', cancelText:'Cancelar', onOk:null }, opts||{});
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:9998;';
    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;max-width:420px;width:90%;padding:16px;box-shadow:0 4px 24px rgba(0,0,0,.2)';
    modal.innerHTML = `<h3 style="margin:0 0 8px 0">${o.title}</h3><p style="margin:0 0 16px 0">${o.message}</p>`;
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    const cancel = document.createElement('button'); cancel.className='ui-button ui-button--secondary'; cancel.textContent=o.cancelText;
    const ok = document.createElement('button'); ok.className='ui-button ui-button--primary'; ok.textContent=o.okText;
    actions.append(cancel, ok); modal.appendChild(actions); wrap.appendChild(modal); document.body.appendChild(wrap);
    cancel.onclick = ()=> wrap.remove();
    ok.onclick = ()=>{ try{ o.onOk && o.onOk(); }finally{ wrap.remove(); } };
  };

  // Validación genérica
  function fieldError(input, msg){
    input.classList.remove('is-valid');
    input.classList.add('is-invalid');
    let fb = input.parentElement && input.parentElement.querySelector('.ui-form-feedback');
    if(!fb){ 
      fb = document.getElementById(input.id + 'Feedback');
      if(!fb){
        fb = document.createElement('div');
        fb.className='ui-form-feedback';
        input.parentElement && input.parentElement.appendChild(fb);
      }
    }
    fb.textContent = msg;
    fb.classList.add('error');
  }
  
  function fieldOk(input){
    input.classList.remove('is-invalid');
    input.classList.add('is-valid');
    const fb = input.parentElement && input.parentElement.querySelector('.ui-form-feedback');
    if(fb){ fb.textContent=''; fb.classList.remove('error'); }
  }

  window.validateForm = function(form){
    let firstInvalid = null;
    const inputs = form.querySelectorAll('input,select,textarea');
    const today = new Date(); today.setHours(0,0,0,0);

    for(const input of inputs){
      const v = (input.value||'').trim();
      if(input.hasAttribute('required') && !v){ if(!firstInvalid) firstInvalid=input; fieldError(input, 'Campo obligatorio'); continue; }
      if(input.hasAttribute('minlength') && v.length < Number(input.getAttribute('minlength'))){ if(!firstInvalid) firstInvalid=input; fieldError(input, `Mínimo ${input.getAttribute('minlength')} caracteres`); continue; }
      if(input.hasAttribute('maxlength') && v.length > Number(input.getAttribute('maxlength'))){ if(!firstInvalid) firstInvalid=input; fieldError(input, `Máximo ${input.getAttribute('maxlength')} caracteres`); continue; }
      if(input.type==='number'){
        const num = Number(v);
        if(isNaN(num)){ if(!firstInvalid) firstInvalid=input; fieldError(input, 'Ingrese un número válido'); continue; }
        if(input.hasAttribute('min') && num < Number(input.getAttribute('min'))){ if(!firstInvalid) firstInvalid=input; fieldError(input, `Mínimo ${input.getAttribute('min')}`); continue; }
        if(input.hasAttribute('max') && num > Number(input.getAttribute('max'))){ if(!firstInvalid) firstInvalid=input; fieldError(input, `Máximo ${input.getAttribute('max')}`); continue; }
      }
      if(input.name && input.name.toLowerCase().includes('folio')){
        const re = /^[A-Z0-9\-]{6,20}$/; if(v && !re.test(v)){ if(!firstInvalid) firstInvalid=input; fieldError(input, 'El folio debe tener 6–20 caracteres alfanuméricos'); continue; }
      }
      if(input.type==='date'){
        const d = v ? new Date(v+'T00:00:00') : null;
        if(d && d > today){ if(!firstInvalid) firstInvalid=input; fieldError(input, 'La fecha no puede ser futura'); continue; }
      }
      fieldOk(input);
    }

    // Reglas cruzadas comunes: FechaAtencion >= Fecha
    const fecha = form.querySelector('[name="Fecha"], [id*="Fecha" i]');
    const fechaAt = form.querySelector('[name*="FechaAtencion" i], [id*="FechaAtencion" i]');
    if(fecha && fechaAt && fecha.value && fechaAt.value){
      const df = new Date(fecha.value+'T00:00:00');
      const da = new Date(fechaAt.value+'T00:00:00');
      if(da < df){ if(!firstInvalid) firstInvalid=fechaAt; fieldError(fechaAt, 'Fecha de atención debe ser posterior o igual'); }
    }

    if(firstInvalid){ firstInvalid.focus(); return false; }
    return true;
  };

  // Auto-bind: evitar submit si inválido
  document.addEventListener('DOMContentLoaded', function(){
    document.body.insertAdjacentHTML('beforeend', '<div id="live-region" aria-live="polite" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden"></div>');
    for(const form of document.querySelectorAll('form')){
      form.addEventListener('submit', function(ev){ if(!window.validateForm(form)){ ev.preventDefault(); window.toastError('Revisa los campos marcados'); } });
    }
    // Botones con estado de carga
    document.body.addEventListener('click', function(e){
      const b = e.target.closest('button[data-loading]'); if(!b) return;
      b.classList.add('ui-button--loading'); b.disabled=true; setTimeout(()=>{ b.classList.remove('ui-button--loading'); b.disabled=false; }, 2000);
    });

    // Footer global con enlaces de privacidad/términos.
    // Evitar desordenar el layout del login (body es flex): insertar dentro del contenedor cuando sea login.
    try {
      const footer = document.createElement('div');
      // Añadimos la clase login-footer para heredar estilos de autenticación cuando exista
      footer.className = 'ui-links-group ui-auth__footer';
      footer.innerHTML = '<a href="/privacidad.html" class="ui-link ui-link--secondary">Aviso de Privacidad</a> · <a href="/terminos.html" class="ui-link ui-link--secondary">Términos de Uso</a>';
      if (document.body.classList.contains('ui-auth-body')) {
        // Preferir el contenedor específico dentro de la tarjeta de login si existe
        const target = document.getElementById('loginFooter') || document.querySelector('.ui-auth-card') || document.querySelector('.ui-auth-page') || document.body;
        target.appendChild(footer);
      } else {
        document.body.appendChild(footer);
      }
    } catch {}
    // Intentar cargar mejora global de formularios (form-ux.js) de forma dinámica.
    try{
      const s = document.createElement('script'); s.src = '/Scripts/form-ux.js'; s.defer = true;
      s.onload = function(){ try{ const s2 = document.createElement('script'); s2.src = '/Scripts/form-ux-validators.js'; s2.defer=true; document.head.appendChild(s2);}catch(e){ console.warn('No se pudo cargar form-ux-validators.js', e); } };
      document.head.appendChild(s);
    }catch(e){ console.warn('No se pudo cargar form-ux.js', e); }

    // Contadores de caracteres unificados: insertar si faltan y observar nuevos textareas
    try {
      const DEFAULT_MAX = 2000;

      function ensureCounter(area){
        const group = area.closest('.ui-form-group') || area.parentElement;
        let counter = group && group.querySelector('.ui-form__counter');
        if (!counter) {
          counter = document.createElement('small');
          counter.className = 'ui-form__counter';
          const feedback = group && group.querySelector('.ui-form__feedback');
          const field = group && group.querySelector('.ui-form__field');
          if (feedback && feedback.parentElement === group) {
            feedback.insertAdjacentElement('afterend', counter);
          } else if (field) {
            field.insertAdjacentElement('afterend', counter);
          } else {
            area.insertAdjacentElement('afterend', counter);
          }
        }
        return counter;
      }

      function updateCounter(area, counter){
        const len = (area.value || '').length;
        const cap = DEFAULT_MAX;
        counter.textContent = `${len}/${cap}`;
      }

      function attachCounter(area){
        if (!area || area.dataset.counterInit === '1') return;
        const counter = ensureCounter(area);
        const handler = () => updateCounter(area, counter);
        area.addEventListener('input', handler);
        updateCounter(area, counter);
        area.dataset.counterInit = '1';
      }

      document.querySelectorAll('textarea').forEach(attachCounter);

      const mo = new MutationObserver((mutations) => {
        for(const m of mutations){
          m.addedNodes && m.addedNodes.forEach(node => {
            if(node.nodeType !== 1) return; // no elementos
            if(node.tagName === 'TEXTAREA') attachCounter(node);
            node.querySelectorAll && node.querySelectorAll('textarea').forEach(attachCounter);
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) { console.warn('No se pudieron inicializar contadores de caracteres', e); }
  });
})();

