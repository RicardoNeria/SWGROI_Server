// Utilidades para el staff CCC: generar enlace por folio y consultar respuestas.
// Se puede usar desde la consola o integrar botones en páginas internas.
// Ejemplos:
//   RetroAdmin.generar('FOLIO123').then(console.log)
//   RetroAdmin.buscar('FOLIO123').then(console.log)
(function (w) {
  const ep = '/retroalimentacion';
  
  async function generar(folio) {
    const r = await fetch(ep + '?op=generar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': (document.cookie.match(/csrftoken=([^;]+)/)||[])[1] || ''
      },
      credentials: 'include',
      body: JSON.stringify({ ticket: folio })
    });
    if (!r.ok) throw new Error('No autorizado o error de servidor');
    return r.json();
  }
  
  async function buscar(folio) {
    const r = await fetch(ep + '?op=buscar&ticket=' + encodeURIComponent(folio), { 
      credentials: 'include' 
    });
    if (!r.ok) throw new Error('No autorizado o sin datos');
    return r.json();
  }
  
  w.RetroAdmin = { generar, buscar };
})(window);