/* form-ux-validators.js
   Validadores/transformaciones específicas para formularios SWGROI.
   - Auto uppercase para campos de folio
   - Formateo ligero para montos (display only)
   - Hooks para validaciones personalizadas (exposed en window.formUxValidators)
*/
(function(){
  function toUppercaseOnInput(el){
    if(!el) return;
    el.addEventListener('input', function(){
      const start = el.selectionStart, end = el.selectionEnd;
      el.value = (el.value || '').toUpperCase();
      try{ el.setSelectionRange(start, end); }catch(e){}
    });
  }

  function formatNumberOnBlur(el){
    if(!el) return;
    el.addEventListener('blur', function(){
      const v = el.value || '';
      if(v === '') return;
      const n = Number(v);
      if(isNaN(n)) return;
      // Mantener el valor del input como número (no cambiar input.value si es number), pero mostrar con toLocaleString en data-display
      try{ el.dataset.display = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      catch(e){ el.dataset.display = n.toFixed(2); }
    });
    el.addEventListener('focus', function(){ if(el.dataset.display) { el.dataset.display = ''; } });
  }

  function attachDefaults(root=document){
    // Folio fields: id or name contains 'folio'
    const folios = root.querySelectorAll('input[id*="folio" i], input[name*="folio" i]');
    for(const f of folios) toUppercaseOnInput(f);

    // Monto fields
    const montos = root.querySelectorAll('input[type="number"][id*="monto" i], input[id*="monto" i]');
    for(const m of montos) formatNumberOnBlur(m);
  }

  document.addEventListener('DOMContentLoaded', function(){ attachDefaults(document); const obs = new MutationObserver((mut)=>{ for(const m of mut){ for(const n of m.addedNodes){ if(n.nodeType===1) attachDefaults(n); } } }); obs.observe(document.body, { childList:true, subtree:true }); });

  window.formUxValidators = { attachDefaults, toUppercaseOnInput, formatNumberOnBlur };
})();
