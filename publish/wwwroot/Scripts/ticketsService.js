// TICKETS-SERVICE.JS - Capa de servicio (frontend) para llamadas del módulo de Tickets
// Estandariza fetch, encabezados y rutas.
(function(){
  'use strict';

  function getCookie(name){
    try{
      const v = document.cookie.split('; ').find(c => c.startsWith(name+'='));
      return v ? decodeURIComponent(v.split('=')[1]) : '';
    }catch{ return ''; }
  }

  const cfg = {
    base: '', // por si se requiere prefijo en despliegues futuros
    endpoints: {
      tickets: '/tickets',
      actualizar: '/tickets/actualizar',
      eliminar: '/tickets/eliminar',
      seguimiento: '/seguimiento'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  async function http(url, options){
    const csrf = getCookie('csrftoken');
    const headers = { ...cfg.headers, ...(options?.headers||{}) };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    const res = await fetch(url, { credentials:'include', headers, ...options });
    const ct = res.headers.get('content-type')||'';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if(!res.ok){ const msg = (data && (data.error||data.mensaje||data.message)) || `Error ${res.status}`; throw new Error(msg); }
    return data;
  }

  const TicketsService = {
    // GET seguimiento por folio (o listado completo si backend lo permite)
    async getSeguimiento(folio){
      const q = folio ? (`?folio=${encodeURIComponent(folio)}`) : '';
      return http(cfg.base + cfg.endpoints.seguimiento + q, { method:'GET' });
    },

    // POST registrar ticket (backend espera claves con mayúsculas)
    async registrarTicket({ Folio, Descripcion, Estado, Responsable, Comentario, TipoAsunto }){
      const payload = { Folio, Descripcion, Estado, Responsable, Comentario: Comentario||'', TipoAsunto: TipoAsunto||'' };
      return http(cfg.base + cfg.endpoints.tickets, { method:'POST', body: JSON.stringify(payload) });
    },

    // POST actualizar (backend espera minúsculas)
    async actualizarTicket({ folio, descripcion, estado, responsable, tipoAsunto }){
      const payload = { folio, descripcion, estado, responsable, tipoAsunto };
      return http(cfg.base + cfg.endpoints.actualizar, { method:'POST', body: JSON.stringify(payload) });
    },

    // POST eliminar
    async eliminarTicket(folio){
      return http(cfg.base + cfg.endpoints.eliminar, { method:'POST', body: JSON.stringify({ folio }) });
    }
  };

  window.TicketsService = TicketsService;
  console.log('[TicketsService] listo');
})();
