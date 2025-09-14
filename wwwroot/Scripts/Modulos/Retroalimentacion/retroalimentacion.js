(() => {
  const $ = (sel) => document.querySelector(sel);
  const folio = $('#folio');
  const btnGen = $('#btn-generar');
  const btnCopy = $('#btn-copiar');
  const out = $('#resultado');
  const folioBuscar = $('#folio-buscar');
  const btnBuscar = $('#btn-buscar');
  const respOut = $('#respuesta');
  const leyenda = $('#leyenda');

  function show(el, text) {
    if (!el) return; el.hidden = false; el.textContent = text;
  }

  function ok(msg){ try{ toastSuccess(msg); }catch{} }
  function err(msg){ try{ toastError(msg); }catch{} }

  if (btnGen) btnGen.addEventListener('click', async () => {
    const f = (folio.value || '').trim().toUpperCase();
    if (!/^[A-Z0-9\-]{6,20}$/.test(f)) { err('Folio inválido'); folio.focus(); return; }
    try {
      const r = await fetch('/retroalimentacion/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folio: f })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || 'Error');
      const linkAbs = `${location.protocol}//${location.host}${j.link}`;
      btnCopy.dataset.clip = linkAbs;
      show(out, `Token: ${j.token}\nLink: ${linkAbs}`);
      ok('Enlace generado');
    } catch (e) { err(e.message || 'Error generando enlace'); }
  });

  if (btnCopy) btnCopy.addEventListener('click', async () => {
    const s = btnCopy.dataset.clip || '';
    if (!s) { err('Nada para copiar'); return; }
    try { await navigator.clipboard.writeText(s); ok('Enlace copiado'); } catch { }
  });

  if (btnBuscar) btnBuscar.addEventListener('click', async () => {
    const f = (folioBuscar.value || '').trim().toUpperCase();
    if (!/^[A-Z0-9\-]{6,20}$/.test(f)) { err('Folio inválido'); folioBuscar.focus(); return; }
    try {
      const r = await fetch('/retroalimentacion/buscar?folio=' + encodeURIComponent(f));
      const j = await r.json();
      if (!j.ok) throw new Error(j.message || 'Error');
      if (!j.hasData) { show(respOut, 'Sin respuesta registrada.'); return; }
      show(respOut, JSON.stringify(j.data, null, 2));
      ok('Respuesta localizada');
    } catch (e) { err(e.message || 'Error en búsqueda'); }
  });
})();
﻿
