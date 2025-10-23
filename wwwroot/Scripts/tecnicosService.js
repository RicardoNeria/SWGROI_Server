// TECNICOS-SERVICE.JS - Capa de servicio para Mesa de Control (Técnicos)
(function(){
  'use strict';

  const cfg = {
    base: '',
    endpoints: {
      seguimiento: '/seguimiento',
      tecnicos: '/tecnicos' // reservado para futuras rutas específicas
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  async function http(url, options){
    const res = await fetch(url, { credentials: 'include', headers: { ...cfg.headers, ...(options?.headers||{}) }, ...options });
    const ct = res.headers.get('content-type')||'';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) { const msg = (data && (data.error||data.mensaje||data.message)) || `Error ${res.status}`; throw new Error(msg); }
    return data;
  }

  const TecnicosService = {
    async listarSeguimiento(){
      return http(cfg.base + cfg.endpoints.seguimiento, { method: 'GET' });
    },
    async actualizarEstado({ folio, nuevoEstado, comentario }){
      const payload = { folio, nuevoEstado, comentario };
      return http(cfg.base + cfg.endpoints.seguimiento, { method: 'POST', body: JSON.stringify(payload) });
    }
  };

  window.TecnicosService = TecnicosService;
  console.log('[TecnicosService] listo');
})();
