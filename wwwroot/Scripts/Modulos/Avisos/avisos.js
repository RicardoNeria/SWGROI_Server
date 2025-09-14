// Módulo de avisos: CRUD con paginación, orden, filtros y notificaciones del sistema (4s)
let AV_STATE = { page: 1, pageSize: 10, sort: 'Fecha', dir: 'DESC', desde: '', hasta: '', asunto: '' };

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formAviso");
    const inputId = document.getElementById("avisoId");
    const inputAsunto = document.getElementById("asunto");
    const inputMensaje = document.getElementById("mensaje");
    const btnLimpiar = document.getElementById("btnLimpiar");
    const btnCancelarEdicion = document.getElementById("btnCancelarEdicion");
    const filtroDesde = document.getElementById("filtroDesde");
    const filtroHasta = document.getElementById("filtroHasta");
    const filtroAsunto = document.getElementById("filtroAsunto");
    const btnBuscar = document.getElementById("btnBuscar");
    const btnLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
    const selSort = document.getElementById("selSort");
    const selDir = document.getElementById("selDir");
    const selPageSize = document.getElementById("selPageSize");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    const btnExportar = document.getElementById("btnExportar");

    // Modal elementos
    const modalOverlay = document.getElementById('modalOverlay');
    const modalId = document.getElementById('modalAvisoId');
    const modalAsunto = document.getElementById('modalAsunto');
    const modalMensaje = document.getElementById('modalMensaje');
    const btnModalGuardar = document.getElementById('btnModalGuardar');
    const btnModalCancelar = document.getElementById('btnModalCancelar');

    // Contador de caracteres de mensaje
    let contadorMsg = document.getElementById('contadorMensaje');
    if (!contadorMsg) {
        contadorMsg = document.createElement('small');
        contadorMsg.id = 'contadorMensaje';
        contadorMsg.style.display = 'block';
        contadorMsg.style.opacity = '0.8';
        inputMensaje.parentNode.appendChild(contadorMsg);
    }
    function actualizarContador() {
        const len = (inputMensaje.value || '').length;
        contadorMsg.textContent = `${len}/2000`;
        contadorMsg.style.color = len > 1800 ? '#e67e22' : '#2c3e50';
    }
    inputMensaje.addEventListener('input', actualizarContador);
    actualizarContador();

    // Configuración de filtros/sort/paginación
    selPageSize.addEventListener('change', () => { AV_STATE.pageSize = parseInt(selPageSize.value, 10) || 10; AV_STATE.page = 1; cargarAvisos(); });
    selSort.addEventListener('change', () => { AV_STATE.sort = selSort.value; AV_STATE.page = 1; cargarAvisos(); });
    selDir.addEventListener('change', () => { AV_STATE.dir = selDir.value; AV_STATE.page = 1; cargarAvisos(); });
    btnPrev.addEventListener('click', () => { if (AV_STATE.page > 1) { AV_STATE.page--; cargarAvisos(); } });
    btnNext.addEventListener('click', () => { AV_STATE.page++; cargarAvisos(); });
    btnExportar.addEventListener('click', exportarCsv);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        const asunto = inputAsunto.value.trim();
        const mensaje = inputMensaje.value.trim();

        if (!asunto || !mensaje) { mostrarMensaje("Por favor completa todos los campos.", "error"); return; }
        if (asunto.length < 3 || asunto.length > 100) { mostrarMensaje("El asunto debe tener entre 3 y 100 caracteres.", "warn"); return; }
        if (mensaje.length < 5 || mensaje.length > 2000) { mostrarMensaje("El mensaje debe tener entre 5 y 2000 caracteres.", "warn"); return; }

        const idEdit = inputId.value.trim();
        const isEdit = idEdit !== "";
        const url = isEdit ? ("/avisos?id=" + encodeURIComponent(idEdit)) : "/avisos";
        const method = isEdit ? "PUT" : "POST";

        fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ asunto, mensaje }) })
            .then(async res => { const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch {} if (!res.ok) throw new Error((data && data.error) || "Error en la operación"); mostrarMensaje(isEdit ? "Aviso actualizado." : "Aviso publicado.", "success"); cancelarEdicion(); form.reset(); actualizarContador(); cargarAvisos(); })
            .catch(e => mostrarMensaje(e.message || "Error en la operación.", "error"));
    });

    btnLimpiar.addEventListener("click", () => { inputAsunto.value = ""; inputMensaje.value = ""; actualizarContador(); });
    btnCancelarEdicion.addEventListener("click", cancelarEdicion);

    if (btnModalCancelar) btnModalCancelar.addEventListener('click', (e)=>{ e.preventDefault(); cerrarModal(); });
    if (btnModalGuardar) btnModalGuardar.addEventListener('click', (e)=>{ e.preventDefault(); guardarModal(); });
    const btnModalClose = document.getElementById('btnModalClose');
    if (btnModalClose) btnModalClose.addEventListener('click', (e)=>{ e.preventDefault(); cerrarModal(); });
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e)=>{ if (e.target === modalOverlay) cerrarModal(); });
        document.addEventListener('keydown', (e)=>{ if (modalOverlay.style.display==='flex' && e.key==='Escape') cerrarModal(); });
    }

    btnBuscar.addEventListener("click", () => {
        const desde = filtroDesde.value.trim(); const hasta = filtroHasta.value.trim();
        if (desde && hasta && new Date(desde) > new Date(hasta)) { mostrarMensaje("El rango de fechas es inválido (Desde > Hasta).", "warn"); return; }
        AV_STATE.desde = desde; AV_STATE.hasta = hasta; AV_STATE.asunto = filtroAsunto.value.trim(); AV_STATE.page = 1; cargarAvisos();
    });
    btnLimpiarFiltros.addEventListener("click", () => { filtroDesde.value = ""; filtroHasta.value = ""; filtroAsunto.value = ""; AV_STATE = { page: 1, pageSize: parseInt(selPageSize.value,10)||10, sort: selSort.value, dir: selDir.value, desde: '', hasta: '', asunto: '' }; cargarAvisos(); });

    cargarAvisos();
});

function cargarAvisos() {
    const params = new URLSearchParams();
    if (AV_STATE.desde) params.set('desde', AV_STATE.desde);
    if (AV_STATE.hasta) params.set('hasta', AV_STATE.hasta);
    if (AV_STATE.asunto) params.set('asunto', AV_STATE.asunto);
    params.set('page', AV_STATE.page); params.set('pageSize', AV_STATE.pageSize); params.set('sort', AV_STATE.sort); params.set('dir', AV_STATE.dir);
    fetch("/avisos?" + params.toString())
        .then(res => res.text())
        .then(txt => JSON.parse(txt))
        .then(data => { renderizarTabla(data.items || []); actualizarPaginacion(data.total || 0, data.page || AV_STATE.page, data.pageSize || AV_STATE.pageSize); })
        .catch(() => mostrarMensaje("Error al cargar avisos.", "error"));
}

function renderizarTabla(avisos) {
    const tabla = document.getElementById("tablaAvisos");
    tabla.innerHTML = "";
    avisos.forEach(a => {
        const fila = document.createElement("tr");
        const tdFecha = document.createElement("td"); tdFecha.textContent = a.Fecha ?? "";
        const tdAsunto = document.createElement("td"); tdAsunto.textContent = a.Asunto ?? "";
        const tdMensaje = document.createElement("td"); tdMensaje.textContent = a.Mensaje ?? "";
        const tdAcciones = document.createElement("td"); tdAcciones.className = "acciones";
        const btnEditar = document.createElement("button"); btnEditar.className = "btn azul"; btnEditar.innerHTML = svgIcon('edit') + "Editar"; btnEditar.addEventListener("click", () => abrirModal(a));
        const btnEliminar = document.createElement("button"); btnEliminar.className = "btn rojo"; btnEliminar.innerHTML = svgIcon('trash') + "Eliminar"; btnEliminar.addEventListener("click", () => confirmarEliminacion(a.Id));
        const btnCopiar = document.createElement("button"); btnCopiar.className = "btn"; btnCopiar.innerHTML = svgIcon('copy') + "Copiar"; btnCopiar.addEventListener("click", () => copiarAviso(a));
        const group = document.createElement('div'); group.className = 'acciones-group';
        group.appendChild(btnEditar); group.appendChild(btnEliminar); group.appendChild(btnCopiar);
        tdAcciones.appendChild(group);
        fila.appendChild(tdFecha); fila.appendChild(tdAsunto); fila.appendChild(tdMensaje); fila.appendChild(tdAcciones);
        tabla.appendChild(fila);
    });
}

function svgIcon(name){
    const base = {
        edit: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M2 14.5V18h3.5L16 7.5 12.5 4 2 14.5zm14.8-9.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-1.2 1.2L15.6 6l1.2-1.2z"/></svg>',
        trash: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 2h8l1 2h3v2H2V4h3l1-2zm1 6h2v8H7V8zm4 0h2v8h-2V8z"/></svg>',
        copy: '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2h9a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm-2 4h9a1 1 0 0 1 1 1v11H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/></svg>'
    };
    return base[name] || '';
}

function actualizarPaginacion(total, page, pageSize) {
    const lbl = document.getElementById('lblPaginacion');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    AV_STATE.page = page; AV_STATE.pageSize = pageSize;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    lbl.textContent = `Página ${page} de ${maxPage} · ${total} avisos`;
    btnPrev.disabled = page <= 1; btnNext.disabled = page >= maxPage;
}

function mostrarMensaje(mensaje, tipo) {
    const barra = document.getElementById("leyenda");
    barra.className = "leyenda";
    if (tipo === "error") barra.classList.add("leyenda--error");
    else if (tipo === "warn") barra.classList.add("leyenda--warn");
    else if (tipo === "info") barra.classList.add("leyenda--info");
    barra.textContent = mensaje; barra.style.display = "block"; clearTimeout(barra._t); barra._t = setTimeout(() => { barra.style.display = "none"; }, 4000);
}

function abrirModal(a) {
    const overlay = document.getElementById('modalOverlay');
    const mId = document.getElementById('modalAvisoId');
    const mAsunto = document.getElementById('modalAsunto');
    const mMensaje = document.getElementById('modalMensaje');
    if (!overlay || !mId || !mAsunto || !mMensaje) { mostrarMensaje('No se pudo abrir el editor.', 'error'); return; }
    mId.value = a.Id;
    mAsunto.value = a.Asunto || '';
    mMensaje.value = a.Mensaje || '';
    overlay.style.display = 'flex';
    setTimeout(()=>{ try { mAsunto.focus(); } catch{} }, 0);
}

function cancelarEdicion() {
    const inputId = document.getElementById("avisoId"); const btnCancelar = document.getElementById("btnCancelarEdicion"); inputId.value = ""; btnCancelar.style.display = "none";
}

function cerrarModal() { const overlay = document.getElementById('modalOverlay'); if (overlay) overlay.style.display = 'none'; }

function guardarModal() {
    const mId = document.getElementById('modalAvisoId');
    const mAsunto = document.getElementById('modalAsunto');
    const mMensaje = document.getElementById('modalMensaje');
    if (!mId || !mAsunto || !mMensaje) { mostrarMensaje('No se pudo guardar.', 'error'); return; }
    const id = mId.value.trim();
    const asunto = (mAsunto.value || '').trim();
    const mensaje = (mMensaje.value || '').trim();
    if (!asunto || asunto.length < 3 || asunto.length > 100) { mostrarMensaje("El asunto debe tener entre 3 y 100 caracteres.", "warn"); return; }
    if (!mensaje || mensaje.length < 5 || mensaje.length > 2000) { mostrarMensaje("El mensaje debe tener entre 5 y 2000 caracteres.", "warn"); return; }
    fetch('/avisos?id=' + encodeURIComponent(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asunto, mensaje }) })
      .then(async r => { const t = await r.text(); let d=null; try{d=JSON.parse(t);}catch{} if (!r.ok){ if (r.status===403) throw new Error('No autorizado. Inicie sesión como Administrador.'); throw new Error((d && d.error) || 'Error al actualizar.'); } mostrarMensaje('Aviso actualizado.', 'success'); cerrarModal(); cargarAvisos(); })
      .catch(e => mostrarMensaje(e.message || 'Error al actualizar.', 'error'));
}

function copiarAviso(a) {
    const txt = `Fecha: ${a.Fecha}\nAsunto: ${a.Asunto}\nMensaje: ${a.Mensaje}`;
    navigator.clipboard.writeText(txt).then(() => mostrarMensaje('Aviso copiado al portapapeles.', 'info'));
}

function eliminarAviso(id) {
    fetch("/avisos?id=" + encodeURIComponent(id), { method: "DELETE" })
        .then(res => res.text())
        .then(txt => { let data = null; try { data = JSON.parse(txt); } catch {} if (data && data.error) throw new Error(data.error); mostrarMensaje("Aviso eliminado.", "success"); cargarAvisos(); })
        .catch(e => mostrarMensaje(e.message || "Error al eliminar.", "error"));
}

function confirmarEliminacion(id) {
    const barra = document.getElementById("leyenda");
    barra.className = "leyenda leyenda--warn";
    barra.innerHTML = "¿Eliminar este aviso? ";
    const btnOk = document.createElement("button"); btnOk.className = "btn rojo"; btnOk.textContent = "Eliminar"; btnOk.onclick = () => { barra.style.display = "none"; eliminarAviso(id); };
    const btnCancel = document.createElement("button"); btnCancel.className = "btn"; btnCancel.style.marginLeft = "8px"; btnCancel.textContent = "Cancelar"; btnCancel.onclick = () => { barra.style.display = "none"; };
    barra.appendChild(btnOk); barra.appendChild(btnCancel); barra.style.display = "block"; clearTimeout(barra._t); barra._t = setTimeout(() => { barra.style.display = "none"; }, 4000);
}

function exportarCsv() {
    const params = new URLSearchParams();
    if (AV_STATE.desde) params.set('desde', AV_STATE.desde);
    if (AV_STATE.hasta) params.set('hasta', AV_STATE.hasta);
    if (AV_STATE.asunto) params.set('asunto', AV_STATE.asunto);
    params.set('sort', AV_STATE.sort); params.set('dir', AV_STATE.dir); params.set('export', 'csv');
    const a = document.createElement('a'); a.href = '/avisos?' + params.toString(); a.download = 'avisos.csv'; document.body.appendChild(a); a.click(); a.remove();
}
