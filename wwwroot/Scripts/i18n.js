// Carga ligera de i18n desde /Recursos/i18n/es.json si existe.
// Uso: i18n.t('clave', 'Texto por defecto')
(() => {
  const I18N_PATH = '/Recursos/i18n/es.json';
  const cache = Object.create(null);
  let loaded = false;
  async function load() {
    if (loaded) return;
    try {
      const r = await fetch(I18N_PATH, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        Object.assign(cache, j || {});
      }
    } catch {}
    loaded = true;
  }
  function get(obj, path) {
    try { return path.split('.').reduce((o,k)=> o && o[k], obj); } catch { return undefined; }
  }
  window.i18n = {
    t: (key, fallback) => {
      const v = get(cache, key);
      return (typeof v === 'string' && v) ? v : (fallback || key);
    },
    load
  };
  // precarga no bloqueante
  try { window.addEventListener('DOMContentLoaded', load, { once:true }); } catch {}
})();

