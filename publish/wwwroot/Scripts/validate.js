// validate.js: utilidades de validación homogéneas y manejo de errores en formularios.
(function(){
  const MSG = {
    required: 'Campo requerido',
    email: 'Email inválido',
    folio: 'Folio inválido (6-20 alfanumérico o -)',
    ovsr3: 'OVSR3 inválido (3-20 alfanumérico)',
    number: 'Número inválido',
    max: v => `Debe ser <= ${v}`,
    min: v => `Debe ser >= ${v}`,
    pattern: 'Formato inválido'
  };

  function qsel(s, r){ return (r||document).querySelector(s); }
  function qall(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }

  function showError(input, message){
    input.classList.add('is-invalid');
    let fb = input.nextElementSibling;
    if(!fb || !fb.classList || !fb.classList.contains('feedback')){
      fb = document.createElement('div');
      fb.className = 'feedback error'; input.after(fb);
    }
    fb.textContent = message || MSG.required;
  }
  function clearError(input){
    input.classList.remove('is-invalid');
    let fb = input.nextElementSibling;
    if(fb && fb.classList && fb.classList.contains('feedback')) fb.textContent = '';
  }

  function validateField(input){
    const v = (input.value||'').trim();
    const req = input.hasAttribute('required');
    const type = (input.getAttribute('data-type')||input.type||'text').toLowerCase();
    const max = input.getAttribute('max');
    const min = input.getAttribute('min');
    const pattern = input.getAttribute('pattern');

    if(req && !v){ showError(input, MSG.required); return false; }
    if(!v){ clearError(input); return true; }

    if(type==='email'){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ showError(input, MSG.email); return false; }
    }
    if(type==='number'){
      const n = Number(v); if(Number.isNaN(n)){ showError(input, MSG.number); return false; }
      if(max!==null && max!=='' && n>Number(max)){ showError(input, MSG.max(max)); return false; }
      if(min!==null && min!=='' && n<Number(min)){ showError(input, MSG.min(min)); return false; }
    }
    if(input.getAttribute('data-type')==='folio'){
      if(!/^[A-Z0-9\-]{6,20}$/.test(v.toUpperCase())){ showError(input, MSG.folio); return false; }
    }
    if(input.getAttribute('data-type')==='ovsr3'){
      if(!/^[A-Z0-9]{3,20}$/.test(v.toUpperCase())){ showError(input, MSG.ovsr3); return false; }
    }
    if(pattern){
      try{ if(!(new RegExp(pattern)).test(v)){ showError(input, MSG.pattern); return false; } }catch(e){}
    }

    clearError(input); return true;
  }

  function validateForm(form){
    const inputs = qall('input,select,textarea', form);
    let firstInvalid = null; let ok = true;
    inputs.forEach(inp => { if(!validateField(inp)){ ok=false; if(!firstInvalid) firstInvalid=inp; } });
    if(firstInvalid){ firstInvalid.focus(); }
    return ok;
  }

  // Auto-hook: data-validate form
  document.addEventListener('submit', function(ev){
    const f = ev.target; if(!(f && f.matches && f.matches('form[data-validate]'))) return;
    if(!validateForm(f)) ev.preventDefault();
  });

  window.validate = { field: validateField, form: validateForm, messages: MSG };
})();

