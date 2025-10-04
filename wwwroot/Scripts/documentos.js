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
      eliminar: '/documentos?op=eliminar'
    },
    pageSize: 10
  };

  const util = {
    qs: s => document.querySelector(s),
    qsa: s => Array.from(document.querySelectorAll(s)),
    toast(msg, type = 'info') {
      // Preferir sistema global SWGROI.UI
      if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
        window.SWGROI.UI.mostrarMensaje(msg, type, 'leyenda', 4000);
        return;
      }
      const c = util.qs('#toastContainer'); if (!c) return; const t = document.createElement('div'); t.className = `ui-toast ui-toast--${type}`; t.textContent = msg; c.appendChild(t); setTimeout(() => t.classList.add('ui-toast--visible'), 20); setTimeout(() => { t.classList.remove('ui-toast--visible'); setTimeout(() => t.remove(), 300); }, 4000);
    },
    fmtBytes(b) { if (!b && b !== 0) return '0 B'; const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']; const i = b > 0 ? Math.floor(Math.log(b) / Math.log(k)) : 0; return (b / Math.pow(k, i)).toFixed(i ? 1 : 0) + ' ' + sizes[i]; },
    esc(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  };

  // helper para íconos SVG inline (pequeños, accesibles)
  const svgIcon = (name) => {
    switch (name) {
      case 'edit': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>`;
      case 'download': return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.92v6h6.5V9h3.92L12 2z" fill="currentColor"/></svg>`;
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
      this.bindElements();
      this.bindEvents();
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
      if (this.buscar) this.buscar.addEventListener('input', () => { clearTimeout(this._t); this._t = setTimeout(() => { this.page = 1; this.load(); }, 350); });
      if (this.formSub && !this.formSub._boundSubmit) { this.formSub._boundSubmit = true; this.formSub.addEventListener('submit', e => { e.preventDefault(); this.upload(); }); }
      if (this.drop && !this.drop._boundDrop) { this.drop._boundDrop = true; this.setupDrop(this.drop); }
      if (this.tabla && !this.tabla._boundClick) {
        this.tabla._boundClick = true;
        this.tabla.addEventListener('click', e => {
          const b = e.target.closest('[data-action]'); if (!b) return;
          const a = b.dataset.action, id = b.dataset.id;
          if (a === 'desc' || a === 'download') this.download(id);
          if (a === 'edit') this.openEdit(id);
          if (a === 'ver') this.openVersion(id);
          if (a === 'del' || a === 'eliminar') this.openDeleteModal(id, b.dataset.title);
        });
      }
      const btnSub = util.qs('#btnSubirMostrar'); if (btnSub && !btnSub._bound) { btnSub._bound = true; btnSub.addEventListener('click', () => this.openUpload()); }
      const btnRef = util.qs('#btnRefrescar'); if (btnRef && !btnRef._bound) { btnRef._bound = true; btnRef.addEventListener('click', () => this.load()); }

      // Botones de filtros del HTML (si existen)
      const btnBuscar = document.getElementById('btnBuscar');
      const btnLimpiar = document.getElementById('btnLimpiar');
      if (btnBuscar && !btnBuscar._bound) { btnBuscar._bound = true; btnBuscar.addEventListener('click', () => this.aplicarFiltros()); }
      if (btnLimpiar && !btnLimpiar._bound) { btnLimpiar._bound = true; btnLimpiar.addEventListener('click', () => this.limpiarFiltros()); }

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

  setupDrop(el) { const input = el.querySelector('input[type=file]'); if (!input) return; const onClick = (ev) => { if (ev.target === input) return; input.click(); }; const onChange = () => this.onFile(input.files); const onDragOver = e => { e.preventDefault(); el.classList.add('dragover'); }; const onDragLeave = () => el.classList.remove('dragover'); const onDrop = e => { e.preventDefault(); el.classList.remove('dragover'); const f = e.dataTransfer.files; if (f && f.length) { input.files = f; this.onFile(input.files); } }; if (!el._click) { el.addEventListener('click', onClick); el._click = onClick; } if (!input._change) { input.addEventListener('change', onChange); input._change = onChange; } if (!el._dragover) { el.addEventListener('dragover', onDragOver); el._dragover = onDragOver; } if (!el._dragleave) { el.addEventListener('dragleave', onDragLeave); el._dragleave = onDragLeave; } if (!el._drop) { el.addEventListener('drop', onDrop); el._drop = onDrop; } }

  onFile(files) { const fb = util.qs('#archivoFeedback'); if (!files || files.length === 0) { if (fb) { fb.textContent = 'No hay archivo seleccionado'; fb.classList.remove('ok'); } return; } const f = files[0]; if (fb) { fb.textContent = `${f.name} • ${util.fmtBytes(f.size)}`; fb.classList.add('ok'); } }

    async load() {
      try {
        const params = new URLSearchParams();
        params.set('page', this.page);
        params.set('pageSize', this.opts.pageSize);
        const q = (this.buscar && this.buscar.value) || '';
        if (q) params.set('q', q);
        // Filtros adicionales si existen en el DOM
        const tipo = document.getElementById('filtro-tipo')?.value || '';
        const cat = document.getElementById('filtro-categoria')?.value || '';
        const est = document.getElementById('filtro-estado')?.value || '';
        if (tipo) params.set('tipo', tipo);
        if (cat) params.set('categoria', cat);
        if (est) params.set('estado', est);
        const url = this.urls.listar + '&' + params.toString();
        const r = await fetch(url); const data = await r.json(); if (!data || !Array.isArray(data.items)) { this.renderEmpty(); return; }
        this.total = data.total || data.items.length; this.renderRows(data.items); this.renderPager();
        // métricas
        const meta = { total: data.total || data.items.length, vigentes: (data.items || []).filter(d => (d.estado || '').toLowerCase() === 'vigente').length, favoritos: 0 };
        this.updateKPIs(meta);
      } catch (e) { console.error(e); this.renderEmpty(); }
    }

    renderEmpty() { if (this.tabla) this.tabla.innerHTML = '<tr class="ui-tabla__row tabla-vacia"><td colspan="5" class="tabla-vacia">No hay documentos para mostrar</td></tr>'; if (this.pagin) this.pagin.innerHTML = ''; }

    renderRows(items) { if (!this.tabla) return; const rows = items.map(it => { const nombre = `<div class="ui-tabla__cell--archivo"><div class="documento-card__icon"><span class="ui-button__icon" data-icon="file" aria-hidden="true"></span></div><div><div class="documento-card__title">${util.esc(it.titulo || it.nombre_archivo)}</div><div class="documento-card__description">${util.esc(it.descripcion || '')}</div></div></div>`; const cat = util.esc(it.categoria_nombre || it.categoria || ''); const vig = it.estado ? util.esc(it.estado) : ''; const bytes = it.tamano_archivo || it.tamaño_archivo || it.tamano || it.size || 0; const tam = `<span class="ui-tabla__cell--size">${util.fmtBytes(bytes)}</span>`; const acciones = `
  <button class="ui-button ui-action ui-action--edit" data-action="edit" data-id="${it.id}" title="Editar" aria-label="Editar">
    <span class="ui-button__icon" data-icon="edit" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--view" data-action="ver" data-id="${it.id}" title="Nueva versión" aria-label="Nueva versión">
    <span class="ui-button__icon" data-icon="export" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--download" data-action="desc" data-id="${it.id}" title="Descargar" aria-label="Descargar">
    <span class="ui-button__icon" data-icon="download" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--delete" data-action="del" data-id="${it.id}" data-title="${util.esc(it.titulo || it.nombre_archivo)}" title="Eliminar" aria-label="Eliminar">
    <span class="ui-button__icon" data-icon="delete" aria-hidden="true"></span>
  </button>`; return `<tr class="ui-tabla__row"><td class="ui-tabla__cell">${nombre}</td><td class="ui-tabla__cell">${cat}</td><td class="ui-tabla__cell">${vig}</td><td class="ui-tabla__cell">${tam}</td><td class="ui-tabla__cell ui-tabla__cell--acciones">${acciones}</td></tr>`; }).join(''); this.tabla.innerHTML = rows || '<tr class="ui-tabla__row tabla-vacia"><td colspan="5" class="tabla-vacia">No hay documentos para mostrar</td></tr>'; }

    renderPager() { if (!this.pagin) return; const total = this.total || 0; const pageSize = this.opts.pageSize; const totalPages = Math.max(1, Math.ceil(total / pageSize)); const cur = Math.min(this.page, totalPages); const start = total === 0 ? 0 : (cur - 1) * pageSize + 1; const end = total === 0 ? 0 : Math.min(cur * pageSize, total); this.pagin.innerHTML = `<span class="ui-paginacion__info">Página ${cur} de ${totalPages} · ${start}-${end} de ${total} documentos</span><div class="ui-paginacion__controles"><button class="ui-button ui-button--ghost ui-paginacion__btn" ${cur === 1 ? 'disabled' : ''} data-page="${cur - 1}"><span class="ui-button__icon" data-icon="prev"></span>Anterior</button><button class="ui-button ui-button--ghost ui-paginacion__btn" ${cur === totalPages ? 'disabled' : ''} data-page="${cur + 1}">Siguiente<span class="ui-button__icon" data-icon="next"></span></button></div>`; this.pagin.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { const p = parseInt(b.dataset.page); if (p >= 1 && p <= totalPages) { this.page = p; this.load(); } })); }

  updateKPIs(meta) { if (!meta) return; if (this.kpiTotal) this.kpiTotal.textContent = meta.total || 0; if (this.kpiVig) this.kpiVig.textContent = meta.vigentes || 0; if (this.kpiFav) this.kpiFav.textContent = meta.favoritos || 0; }

  openUpload() { if (!this.modalSub) return; if (this.formSub) { this.formSub.reset(); const hidden = this.formSub.querySelector('input[name="documento_id"]'); if (hidden) hidden.remove(); } this.modalSub.style.display = 'flex'; }
  closeUpload() { if (!this.modalSub) return; this.modalSub.style.display = 'none'; }

  async upload() { if (!this.formSub) return; const fd = new FormData(this.formSub); const fileInput = this.formSub.querySelector('input[type=file]'); if (fileInput && fileInput.files.length) fd.set('archivo', fileInput.files[0]); const isNewVersion = fd.has('documento_id') && fd.get('documento_id'); const endpoint = isNewVersion ? this.urls.actualizar : this.urls.subir; const xhr = new XMLHttpRequest(); xhr.open('POST', endpoint); xhr.upload.addEventListener('progress', e => { if (e.lengthComputable && this.progress) { const pct = Math.round((e.loaded / e.total) * 100); this.progress.style.display = 'block'; if (this.bar) this.bar.style.width = pct + '%'; if (this.pct) this.pct.textContent = pct + '%'; } }); xhr.onload = () => { const cont = document.getElementById('leyenda'); if (xhr.status >= 200 && xhr.status < 300) { util.toast(isNewVersion ? 'Versión creada' : 'Subida finalizada', 'success'); try { if (window.SWGROI && window.SWGROI.UI && cont) window.SWGROI.UI.mostrarMensaje(isNewVersion ? 'Versión creada' : 'Documento subido', 'success', 'leyenda'); } catch(_) {} this.closeUpload(); this.load(); } else { util.toast('Error subiendo archivo', 'error'); try { if (window.SWGROI && window.SWGROI.UI && cont) window.SWGROI.UI.mostrarMensaje('Error subiendo archivo', 'error', 'leyenda'); } catch(_) {} } if (this.progress) { this.progress.style.display = 'none'; if (this.bar) this.bar.style.width = '0%'; if (this.pct) this.pct.textContent = '0%'; } }; xhr.onerror = () => { util.toast('Error de red durante la subida', 'error'); try { const cont = document.getElementById('leyenda'); if (window.SWGROI && window.SWGROI.UI && cont) window.SWGROI.UI.mostrarMensaje('Error de red durante la subida', 'error', 'leyenda'); } catch(_) {} }; xhr.send(fd); }

  async download(id) { const url = this.urls.descargar + '&id=' + encodeURIComponent(id); const a = document.createElement('a'); a.href = url; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove(); }

  async openEdit(id) { try { const r = await fetch(this.urls.obtener + '&id=' + encodeURIComponent(id)); const data = await r.json(); if (!data) return util.toast('Documento no encontrado', 'error'); const modal = util.qs('#modalDetalles'); if (!modal) return; modal.style.display = 'flex'; modal.querySelector('#contenidoDetalles').innerHTML = `<form id="formEditar" class="ui-form"><div class="ui-form-group"><label>Título</label><input name="titulo" class="ui-form__input" value="${util.esc(data.titulo || data.nombre_archivo)}"/></div><div class="ui-form-group"><label>Descripción</label><textarea name="descripcion" class="ui-form__input">${util.esc(data.descripcion || '')}</textarea></div><div class="ui-modal__actions"><button type="button" class="ui-button ui-button--secondary" id="cancelEdit">Cancelar</button><button type="submit" class="ui-button ui-button--primary">Guardar</button></div></form>`; const form = modal.querySelector('#formEditar'); form.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(form); fd.append('documento_id', id); this.update(fd); }); modal.querySelector('#cancelEdit').addEventListener('click', () => modal.style.display = 'none'); } catch (e) { console.error(e); util.toast('Error cargando documento', 'error'); } }

  async update(formData) { try { const r = await fetch(this.urls.actualizar, { method: 'POST', body: formData }); const j = await r.json(); if (j && j.status === 'success') { util.toast('Documento actualizado', 'success'); try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje('Documento actualizado', 'success', 'leyenda'); } catch(_) {} util.qs('#modalDetalles').style.display = 'none'; this.load(); } else { util.toast('Error actualizando documento', 'error'); try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje(j?.mensaje || 'Error actualizando documento', 'error', 'leyenda'); } catch(_) {} } } catch (e) { console.error(e); util.toast('Error actualizando', 'error'); try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje('Error actualizando', 'error', 'leyenda'); } catch(_) {} } }

  // abre el modal de confirmación (no usa confirm nativo)
  openDeleteModal(id, title) {
    if (!id) return;
    this._toDeleteId = id;
    if (this.deleteTextEl) this.deleteTextEl.textContent = title || '¿Eliminar el documento seleccionado? Esta acción no se puede deshacer.';
    if (this.modalEliminar) this.modalEliminar.style.display = 'flex';
  }

  async confirmDelete() {
    const id = this._toDeleteId; if (!id) return; try {
      if (this.modalEliminar) this.modalEliminar.style.display = 'none';
      const r = await fetch(this.urls.eliminar + '&id=' + encodeURIComponent(id), { method: 'POST' });
      const j = await r.json(); if (j && j.status === 'success') { util.toast('Documento eliminado', 'success'); try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje('Documento eliminado', 'success', 'leyenda'); } catch(_) {} this.load(); } else { const msg = j?.mensaje || 'No se pudo eliminar'; util.toast(msg, 'error'); try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje(msg, 'error', 'leyenda'); } catch(_) {} }
    } catch (e) { console.error(e); util.toast('Error eliminando', 'error'); }
    try { if (window.SWGROI && window.SWGROI.UI) window.SWGROI.UI.mostrarMensaje('Error eliminando', 'error', 'leyenda'); } catch(_) {}
    finally { this._toDeleteId = null; }
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
        window.documentosManager = new DocumentosManager({ selectors: { buscar: '#buscar-documentos', tabla: '#documentosGrid', paginacion: '#paginacionContainer', modalSubida: '#modalSubida', formSubida: '#formSubida', dropzone: '#dropzone', categorias: '#categoriaDocumento', modalDetalles: '#modalDetalles' } });
        window.documentosManager.load();
        window.documentosManager.loadCategories();
      }
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
