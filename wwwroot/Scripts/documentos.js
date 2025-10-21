// DocumentosManager - implementación final, limpia y autocontenida
(function (window) {
  'use strict';

  const defaults = {
    urls: {
      listar: '/documentos?op=listar',
      categorias: '/documentos?op=categorias',
      subir: '/documentos?op=subir',
      obtener: '/documentos?op=obtener',
      descargar: '/documentos?op=descargar',
      actualizar: '/documentos?op=actualizar',
      eliminar: '/documentos?op=eliminar',
      favorito: '/documentos?op=favorito'
    },
    pageSize: 10
  };

  const util = {
    qs: s => document.querySelector(s),
    qsa: s => Array.from(document.querySelectorAll(s)),
    toast(msg, type = 'info') {
      // 1) Preferir Toast Premium unificado
      if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
        try { window.ToastPremium.show(String(msg || ''), String(type || 'info'), { duration: 4000 }); return; } catch (_) {}
      }
      // 2) Fallback: sistema global SWGROI.UI
      if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
        window.SWGROI.UI.mostrarMensaje(msg, type, 'leyenda', 4000);
        return;
      }
      // 3) Fallback mínimo: contenedor local si existe
      const c = util.qs('#toastContainer'); if (!c) return; const t = document.createElement('div'); t.className = `ui-toast ui-toast--${type}`; t.textContent = msg; c.appendChild(t); setTimeout(() => t.classList.add('ui-toast--visible'), 20); setTimeout(() => { t.classList.remove('ui-toast--visible'); setTimeout(() => t.remove(), 300); }, 4000);
    },
    fmtBytes(b) { if (!b && b !== 0) return '0 B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']; const i = b > 0 ? Math.floor(Math.log(b) / Math.log(k)) : 0; return (b / Math.pow(k, i)).toFixed(i ? 1 : 0) + ' ' + sizes[i]; },
    esc(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  };

  // helper para íconos SVG inline (pequeños, accesibles)
  const svgIcon = (name) => {
    switch (name) {
      case 'star': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 .587l3.668 7.431L23.4 9.75l-5.7 5.555L19.335 24 12 19.897 4.665 24l1.635-8.695L.6 9.75l7.732-1.732L12 .587z" fill="currentColor"/></svg>`;
      case 'edit': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>`;
  case 'download': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 3v10.17l3.59-3.58L17 11l-5 5-5-5 .41-.41L11 13.17V3h1zM5 19h14v2H5v-2z" fill="currentColor"/></svg>`;
      case 'upload': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.92v6h6.5V9h3.92L12 2z" transform="rotate(180 12 11)" fill="currentColor"/></svg>`;
      case 'trash': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>`;
      default: return '';
    }
  };

  class DocumentosManager {
    constructor(opts) {
      this.opts = Object.assign({}, defaults, opts || {});
      this.urls = (this.opts && this.opts.urls) || defaults.urls;
      this.sel = (opts && opts.selectors) || {};
      this.page = 1; this.total = 0;
      // flag para controlar si ya se realizó al menos una subida en esta sesión
      this._hasUploaded = false;
      this.bindElements();
      this.bindEvents();
      // sincronizar opciones de estado entre modal y filtro al iniciar
      try { this.syncEstadosFromModal(); } catch(_) {}
    }

    bindElements() {
      this.buscar = util.qs(this.sel.buscar) || util.qs('#buscar-documentos');
      this.tabla = util.qs(this.sel.tabla) || util.qs('#documentosGrid');
      this.pagin = util.qs(this.sel.paginacion) || util.qs('#paginacionContainer');
      this.modalSub = util.qs(this.sel.modalSubida) || util.qs('#modalSubida');
      this.formSub = util.qs(this.sel.formSubida) || util.qs('#formSubida');
      this.drop = util.qs(this.sel.dropzone) || util.qs('#dropzone');
      this.kpiTotal = util.qs('#kpiTotal'); this.kpiVig = util.qs('#kpiVigentes'); this.kpiFav = util.qs('#kpiFavoritos');
      this.catSelect = util.qs(this.sel.categorias) || util.qs('#categoriaDocumento');
      this.progress = util.qs('#progresoSubida'); this.bar = util.qs('#barraProgreso'); this.pct = util.qs('#porcentajeSubida');
      this.modalEliminar = util.qs('#modalEliminarDocumento');
      this.btnConfirmEliminar = util.qs('#btnConfirmarEliminar');
      this.btnCancelEliminar = util.qs('#btnCancelarEliminar');
      this.btnCerrarEliminar = util.qs('#btnCerrarEliminar');
      this.deleteTextEl = util.qs('#textoEliminar');
    }

    bindEvents() {
      if (this.buscar) {
        // Debounce para búsqueda por input
        this.buscar.addEventListener('input', () => { clearTimeout(this._t); this._t = setTimeout(() => { this.page = 1; this.load(); }, 350); });
        // Enter debe aplicar filtros y ejecutar la búsqueda (buscar por documento)
        this.buscar.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            console.debug('Documentos: buscar input Enter -> aplicarFiltros');
            this.aplicarFiltros();
          }
        });
      }
      if (this.formSub && !this.formSub._boundSubmit) { 
        this.formSub._boundSubmit = true; 
        this.formSub.addEventListener('submit', e => { e.preventDefault(); this.upload(); });
        
        // ================================
        // VALIDACIÓN EN TIEMPO REAL
        // ================================
        if (window.DocumentosValidator) {
          // Validar campos en tiempo real
          const campos = this.formSub.querySelectorAll('input[name="nombreDocumento"], select[name="categoria"], textarea[name="descripcion"], input[type="file"]');
          campos.forEach(campo => {
            if (!campo._boundValidation) {
              campo._boundValidation = true;
              campo.addEventListener('blur', () => {
                window.DocumentosValidator.validarTiempoReal(campo, this.formSub);
              });
              campo.addEventListener('change', () => {
                window.DocumentosValidator.validarTiempoReal(campo, this.formSub);
              });
            }
          });
        }
      }
      if (this.drop && !this.drop._boundDrop) { this.drop._boundDrop = true; this.setupDrop(this.drop); }
      if (this.tabla && !this.tabla._boundClick) {
        this.tabla._boundClick = true;
        this.tabla.addEventListener('click', e => {
          // Solo aceptar clicks en elementos con data-action (botones de acción)
          const b = e.target.closest('[data-action]');
          if (!b) return;
          const a = b.dataset.action, id = b.dataset.id;
          if (a === 'desc' || a === 'download') this.download(id);
          if (a === 'edit') this.openEdit(id);
          if (a === 'ver') this.openVersion(id);
          if (a === 'del' || a === 'eliminar') this.openDeleteModal(id, b.dataset.title);
          if (a === 'fav') this.toggleFavorito(id, b);
        });
      }
      const btnSub = util.qs('#btnSubirMostrar'); if (btnSub && !btnSub._bound) { btnSub._bound = true; btnSub.addEventListener('click', () => this.openUpload()); }
      const btnRef = util.qs('#btnRefrescar'); if (btnRef && !btnRef._bound) { btnRef._bound = true; btnRef.addEventListener('click', () => this.load()); }

      // Botones de filtros del HTML (si existen)
      const btnBuscar = document.getElementById('btnBuscar');
      const btnLimpiar = document.getElementById('btnLimpiar');
      const formFiltro = document.getElementById('formFiltro');
      // Asegurar que el submit del formulario no recargue la página y ejecute aplicarFiltros
      if (formFiltro && !formFiltro._boundSubmitFilter) {
        formFiltro._boundSubmitFilter = true;
        formFiltro.addEventListener('submit', (e) => { e.preventDefault(); this.page = 1; this.aplicarFiltros(); });
      }
      if (btnBuscar && !btnBuscar._bound) { btnBuscar._bound = true; btnBuscar.addEventListener('click', (e) => { e.preventDefault(); this.page = 1; this.aplicarFiltros(); }); }
      if (btnLimpiar && !btnLimpiar._bound) { btnLimpiar._bound = true; btnLimpiar.addEventListener('click', () => this.limpiarFiltros()); }

  // aplicar filtros al cambiar el select de estado
  const filtroEstado = util.qs('#filtro-estado');
  if (filtroEstado && !filtroEstado._boundChange) { filtroEstado._boundChange = true; filtroEstado.addEventListener('change', () => { this.page = 1; this.load(); }); }

  // aplicar filtros al cambiar categoria
  const filtroCat = util.qs('#filtro-categoria');
  if (filtroCat && !filtroCat._boundChange) { filtroCat._boundChange = true; filtroCat.addEventListener('change', () => { this.page = 1; this.load(); }); }

      // modal eliminar bindings
      if (this.btnConfirmEliminar && !this.btnConfirmEliminar._bound) {
        this.btnConfirmEliminar._bound = true;
        this.btnConfirmEliminar.addEventListener('click', () => this.confirmDelete());
      }
      if (this.btnCancelEliminar && !this.btnCancelEliminar._bound) {
        this.btnCancelEliminar._bound = true;
        this.btnCancelEliminar.addEventListener('click', () => { if (this.modalEliminar) this.modalEliminar.style.display = 'none'; this._toDeleteId = null; });
      }
      if (this.btnCerrarEliminar && !this.btnCerrarEliminar._bound) {
        this.btnCerrarEliminar._bound = true;
        this.btnCerrarEliminar.addEventListener('click', () => { if (this.modalEliminar) this.modalEliminar.style.display = 'none'; this._toDeleteId = null; });
      }
    }

    // Copia las opciones de estado desde el modal (#estadoDocumento) hacia el filtro principal (#filtro-estado)
    syncEstadosFromModal() {
      const modalSel = util.qs('#estadoDocumento');
      const filtroSel = util.qs('#filtro-estado');
      if (!filtroSel) return;
      const prev = filtroSel.value;
      // limpiar y construir: Estado: Todos + opciones del modal + Favoritos
      filtroSel.innerHTML = '';
      const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'Estado: Todos'; filtroSel.appendChild(optAll);
      if (modalSel) {
        Array.from(modalSel.options).forEach(o => {
          const opt = document.createElement('option'); opt.value = o.value; opt.textContent = o.textContent || o.innerText || o.value; filtroSel.appendChild(opt);
        });
      }
      // mantener la opción 'Vencido' (puede ser cálculo en el servidor) si no viene en el modal
      if (!Array.from(filtroSel.options).some(o => o.value === 'Vencido')) {
        const optV = document.createElement('option'); optV.value = 'Vencido'; optV.textContent = 'Vencido'; filtroSel.appendChild(optV);
      }
      const optFav = document.createElement('option'); optFav.value = 'mis_favoritos'; optFav.textContent = 'Favoritos: Solo míos'; filtroSel.appendChild(optFav);
      // restaurar selección si sigue disponible
      if (prev && Array.from(filtroSel.options).some(o => o.value === prev)) filtroSel.value = prev;
    }

  setupDrop(el) { const input = el.querySelector('input[type=file]'); if (!input) return; const onClick = (ev) => { if (ev.target === input) return; input.click(); }; const onChange = () => this.onFile(input.files); const onDragOver = e => { e.preventDefault(); el.classList.add('dragover'); }; const onDragLeave = () => el.classList.remove('dragover'); const onDrop = e => { e.preventDefault(); el.classList.remove('dragover'); const f = e.dataTransfer.files; if (f && f.length) { input.files = f; this.onFile(input.files); } }; if (!el._click) { el.addEventListener('click', onClick); el._click = onClick; } if (!input._change) { input.addEventListener('change', onChange); input._change = onChange; } if (!el._dragover) { el.addEventListener('dragover', onDragOver); el._dragover = onDragOver; } if (!el._dragleave) { el.addEventListener('dragleave', onDragLeave); el._dragleave = onDragLeave; } if (!el._drop) { el.addEventListener('drop', onDrop); el._drop = onDrop; } }

  onFile(files) {
    const fb = util.qs('#archivoFeedback');
    if (!files || files.length === 0) {
      if (fb) {
        fb.textContent = 'No hay archivo seleccionado';
        fb.classList.remove('ok'); fb.classList.remove('uploaded'); fb.classList.remove('error');
      }
      return;
    }
    
    const f = files[0];
    
    // ================================
    // VALIDACIÓN EN TIEMPO REAL
    // ================================
    if (window.DocumentosValidator) {
      const fileValidation = window.DocumentosValidator._validateFile(f);
      if (!fileValidation.isValid) {
        if (fb) {
          fb.textContent = fileValidation.errors[0] || 'Archivo inválido';
          fb.classList.remove('ok'); fb.classList.remove('uploaded'); fb.classList.add('error');
        }
        return;
      }
    }
    
    if (fb) {
      if (!this._hasUploaded) {
        // comportamiento legado: mostrar nombre en rojo (clase error) la primera vez
        fb.textContent = `${f.name} • ${util.fmtBytes(f.size)}`;
        fb.classList.remove('ok'); fb.classList.remove('uploaded'); fb.classList.add('error');
      } else {
        // después de una subida, no mostrar el nombre en rojo; solo indicar listo
        fb.textContent = 'Archivo listo para subir • ' + util.fmtBytes(f.size);
        fb.classList.remove('uploaded'); fb.classList.remove('error'); fb.classList.add('ok');
      }
    }
  }

    async load(silent = false) {
      try {
        // mostrar indicador simple en la UI para la búsqueda
        // si silent==true evitamos tocar la 'leyenda' (para operaciones internas como refresh tras favorito)
        try { if (!silent) { const ley = document.getElementById('leyenda'); if (ley) { ley.style.display = 'block'; ley.querySelector('.ui-message__text').textContent = 'Buscando...'; } } } catch(_) {}
        const params = new URLSearchParams();
        params.set('page', this.page);
        params.set('pageSize', this.opts.pageSize);
        const q = (this.buscar && this.buscar.value) || '';
        if (q) {
          // Enviar 'q' para compatibilidad con el endpoint de búsqueda y
          // enviar 'tipo' para que el controlador 'ListarDocumentos' pueda
          // filtrar por TituloDescriptivo / Etiquetas / NombreArchivo.
          params.set('q', q);
          params.set('tipo', q);
        }
        // Filtros adicionales si existen en el DOM
  const cat = document.getElementById('filtro-categoria')?.value || '';
  const est = document.getElementById('filtro-estado')?.value || '';
  // filtro especial: favoritos propios
  const favoritosFiltro = (est === 'mis_favoritos');
  if (cat) params.set('categoria', cat);
  if (est && !favoritosFiltro) params.set('estado', est);
  if (favoritosFiltro) params.set('favoritos', '1');
  const url = this.urls.listar + '&' + params.toString();
  console.debug('Documentos.load -> URL', url);
  try { console.log('Iniciando petición a:', url); } catch(_) {}
  const r = await fetch(url, { credentials: 'same-origin' });
        let data;
        // si el status HTTP no es OK, leer el body y mostrar en la UI para depuraci n
        if (!r.ok) {
          const txt = await r.text().catch(() => null);
          console.error('Documentos.load: respuesta HTTP != 200', r.status, txt);
          // mostrar mensaje al usuario
          const ley = document.getElementById('leyenda');
          if (ley) { ley.style.display = 'block'; ley.querySelector('.ui-message__text').textContent = txt || ('Error HTTP ' + r.status); }
          this.renderEmpty();
          return;
        }

        try {
          data = await r.json();
        } catch (e) {
          console.error('Documentos.load: respuesta no JSON', e);
          const txt = await r.text().catch(() => null);
          console.error('Documentos.load: body:', txt);
          const ley = document.getElementById('leyenda');
          if (ley) { ley.style.display = 'block'; ley.querySelector('.ui-message__text').textContent = txt || ('Respuesta no válida del servidor (status ' + r.status + ')'); }
          this.renderEmpty();
          return;
        }

        console.debug('Documentos.load: status=', r.status, 'data=', data);

        // manejar respuesta de error desde la API: { status: 'error', mensaje: '...' }
        if (data && data.status === 'error') {
          const ley = document.getElementById('leyenda');
          if (ley) { ley.style.display = 'block'; ley.querySelector('.ui-message__text').textContent = data.mensaje || 'Error en la API'; }
          console.error('Documentos.load: API error', data.mensaje);
          this.renderEmpty();
          return;
        }

        // permitir que la API devuelva directamente un array (compatibilidad) o un objeto { items: [] }
        const itemsArr = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : null);
        if (!itemsArr) { this.renderEmpty(); return; }
        this.total = (data && (data.total || (data.items && data.items.length))) ? (data.total || data.items.length) : itemsArr.length;
        this.renderRows(itemsArr);
        this.renderPager();
        // m tricas: usar meta si lo provee el servidor
        const metaFromServer = data && data.meta ? data.meta : null;
        const meta = metaFromServer || { total: this.total, vigentes: (itemsArr || []).filter(d => (d.estado || '').toLowerCase() === 'vigente').length, favoritos: (itemsArr || []).filter(d => d.favorito).length };
        this.updateKPIs(meta);
      } catch (e) { console.error(e); this.renderEmpty(); }
    }

    renderEmpty() { if (this.tabla) this.tabla.innerHTML = '<tr class="ui-tabla__row tabla-vacia"><td colspan="5" class="tabla-vacia">No hay documentos para mostrar</td></tr>'; if (this.pagin) this.pagin.innerHTML = ''; }

    renderRows(items) {
      if (!this.tabla) return;
  const rows = items.map(it => {
        const nombre = `<div class="ui-tabla__cell--archivo"><div class="documento-card__icon"><span class="ui-button__icon" data-icon="file" aria-hidden="true"></span></div><div><div class="documento-card__title">${util.esc(it.titulo || it.nombre_archivo)}</div><div class="documento-card__description">${util.esc(it.descripcion || '')}</div></div></div>`;
        const cat = util.esc(it.categoria_nombre || it.categoria || '');
        const vig = it.estado ? util.esc(it.estado) : '';
        const bytes = it.tamano_archivo || it.tamaño_archivo || it.tamano || it.size || 0;
        const tam = `<span class="ui-tabla__cell--size">${util.fmtBytes(bytes)}</span>`;
  const favClass = it.favorito ? 'btn-favorito btn-favorito--active' : 'btn-favorito';
        // favorito button: aria-pressed and dynamic title
        const isFav = !!it.favorito;
        const favTitle = isFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
        const favAria = isFav ? 'true' : 'false';
        const acciones = `
        <button class="ui-button ui-action ui-action--fav ${favClass}" data-action="fav" data-id="${it.id}" title="${favTitle}" aria-label="${favTitle}" role="button" aria-pressed="${favAria}">
          <span class="ui-button__icon" aria-hidden="true">${svgIcon('star')}</span>
        </button>
  <button class="ui-button ui-action ui-action--edit" data-action="edit" data-id="${it.id}" title="Editar" aria-label="Editar">
    <span class="ui-button__icon" data-icon="edit" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--view" data-action="ver" data-id="${it.id}" title="Nueva versión" aria-label="Nueva versión">
    <span class="ui-button__icon" data-icon="export" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--download ui-button--primary" data-action="download" data-id="${it.id}" title="Descargar" aria-label="Descargar">
    <span class="ui-button__icon" aria-hidden="true">${svgIcon('download')}</span>
  </button>
  <button class="ui-button ui-action ui-action--delete" data-action="del" data-id="${it.id}" data-title="${util.esc(it.titulo || it.nombre_archivo)}" title="Eliminar" aria-label="Eliminar">
    <span class="ui-button__icon" data-icon="delete" aria-hidden="true"></span>
  </button>`;
        // añadir title para accesibilidad (no hacer la fila clicable)
        const titleAttr = util.esc(it.titulo || it.nombre_archivo || 'Documento');
        return `<tr class="ui-tabla__row" data-id="${util.esc(it.id)}" title="${titleAttr}"><td class="ui-tabla__cell">${nombre}</td><td class="ui-tabla__cell">${cat}</td><td class="ui-tabla__cell">${vig}</td><td class="ui-tabla__cell">${tam}</td><td class="ui-tabla__cell ui-tabla__cell--acciones">${acciones}</td></tr>`;
      }).join('');
      this.tabla.innerHTML = rows || '<tr class="ui-tabla__row tabla-vacia"><td colspan="5" class="tabla-vacia">No hay documentos para mostrar</td></tr>';
    }

    renderPager() { if (!this.pagin) return; const total = this.total || 0; const pageSize = this.opts.pageSize; const totalPages = Math.max(1, Math.ceil(total / pageSize)); const cur = Math.min(this.page, totalPages); const start = total === 0 ? 0 : (cur - 1) * pageSize + 1; const end = total === 0 ? 0 : Math.min(cur * pageSize, total); this.pagin.innerHTML = `<span class="ui-paginacion__info">Página ${cur} de ${totalPages} · ${start}-${end} de ${total} documentos</span><div class="ui-paginacion__controles"><button class="ui-button ui-button--ghost ui-paginacion__btn" ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}"><span class="ui-button__icon" data-icon="prev"></span>Anterior</button><button class="ui-button ui-button--ghost ui-paginacion__btn" ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">Siguiente<span class="ui-button__icon" data-icon="next"></span></button></div>`; this.pagin.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { const p = parseInt(b.dataset.page); if (p >= 1 && p <= totalPages) { this.page = p; this.load(); } })); }

  updateKPIs(meta) {
    if (!meta) return;
    if (this.kpiTotal) this.kpiTotal.textContent = meta.total || 0;
    if (this.kpiVig) this.kpiVig.textContent = meta.vigentes || 0;
    // Preferir mostrar los favoritos del usuario si el servidor lo provee, si no mostrar el total global
    const favUsuario = typeof meta.favoritosUsuario !== 'undefined' ? meta.favoritosUsuario : null;
    const favToShow = favUsuario !== null ? favUsuario : (meta.favoritos || 0);
    if (this.kpiFav) this.kpiFav.textContent = favToShow;
  }

  openUpload() { if (!this.modalSub) return; if (this.formSub) { this.formSub.reset(); const hidden = this.formSub.querySelector('input[name="documento_id"]'); if (hidden) hidden.remove(); } try { this.syncEstadosFromModal(); } catch(_) {} this.modalSub.style.display = 'flex'; }
  closeUpload() { if (!this.modalSub) return; this.modalSub.style.display = 'none'; }

  async upload() {
    if (!this.formSub) return;

    // ================================
    // VALIDACIÓN CENTRALIZADA CON TOAST
    // ================================
    
    // Validar formulario usando DocumentosValidator
    const validationResult = window.DocumentosValidator ? 
      window.DocumentosValidator.validarFormularioSubida(this.formSub) : 
      { isValid: true, errors: [] };

    if (!validationResult.isValid) {
      // Los errores ya se mostraron vía Toast en el validador
      return;
    }

    // ================================
    // CONTINUAR CON SUBIDA VALIDADA
    // ================================
    
    const fd = new FormData(this.formSub);
    // asegurarse de incluir manualmente el archivo del input si existe
    const fileInput = this.formSub.querySelector('input[type=file]');
    if (fileInput && fileInput.files.length) fd.set('archivo', fileInput.files[0]);
    const isNewVersion = fd.has('documento_id') && fd.get('documento_id');
    const endpoint = isNewVersion ? this.urls.actualizar : this.urls.subir;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable && this.progress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        this.progress.style.display = 'block';
        if (this.bar) this.bar.style.width = pct + '%';
        if (this.pct) this.pct.textContent = pct + '%';
      }
    });

    xhr.onload = () => {
      const cont = document.getElementById('leyenda');
      let respJson = null;
      try { respJson = JSON.parse(xhr.responseText || null); } catch(_) { }

      if (xhr.status >= 200 && xhr.status < 300) {
        // ================================
        // USAR TOAST PARA ÉXITO
        // ================================
        const successMessage = isNewVersion ? 'Nueva versión creada exitosamente' : 'Documento subido correctamente';
        const fileName = (respJson && (respJson.nombre || respJson.filename || respJson.nombre_archivo)) || 
                        (fileInput?.files?.[0]?.name) || 'archivo';
        
        if (window.showDocsToast) {
          window.showDocsToast(
            `${successMessage}: ${fileName}`, 
            'success', 
            {
              title: isNewVersion ? 'Nueva Versión' : 'Subida Completada',
              duration: 6000,
              closable: true
            }
          );
        }

        // mostrar feedback con nombre subido por un breve periodo
        try {
          const fb = document.getElementById('archivoFeedback');
          if (fb) {
            const name = fileName;
            // Si es la primera subida, mostrar en rojo (comportamiento legado). Luego de la primera, usar uploaded (verde)
            if (!this._hasUploaded) {
              fb.textContent = name ? `${name}` : 'Archivo subido';
              fb.classList.remove('ok'); fb.classList.remove('uploaded'); fb.classList.add('error');
            } else {
              fb.textContent = name ? `${name} • subido` : 'Archivo subido';
              fb.classList.remove('ok'); fb.classList.remove('error'); fb.classList.add('uploaded');
            }
            // marcar que ya hubo al menos una subida
            this._hasUploaded = true;
          }
        } catch(_) {}

        // esperar y luego limpiar
        setTimeout(() => {
          try {
            if (this.formSub) {
              this.formSub.reset();
              if (fileInput) fileInput.value = '';
              const fb = document.getElementById('archivoFeedback'); if (fb) { fb.textContent = ''; fb.classList.remove('uploaded'); }
              const hidden = this.formSub.querySelector('input[name="documento_id"]'); if (hidden) hidden.remove();
            }
          } catch(_) {}
          this.closeUpload();
          this.load();
        }, 1800);

      } else {
        // Error al subir - manejar silenciosamente sin Toast
        const errorMessage = (respJson && respJson.mensaje) || 'Error al procesar el documento';
        
        // Mantener solo feedback visual inline
        try { 
          const fb = document.getElementById('archivoFeedback'); 
          if (fb) { 
            fb.classList.remove('ok'); 
            fb.classList.add('error'); 
            fb.textContent = errorMessage; 
          } 
        } catch(_) {}
      }

      if (this.progress) { this.progress.style.display = 'none'; if (this.bar) this.bar.style.width = '0%'; if (this.pct) this.pct.textContent = '0%'; }
    };

    xhr.onerror = () => {
      // Error de red - manejar silenciosamente
      console.error('Error de red durante la subida');
    };

    xhr.send(fd);
  }

  async download(id) {
    if (!id) return;
    // evitar descargas concurrentes del mismo id
    if (!this._downloading) this._downloading = new Set();
    if (this._downloading.has(id)) return;
    this._downloading.add(id);

    const url = this.urls.descargar + '&id=' + encodeURIComponent(id);
    // intentar deshabilitar botón de descarga correspondiente para evitar doble click
    const btn = document.querySelector(`[data-action="download"][data-id="${CSS.escape(String(id))}"]`);
    if (btn) btn.disabled = true;
    try {
      const r = await fetch(url, { method: 'GET' });
      if (!r.ok) {
        const txt = await r.text().catch(() => null);
        
        // Toast Premium para error de descarga
        if (window.showDocsToast) {
          window.showDocsToast(
            txt || 'No se pudo descargar el documento. Intente nuevamente.', 
            'error', 
            {
              title: 'Error de Descarga',
              duration: 6000,
              closable: true
            }
          );
        }
        console.error('Error descargando archivo:', txt || ('HTTP ' + r.status));
        return;
      }

      // obtener filename desde Content-Disposition si está presente
      const contentDisp = r.headers.get('content-disposition') || r.headers.get('Content-Disposition');
      let filename = 'documento';
      if (contentDisp) {
        const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisp);
        if (m && m[1]) {
          try { filename = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch(_) { filename = m[1]; }
        }
      }

      const blob = await r.blob();

      // Si el navegador soporta showSaveFilePicker (Chromium-based), usarlo para abrir diálogo de guardado
      if (window.showSaveFilePicker) {
        try {
          const opts = { suggestedName: filename };
          const handle = await window.showSaveFilePicker(opts);
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          // Toast Premium para descarga exitosa (showSaveFilePicker)
          if (window.showDocsToast) {
            window.showDocsToast(
              `Archivo guardado: ${filename}`, 
              'success', 
              {
                title: 'Descarga Completada',
                duration: 4000,
                closable: true
              }
            );
          }
          return;
        } catch (e) {
          // Si el usuario canceló explícitamente, no ejecutar el fallback
          // Muchos navegadores lanzan AbortError o NotAllowedError al cancelar
          console.warn('showSaveFilePicker falló o fue cancelado', e);
          const name = e && e.name ? e.name : '';
          const msg = e && e.message ? e.message : '';
          if (name === 'AbortError' || name === 'NotAllowedError' || name === 'SecurityError' || /cancel/i.test(msg)) {
            return;
          }
          // si fue otro error, caer al fallback
        }
      }

      // Fallback: crear objeto URL y forzar descarga con atributo download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      
      // Toast Premium para descarga exitosa (fallback)
      if (window.showDocsToast) {
        window.showDocsToast(
          `Descarga iniciada: ${filename}`, 
          'success', 
          {
            title: 'Descarga Completada',
            duration: 4000,
            closable: true
          }
        );
      }
    } catch (e) {
      // Toast Premium para error general de descarga
      if (window.showDocsToast) {
        window.showDocsToast(
          'Error al procesar la descarga. Intente nuevamente.', 
          'error', 
          {
            title: 'Error de Descarga',
            duration: 6000,
            closable: true
          }
        );
      }
      console.error('Error en descarga:', e);
    }
    finally {
      // limpiar guard y reactivar botón
      try { this._downloading.delete(id); } catch(_) {}
      try { if (btn) btn.disabled = false; } catch(_) {}
    }
  }

  async openEdit(id) { 
    try { 
      const r = await fetch(this.urls.obtener + '&id=' + encodeURIComponent(id)); 
      const data = await r.json(); 
      
      if (!data) {
        // Toast Premium para documento no encontrado
        if (window.showDocsToast) {
          window.showDocsToast(
            'El documento solicitado no existe o ha sido eliminado.', 
            'error', 
            {
              title: 'Documento No Encontrado',
              duration: 5000,
              closable: true
            }
          );
        }
        console.error('Documento no encontrado');
        return;
      }
      
      const modal = util.qs('#modalDetalles'); 
      if (!modal) return; 
      
      modal.style.display = 'flex'; 
      modal.querySelector('#contenidoDetalles').innerHTML = `<form id="formEditar" class="ui-form"><div class="ui-form-group"><label>Título</label><input name="titulo" class="ui-form__input" value="${util.esc(data.titulo || data.nombre_archivo)}"/></div><div class="ui-form-group"><label>Descripción</label><textarea name="descripcion" class="ui-form__input">${util.esc(data.descripcion || '')}</textarea></div><div class="ui-modal__actions"><button type="button" class="ui-button ui-button--secondary" id="cancelEdit">Cancelar</button><button type="submit" class="ui-button ui-button--primary">Guardar</button></div></form>`; 
      
      const form = modal.querySelector('#formEditar'); 
      form.addEventListener('submit', ev => { 
        ev.preventDefault(); 
        const fd = new FormData(form); 
        fd.append('documento_id', id); 
        this.update(fd); 
      }); 
      
      modal.querySelector('#cancelEdit').addEventListener('click', () => modal.style.display = 'none'); 
    } catch (e) { 
      // Toast Premium para error de carga
      if (window.showDocsToast) {
        window.showDocsToast(
          'Error al cargar los datos del documento. Intente nuevamente.', 
          'error', 
          {
            title: 'Error de Carga',
            duration: 5000,
            closable: true
          }
        );
      }
      console.error('Error cargando documento:', e);
    } 
  }

  async update(formData) { 
    try { 
      const r = await fetch(this.urls.actualizar, { method: 'POST', body: formData }); 
      const j = await r.json(); 
      
      if (j && j.status === 'success') { 
        try { await this.load(true); } catch(_) {}
        
        // Toast estilo premium para actualización
        const docName = formData.get('titulo') || 'documento';
        if (window.showDocsToast) {
          window.showDocsToast(
            `Documento actualizado exitosamente: ${docName}`, 
            'success', 
            {
              title: 'Actualización Completada',
              duration: 5000,
              closable: true
            }
          );
        }
        
        util.qs('#modalDetalles').style.display = 'none'; 
      } else { 
        // Toast Premium para error de actualización
        if (window.showDocsToast) {
          window.showDocsToast(
            j?.mensaje || 'No se pudo actualizar el documento. Intente nuevamente.', 
            'error', 
            {
              title: 'Error de Actualización',
              duration: 6000,
              closable: true
            }
          );
        }
        console.error('Error actualizando documento:', j?.mensaje);
      } 
    } catch (e) { 
      // Toast Premium para error de red
      if (window.showDocsToast) {
        window.showDocsToast(
          'Error de conexión al actualizar. Verifique su conexión a internet.', 
          'error', 
          {
            title: 'Error de Red',
            duration: 6000,
            closable: true
          }
        );
      }
      console.error('Error actualizando:', e);
    } 
  }

  // abre el modal de confirmación (no usa confirm nativo)
  openDeleteModal(id, title) {
    if (!id) return;
    this._toDeleteId = id;
    if (this.deleteTextEl) this.deleteTextEl.textContent = title || '¿Eliminar el documento seleccionado? Esta acción no se puede deshacer.';
    if (this.modalEliminar) this.modalEliminar.style.display = 'flex';
  }

  async confirmDelete() {
    const id = this._toDeleteId; 
    if (!id) return; 
    
    // ================================
    // VALIDACIÓN USANDO DOCUMENTOS VALIDATOR
    // ================================
    if (window.DocumentosValidator) {
      const validationResult = window.DocumentosValidator.validarEliminacion(id);
      if (!validationResult.isValid) {
        // Los errores ya se mostraron vía Toast
        return;
      }
    }
    
    try {
      if (this.modalEliminar) this.modalEliminar.style.display = 'none';
      const r = await fetch(this.urls.eliminar + '&id=' + encodeURIComponent(id), { method: 'POST' });
      const j = await r.json(); 
      
      if (j && j.status === 'success') {
        try { await this.load(true); } catch(_) {}
        
        // Toast Premium para eliminación exitosa
        if (window.showDocsToast) {
          window.showDocsToast(
            'El documento ha sido eliminado permanentemente del sistema', 
            'success', 
            {
              title: 'Documento Eliminado',
              duration: 4000,
              closable: true
            }
          );
        }
      } else { 
        // Toast Premium para error de eliminación
        if (window.showDocsToast) {
          window.showDocsToast(
            j?.mensaje || 'No se pudo eliminar el documento. Intente nuevamente.', 
            'error', 
            {
              title: 'Error de Eliminación',
              duration: 6000,
              closable: true
            }
          );
        }
        console.error('Error eliminando documento:', j?.mensaje);
      }
    } catch (e) { 
      // Toast Premium para error de red
      if (window.showDocsToast) {
        window.showDocsToast(
          'Error de conexión al eliminar el documento. Verifique su conexión a internet.', 
          'error', 
          {
            title: 'Error de Red',
            duration: 6000,
            closable: true
          }
        );
      }
      console.error('Error de red al eliminar:', e); 
    }
    finally { this._toDeleteId = null; }
  }

  async toggleFavorito(id, btnEl) {
    try {
      // optimist update: toggle UI immediately
      let prevActive = false;
      if (btnEl) { 
        prevActive = btnEl.classList.contains('btn-favorito--active'); 
        btnEl.classList.toggle('btn-favorito--active'); 
        btnEl.setAttribute('aria-pressed', String(!prevActive)); 
        btnEl.title = !prevActive ? 'Quitar de favoritos' : 'Agregar a favoritos'; 
      }
      
      const r = await fetch(this.urls.favorito + '&id=' + encodeURIComponent(id), { method: 'POST' });
      const j = await r.json();
      
      if (j && j.status === 'success') {
        // Refrescar lista en segundo plano
        try { await this.load(true); } catch(_) {}
        
        // Determinar estado final
        const servidorFav = typeof j.favorito !== 'undefined' ? !!j.favorito : !prevActive;
        
        // Toast estilo premium para favoritos
        if (window.showDocsToast) {
          window.showDocsToast(
            servidorFav 
              ? 'El documento ha sido agregado a tus favoritos' 
              : 'El documento ha sido removido de tus favoritos', 
            'success', 
            {
              title: servidorFav ? 'Favorito Agregado' : 'Favorito Removido',
              duration: 4000,
              closable: true
            }
          );
        }
        
        // Asegurar que el estado del botón coincida con la respuesta del servidor
        if (btnEl) {
          if (servidorFav) {
            btnEl.classList.add('btn-favorito--active');
            btnEl.setAttribute('aria-pressed', 'true');
            btnEl.setAttribute('aria-label', 'Quitar de favoritos');
            btnEl.title = 'Quitar de favoritos';
          } else {
            btnEl.classList.remove('btn-favorito--active');
            btnEl.setAttribute('aria-pressed', 'false');
            btnEl.setAttribute('aria-label', 'Agregar a favoritos');
            btnEl.title = 'Agregar a favoritos';
          }
          
          // animación pulse breve para dar feedback visual
          try {
            btnEl.classList.add('btn-favorito--pulse');
            setTimeout(() => btnEl.classList.remove('btn-favorito--pulse'), 550);
          } catch(_) {}
        }
      } else {
        // revertir UI
        if (btnEl) { 
          if (prevActive) btnEl.classList.add('btn-favorito--active'); 
          else btnEl.classList.remove('btn-favorito--active'); 
          btnEl.setAttribute('aria-pressed', String(prevActive)); 
          btnEl.setAttribute('aria-label', prevActive ? 'Quitar de favoritos' : 'Agregar a favoritos'); 
          btnEl.title = prevActive ? 'Quitar de favoritos' : 'Agregar a favoritos'; 
        }
        
        // Toast Premium para error de favorito
        if (window.showDocsToast) {
          window.showDocsToast(
            j?.mensaje || 'No se pudo actualizar el favorito. Intente nuevamente.', 
            'error', 
            {
              title: 'Error de Favorito',
              duration: 5000,
              closable: true
            }
          );
        }
        console.error('Error actualizando favorito:', j?.mensaje);
      }
    } catch (e) { 
      // Toast Premium para error de red en favoritos
      if (window.showDocsToast) {
        window.showDocsToast(
          'Error de conexión al marcar favorito. Verifique su conexión a internet.', 
          'error', 
          {
            title: 'Error de Red',
            duration: 5000,
            closable: true
          }
        );
      }
      console.error('Error marcando favorito:', e);
    }
  }

    openVersion(id) { this.openUpload(); const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'documento_id'; hidden.value = id; this.formSub.appendChild(hidden); }

    // Métodos auxiliares solicitados por el HTML
    mostrarModalSubida() { this.openUpload(); }
    cerrarModalSubida() { this.closeUpload(); }
    cerrarModalDetalles() { const m = util.qs('#modalDetalles'); if (m) m.style.display = 'none'; }
    obtenerDocumentos() { this.page = 1; return this.load(); }
    aplicarFiltros() { this.page = 1; return this.load(); }
    limpiarFiltros() { document.getElementById('formFiltro')?.reset(); this.page = 1; return this.load(); }

    async obtenerCategorias() { return this.loadCategories(); }
    async loadCategories() {
      try {
        const r = await fetch(this.urls.categorias);
        if (!r.ok) return;
        const data = await r.json();
        const opts = Array.isArray(data) ? data : (data.items || []);
        const toOpt = (c) => `<option value="${util.esc(c.id)}">${util.esc(c.nombre || c.titulo || c.name)}</option>`;
        const html = opts.map(toOpt).join('');
        if (this.catSelect) this.catSelect.innerHTML = '<option value="">Seleccionar categoría</option>' + html;
        const filtroCat = document.getElementById('filtro-categoria');
        if (filtroCat) filtroCat.innerHTML = '<option value="">Categoría: Todas</option>' + html;
      } catch (e) { /* opcional: log */ }
    }
  }

  window.DocumentosManager = DocumentosManager;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.documentos-container')) {
      if (!window.documentosManager) {
        const mgr = new DocumentosManager({ selectors: { buscar: '#buscar-documentos', tabla: '#documentosGrid', paginacion: '#paginacionContainer', modalSubida: '#modalSubida', formSubida: '#formSubida', dropzone: '#dropzone', categorias: '#categoriaDocumento', modalDetalles: '#modalDetalles' } });
        window.documentosManager = mgr;
        // cargar categorias primero para poblar filtros y luego los documentos
        mgr.loadCategories().then(() => mgr.load()).catch(() => mgr.load());
      }
    }
  });

  // Fallback ligero: asegurar que el buscador del toolbar funcione aunque el manager aún no esté listo
  document.addEventListener('DOMContentLoaded', () => {
    const formFiltro = document.getElementById('formFiltro');
    const btnBuscar = document.getElementById('btnBuscar');
    const buscarInput = document.getElementById('buscar-documentos');
    const runSearch = (ev) => {
      if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
      if (window.documentosManager && typeof window.documentosManager.aplicarFiltros === 'function') {
        try { window.documentosManager.aplicarFiltros(); } catch (e) { console.error('Error ejecutando aplicarFiltros', e); }
      } else {
        console.warn('documentosManager no inicializado todavía. Intentando crear uno temporalmente.');
        try {
          window.documentosManager = new DocumentosManager({ selectors: { buscar: '#buscar-documentos', tabla: '#documentosGrid', paginacion: '#paginacionContainer' } });
          window.documentosManager.aplicarFiltros();
        } catch (e) { console.error('No fue posible inicializar DocumentosManager:', e); }
      }
    };
    if (btnBuscar && !btnBuscar._boundFallback) { btnBuscar.addEventListener('click', runSearch); btnBuscar._boundFallback = true; }
    if (formFiltro && !formFiltro._boundFallback) { formFiltro.addEventListener('submit', runSearch); formFiltro._boundFallback = true; }
    if (buscarInput && !buscarInput._boundFallback) { buscarInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(e); } }); buscarInput._boundFallback = true; }
    // Enlazar iconos (por si el botón está renderizado solo como icono)
    if (formFiltro) {
      const iconSearch = formFiltro.querySelector('[data-icon="search"]');
      if (iconSearch && !iconSearch._boundIcon) { iconSearch.addEventListener('click', runSearch); iconSearch._boundIcon = true; }
      const iconClear = formFiltro.querySelector('[data-icon="clear"]');
      if (iconClear && !iconClear._boundIcon) { iconClear.addEventListener('click', (e) => { e.preventDefault(); if (window.documentosManager && typeof window.documentosManager.limpiarFiltros === 'function') { window.documentosManager.limpiarFiltros(); } else { formFiltro.reset(); if (window.documentosManager && typeof window.documentosManager.load === 'function') window.documentosManager.load(); } }); iconClear._boundIcon = true; }
    }
  });

      // Auto-refresh de métricas del módulo Documentos: recarga cada 30s
      (function(){
        if (typeof window.documentosManager === 'undefined') return;
        if (window.documentosManager._metricsAutoRefresh) return;
        window.documentosManager._metricsAutoRefresh = true;
        try { setInterval(() => { window.documentosManager.load(); }, 30000); } catch(e) { console.warn('No se pudo iniciar auto-refresh Documentos', e); }
      })();

})(window);
