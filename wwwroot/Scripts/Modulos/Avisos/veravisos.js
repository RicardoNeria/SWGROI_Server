// veravisos: listado con filtros, orden y paginación (3 columnas)
let VV_STATE = { page: 1, pageSize: 20, sort: 'Fecha', dir: 'DESC', desde: '', hasta: '', asunto: '' };

document.addEventListener('DOMContentLoaded', () => {
  const filtroDesde = document.getElementById('filtroDesde');
  const filtroHasta = document.getElementById('filtroHasta');
  const filtroAsunto = document.getElementById('filtroAsunto');
  const btnBuscar = document.getElementById('btnBuscar');
  const btnLimpiar = document.getElementById('btnLimpiar');
  const selSort = document.getElementById('selSort');
  const selDir = document.getElementById('selDir');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  btnBuscar?.addEventListener('click', () => {
    const d = filtroDesde.value.trim(); const h = filtroHasta.value.trim();
    if (d && h && new Date(d) > new Date(h)) { mostrar('El rango de fechas es inválido (Desde > Hasta).', 'warn'); return; }
    VV_STATE.desde = d; VV_STATE.hasta = h; VV_STATE.asunto = filtroAsunto.value.trim(); VV_STATE.page = 1; cargar();
  });
  btnLimpiar?.addEventListener('click', () => { filtroDesde.value = ''; filtroHasta.value=''; filtroAsunto.value=''; VV_STATE = { page:1, pageSize:20, sort: selSort.value, dir: selDir.value, desde:'', hasta:'', asunto:'' }; cargar(); });
  selSort?.addEventListener('change', () => { VV_STATE.sort = selSort.value; VV_STATE.page=1; cargar(); });
  selDir?.addEventListener('change', () => { VV_STATE.dir = selDir.value; VV_STATE.page=1; cargar(); });
  btnPrev?.addEventListener('click', () => { if (VV_STATE.page>1){ VV_STATE.page--; cargar(); } });
  btnNext?.addEventListener('click', () => { VV_STATE.page++; cargar(); });

  cargar();
});

function cargar(){
  const p = new URLSearchParams();
  if (VV_STATE.desde) p.set('desde', VV_STATE.desde);
  if (VV_STATE.hasta) p.set('hasta', VV_STATE.hasta);
  if (VV_STATE.asunto) p.set('asunto', VV_STATE.asunto);
  p.set('page', VV_STATE.page); p.set('pageSize', VV_STATE.pageSize); p.set('sort', VV_STATE.sort); p.set('dir', VV_STATE.dir);
  const loader = document.getElementById('tablaLoader'); if (loader) loader.style.display='block';
  fetch('/avisos?' + p.toString())
    .then(r=>r.text())
    .then(t=>{
      let data=null; try{ data = JSON.parse(t); }catch{}
      if (!data) throw new Error('Respuesta inválida del servidor');
      if (Array.isArray(data)) data = { items: data, total: data.length, page: 1, pageSize: data.length };
      render(data.items||[]); paginacion(data.total||0, data.page||VV_STATE.page, data.pageSize||VV_STATE.pageSize);
    })
    .catch((e)=> mostrar(e.message || 'Error al cargar avisos.', 'error'))
    .finally(()=>{ if (loader) loader.style.display='none'; });
}

function render(items){
  const tbody = document.getElementById('tablaAvisos');
  tbody.innerHTML = '';
  const hoy = new Date();
  if (!items || items.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.colSpan = 3; td.textContent = 'No hay avisos para los filtros seleccionados.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  items.forEach(a=>{
    const tr = document.createElement('tr');
    const tdF = document.createElement('td'); tdF.textContent = a.Fecha || '';
    const tdA = document.createElement('td'); tdA.textContent = a.Asunto || '';
    const tdM = document.createElement('td'); tdM.textContent = a.Mensaje || ''; tdM.title = a.Mensaje || '';

    // Badge "nuevo" si es de las últimas 48h
    try{
      const f = new Date(String(a.Fecha||'').replace(' ', 'T'));
      const diff = (hoy - f) / 36e5; // horas
      if (!isNaN(diff) && diff <= 48){
        const b = document.createElement('span'); b.className='badge badge--new'; b.textContent='nuevo'; tdA.appendChild(document.createTextNode(' ')); tdA.appendChild(b);
      }
    }catch{}

    tr.appendChild(tdF); tr.appendChild(tdA); tr.appendChild(tdM);
    tbody.appendChild(tr);
  });
}

function paginacion(total, page, pageSize){
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const lbl = document.getElementById('lblPaginacion'); if (lbl) lbl.textContent = `Página ${page} de ${maxPage} · ${total} avisos`;
  const prev = document.getElementById('btnPrev'); if (prev) prev.disabled = page<=1;
  const next = document.getElementById('btnNext'); if (next) next.disabled = page>=maxPage;
  VV_STATE.page = page; VV_STATE.pageSize = pageSize;
}

function mostrar(msg, tipo){
  const barra = document.getElementById('leyenda'); if (!barra) return;
  barra.className = 'leyenda';
  if (tipo==='error') barra.classList.add('leyenda--error');
  else if (tipo==='warn') barra.classList.add('leyenda--warn');
  else if (tipo==='info') barra.classList.add('leyenda--info');
  barra.textContent = msg; barra.style.display='block'; clearTimeout(barra._t); barra._t=setTimeout(()=>{barra.style.display='none';},4000);
}
