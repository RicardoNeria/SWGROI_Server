document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const leyenda = $('leyenda');

    const fDesde = $('fDesde'), fHasta = $('fHasta'), fEstado = $('fEstado'), fTexto = $('fTexto');
    const btnFiltrar = $('btnFiltrar'), btnLimpiar = $('btnLimpiar'), btnRecargar = $('btnRecargar');
    const tbody = document.querySelector('#tablaCots tbody');

    const params = new URLSearchParams(location.search);
    const filtroOVS = params.get('ovsr3') || '';  // viene del reporte (coma-separado)
    const filtroFolios = params.get('folios') || '';

    const fmt2 = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function fmtDate(v) {
        if (!v) return '';
        try { const d = new Date(v); if (!isNaN(d)) return d.toISOString().slice(0, 10); } catch { }
        return String(v).slice(0, 10);
    }

    function toast(msg, ok = true) {
        if (!leyenda) return;
        const type = ok ? 'success' : 'error';
        const iconMap = { success: '✔', error: '✖', warning: '⚠', info: 'ℹ️' };
        const icon = iconMap[type];

        let iconNode = leyenda.querySelector('.ui-message__icon');
        let textNode = leyenda.querySelector('.ui-message__text');
        if (!iconNode) { iconNode = document.createElement('span'); iconNode.className = 'ui-message__icon'; leyenda.insertAdjacentElement('afterbegin', iconNode); }
        if (!textNode) { textNode = document.createElement('span'); textNode.className = 'ui-message__text'; leyenda.appendChild(textNode); }
        iconNode.textContent = icon;
        textNode.textContent = msg;
        leyenda.className = `ui-message ui-message--${type} ui-message--visible`;
        leyenda.style.display = 'inline-flex';
        setTimeout(() => { leyenda.classList.remove('ui-message--visible'); leyenda.style.display = 'none'; }, 3000);
    }

    if (params.get('from') === 'reporte') {
        toast('Reporte enviado. Se aplicaron filtros automáticos desde el reporte.');
    }

    function normEstado(e) {
        const up = (e || '').toUpperCase();
        return up === 'ENVIAR' ? 'ENVIADO' : up;
    }

    function chip(estado) {
        const e = normEstado(estado);
        return `<span class="chip chip--${e}">${e}</span>`;
    }

    function filaVacia(txt) {
        return `<tr><td colspan="11" style="text-align:center;color:#6b7280;padding:14px">${txt || 'Sin resultados'}</td></tr>`;
    }

    function cargar() {
        const p = new URLSearchParams();
        if (fDesde.value) p.append('desde', fDesde.value);
        if (fHasta.value) p.append('hasta', fHasta.value);
        if (fEstado.value) p.append('estado', fEstado.value);
        if (fTexto.value) p.append('q', fTexto.value.trim());

        // si llegamos desde el reporte, respetamos esos filtros
        if (filtroOVS) p.append('ovsr3', filtroOVS);
        if (filtroFolios) p.append('folios', filtroFolios);

        tbody.innerHTML = filaVacia('Cargando…');

        fetch('/cotizaciones/listar' + (p.toString() ? ('?' + p.toString()) : ''))
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
            .then(lista => {
                console.log('Cotizaciones recibidas:', (lista || []).length);
                if (!lista || !lista.length) {
                    tbody.innerHTML = filaVacia('No hay cotizaciones con los filtros actuales.');
                    return;
                }

                tbody.innerHTML = (lista || []).map(c => {
                    const estadoNorm = normEstado(c.Estado);
                    const selectEstado = `
            <select class="sel-estado" data-id="${c.CotizacionID}">
              ${['ENVIADO', 'DECLINADO', 'ALMACEN', 'OPERACIONES', 'COBRANZA', 'FACTURACION', 'FINALIZADO']
                            .map(E => `<option value="${E}" ${estadoNorm === E ? 'selected' : ''}>${E}</option>`).join('')}
            </select>`;

                    const txt = (c.Comentarios || '').replace(/"/g, '&quot;');

                    return `
            <tr>
              <td>${c.CotizacionID}</td>
              <td>${c.Folio || ''}</td>
              <td>${c.OVSR3 || ''}</td>
              <td>${chip(c.Estado)}<br/>${selectEstado}</td>
              <td>$ ${fmt2(c.Monto)}</td>
              <td>${fmtDate(c.FechaEnvio)}</td>
              <td>${c.Cuenta || ''}</td>
              <td>${c.RazonSocial || ''}</td>
              <td>${c.Agente || ''}</td>
              <td class="coment">
                <textarea class="txt-coment" data-id="${c.CotizacionID}" rows="2" style="width: 100%">${txt}</textarea>
              </td>
              <td>
                <button class="btn verde btn-guardar" data-id="${c.CotizacionID}">Guardar</button>
              </td>
            </tr>`;
                }).join('');
            })
            .catch(err => {
                console.error('Error cargando cotizaciones:', err);
                tbody.innerHTML = filaVacia('Ocurrió un error al cargar. Intenta nuevamente.');
                toast('No fue posible cargar cotizaciones.', false);
            });
    }

    function guardar(id) {
        const sel = tbody.querySelector(`.sel-estado[data-id="${id}"]`);
        const txt = tbody.querySelector(`.txt-coment[data-id="${id}"]`);
        const estado = sel ? sel.value : '';
        const comentarios = txt ? txt.value : '';
        fetch('/cotizaciones/actualizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cotizacionId: String(id), estado, comentarios })
        })
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); })
            .then(() => { toast('Actualizado.'); cargar(); })
            .catch(err => { console.error(err); toast('No fue posible actualizar.', false); });
    }

    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-guardar');
        if (btn) guardar(btn.getAttribute('data-id'));
    });

    btnFiltrar.addEventListener('click', cargar);
    btnRecargar.addEventListener('click', cargar);
    btnLimpiar.addEventListener('click', () => { fDesde.value = ''; fHasta.value = ''; fEstado.value = ''; fTexto.value = ''; cargar(); });

    cargar();
});
