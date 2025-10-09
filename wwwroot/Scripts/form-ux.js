/* form-ux.js
   Auto-mejora visual de formularios: añade clases `form-control`, zonas de feedback
   y validación en tiempo real para inputs/selects/textarea. Safe-by-default: no cambia
   ids ni valores, sólo añade elementos de UI auxiliares y clases.
*/
(function(){
  const uid = (()=>{ let c=0; return ()=> (++c); })();
  function debounce(fn, wait){ let t; return function(...a){ clearTimeout(t); t = setTimeout(()=> fn.apply(this,a), wait); }; }

  function ensureFeedback(input){
    if(!input) return null;
    // Add form-control class
    if(!input.classList.contains('form-control')) input.classList.add('form-control');

    // Add small icon span after the input if not exists
    let next = input.nextElementSibling;
    if(!(next && next.classList && next.classList.contains('field-icon'))){
      const span = document.createElement('span'); span.className = 'field-icon icon icon--sm'; span.setAttribute('aria-hidden','true');
      input.parentNode && input.parentNode.insertBefore(span, input.nextSibling);
    }

    // Add feedback div after input/icon
    const fbId = input.id ? `${input.id}Feedback` : `feedback-${uid()}`;
    let fb = null;
    // search for existing feedback by id or nextElement
    if(input.id) fb = document.getElementById(fbId);
    if(!fb){
      const sibling = input.nextElementSibling && input.nextElementSibling.nextElementSibling;
      if(sibling && sibling.classList && sibling.classList.contains('field-feedback')) fb = sibling;
    }
    if(!fb){ fb = document.createElement('div'); fb.className = 'field-feedback'; fb.id = fbId; fb.setAttribute('aria-live','polite'); input.parentNode && input.parentNode.insertBefore(fb, input.nextSibling ? input.nextSibling.nextSibling : null); }
    return fb;
  }

  function validateField(input){
    if(!input) return { valid:true, message: '' };
    const v = (input.value||'').trim();
    // required
    if(input.hasAttribute('required') && !v) return { valid:false, message:'Campo obligatorio' };
    // minlength/maxlength
    if(input.hasAttribute('minlength') && v.length < Number(input.getAttribute('minlength'))) return { valid:false, message:`Mínimo ${input.getAttribute('minlength')} caracteres` };
    if(input.hasAttribute('maxlength') && v.length > Number(input.getAttribute('maxlength'))) return { valid:false, message:`Máximo ${input.getAttribute('maxlength')} caracteres` };
    // pattern
    if(input.hasAttribute('pattern')){
      try{ const re = new RegExp(input.getAttribute('pattern')); if(v && !re.test(v)) return { valid:false, message:'Formato inválido' }; }catch(e){}
    }
    // type specific
    if(input.type === 'number'){
      const num = Number(v);
      if(v && isNaN(num)) return { valid:false, message:'Ingrese un número válido' };
      if(input.hasAttribute('min') && num < Number(input.getAttribute('min'))) return { valid:false, message:`Mínimo ${input.getAttribute('min')}` };
      if(input.hasAttribute('max') && num > Number(input.getAttribute('max'))) return { valid:false, message:`Máximo ${input.getAttribute('max')}` };
    }
    if(input.type === 'date'){
      if(v){ const d = new Date(v+'T00:00:00'); const today = new Date(); today.setHours(0,0,0,0); if(d > today) return { valid:false, message:'La fecha no puede ser futura' }; }
    }
    // common folio rule (look at id/name)
    const nameid = ((input.name||'') + ' ' + (input.id||'')).toLowerCase();
    if(nameid.includes('folio')){
      const re = /^[A-Z0-9\-]{6,20}$/;
      if(v && !re.test(v)) return { valid:false, message:'El folio debe tener 6–20 caracteres en mayúsculas y números' };
    }

    return { valid:true, message: '' };
  }

  function setState(input, valid, message){
    if(!input) return;
    const fb = ensureFeedback(input);
    if(valid){ input.classList.remove('is-invalid'); input.classList.add('is-valid'); if(fb){ fb.textContent = message || ''; fb.classList.remove('error'); fb.classList.add('success'); } }
    else { input.classList.remove('is-valid'); input.classList.add('is-invalid'); if(fb){ fb.textContent = message || ''; fb.classList.remove('success'); fb.classList.add('error'); } }
  }

  function enhanceInputs(root=document){
    const inputs = root.querySelectorAll('input,select,textarea');
    for(const input of inputs){
      // skip buttons/hidden
      if(input.type === 'button' || input.type === 'submit' || input.type === 'reset' || input.type === 'hidden') continue;
      // ensure feedback elements
      ensureFeedback(input);
      // attach listeners
      const onValidate = debounce(()=>{ const r = validateField(input); setState(input, r.valid, r.message); }, 250);
      input.addEventListener('input', onValidate);
      input.addEventListener('blur', ()=>{ const r = validateField(input); setState(input, r.valid, r.message); });
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    try{ enhanceInputs(document); }
    catch(e){ console.warn('form-ux init failed', e); }
    // Observe DOM additions (modals, dynamic forms)
    const obs = new MutationObserver((mutations)=>{
      for(const m of mutations){
        for(const n of m.addedNodes){ if(n.nodeType===1){ enhanceInputs(n); } }
      }
    });
    obs.observe(document.body, { childList:true, subtree:true });
  });

  // expose for debugging
  window.formUx = { enhanceInputs, validateField };

})();
