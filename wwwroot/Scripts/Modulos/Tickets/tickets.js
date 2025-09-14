document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formularioTicket");
    const leyenda = document.getElementById("leyenda");

    const responsableInput = document.getElementById("responsable");
    const folioInput = document.getElementById("folio");
    const descripcionInput = document.getElementById("descripcion");
    const estadoInput = document.getElementById("estado");
    const estadoSeguimientoInput = document.getElementById("estadoSeguimiento");
    const comentarioDiv = document.getElementById("comentarioTecnico");
    const actualizarBtn = document.getElementById("actualizarBtn");

    const buscadorFolio = document.getElementById("buscadorFolio");
    const btnBuscar = document.getElementById("btnBuscar");

    const responsableConstante = getResponsableDesdeCookie();
    if (responsableConstante) responsableInput.value = responsableConstante;

    btnBuscar.addEventListener("click", buscarTicketPorFolio);
    buscadorFolio.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            buscarTicketPorFolio();
        }
    });

    function buscarTicketPorFolio() {
        const folio = buscadorFolio.value.trim();
        if (!folio) {
            mostrarMensaje("Por favor ingrese un folio para buscar.", false);
            return;
        }

        fetch(`/seguimiento?folio=${encodeURIComponent(folio)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.Descripcion && data.Estado) {
                    folioInput.value = folio;
                    descripcionInput.value = data.Descripcion || "";
                    estadoInput.value = data.Estado || "Almacén";
                    estadoSeguimientoInput.value = data.Estado || "";
                    comentarioDiv.textContent = data.Comentario || "(Sin comentarios técnicos)";
                    const cerrado = (data.Estado || "").toLowerCase() === "cerrado";
                    folioInput.readOnly = cerrado;
                    descripcionInput.readOnly = cerrado;
                    estadoInput.disabled = cerrado;
                    actualizarBtn.disabled = cerrado;
                    mostrarMensaje(cerrado ? "Este ticket está cerrado y no puede ser editado." : "Ticket encontrado correctamente.", !cerrado);
                } else {
                    mostrarMensaje("No se encontró el ticket.", false);
                }
            })
            .catch(err => {
                mostrarMensaje("Error al buscar el ticket.", false);
                console.error("Error al buscar ticket:", err);
            });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!window.validateForm || !window.validateForm(form)) { return; }
        mostrarModalConfirmacion("Registrar Ticket", "¿Deseas registrar este ticket?", registrarTicket);
    });

    function registrarTicket() {
        const folio = folioInput.value.trim();
        const descripcion = descripcionInput.value.trim();
        const estado = estadoInput.value;
        const responsable = responsableInput.value.trim();

        if (!folio || !descripcion || !estado || !responsable) {
            mostrarMensaje("Todos los campos son obligatorios.", false);
            return;
        }

        const datos = { Folio: folio, Descripcion: descripcion, Estado: estado, Responsable: responsable, Comentario: "" };

        fetch("/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(async res => {
                let ok = res.ok;
                let payload;
                try { payload = await res.clone().json(); } catch { payload = await res.text(); }
                if (typeof payload === 'object' && payload) {
                    ok = !!payload.ok || res.ok;
                    mostrarMensaje(payload.message || (ok?"Operación exitosa":"Ocurrió un error"), ok);
                } else {
                    const msg = String(payload||'');
                    mostrarMensaje(msg, ok && (msg.toLowerCase().includes("registrado") || msg.toLowerCase().includes("correctamente")));
                }
                form.reset();
                responsableInput.value = responsableConstante;
                estadoSeguimientoInput.value = "";
                comentarioDiv.textContent = "(No hay comentarios técnicos aún)";
            })
            .catch(err => {
                console.error("Error al registrar el ticket:", err);
                mostrarMensaje("No se pudo guardar el ticket.", false);
            });
    }

    actualizarBtn.addEventListener("click", function () {
        mostrarModalConfirmacion("Actualizar Ticket", "¿Deseas actualizar este ticket?", actualizarTicket);
    });

    function actualizarTicket() {
        const datos = {
            folio: folioInput.value.trim(),
            descripcion: descripcionInput.value.trim(),
            estado: estadoInput.value,
            responsable: responsableConstante
        };

        fetch("/tickets/actualizar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(async res => {
                let ok = res.ok;
                let payload;
                try { payload = await res.clone().json(); } catch { payload = await res.text(); }
                if (typeof payload === 'object' && payload) {
                    ok = !!payload.ok || res.ok;
                    mostrarMensaje(payload.message || (ok?"Operación exitosa":"Ocurrió un error"), ok);
                } else {
                    const msg = String(payload||'');
                    mostrarMensaje(msg, ok && msg.toLowerCase().includes("actualizado"));
                }
            })
            .catch(err => {
                mostrarMensaje("Error al actualizar el ticket.", false);
                console.error("Actualización error:", err);
            });
    }

    function mostrarMensaje(mensajeTexto, exito, colorPersonalizado) {
        leyenda.innerText = mensajeTexto;
        leyenda.style.backgroundColor = colorPersonalizado || (exito ? "#28a745" : "#e74c3c");
        leyenda.style.color = "white";
        leyenda.style.padding = "10px 20px";
        leyenda.style.borderRadius = "8px";
        leyenda.style.marginBottom = "20px";
        leyenda.style.display = "block";
        try { (exito?window.toastSuccess:window.toastError)(mensajeTexto); } catch {}
        setTimeout(() => leyenda.style.display = "none", 4000);
    }

    function getResponsableDesdeCookie() {
        const cookie = document.cookie.split('; ').find(c => c.startsWith('usuario='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    }

    document.getElementById("limpiarBtn").addEventListener("click", function () {
        form.reset();
        // Rehabilitar campos en caso de que el ticket consultado estuviera cerrado
        folioInput.readOnly = false;
        descripcionInput.readOnly = false;
        estadoInput.disabled = false;
        actualizarBtn.disabled = false;
        estadoInput.selectedIndex = 0;
        estadoSeguimientoInput.value = "";
        comentarioDiv.value = "(No hay comentarios técnicos aún)";
        buscadorFolio.value = "";
    });

    // ===== Tabla CRUD =====
    const T = {
        page: 1,
        pageSize: 10,
        cache: [],
        filtro: '',
        estado: ''
    };
    const tabla = document.getElementById('tablaTickets');
    const tbody = tabla ? tabla.querySelector('tbody') : null;
    const lblPag = document.getElementById('lblPaginacionTickets');
    const btnPrev = document.getElementById('btnPrevTickets');
    const btnNext = document.getElementById('btnNextTickets');
    const filtroTxt = document.getElementById('filtroTicket');
    const filtroEstado = document.getElementById('filtroEstadoTicket');

    function renderKPIs(list){
        const opened = list.filter(x=> (x.Estado||'').toLowerCase()==='abierto').length;
        const proc = list.filter(x=> (x.Estado||'').toLowerCase()==='en proceso').length;
        const cerr = list.filter(x=> (x.Estado||'').toLowerCase()==='cerrado').length;
        const box = document.getElementById('kpisTickets');
        if(!box) return;
        document.getElementById('kpiAbiertos').textContent = `Abiertos: ${opened}`;
        document.getElementById('kpiProceso').textContent = `En Proceso: ${proc}`;
        document.getElementById('kpiCerrados').textContent = `Cerrados: ${cerr}`;
        box.style.display = 'flex';
    }

    function filtrar(list){
        const f = (T.filtro||'').toLowerCase();
        const e = (T.estado||'').toLowerCase();
        return list.filter(t=>{
            const okF = !f || (String(t.Folio||'').toLowerCase().includes(f) || String(t.Responsable||'').toLowerCase().includes(f));
            const okE = !e || String(t.Estado||'').toLowerCase() === e;
            return okF && okE;
        });
    }

    function renderTable(){
        if(!tbody) return;
        const filtered = filtrar(T.cache);
        const total = filtered.length;
        const maxPage = Math.max(1, Math.ceil(total / T.pageSize));
        if(T.page>maxPage) T.page=maxPage;
        const start = (T.page-1)*T.pageSize;
        const pageItems = filtered.slice(start, start+T.pageSize);

        tbody.innerHTML = '';
        pageItems.forEach(t=>{
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td title="${t.Folio||''}">${t.Folio||''}</td>
                <td>${(t.Descripcion||'').replace(/</g,'&lt;')}</td>
                <td>${t.Estado||''}</td>
                <td>${t.Responsable||''}</td>
                <td>${t.Comentario||''}</td>
                <td class="acciones">
                  <div class="acciones-group">
                    <button class="btn azul" data-editar="${t.Folio||''}">Editar</button>
                    <button class="btn rojo" data-eliminar="${t.Folio||''}">Eliminar</button>
                  </div>
                </td>`;
            tbody.appendChild(tr);
        });
        if(lblPag) lblPag.textContent = `Página ${T.page} de ${maxPage} · ${total} tickets`;
        if(btnPrev) btnPrev.disabled = T.page<=1;
        if(btnNext) btnNext.disabled = T.page>=maxPage;
    }

    function cargarTickets(){
        fetch('/seguimiento')
            .then(r=>r.json())
            .then(list=>{ T.cache = Array.isArray(list)? list : []; renderKPIs(T.cache); renderTable(); })
            .catch(()=>{ T.cache=[]; renderTable();});
    }

    if(btnPrev) btnPrev.addEventListener('click', ()=>{ if(T.page>1){ T.page--; renderTable(); } });
    if(btnNext) btnNext.addEventListener('click', ()=>{ T.page++; renderTable(); });
    const btnBuscarTicket = document.getElementById('btnBuscarTicket');
    if(btnBuscarTicket) btnBuscarTicket.addEventListener('click', ()=>{ T.filtro = (filtroTxt?.value||'').trim(); T.estado = (filtroEstado?.value||'').trim(); T.page=1; renderTable(); });
    const btnLimpiarTabla = document.getElementById('btnLimpiarTabla');
    if(btnLimpiarTabla) btnLimpiarTabla.addEventListener('click', ()=>{ if(filtroTxt) filtroTxt.value=''; if(filtroEstado) filtroEstado.value=''; T.filtro=''; T.estado=''; T.page=1; renderTable(); });

    // Delegación de acciones editar/eliminar
    if(tbody) tbody.addEventListener('click', (e)=>{
        const bE = e.target.closest('button[data-editar]');
        if(bE){
            const fol = bE.getAttribute('data-editar');
            const t = T.cache.find(x=> String(x.Folio)===String(fol));
            if(t){
                folioInput.value = t.Folio||'';
                descripcionInput.value = t.Descripcion||'';
                estadoInput.value = t.Estado||'Almacén';
                estadoSeguimientoInput.value = t.Estado||'';
                comentarioDiv.value = t.Comentario||'(No hay comentarios técnicos aún)';
                mostrarMensaje('Formulario cargado para edición.', true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
        }
        const bD = e.target.closest('button[data-eliminar]');
        if(bD){
            const fol = bD.getAttribute('data-eliminar');
            window.confirmDialog({
                title: 'Eliminar ticket',
                message: `¿Eliminar el ticket ${fol}? Esta acción no se puede deshacer.`,
                okText: 'Eliminar',
                onOk: ()=>{
                    fetch('/tickets/eliminar', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ folio: fol }) })
                        .then(r=>r.ok?r.text():Promise.reject())
                        .then(()=>{ mostrarMensaje('Ticket eliminado.', true); cargarTickets(); })
                        .catch(()=> mostrarMensaje('No se pudo eliminar.', false));
                }
            });
        }
    });

    // Exportar CSV
    const btnExpCsv = document.getElementById('btnExportCsvTickets');
    if(btnExpCsv) btnExpCsv.addEventListener('click', ()=>{
        const list = filtrar(T.cache);
        const rows = [ ['Folio','Descripcion','Estado','Responsable','Comentario'] ]
            .concat(list.map(t=> [t.Folio||'', t.Descripcion||'', t.Estado||'', t.Responsable||'', t.Comentario||'']));
        const csv = rows.map(r=> r.map(v=> {
            v = (v||'').replace(/\"/g,'\"\"');
            return (v.includes(',')||v.includes('"')||v.includes('\n')) ? `"${v}"` : v;
        }).join(',')).join('\n');
        const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tickets.csv'; a.click(); URL.revokeObjectURL(a.href);
    });

    // Imprimir / PDF
    const btnPrint = document.getElementById('btnImprimirTickets');
    if(btnPrint) btnPrint.addEventListener('click', ()=> window.print());

    // Carga inicial de la tabla
    cargarTickets();

    function mostrarModalConfirmacion(titulo, mensaje, callback) {
        const modal = document.getElementById("modalConfirmacion");
        document.getElementById("modalConfirmacionTitulo").textContent = titulo || "Confirmación";
        document.getElementById("modalConfirmacionMensaje").textContent = mensaje || "¿Estás seguro?";
        const btnConfirmar = document.getElementById("btnConfirmarAccion");
        const nuevoBoton = btnConfirmar.cloneNode(true);
        btnConfirmar.parentNode.replaceChild(nuevoBoton, btnConfirmar);
        nuevoBoton.addEventListener("click", () => {
            modal.style.display = "none";
            if (typeof callback === "function") callback();
        });
        modal.style.display = "flex";
    }

    window.cerrarModalConfirmacion = function () {
        document.getElementById("modalConfirmacion").style.display = "none";
    };
});
