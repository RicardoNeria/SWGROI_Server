// TECNICOS-VALIDATOR.JS - Validador centralizado para Mesa de Control (Técnicos)
(function(){
  'use strict';

  const ESTADOS = new Set(['Almacén','Capturado','Programado/Asignado','Abierto','En Proceso','Cerrado']);
  function req(v){ return v!=null && String(v).trim()!==''; }
  function min(v,n){ return String(v||'').trim().length>=n; }
  function estadoOk(e){ return ESTADOS.has(String(e||'').trim()); }
  function toast(msg,type){ if (typeof window.showTecnicosToast==='function') window.showTecnicosToast(String(msg||''), type||'error'); else if (window.ToastPremium) ToastPremium.show(String(msg||''), type||'error'); else console.error('[TecnicosValidator]', msg); }

  const TecnicosValidator = {
    validarSeguimientoForm(form, ticketSeleccionado){
      const folio = ticketSeleccionado?.Folio;
      const comentario = form?.querySelector('#comentarioTecnico')?.value?.trim();
      const nuevoEstado = form?.querySelector('#nuevoEstado')?.value;

      if(!folio){ toast('Debe seleccionar un ticket de la tabla.','error'); return false; }
      if(!req(comentario)){ toast('El comentario técnico es obligatorio.','error'); return false; }
      if(!min(comentario,10)){ toast('El comentario debe tener al menos 10 caracteres.','error'); return false; }
      if(!req(nuevoEstado) || !estadoOk(nuevoEstado)){ toast('Debe seleccionar un nuevo estado válido.','error'); return false; }
      return true;
    },

    validarFiltros({ folio, estado, responsable }){
      if (estado && !estadoOk(estado)) { toast('Estado de filtro inválido.','error'); return false; }
      if (folio && String(folio).length<2) { toast('Use al menos 2 caracteres para filtrar por folio.','warning'); }
      if (responsable && String(responsable).length<2) { toast('Use al menos 2 caracteres para filtrar por responsable.','warning'); }
      return true;
    }
  };

  window.TecnicosValidator = TecnicosValidator;
  console.log('[TecnicosValidator] listo');
})();
