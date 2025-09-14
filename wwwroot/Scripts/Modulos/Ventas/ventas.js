// ventas.js — sin Programar/Editar/Eliminar. Cancelar↔Activar alternan.
// Autorelleno del último registro del ticket para nueva venta.
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const leyenda = $('leyenda');

    // Form (modal)
    const folio = $('folioTicket');
    const monto = $('monto');
    const estado = $('estadoCotizacion');
    const ovsr3Pref = $('ovsr3Pref');
    const ovsr3Num = $('ovsr3Num');
    const ovsr3Hidden = $('ovsr3');
    const cuenta = $('cuenta');
    const razon = $('razonSocial');
    const domicilio = $('domicilio');
    const fecha = $('fechaAtencion');
    const agente = $('agenteResponsable');
    const descripcion = $('descripcion');
    const totalIva = $('totalIva');
    const comision = $('comision');
    const comentarios = $('comentariosCotizacion');
    const statusPagoSel = $('statusPago');
    const mvMsg = $('mv-msg');

    // Botones
    const btnConsultar = $('btnConsultar');
    const btnGuardar = $('btnGuardar');
    const btnLimpiarForm = $('btnLimpiarForm');
    const btnAbrirModalVenta = $('btnAbrirModalVenta');
    const fabNuevaVenta = $('fabNuevaVenta');
    const btnToggleSidebar = $('btnToggleSidebar');

    // Filtros/tabla
    const filtroFolio = $('filtroFolio');
    const filtroEstado = $('filtroEstado');
    const filtroOvsr3 = $('filtroOvsr3');
    const filtroMin = $('filtroTotalComisionMin');
    const filtroMax = $('filtroTotalComisionMax');
    const btnBuscar = $('btnBuscar');
    const btnCargar = $('btnCargarVentas');
    const btnLimpiar = $('btnLimpiar');
    const tbody = document.querySelector('#tablaVentas tbody');

    // Paginación + resumen
    const btnPrev = $('btnPrev');
    const btnNext = $('btnNext');
    const lblPaginacion = $('lblPaginacion');
    const tablaLoader = $('tablaLoader');

    const resumenTotales = $('resumenTotales');
    const resTotalReg = $('resTotalReg');
    const resMonto = $('resMonto');
    const resTotalIva = $('resTotalIva');
    const resTotalIvaCom = $('resTotalIvaCom');
    const resComSinIva = $('resComSinIva');
    const divisorCom = $('divisorCom');
    const resComPorPersona = $('resComPorPersona');

    // Modales
    const modalVenta = $('modalVenta');
    const mvClose = $('mv-close');
    const mvCancel = $('mv-cancel');

    const modalCancelacion = $('modalCancelacion');
    const mcanOv = $('mcan-ov');
    const mcanMot = $('mcan-motivo');

    if (btnToggleSidebar) btnToggleSidebar.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));

    const num = (v) => Number(isNaN(v) || v === '' ? 0 : v);
    const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let toastTimer, mvTimer;

    function toast(msg, ok = true) {
        leyenda.textContent = msg;
        leyenda.style.display = 'block';
        leyenda.style.backgroundColor = ok ? '#28a745' : '#e74c3c';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { leyenda.style.display = 'none'; }, 2000);
    }

    function setMv(msg, ok = true) {
        mvMsg.textContent = msg;
        mvMsg.style.display = 'block';
        mvMsg.style.backgroundColor = ok ? '#28a745' : '#e74c3c';
        clearTimeout(mvTimer);
        mvTimer = setTimeout(() => { clearMv(); }, 2000);
    }

    function clearMv() {
        mvMsg.textContent = '';
        mvMsg.style.display = 'none';
    }

function calcular() {
        const base = num(monto?.value || 0);
        const iva = base * 1.16;
        const comIva = iva * 1.03;
        if (totalIva) totalIva.value = iva.toFixed(2);
        if (comision) comision.value = comIva.toFixed(2);
    }
    if (monto) monto.addEventListener('input', calcular);

    function getUsuarioCookie() {
        const c = document.cookie.split('; ').find(p => p.startsWith('usuario='));
        return c ? decodeURIComponent(c.split('=')[1]) : '';
    }
    if (agente) agente.value = getUsuarioCookie();

    // Modal open/close
    function abrirModalVenta() {
        clearMv();
        modalVenta.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        folio && folio.focus();
    }
    function cerrarModalVenta() {
        modalVenta.style.display = 'none';
        document.body.style.overflow = '';
    }
    if (btnAbrirModalVenta) btnAbrirModalVenta.addEventListener('click', abrirModalVenta);
    if (fabNuevaVenta) fabNuevaVenta.addEventListener('click', abrirModalVenta);
    if (mvClose) mvClose.addEventListener('click', cerrarModalVenta);
    if (mvCancel) mvCancel.addEventListener('click', cerrarModalVenta);
    if (modalVenta) modalVenta.addEventListener('click', (e) => { if (e.target === modalVenta) cerrarModalVenta(); });

    // Construir OVSR3 combinado
    function buildOVSR3() {
        const pref = (ovsr3Pref?.value || '').trim();
        const numtxt = (ovsr3Num?.value || '').trim();
        if (ovsr3Hidden) ovsr3Hidden.value = numtxt ? `${pref}-${numtxt}` : pref;
    }

    // Consultar folio y precargar último registro del ticket
    async function consultarFolio() {
        const f = (folio?.value || '').trim();
        if (!f) { setMv('Ingresa un folio para consultar.', false); return; }
        try {
            const r = await fetch(`/ventas/consultar-ticket?folio=${encodeURIComponent(f)}`);
            if (!r.ok) throw new Error('No encontrado');
            const data = await r.json();
            if (cuenta) cuenta.value = data.Cuenta || '';
            if (razon) razon.value = data.RazonSocial || '';
            if (domicilio) domicilio.value = data.Domicilio || '';
            if (fecha) fecha.value = data.FechaAtencion || '';
            if (agente) agente.value = data.AgenteResponsable || agente.value;
            if (descripcion) descripcion.value = data.Descripcion || '';

            const pre = await fetch(`/ventas/por-ticket?folio=${encodeURIComponent(f)}`);
            if (pre.ok) {
                const v = await pre.json();
                if (v && Object.keys(v).length) {
                    if (v.ovsr3) {
                        const m = String(v.ovsr3).match(/^(PRE-OV|POST-OV)-?(.+)$/i);
                        if (m) { if (ovsr3Pref) ovsr3Pref.value = m[1].toUpperCase(); if (ovsr3Num) ovsr3Num.value = m[2]; }
                        else { if (ovsr3Num) ovsr3Num.value = v.ovsr3; }
                    }
                    if (cuenta) cuenta.value = v.cuenta || cuenta.value;
                    if (razon) razon.value = v.razonSocial || razon.value;
                    if (domicilio) domicilio.value = v.domicilio || domicilio.value;

                    if (estado) estado.value = v.estado || estado.value;
                    if (monto) monto.value = v.monto || monto.value;
                    if (comentarios) comentarios.value = v.comentariosCotizacion || '';
                    calcular();
                    setMv('Ticket consultado. Datos del último registro precargados. Puedes editar y registrar una nueva venta.', true);
                    return;
                }
            }
            setMv('Ticket consultado.', true);
        } catch {
            setMv('No se encontró el folio en tickets.', false);
        }
    }
    if (btnConsultar) btnConsultar.addEventListener('click', consultarFolio);

    function limpiarFormulario(notify = true) {
        [folio, monto, ovsr3Num, cuenta, razon, domicilio, fecha, descripcion, totalIva, comision, comentarios]
            .forEach(el => { if (el) el.value = ''; });
        if (estado) estado.value = 'ENVIADO';
        if (ovsr3Pref) ovsr3Pref.value = 'PRE-OV';
        if (agente) agente.value = getUsuarioCookie();
        calcular();
        if (notify) setMv('Formulario limpio.', true); else clearMv();
    }
    if (btnLimpiarForm) btnLimpiarForm.addEventListener('click', () => limpiarFormulario(true));

    function mostrarConfirm(titulo, mensaje, cb) {
        const modal = document.getElementById('modalConfirmacion');
        $('modalConfirmacionTitulo').textContent = titulo || 'Confirmación';
        $('modalConfirmacionMensaje').textContent = mensaje || '¿Estás seguro?';
        const btn = $('btnConfirmarAccion');
        const nuevo = btn.cloneNode(true);
        btn.parentNode.replaceChild(nuevo, btn);
        nuevo.addEventListener('click', () => { modal.style.display = 'none'; if (typeof cb === 'function') cb(); });
        modal.style.display = 'flex';
    }
    window.cerrarModalConfirmacion = () => { const m = document.getElementById('modalConfirmacion'); if (m) m.style.display = 'none'; };

    function postGuardar() {
        buildOVSR3();
        const payload = {
            folioTicket: (folio?.value || '').trim(),
            monto: String(num(monto?.value).toFixed(2)),
            estado: estado?.value || '',
            ovsr3: (ovsr3Hidden?.value || '').trim(),
            cuenta: (cuenta?.value || '').trim(),
            razonSocial: (razon?.value || '').trim(),
            domicilio: (domicilio?.value || '').trim(),
            fechaAtencion: fecha?.value || '',
            comentariosCotizacion: (comentarios?.value || '').trim(),
            statusPago: (statusPagoSel?.value || 'Pendiente')
        };
        if (!payload.folioTicket || !payload.ovsr3 || !payload.monto) { setMv('Folio, OVSR3 y Monto son obligatorios.', false); return; }

        fetch('/ventas/guardar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(async r => {
                if (!r.ok) {
                    let m = 'Error al guardar';
                    try { const j = await r.json(); m = j.message || m; } catch { }
                    if (r.status === 409) m = 'No se puede registrar el ticket porque el OVSR3 ya existe.';
                    throw new Error(m);
                }
                return r.json();
            })
            .then(() => { toast('Venta registrada.'); limpiarFormulario(false); cerrarModalVenta(); cargarTabla(); })
            .catch(err => setMv(err.message || 'No se pudo registrar la venta.', false));
    }
    function guardarVenta(e) { e.preventDefault(); mostrarConfirm('Registrar Venta', '¿Deseas registrar esta venta?', postGuardar); }
    if (btnGuardar) btnGuardar.addEventListener('click', guardarVenta);

    // ===== Estado de COTIZACIÓN =====
    // Catálogo EXACTO como BD (EstadoCotizacionID → Nombre)
    const ESTADO_ID_TO_NAME = {
        1: 'ENVIADO',
        2: 'DECLINADA',
        3: 'ALMACEN',
        4: 'OPERACIONES',
        5: 'COBRANZA',
        6: 'FACTURACION',
        7: 'FINALIZADO'
    };

    // Lee ID o texto. Devuelve exactamente como en BD.
    function getEstado(obj) {
        if (!obj || typeof obj !== 'object') return '';

        // 1) Por ID (considera varias variantes de nombre)
        const idCandidates = [
            'EstadoCotizacionID', 'estadoCotizacionID', 'EstadoCotizacionId', 'estadoCotizacionId',
            'IdEstadoCotizacion', 'idEstadoCotizacion',
            'EstadoID', 'estadoID', 'EstadoId', 'estadoId',
            'Estado' // a veces llega numérica
        ];
        for (const k of idCandidates) {
            if (k in obj) {
                const n = Number(obj[k]);
                if (!Number.isNaN(n) && ESTADO_ID_TO_NAME[n]) return ESTADO_ID_TO_NAME[n];
            }
        }

        // 2) Por texto
        const textCandidates = [
            'Nombre', 'nombre', 'NombreNorm', 'nombreNorm',
            'Estado', 'estado',
            'EstadoCotizacion', 'estadoCotizacion',
            'StatusCotizacion', 'statusCotizacion',
            'Estatus', 'estatus',
            'EstadoVenta', 'estadoVenta'
        ];
        for (const k of textCandidates) {
            if (k in obj && obj[k] != null && String(obj[k]).trim() !== '') {
                const norm = String(obj[k])
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .trim().toUpperCase();
                if (/^DECLINAD[AO]$/.test(norm) || /^RECHAZAD[AO]$/.test(norm)) return 'DECLINADA';
                if (/^ENVIAD[OA]$/.test(norm)) return 'ENVIADO';
                if (/ALMACEN/.test(norm)) return 'ALMACEN';
                if (/OPERACION/.test(norm)) return 'OPERACIONES';
                if (/COBRANZ/.test(norm)) return 'COBRANZA';
                if (/FACTURACI/.test(norm)) return 'FACTURACION';
                if (/FINALIZAD/.test(norm)) return 'FINALIZADO';
                return norm; // ya viene igual a BD
            }
        }

        // 3) Fallback: inspeccionar cualquier string por palabras clave
        for (const [, v] of Object.entries(obj)) {
            if (typeof v === 'string') {
                const s = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                if (/DECLINAD/.test(s) || /RECHAZAD/.test(s)) return 'DECLINADA';
            }
        }
        return '';
    }

    function badgeEstado(val) {
        let e = typeof val === 'string' ? val : '';
        if (!e) e = getEstado({ Nombre: val });
        const map = {
            DECLINADA: 'badge--cancel',
            ENVIADO: 'badge--almacen',
            ALMACEN: 'badge--almacen',
            OPERACIONES: 'badge--operaciones',
            COBRANZA: 'badge--cobranza',
            FACTURACION: 'badge--facturacion',
            FINALIZADO: 'badge--finalizado'
        };
        const clase = map[e] || 'badge--almacen';
        const texto = e || '—';
        return `<span class="badge ${clase}">${esc(texto)}</span>`;
    }

    function filaVenta(v) {
        const totalIVA = (v.Monto || 0) * 1.16;
        const totalIVACom = totalIVA * 1.03;

        const esCancelado = (v.StatusPago || '').toString().toLowerCase() === 'cancelado';
        const tip = (v.MotivoCancelacion || v.FechaCancelacion || v.UsuarioCancelacion)
            ? ` data-tip="Motivo: ${esc(v.MotivoCancelacion || '-')} · Fecha: ${v.FechaCancelacion ? new Date(v.FechaCancelacion).toISOString().slice(0, 10) : '-'} · Por: ${esc(v.UsuarioCancelacion || '-')}"` : '';
        const cancelChip = esCancelado ? `<span class="badge badge--cancel"${tip}>CANCELADO</span>` : '';
        const cls = esCancelado ? ' class="row-cancelado"' : '';
        const fechaAt = v.FechaAtencion ? new Date(v.FechaAtencion).toISOString().slice(0, 10) : '';

        const btnToggle = esCancelado
            ? `<button class="btn verde btnactivar" data-ovsr3="${esc(v.OVSR3 || '')}">Activar</button>`
            : `<button class="btn rojo btn-cancelar" data-ovsr3="${esc(v.OVSR3 || '')}">Cancelar</button>`;

        const estadoNorm = getEstado(v);

        return `
<tr${cls}>
  <td><span title="${esc(v.OVSR3 || '')}">${esc(v.OVSR3 || '')}</span></td>
  <td><span title="${esc(v.Folio || '')}">${esc(v.Folio || '')}</span></td>
  <td>$ ${fmt(v.Monto || 0)}</td>
  <td>$ ${fmt(totalIVA)}</td>
  <td>$ ${fmt(totalIVACom)}</td>
  <td>${esc(fechaAt)}</td>
  <td>${esc(v.Cuenta || '')}</td>
  <td>${esc(v.RazonSocial || '')}</td>
  <td>${esc(v.AgenteResponsable || '')}</td>
  <td class="cell-estado">${badgeEstado(estadoNorm)} ${cancelChip}</td>
  <td>${esc(v.Descripcion || '')}</td>
  <td>${esc(v.ComentariosCotizacion || '')}</td>
  <td>${esc(v.StatusPago || '')}</td>
  <td>${esc(v.FechaCancelacion ? new Date(v.FechaCancelacion).toISOString().slice(0,10) : '')}</td>
  <td>${esc(v.MotivoCancelacion || '')}</td>
  <td>${esc(v.UsuarioCancelacion || '')}</td>
  <td class="cell-acciones" style="display:flex; gap:6px; flex-wrap:wrap">${btnToggle}</td>
</tr>`;
    }

    // Copiar texto con fallback
    async function copyText(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_) { }
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.top = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            ta.setSelectionRange(0, ta.value.length);
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (_) { return false; }
    }

    // Delegación de acciones en tabla
    document.addEventListener('click', async (e) => {
        const ov = (btn) => btn?.getAttribute('data-ovsr3');

        if (e.target.closest('.copy')) {
            const val = e.target.closest('.copy').getAttribute('data-copy') || '';
            const ok = await copyText(val);
            toast(ok ? 'Copiado.' : 'No se pudo copiar.', ok);
            return;
        }

        if (e.target.closest('.btn-cancelar')) {
            abrirModalCancelacion(ov(e.target.closest('.btn-cancelar')));
            return;
        }

        if (e.target.closest('.btnactivar')) {
            const id = ov(e.target.closest('.btnactivar'));
            const r = await fetch('/ventas/activar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ovsr3: id })
            });
            if (r.ok) { toast('Venta activada.'); cargarTabla(); return; }
            let m = 'No se pudo activar';
            try { const j = await r.json(); m = j.message || m; } catch { }
            toast(m, false);
            return;
        }
    });

    async function postJson(url, body) {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
        if (r.ok) return true;
        let m = 'Operación no realizada';
        try { const j = await r.json(); m = j.message || m; } catch { }
        toast(m, false);
        return false;
    }

    function abrirModalCancelacion(ov) {
        mcanOv.textContent = ov;
        mcanMot.value = '';

        const btn = document.getElementById('mcan-confirm');
        btn.replaceWith(btn.cloneNode(true));
        const fresh = document.getElementById('mcan-confirm');

        fresh.addEventListener('click', async () => {
            const motivo = mcanMot.value.trim();
            if (!motivo) { toast('Motivo requerido.', false); return; }
            const cUser = document.cookie.split('; ').find(p => p.startsWith('usuario='));
            const usuario = cUser ? decodeURIComponent(cUser.split('=')[1]) : '';
            const ok = await postJson('/ventas/cancelar', { ovsr3: mcanOv.textContent, motivo, usuario });
            if (ok) { window.cerrarModalCancelacion(); toast('Venta cancelada.'); cargarTabla(); }
        });

        modalCancelacion.style.display = 'flex';
    }

    window.cerrarModalCancelacion = () => { modalCancelacion.style.display = 'none'; };

    // Filtros y tabla
    let page = 1, pageSize = 50, total = 0;

    function renderTabla(resp) {
        const raw = Array.isArray(resp.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        const datos = applySort(raw);

        tbody.innerHTML = datos.length
            ? datos.map(filaVenta).join('')
            : `<tr><td colspan="15" style="text-align:center; padding:10px">Sin resultados</td></tr>`;

        total = resp.total || datos.length || 0;
        const maxPage = Math.max(1, Math.ceil(total / pageSize));
        lblPaginacion.textContent = `Página ${page} / ${maxPage} • ${total} registros`;
        btnPrev.disabled = page <= 1;
        btnNext.disabled = page >= maxPage;
    }

    function cargarTabla(feedback = false) {
        const q = new URLSearchParams();
        const hasFolio = !!filtroFolio.value.trim();
        const hasEstado = !!filtroEstado.value.trim();
        const hasOvsr3 = !!filtroOvsr3.value.trim();
        const hasMin = filtroMin.value !== '';
        const hasMax = filtroMax.value !== '';
        const anyFilter = hasFolio || hasEstado || hasOvsr3 || hasMin || hasMax;

        if (hasFolio) q.set('folio', filtroFolio.value.trim());
        if (hasEstado) q.set('estado', filtroEstado.value.trim());
        if (hasOvsr3) q.set('ovsr3', filtroOvsr3.value.trim());
        if (hasMin) q.set('min', String(num(filtroMin.value)));
        if (hasMax) q.set('max', String(num(filtroMax.value)));
        q.set('page', String(page));
        q.set('pageSize', String(pageSize));

        const qs = q.toString();

        tablaLoader.style.display = 'inline-block';
        fetch(`/ventas/listar?${qs}`)
            .then(r => r.json())
            .then(resp => {
                renderTabla(resp);

                // Totales y resumen
                const raw = Array.isArray(resp.items) ? resp.items : (Array.isArray(resp) ? resp : []);
                const sumMonto = raw.reduce((a, x) => a + Number(x.Monto || 0), 0);
                const sumIva = sumMonto * 1.16;
                const sumIvaCom = sumIva * 1.03;
                const sumComSI = sumIva * 0.03;

                if (resumenTotales) {
                    resTotalReg.textContent = `Registros: ${resp?.total ?? raw.length}`;
                    resMonto.textContent = `Σ Monto: $ ${fmt(sumMonto)}`;
                    resTotalIva.textContent = `Σ c/IVA: $ ${fmt(sumIva)}`;
                    resTotalIvaCom.textContent = `Σ c/IVA+Com.: $ ${fmt(sumIvaCom)}`;
                    if (resComSinIva) resComSinIva.textContent = `Σ Comisión s/IVA: $ ${fmt(sumComSI)}`;

                    const recompute = () => {
                        if (!divisorCom || !resComPorPersona) return;
                        const d = Math.max(1, Number(divisorCom.value || 1));
                        resComPorPersona.textContent = `= $ ${fmt(sumComSI / d)} por cada uno`;
                    };
                    if (divisorCom) divisorCom.oninput = recompute;
                    recompute();
                    resumenTotales.style.display = 'flex';

                    // Métricas de estados (sumatoria monto s/IVA)
                    (function metricas(){
                        const se = document.getElementById('metEstado');
                        const sm = document.getElementById('metMes');
                        const box = document.getElementById('metricasEstados');
                        if(!se || !sm || !box) return;
                        box.style.display = 'block';
                        function upd(){
                            const est = (se.value||'').toUpperCase();
                            const mm = Number(sm.value||0);
                            let sum = 0;
                            const byEstado = {};
                            (raw||[]).forEach(v=>{
                                const e = String(v.Estado||'').toUpperCase();
                                const fa = v.FechaAtencion ? new Date(v.FechaAtencion) : null;
                                const mes = fa? (fa.getMonth()+1) : 0;
                                if(est && e!==est) return;
                                if(mm && mes!==mm) return;
                                const base = Number(v.Monto||0);
                                sum += base;
                                byEstado[e] = (byEstado[e]||0) + base;
                            });
                            document.getElementById('metSuma').textContent = 'Σ Monto s/IVA: $ ' + fmt(sum);
                            // Gráfica simple de barras
                            const cvs = document.getElementById('metChart');
                            if(!cvs) return;
                            const ctx = cvs.getContext('2d');
                            const keys = Object.keys(byEstado);
                            const W = cvs.width = cvs.clientWidth || 600; const H = cvs.height;
                            ctx.clearRect(0,0,W,H);
                            const max = Math.max(1, ...Object.values(byEstado));
                            const bw = Math.max(20, Math.floor((W-20)/(keys.length||1))-10);
                            keys.forEach((k,i)=>{
                                const val = byEstado[k];
                                const h = Math.round((val/max)*(H-20));
                                const x = 10 + i*(bw+10); const y = H-10-h;
                                ctx.fillStyle = '#2563eb'; ctx.fillRect(x,y,bw,h);
                                ctx.fillStyle = '#111'; ctx.font = '12px Inter, sans-serif';
                                ctx.fillText(k, x, H-2);
                            });
                        }
                        se.onchange = upd; sm.onchange = upd; upd();
                    })();
                }

                if (feedback && anyFilter) {
                    const n = resp?.total ?? raw.length;
                    toast(n > 0 ? `Búsqueda exitosa: ${n} resultado(s).` : 'Sin resultados con los filtros aplicados.', n > 0);
                }

                saveFilters();

                function updateReportLink() {
                    const linkRep = document.querySelector('a[href^="/ventas/reporte?format=html"]');
                    if (!linkRep) return;
                    const v = Number(document.getElementById('divisorCom')?.value || 1);
                    const d = Math.max(1, Math.floor(v));
                    const url = new URL(linkRep.getAttribute('href'), location.origin);
                    url.searchParams.set('format', 'html');
                    url.searchParams.set('div', String(d));
                    linkRep.href = url.pathname + '?' + url.searchParams.toString();
                    linkRep.target = '_blank';
                }
                updateReportLink();
                if (divisorCom) divisorCom.addEventListener('input', updateReportLink);

                const btnExp = document.getElementById('btnExportar');
                if (btnExp) btnExp.onclick = () => window.open(`/ventas/exportar-excel?${qs}`, '_blank');

                const btnExpFull = document.getElementById('btnExportarFull');
                if (btnExpFull) btnExpFull.onclick = () => window.open(`/ventas/exportar-excel?${qs}&full=1`, '_blank');
            })
            .catch(() => {
                toast('No se pudieron cargar las ventas.', false);
                tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding:10px">Error al cargar</td></tr>`;
            })
            .finally(() => { tablaLoader.style.display = 'none'; });
    }

    if (btnCargar) btnCargar.addEventListener('click', () => { page = 1; cargarTabla(); });
    if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
        filtroFolio.value = ''; filtroEstado.value = ''; filtroOvsr3.value = ''; filtroMin.value = ''; filtroMax.value = '';
        page = 1; saveFilters(); cargarTabla(true);
    });
    if (btnBuscar) btnBuscar.addEventListener('click', () => { page = 1; cargarTabla(true); });
    if (btnPrev) btnPrev.addEventListener('click', () => { if (page > 1) { page--; cargarTabla(); } });
    if (btnNext) btnNext.addEventListener('click', () => { page++; cargarTabla(); });

    // Persistencia de filtros y atajos
    const LSKEY = 'ventas_filtros';
    function saveFilters() {
        try {
            localStorage.setItem(LSKEY, JSON.stringify({
                folio: filtroFolio.value.trim(),
                estado: filtroEstado.value.trim(),
                ovsr3: filtroOvsr3.value.trim(),
                min: filtroMin.value, max: filtroMax.value,
                page, pageSize
            }));
        } catch { }
    }
    function loadFilters() {
        try {
            const raw = localStorage.getItem(LSKEY); if (!raw) return;
            const d = JSON.parse(raw);
            filtroFolio.value = d.folio || '';
            filtroEstado.value = d.estado || '';
            filtroOvsr3.value = d.ovsr3 || '';
            filtroMin.value = d.min ?? '';
            filtroMax.value = d.max ?? '';
            page = d.page || 1;
            pageSize = d.pageSize || pageSize;
        } catch { }
    }
    // Buscar con Enter
    [filtroFolio, filtroOvsr3, filtroMin, filtroMax].forEach(el => {
        if (!el) return;
        el.addEventListener('keydown', e => { if (e.key === 'Enter') { page = 1; cargarTabla(true); } });
    });

    let sortKey = null, sortDir = 'desc';
    function applySort(arr) {
        if (!sortKey) return arr;
        const k = sortKey;
        const dir = sortDir === 'asc' ? 1 : -1;
        return arr.slice().sort((a, b) => {
            let A = a[k], B = b[k];
            if (k === 'Monto') { A = Number(A || 0); B = Number(B || 0); }
            else if (k === 'FechaAtencion') { A = A ? new Date(A) : 0; B = B ? new Date(B) : 0; }
            else { A = String(A || ''); B = String(B || ''); }
            return A < B ? -1 * dir : A > B ? 1 * dir : 0;
        });
    }

    // ordenar por encabezados
    document.querySelectorAll('#tablaVentas thead th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            sortDir = (sortKey === key && sortDir === 'asc') ? 'desc' : 'asc';
            sortKey = key;
            document.querySelectorAll('#tablaVentas thead th[data-sort]').forEach(h => h.removeAttribute('data-arrow'));
            th.setAttribute('data-arrow', sortDir === 'asc' ? '▲' : '▼');
            cargarTabla();
        });
    });

    // Init
    calcular();
    loadFilters();
    cargarTabla();
});
