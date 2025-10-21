// TICKETS-VALIDATOR.JS - Validador centralizado para el módulo de Tickets
// Usa showTicketsToast (shim de toast premium) para mostrar errores/avisos
(function(){
  'use strict';

  const ALLOWED_ESTADOS = new Set([
    'Almacén','Capturado','Programado/Asignado','Abierto','En Proceso','Cerrado'
  ]);

  function req(v){ return v!=null && String(v).trim()!==''; }
  function lenBetween(v,min,max){ const s=String(v||'').trim(); return s.length>=min && s.length<=max; }
  function folioOk(f){ return /^[A-Z0-9\-]{6,20}$/.test(String(f||'').trim()); }
  function estadoOk(e){ return ALLOWED_ESTADOS.has(String(e||'').trim()); }
  function show(msg,type){ if (typeof window.showTicketsToast==='function') window.showTicketsToast(String(msg||''), type||'error'); else console.error('[TicketsValidator]', msg); }

  const TicketsValidator = {
    // Validación para registrar (espera mayúsculas en payload para backend)
    validarRegistroFromForm(form){
      if(!form) return true;
      const folio = form.querySelector('#folio')?.value;
      const descripcion = form.querySelector('#descripcion')?.value;
      const estado = form.querySelector('#estado')?.value;
      const responsable = form.querySelector('#responsable')?.value;

      if(!req(folio)){ show('El folio es obligatorio.','error'); return false; }
      if(!folioOk(folio)){ show('El folio debe tener 6-20 caracteres alfanuméricos (A-Z, 0-9 y guiones).','error'); return false; }
      if(!req(descripcion) || !lenBetween(descripcion,10,2000)){ show('La descripción debe tener entre 10 y 2000 caracteres.','error'); return false; }
      if(!req(responsable) || !lenBetween(responsable,1,100)){ show('El responsable es obligatorio (máx. 100 caracteres).','error'); return false; }
      if(!req(estado) || !estadoOk(estado)){ show('Debe seleccionar un estado válido.','error'); return false; }
      return true;
    },

    // Validación para actualizar (backend espera minúsculas en payload)
    validarActualizacionFromForm(form){
      // Las reglas son idénticas al registro
      return this.validarRegistroFromForm(form);
    },

    // Validar búsqueda por folio
    validarBusquedaFolio(folio){
      if(!req(folio)){ show('Por favor ingrese un folio para buscar.','error'); return false; }
      if(!folioOk(folio)){ show('El folio debe tener 6-20 caracteres alfanuméricos (A-Z, 0-9 y guiones).','error'); return false; }
      return true;
    },

    // Validación de filtros de la tabla
    validarFiltrosTabla(filtros){
      const { texto, estado } = filtros||{};
      if (estado && !estadoOk(estado)) { show('Estado de filtro inválido.','error'); return false; }
      if (texto && String(texto).length<2) { show('Use al menos 2 caracteres para filtrar por texto.','warning'); }
      return true;
    }
  };

  window.TicketsValidator = TicketsValidator;
  console.log('[TicketsValidator] listo');
})();
