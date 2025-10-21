/**
 * VENTAS.JS - Lógica del módulo de gestión de ventas
 * Sistema SWGROI - Separación de responsabilidades
 * Solo contiene lógica, sin estilos CSS ni estructura HTML
 */
document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // SELECTORES DOM - Solo referencias a elementos HTML
    // ============================================================
    const $ = (id) => document.getElementById(id);
    
    // Elementos de notificación - Sistema unificado de toasts del módulo
    
    // Formulario modal (IDs sincronizados con ventas.html)
    const folio = $('folio');
    const monto = $('monto');
    const estado = $('estado');
    const ovsr3Pref = $('ovsr3Pref');
    const ovsr3Num = $('ovsr3Num');
    const ovsr3Hidden = $('ovsr3Hidden');
    const cuenta = $('cuenta');
    const razon = $('razon');
    const domicilio = $('domicilio');
    const fecha = $('fecha');
    const agente = $('agente');
    const descripcion = $('descripcion');
    const totalIva = $('totalIva');
    const comision = $('comision');
    const comentarios = $('comentarios');
    const statusPagoSel = $('statusPagoSel');

    // Botones de acción
    const btnConsultar = $('btnConsultar');
    const btnGuardar = $('btnGuardar');
    const btnLimpiarForm = $('btnLimpiarForm');
    const btnAbrirModalVenta = $('btnAbrirModalVenta');
    const fabNuevaVenta = $('fabNuevaVenta');

    // Filtros y búsqueda
    const filtroFolio = $('filtroFolio');
    const filtroEstado = $('filtroEstado');
    const filtroOvsr3 = $('filtroOvsr3');
    const filtroMin = $('filtroMin');
    const filtroMax = $('filtroMax');
    const btnBuscar = $('btnBuscar');
    const btnCargar = $('btnCargar');
    const btnLimpiar = $('btnLimpiar');
    // tbody puede tener id "tbody" o encontrarse dentro de #tablaVentas
    const tbody = $('tbody') || document.querySelector('#tablaVentas tbody');

    // Paginación y resumen
    const lblPaginacion = $('lblPaginacion');
    const paginacionVentas = document.getElementById('paginacionVentas');
    const tablaLoader = $('tablaLoader');
    const resumenTotales = $('resumenTotales');
    const resTotalReg = $('resTotalReg');
    const resMonto = $('resMonto');
    const resTotalIva = $('resTotalIva');
    const resTotalIvaCom = $('resTotalIvaCom');
    // Métricas adicionales
    const resComSinIva = $('resComSinIva');
    const divisorCom = $('divisorCom');
    const resComPorPersona = $('resComPorPersona');
    const metEstado = $('metEstado');
    const metMes = $('metMes');
    const metSuma = $('metSuma');
    const metChart = $('metChart');
    const resPctCanceladas = $('resPctCanceladas');
    const resAvgMonto = $('resAvgMonto');
    const resTopAgentes = $('resTopAgentes');

    // Exportación
    const btnExportar = $('btnExportar');
    const btnExportarFull = $('btnExportarFull');

    // Modales
    const modalVenta = $('modalVenta');
    const mvClose = $('mv-close');
    const mvCancel = $('mv-cancel');
    const modalCancelacion = $('modalCancelacion');
    const mcanOv = $('mcanOv');
    const mcanMot = $('mcanMot');
    const mcanConfirm = $('mcan-confirm');
    // Accesibilidad modal Detalles
    let lastFocusDetalles = null;
    let detallesKeyHandler = null;

    // ============================================================
    // VARIABLES DE ESTADO Y CONFIGURACIÓN
    // ============================================================
    let toastTimer, mvTimer;
    let pageNumber = 1, pageSize = 50, totalRecords = 0;
    let sortKey = null, sortDir = 'desc';
    const STORAGE_KEY = 'ventas_filtros';

    // Catálogo de estados
    // Estados en Title Case para mostrar directamente 'Enviado', 'Declinada', etc.
    const ESTADO_ID_TO_NAME = {
        1: 'Enviado',
        2: 'Declinada',
        3: 'Almacén',
        4: 'Operaciones',
        5: 'Cobranza',
        6: 'Facturación',
        7: 'Finalizado'
    };

    // Mapa derivado para búsquedas por texto: uppercase -> Title Case
    const ESTADO_UPPER_TO_TITLE = Object.values(ESTADO_ID_TO_NAME).reduce((m, v) => {
        if (v && typeof v === 'string') m[v.toUpperCase()] = v;
        return m;
    }, {});

    // ============================================================
    // FUNCIONES UTILITARIAS
    // ============================================================
    const num = (v) => Number(isNaN(v) || v === '' ? 0 : v);
    const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Escape para atributos HTML (usar comillas simples para envolver)
    const escAttr = (s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // Helper: obtener campo usuario cancelación con varios posibles nombres usados por el backend
    function getUsuarioCancelacion(obj) {
        if (!obj || typeof obj !== 'object') return '';
        return String(obj.UsuarioCancelacion || obj.UsuarioCancel || obj.UsuarioCancelado || obj.UsuarioCancela || obj.UsuarioCancelador || obj.Usuario || obj.UserCancelacion || obj.userCancelacion || '').trim();
    }

    // Intentar obtener el nombre completo del usuario que canceló (varios nombres posibles que puede traer el backend)
    function getUsuarioCancelacionFull(obj) {
        if (!obj || typeof obj !== 'object') return '';
        const candidates = [
            'UsuarioCancelacionNombre', 'UsuarioCancelacionNombreCompleto', 'UsuarioCancelacionFull', 'UsuarioCancelacionDisplayName',
            'NombreUsuarioCancelacion', 'NombreCancelacion', 'NombreCompletoCancelacion', 'NombreCompleto', 'Nombre', 'nombre',
            'displayName', 'fullName', 'FullName', 'nombreCompleto', 'NombreCompletoUsuario', 'UsuarioNombre', 'UsuarioDisplayName'
        ];
        for (const k of candidates) {
            if (k in obj && obj[k]) return String(obj[k]).trim();
        }
        // También soportar objeto anidado (ej. obj.Usuario || obj.User)
        const nested = obj.Usuario || obj.User || obj.usuario || obj.user;
        if (nested && typeof nested === 'object') {
            for (const k of ['nombre', 'Nombre', 'fullName', 'displayName', 'NombreCompleto']) {
                if (k in nested && nested[k]) return String(nested[k]).trim();
            }
        }
        // Si no lo trae el objeto, intentar buscar en la cache del módulo de Administración
        try {
            const username = (getUsuarioCancelacion(obj) || '').trim();
            if (username && window.AdminModule && Array.isArray(window.AdminModule.usuarios)) {
                const uname = username.toLowerCase();
                for (const u of window.AdminModule.usuarios) {
                    if (!u) continue;
                    const candidateUser = String(u.Usuario || u.UsuarioLogin || u.UsuarioNombre || u.user || u.User || '').trim();
                    if (candidateUser && candidateUser.toLowerCase() === uname) {
                        const full = String(u.NombreCompleto || u.Nombre || u.NombreCompletoUsuario || u.displayName || u.FullName || u.fullName || '').trim();
                        if (full) return full;
                    }
                }
            }
        } catch (e) {
            // silenciar errores de ambiente
        }
        return '';
    }

    // ============================================================
    // FUNCIONES DE NOTIFICACIÓN
    // ============================================================
    // Proveer un wrapper global para compatibilidad con validators y otras llamadas
    if (typeof window.showVentasToast !== 'function') {
        window.showVentasToast = function(message, type = 'info', duration = 3200) {
            try {
                if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
                    window.ToastPremium.show(String(message || ''), String(type || 'info'), { duration });
                    return;
                }
            } catch (e) { /* ignore */ }
            // Fallback suave si no está disponible el sistema de toasts
            console[(type === 'error' ? 'warn' : 'log')](String(message || ''));
        };
    }

    function toast(msg, ok = true) {
        const type = ok ? 'success' : 'error';
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            try { window.ToastPremium.show(String(msg || ''), type, { duration: 3200 }); return; } catch (_) {}
        }
        if (typeof window.showVentasToast === 'function') {
            window.showVentasToast(String(msg || ''), type, 3200);
        } else {
            console[(ok ? 'log' : 'warn')](String(msg || ''));
        }
    }

    function setMv(msg, ok = true) {
        // Mostrar mensaje en el modal sin depender de SWGROI.UI
        const modalContainer = document.getElementById('modalVentaMensaje') || document.querySelector('#modalVenta .ui-message-container');
        if (!modalContainer) return;

        // Asegurar elemento .ui-message dentro del contenedor
        let msgEl = modalContainer.querySelector('.ui-message');
        if (!msgEl) {
            msgEl = document.createElement('div');
            msgEl.className = 'ui-message';
            msgEl.setAttribute('role', 'status');
            msgEl.setAttribute('aria-live', 'polite');
            // estructura interna: icono + texto
            const iconSpan = document.createElement('span');
            iconSpan.className = 'ui-message__icon';
            const textSpan = document.createElement('span');
            textSpan.className = 'ui-message__text';
            msgEl.appendChild(iconSpan);
            msgEl.appendChild(textSpan);
            modalContainer.appendChild(msgEl);
        }

        // Actualizar contenido y clases
        const tipo = ok ? 'success' : 'error';
        const iconMap = { success: '\u2714', error: '\u2716', warning: '\u26a0', info: '\u2139\ufe0f' };
        const iconNode = msgEl.querySelector('.ui-message__icon');
        const textNode = msgEl.querySelector('.ui-message__text');
        if (iconNode) iconNode.textContent = iconMap[tipo] || '';
        if (textNode) textNode.textContent = String(msg || '');
        msgEl.className = `ui-message ui-message--${tipo} ui-message--visible`;
        msgEl.style.display = 'inline-flex';

        clearTimeout(mvTimer);
        mvTimer = setTimeout(() => {
            msgEl.classList.remove('ui-message--visible');
            msgEl.style.display = 'none';
        }, 4000);

        // Enfocar visualmente el contenedor para visibilidad
        try { modalContainer.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* noop */ }
    }

    function clearMv() {
        // Ocultar cualquier mensaje en el modal (sin SWGROI.UI)
        const container = document.getElementById('modalVentaMensaje') || document.querySelector('#modalVenta .ui-message-container');
        if (!container) return;
        const msg = container.querySelector('.ui-message');
        if (!msg) return;
        clearTimeout(mvTimer);
        msg.classList.remove('ui-message--visible');
        msg.style.display = 'none';
        const iconSpan = msg.querySelector('.ui-message__icon');
        const textSpan = msg.querySelector('.ui-message__text');
        if (iconSpan) iconSpan.textContent = '';
        if (textSpan) textSpan.textContent = '';
    }

    // ============================================================
    // FUNCIONES DE NEGOCIO
    // ============================================================

    // Cálculo automático de IVA y comisión
    function calcular() {
        if (!monto) return;
        const base = num(monto.value);
        const iva = base * 1.16;
        const comIva = iva * 1.03;
        if (totalIva) totalIva.value = iva.toFixed(2);
        if (comision) comision.value = comIva.toFixed(2);
    }

    // Obtener usuario de la cookie
    function getUsuarioCookie() {
        const c = document.cookie.split('; ').find(p => p.startsWith('usuario='));
        return c ? decodeURIComponent(c.split('=')[1]) : '';
    }

    // Intentar obtener el nombre completo del usuario de sesión (buscar en cache de AdminModule)
    function getUsuarioSesionFull() {
        const sessionUser = String(getUsuarioCookie() || '').trim();
        if (!sessionUser) return '';
        try {
            if (window.AdminModule && Array.isArray(window.AdminModule.usuarios)) {
                const uname = sessionUser.toLowerCase();
                for (const u of window.AdminModule.usuarios) {
                    if (!u) continue;
                    const candidateUser = String(u.Usuario || u.UsuarioLogin || u.UsuarioNombre || u.user || u.User || '').trim();
                    if (candidateUser && candidateUser.toLowerCase() === uname) {
                        const full = String(u.NombreCompleto || u.Nombre || u.NombreCompletoUsuario || u.displayName || u.FullName || u.fullName || '').trim();
                        if (full) return full;
                    }
                }
            }
        } catch (e) {
            // noop
        }
        // fallback: devolver el nombre de usuario de sesión (p.ej. 'admin')
        return sessionUser;
    }

    // Construir OVSR3 combinado
    function buildOVSR3() {
        const pref = (ovsr3Pref?.value || '').trim();
        const numtxt = (ovsr3Num?.value || '').trim();
        if (ovsr3Hidden) {
            ovsr3Hidden.value = pref && numtxt ? `${pref}-${numtxt}` : '';
        }
    }

    // Obtener estado de cotización
    function getEstado(obj) {
        if (!obj || typeof obj !== 'object') return '';

        // Por ID
        const idCandidates = [
            'EstadoCotizacionID', 'estadoCotizacionID', 'EstadoCotizacionId', 'estadoCotizacionId',
            'IdEstadoCotizacion', 'idEstadoCotizacion', 'EstadoID', 'estadoID', 'EstadoId', 'estadoId',
            'Estado', 'estado'
        ];
        
        for (const k of idCandidates) {
            if (k in obj && obj[k] != null) {
                const id = parseInt(obj[k]);
                if (!isNaN(id) && ESTADO_ID_TO_NAME[id]) {
                    return ESTADO_ID_TO_NAME[id];
                }
            }
        }

        // Por texto
        const textCandidates = [
            'Nombre', 'nombre', 'NombreNorm', 'nombreNorm',
            'Estado', 'estado', 'EstadoCotizacion', 'estadoCotizacion',
            'StatusCotizacion', 'statusCotizacion', 'Estatus', 'estatus',
            'EstadoVenta', 'estadoVenta'
        ];
        
        for (const k of textCandidates) {
            if (k in obj && typeof obj[k] === 'string') {
                const raw = obj[k].trim();
                const val = raw.toUpperCase();
                if (ESTADO_UPPER_TO_TITLE[val]) {
                    // devolvemos la versión Title Case (por ejemplo 'Enviado')
                    return ESTADO_UPPER_TO_TITLE[val];
                }
            }
        }

        return '';
    }

    // Badge de estado
    function badgeEstado(val) {
        const raw = String(val ?? '').trim();
        if (!raw) return '<span class="ui-badge ui-badge--proceso">En Proceso</span>';

        // Clases por estado (clave en MAYÚSCULAS) mapeadas a ui-badge
        const map = {
            DECLINADA: 'declinada',
            ENVIADO: 'enviado',
            ALMACEN: 'almacen',
            OPERACIONES: 'operaciones',
            COBRANZA: 'cobranza',
            FACTURACION: 'facturacion',
            FINALIZADO: 'finalizado'
        };
        // Texto de display con acentos correctos
        const DISPLAY_BY_KEY = {
            DECLINADA: 'Declinada',
            ENVIADO: 'Enviado',
            ALMACEN: 'Almacén',
            OPERACIONES: 'Operaciones',
            COBRANZA: 'Cobranza',
            FACTURACION: 'Facturación',
            FINALIZADO: 'Finalizado'
        };

        const key = raw.toString().toUpperCase();
        const clase = map[key] || 'almacen';
        const label = DISPLAY_BY_KEY[key] || ESTADO_UPPER_TO_TITLE[key] || toTitleCase(key);
        // Incluir tooltip con el valor crudo
        return `<span class="ui-badge ui-badge--${clase}" title="${esc(raw)}">${esc(label)}</span>`;
    }

    // Convertir cadenas a Title Case (Capitaliza la primera letra de cada palabra)
    function toTitleCase(s) {
        if (!s) return '';
        try {
            // Use locale-aware casing for Spanish
            const locale = 'es-ES';
            // Normalize whitespace and punctuation boundaries
            return String(s)
                .toLocaleLowerCase(locale)
                .split(/(\s+|[-_/])/)
                .map(part => {
                    // preserve separators
                    if (/^(\s+|[-_/])$/.test(part)) return part;
                    // capitalize first char using locale
                    const first = part.charAt(0).toLocaleUpperCase(locale);
                    return first + part.slice(1);
                })
                .join('')
                .trim();
        } catch (e) {
            // Fallback simple implementation
            return String(s).toLowerCase().split(/\s+/).map(w => w ? (w[0].toUpperCase() + w.slice(1)) : '').join(' ');
        }
    }

    // Badge de estado para tickets (igual que tickets.js)
    function badgeEstadoTicket(estado) {
        const raw = String(estado ?? '').trim();
        if (!raw) return '<span class="ui-badge ui-badge--default">Sin Estado</span>';
        
        const estadoLower = raw.toLowerCase();
        let clase = 'default';
        
        switch (estadoLower) {
            case 'almacén':
            case 'almacen':
                clase = 'almacen';
                break;
            case 'capturado':
                clase = 'capturado';
                break;
            case 'programado/asignado':
            case 'programado':
                clase = 'programado';
                break;
            case 'abierto':
                clase = 'abierto';
                break;
            case 'en proceso':
            case 'proceso':
                clase = 'proceso';
                break;
            case 'cerrado':
                clase = 'cerrado';
                break;
            default:
                clase = 'default';
        }
        
        // Formatear estado siempre en mayúsculas (igual que tickets.js)
        const estadoFormateado = raw.toUpperCase();
        return `<span class="ui-badge ui-badge--${clase}" title="${esc(raw)}">${esc(estadoFormateado)}</span>`;
    }

    // ============================================================
    // FUNCIONES DE MODAL
    // ============================================================
    function abrirModalVenta() {
        if (!modalVenta) return;
        clearMv();
        modalVenta.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (folio) folio.focus();
    }

    function cerrarModalVenta() {
        if (!modalVenta) return;
        modalVenta.style.display = 'none';
        document.body.style.overflow = '';
    }

    function abrirModalCancelacion(ov) {
        if (!modalCancelacion || !mcanOv) return;
        mcanOv.value = ov;
        if (mcanMot) mcanMot.value = '';
        modalCancelacion.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        if (mcanMot) mcanMot.focus();
        // Enlazar confirmación única
        if (mcanConfirm) {
            const nuevo = mcanConfirm.cloneNode(true);
            mcanConfirm.parentNode.replaceChild(nuevo, mcanConfirm);
            nuevo.addEventListener('click', async () => {
                const motivo = (mcanMot?.value || '').trim();
                // Validación centralizada
                if (window.VentasValidator && !window.VentasValidator.validarCancelacion(mcanOv.value, motivo)) {
                    return; // errores ya notificados
                }
                try {
                    const r = await fetch('/ventas/cancelar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ovsr3: mcanOv.value, motivo }) });
                    const j = await r.json().catch(()=>null);
                    if (!r.ok) { toast(j?.message || 'Error al cancelar', false); return; }
                    toast('Venta cancelada', true);
                    window.cerrarModalCancelacion();
                    cargarTabla();
                } catch (err) {
                    console.error('Error cancelando venta', err);
                    toast('Error al cancelar venta', false);
                }
            });
        }
    }

    function mostrarConfirm(titulo, mensaje, cb) {
        const modal = $('modalConfirmacion');
        if (!modal) return;
        
        const tituloEl = $('modalConfirmacionTitulo');
        const mensajeEl = $('modalConfirmacionMensaje');
        const btn = $('btnConfirmarAccion');
        
        if (tituloEl) tituloEl.textContent = titulo || 'Confirmación';
        if (mensajeEl) mensajeEl.textContent = mensaje || '¿Estás seguro?';
        
        if (btn) {
            const nuevo = btn.cloneNode(true);
            btn.parentNode.replaceChild(nuevo, btn);
            nuevo.addEventListener('click', () => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
                if (cb) cb();
            });
        }
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    // ============================================================
    // FUNCIONES DE FORMULARIO
    // ============================================================
    function limpiarFormulario(notify = true) {
        const campos = [folio, monto, ovsr3Num, cuenta, razon, domicilio, fecha, descripcion, totalIva, comision, comentarios];
        campos.forEach(el => { 
            if (el) {
                el.value = '';
                // Quitar clases de error
                el.classList.remove('ui-form__input--error', 'ui-form__input--success');
            }
        });
        
        if (estado) {
            estado.value = '';
            estado.classList.remove('ui-form__input--error', 'ui-form__input--success');
        }
        if (ovsr3Pref) ovsr3Pref.value = 'PRE-OV';
        if (agente) agente.value = getUsuarioCookie();
        if (statusPagoSel) statusPagoSel.value = 'Pendiente';
        
        calcular();
        if (notify) clearMv();
    }

    // Consultar folio y autocompletar
    async function consultarFolio() {
        const f = (folio?.value || '').trim();
        if (!f) {
            setMv('Para consultar, primero ingrese un Folio de ticket.', false);
            return;
        }
        try {
            // Usar endpoint por-ticket que devuelve el último registro por folio
            const resp = await fetch(`/ventas/por-ticket?folio=${encodeURIComponent(f)}`);
            const data = await resp.json().catch(() => null);

            if (!resp.ok) {
                setMv(data?.message || `No fue posible consultar el folio (HTTP ${resp.status}).`, false);
                return;
            }

            // El endpoint devuelve un objeto con campos: ovsr3, folioTicket, monto, estado, cuenta, razonSocial, domicilio, fechaAtencion, agenteResponsable, descripcion, comentariosCotizacion
            const ticket = data || {};
            if (!ticket || Object.keys(ticket).length === 0) {
                setMv('No se encontraron datos asociados a este folio.', false);
                return;
            }

            // Mapear campos al modal
            if (monto) {
                const mv = Number(ticket.monto ?? ticket.Monto ?? 0) || 0;
                // input[type=number] acepta punto decimal
                monto.value = mv.toFixed(2);
            }
            if (estado) {
                // El servidor devuelve nombre del estado; si no hay, mantener vacío para obligar selección
                const est = ticket.estado ?? ticket.Estado ?? '';
                estado.value = est;
            }
            const ov = ticket.ovsr3 ?? ticket.OVSR3 ?? '';
            if (ovsr3Hidden) ovsr3Hidden.value = ov;
            if (ovsr3Pref && ovsr3Num) {
                if (ov && ov.indexOf('-') >= 0) {
                    const parts = ov.split('-');
                    const pref = parts[0] || '';
                    ovsr3Pref.value = pref;
                    ovsr3Num.value = parts.slice(1).join('-') || '';
                    // sincronizar radios segmentados
                    const pre = document.getElementById('ovPrefPre');
                    const post = document.getElementById('ovPrefPost');
                    if (pref === 'PRE-OV') { if (pre) pre.checked = true; if (post) post.checked = false; }
                    else if (pref === 'POST-OV') { if (post) post.checked = true; if (pre) pre.checked = false; }
                } else {
                    ovsr3Pref.value = 'PRE-OV';
                    ovsr3Num.value = ov;
                    const pre = document.getElementById('ovPrefPre');
                    if (pre) pre.checked = true;
                }
            }
            if (cuenta) cuenta.value = ticket.cuenta ?? ticket.Cuenta ?? '';
            if (razon) razon.value = ticket.razonSocial ?? ticket.RazonSocial ?? '';
            if (domicilio) domicilio.value = ticket.domicilio ?? ticket.Domicilio ?? '';
            if (descripcion) descripcion.value = ticket.descripcion ?? ticket.Descripcion ?? '';
            if (fecha) {
                // fechaAtencion viene como yyyy-MM-dd desde el servidor; asignar directo
                const fval = ticket.fechaAtencion ?? ticket.FechaAtencion ?? '';
                fecha.value = fval;
            }
            if (agente) {
                const av = ticket.agenteResponsable ?? ticket.AgenteResponsable ?? '';
                agente.value = av || (agente.value || '');
            }
            if (comentarios) comentarios.value = ticket.comentariosCotizacion ?? ticket.ComentariosCotizacion ?? '';

            // Calcular totales derivados (IVA y comisión) en el modal después de cargar monto
            try { calcular(); } catch (e) { /* noop si calcular no está disponible */ }

            setMv('Folio cargado correctamente.', true);
        } catch (error) {
            console.error('Error consultando folio:', error);
            setMv('Error de red al consultar el folio. Intente nuevamente.', false);
        }
    }

    // Guardar nueva venta
    async function guardarVenta() {
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
        
        if (!payload.folioTicket || !payload.monto) {
            let mensajeError = 'Faltan datos para guardar la venta:';
            let camposFaltantes = [];
            
            if (!payload.folioTicket) {
                camposFaltantes.push('Folio');
                folio?.classList.add('ui-form__input--error');
            }
            if (!payload.monto) {
                camposFaltantes.push('Monto');
                monto?.classList.add('ui-form__input--error');
            }
            
            mensajeError += ' ' + camposFaltantes.join(', ') + '.';
            setMv(mensajeError, false);
            
            // Posicionarse en el primer campo faltante
            if (!payload.folioTicket) {
                folio?.focus();
                folio?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (!payload.monto) {
                monto?.focus();
                monto?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Validaciones adicionales
        const montoNum = parseFloat(payload.monto);
        if (isNaN(montoNum) || montoNum <= 0) {
            setMv('Validación: el monto debe ser un número mayor a 0.', false);
            monto?.classList.add('ui-form__input--error');
            monto?.focus();
            monto?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (payload.folioTicket.length < 3) {
            setMv('Validación: el folio debe tener al menos 3 caracteres.', false);
            folio?.classList.add('ui-form__input--error');
            folio?.focus();
            folio?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (payload.razonSocial && payload.razonSocial.length < 3) {
            setMv('Validación: la razón social debe tener al menos 3 caracteres.', false);
            razon?.classList.add('ui-form__input--error');
            razon?.focus();
            razon?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Solo validar OVSR3 si está lleno - permitir crear sin OVSR3
        if (payload.ovsr3) {
            // Validar OVSR3 duplicado solo si se proporciona
            try {
                const checkResp = await fetch(`/ventas/verificar-ovsr3?ovsr3=${encodeURIComponent(payload.ovsr3)}`);
                
                // Si hay error de red o el endpoint no existe, continuar sin validar
                if (checkResp.ok) {
                    const checkData = await checkResp.json();
                    
                    if (checkData && checkData.exists === true) {
                        setMv(`Duplicado: ya existe una venta con OVSR3 "${payload.ovsr3}". Ingrese uno diferente o deje el campo vacío.`, false);
                        ovsr3Num?.focus();
                        ovsr3Num?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return;
                    }
                }
                // Si el endpoint no existe o hay error, continuar sin validar duplicados
            } catch (error) {
                console.log('Validación de OVSR3 no disponible, continuando sin validar duplicados');
                // No mostrar error al usuario, solo log para debug
            }
        }
        
        try {
            const resp = await fetch('/ventas/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await resp.json();
            
            if (!resp.ok || !data.ok) {
                setMv(data.message || 'No se pudo registrar la venta.', false);
                return;
            }
            
            setMv('Venta guardada con éxito.', true);
            setTimeout(async () => {
                cerrarModalVenta();
                limpiarFormulario(false);
                // Evitar mensaje genérico de carga; luego mostrar confirmación clara
                await cargarTabla(false);
                toast('Venta guardada con éxito.', true);
            }, 1200);
            
        } catch (error) {
            console.error('Error guardando venta:', error);
            setMv('Error de conexión al guardar la venta.', false);
        }
    }

    // ============================================================
    // FUNCIONES DE TABLA Y DATOS
    // ============================================================
    function renderTabla(resp) {
        if (!tbody) return;

        tbody.innerHTML = '';

        // Aceptar varias formas de respuesta: {ventas: [...]}, {items: [...]} o directamente un array
        let rows = [];
        if (!resp) rows = [];
        else if (Array.isArray(resp)) rows = resp;
        else if (Array.isArray(resp.ventas)) rows = resp.ventas;
        else if (Array.isArray(resp.items)) rows = resp.items;
        else rows = [];

        if (rows.length === 0) {
            tbody.innerHTML = '<tr class="ui-tabla__row tabla-vacia"><td colspan="18" class="tabla-vacia">No se encontraron ventas</td></tr>';
            return;
        }

        rows.forEach(v => {
            const montoVal = Number(v.Monto || v.MontoBase || 0);
            const totalIVA = montoVal * 1.16;
            const totalIVACom = totalIVA * 1.03;
            const fechaFormat = v.FechaAtencion || v.Fecha ? new Date(v.FechaAtencion || v.Fecha).toLocaleDateString('es-MX') : '';
            // Raw values for JS actions (escape single quotes to safely embed in onclick)
            const ovRaw = String(v.OVSR3 || '').replace(/'/g, "\\'");
            const folRaw = String(v.Folio || v.FolioTicket || '');
            const ov = esc(v.OVSR3 || '');
            const fol = esc(folRaw);

            // Determinar si la venta está cancelada. Se considera cancelada si:
            // - StatusPago === 'CANCELADO' (caso manejado por DB)
            // - o FechaCancelacion o MotivoCancelacion están presentes
            const statusPago = (v.StatusPago || v.statusPago || '').toString().trim().toUpperCase();
            const isCanceled = statusPago === 'CANCELADO' || !!(v.FechaCancelacion || v.MotivoCancelacion);

            // Generar botones de acciones - patrón estándar unificado
            const acciones = `
  <button class="ui-button ui-action ui-action--view" data-action="view" data-ovsr3="${ovRaw}" title="Ver detalles" aria-label="Ver detalles">
    <span class="ui-button__icon" data-icon="view" aria-hidden="true"></span>
  </button>
  <button class="ui-button ui-action ui-action--copy" data-action="copy" data-ovsr3="${ovRaw}" title="Copiar OVSR3" aria-label="Copiar OVSR3">
    <span class="ui-button__icon" data-icon="copy" aria-hidden="true"></span>
  </button>
  ${!isCanceled ? `<button class="ui-button ui-action ui-action--danger" data-action="cancel" data-ovsr3="${ovRaw}" title="Cancelar venta" aria-label="Cancelar venta">
    <span class="ui-button__icon" data-icon="delete" aria-hidden="true"></span>
  </button>` : ''}
  ${isCanceled ? `<button class="ui-button ui-action ui-action--success" data-action="activate" data-ovsr3="${ovRaw}" title="Activar venta" aria-label="Activar venta">
    <span class="ui-button__icon" data-icon="refresh" aria-hidden="true"></span>
  </button>` : ''}
            `.trim();

            // Determinar primeramente el campo "Estado OVSR3" si existe en el objeto de la fila
            // Priorizar siempre el estado de la cotización (EstadoCotizacion) o el campo específico EstadoOVSR3.
            // No usar el campo general 'Estado' (estado de ticket) como primer fallback para OVSR3,
            // ya que puede representar el estado del ticket (CERRADO) y no el estado de la cotización.
            const estadoOvsr3Raw = (v.EstadoCotizacion || v.EstadoOVSR3 || v.EstadoOvsr3 || v.EstadoOVS3 || v.EstadoOVSR || v.EstadoOV || '').toString();
            const estadoOvsr3 = esc(estadoOvsr3Raw);

            // Incluir data-row con el objeto original (JSON) para lectura fiable desde modales
            let rowJson = '{}';
            try { rowJson = JSON.stringify(v); } catch (e) { rowJson = '{}'; }

            // Construir valor visible para la columna "Usuario Cancelación":
            // - preferir el usuario registrado en la fila (getUsuarioCancelacion)
            // - siempre mostrar el usuario de la sesión actual (getUsuarioCookie) entre paréntesis
            // - evitar duplicados si coinciden en distinto case
            const usuarioCancelacionRaw = String(getUsuarioCancelacion(v) || '').trim();
            const usuarioSesion = String(getUsuarioCookie() || '').trim();
            let usuarioCancelacionDisplay = '';
            if (usuarioCancelacionRaw && usuarioSesion) {
                if (usuarioCancelacionRaw.toLowerCase() !== usuarioSesion.toLowerCase()) {
                    // distintos: mostrar ambos sin prefijos (registro — sesión)
                    usuarioCancelacionDisplay = `${esc(usuarioCancelacionRaw)} <span style="opacity:.7; margin:0 0.5rem">—</span> ${esc(usuarioSesion)}`;
                } else {
                    // iguales: mostrar sólo el nombre (p.ej. 'admin')
                    usuarioCancelacionDisplay = esc(usuarioSesion);
                }
            } else if (usuarioCancelacionRaw) {
                usuarioCancelacionDisplay = esc(usuarioCancelacionRaw);
            } else if (usuarioSesion) {
                usuarioCancelacionDisplay = esc(usuarioSesion);
            } else {
                usuarioCancelacionDisplay = '';
            }

            const fila = `
                <tr class="ui-tabla__row" data-row='${escAttr(rowJson)}'>
                    <td class="ui-tabla__cell">${ov}</td>
                    <td class="ui-tabla__cell">${fol}</td>
                    <td class="ui-tabla__cell">$ ${fmt(montoVal)}</td>
                    <td class="ui-tabla__cell">$ ${fmt(totalIVA)}</td>
                    <td class="ui-tabla__cell">$ ${fmt(totalIVACom)}</td>
                    <td class="ui-tabla__cell">${esc(fechaFormat)}</td>
                    <td class="ui-tabla__cell">${esc(v.Cuenta || '')}</td>
                    <td class="ui-tabla__cell">${esc(v.RazonSocial || '')}</td>
                    <td class="ui-tabla__cell">${esc(v.AgenteResponsable || v.Agente || '')}</td>
                    <td class="ui-tabla__cell">${badgeEstadoTicket(v.EstadoTicket || v.Estado || '')}</td>
                    <td class="ui-tabla__cell">${badgeEstado(estadoOvsr3Raw)}</td>
                    <td class="ui-tabla__cell ui-tabla__cell--descripcion js-leer-mas">${esc(v.Descripcion || '')}</td>
                    <td class="ui-tabla__cell ui-tabla__cell--comentarios js-leer-mas">${esc(v.ComentariosCotizacion || v.Comentarios || '')}</td>
                    <td class="ui-tabla__cell">${esc(v.StatusPago || '')}</td>
                    <td class="ui-tabla__cell">${v.FechaCancelacion ? new Date(v.FechaCancelacion).toLocaleDateString('es-MX') : ''}</td>
                    <td class="ui-tabla__cell ui-tabla__cell--motivo-cancel js-leer-mas">${esc(v.MotivoCancelacion || '')}</td>
                    <td class="ui-tabla__cell" title="${esc(getUsuarioCancelacionFull(v) || 'Usuario que canceló el registro (si aplica). Si aparecen dos nombres, el segundo indica el usuario de la sesión.')}">${usuarioCancelacionDisplay}</td>
                    <td class="ui-tabla__cell ui-tabla__cell--acciones">${acciones}</td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', fila);
        });
        
        // Actualizar resumen
        if (resp.resumen && resumenTotales) {
            if (resTotalReg) resTotalReg.textContent = resp.resumen.totalRegistros || 0;
            if (resMonto) resMonto.textContent = `$${fmt(resp.resumen.montoTotal || 0)}`;
            if (resTotalIva) resTotalIva.textContent = `$${fmt(resp.resumen.totalIva || 0)}`;
            if (resTotalIvaCom) resTotalIvaCom.textContent = `$${fmt(resp.resumen.totalComision || 0)}`;
            resumenTotales.style.display = 'grid';
        }
    }

    let _retryingNoFilters = false;
    async function cargarTabla(feedback = true, allowRetryNoFilters = true) {
        if (feedback && tablaLoader) tablaLoader.style.display = 'block';

        const buildParams = (useFilters = true) => {
            const p = new URLSearchParams();
            p.set('page', String(pageNumber));
            p.set('pageSize', String(pageSize));
            // Algunos backends esperan 'size' en lugar de 'pageSize'
            p.set('size', String(pageSize));
            if (useFilters) {
                if (filtroFolio?.value) p.set('folio', filtroFolio.value);
                if (filtroEstado?.value) p.set('estado', filtroEstado.value);
                if (filtroOvsr3?.value) p.set('ovsr3', filtroOvsr3.value);
                if (filtroMin?.value) p.set('min', filtroMin.value);
                if (filtroMax?.value) p.set('max', filtroMax.value);
            }
            return p;
        };

        const hasActiveFilters = Boolean(
            (filtroFolio && filtroFolio.value) ||
            (filtroEstado && filtroEstado.value) ||
            (filtroOvsr3 && filtroOvsr3.value) ||
            (filtroMin && filtroMin.value) ||
            (filtroMax && filtroMax.value)
        );

        const params = buildParams(true);

        try {
            const resp = await fetch(`/ventas/listar?${params.toString()}`);
            const data = await resp.json().catch(() => null);

            if (!resp.ok) {
                const msg = data?.message || `Error ${resp.status} al cargar las ventas`;
                toast(msg, false);
                return;
            }

            // data puede ser {ventas:[], total: n} o {items:[], total: n} o directamente {items:..., resumen:...}
            const rows = data?.ventas || data?.items || (Array.isArray(data) ? data : null);
            const total = data?.total ?? data?.totalRegistros ?? (rows ? rows.length : 0);

            totalRecords = Number(total || 0);

            // Si no hay resultados y hay filtros activos, reintentar sin filtros una sola vez
            if (allowRetryNoFilters && hasActiveFilters && totalRecords === 0 && !_retryingNoFilters) {
                _retryingNoFilters = true;
                // Reintentar sin filtros, sin feedback para no parpadear el loader
                // Resetear a primera página para el listado completo
                pageNumber = 1;
                const resp2 = await fetch(`/ventas/listar?${buildParams(false).toString()}`);
                const data2 = await resp2.json().catch(() => null);
                if (resp2.ok) {
                    const rows2 = data2?.ventas || data2?.items || (Array.isArray(data2) ? data2 : null);
                    const total2 = data2?.total ?? data2?.totalRegistros ?? (rows2 ? rows2.length : 0);
                    totalRecords = Number(total2 || 0);
                    renderTabla(data2 || rows2 || []);
                    if (data2) updateMetrics(data2);
                    actualizarPaginacion();
                    // Limpiar UI de filtros para que coincida con el estado mostrado
                    if (filtroFolio) filtroFolio.value = '';
                    if (filtroEstado) filtroEstado.value = '';
                    if (filtroOvsr3) filtroOvsr3.value = '';
                    if (filtroMin) filtroMin.value = '';
                    if (filtroMax) filtroMax.value = '';
                    // Persistir filtros limpios
                    try { if (typeof saveFilters === 'function') saveFilters(); } catch (e) { /* noop */ }
                    toast('Sin coincidencias con filtros; mostrando todos los registros.', true);
                    return; // Importante: no continuar para que no sobrescriba con "sin resultados"
                }
            }

            // Pasar al renderTabla una estructura amigable
            renderTabla(data || rows || []);
            // Actualizar métricas si vienen totales
            if (data) updateMetrics(data);
            actualizarPaginacion();

            if (feedback) toast('Ventas cargadas correctamente.', true);

        } catch (error) {
            console.error('Error cargando tabla:', error);
            toast('Error de conexión al cargar las ventas.', false);
        } finally {
            if (feedback && tablaLoader) tablaLoader.style.display = 'none';
            _retryingNoFilters = false;
        }
    }

    function actualizarPaginacion() {
        if (window.SWGROI && window.SWGROI.Pagination && paginacionVentas) {
            window.SWGROI.Pagination.render(paginacionVentas, {
                total: totalRecords,
                page: pageNumber,
                size: pageSize,
                infoLabel: lblPaginacion,
                onChange: (p)=>{ pageNumber = p; cargarTabla(false); }
            });
            return;
        }
        if (lblPaginacion) {
            const inicio = totalRecords === 0 ? 0 : ((pageNumber - 1) * pageSize) + 1;
            const fin = Math.min(pageNumber * pageSize, totalRecords);
            lblPaginacion.textContent = totalRecords === 0 ? 'No hay ventas' : `Mostrando ${inicio}-${fin} de ${totalRecords} ventas`;
        }
    }

    // ============================================================
    // MÉTRICAS
    // ============================================================
    function updateMetrics(data) {
        // data puede traer sumMonto, sumIva, sumIvaCom o resumen
        const sumMonto = Number(data.sumMonto ?? data.resumen?.montoTotal ?? 0);
        const sumIva = Number(data.sumIva ?? data.resumen?.totalIva ?? 0);
        const sumIvaCom = Number(data.sumIvaCom ?? data.resumen?.totalComision ?? 0);
        const totalReg = Number(data.total ?? data.resumen?.totalRegistros ?? (Array.isArray(data) ? data.length : 0));

        if (resTotalReg) resTotalReg.textContent = totalReg;
        if (resMonto) resMonto.textContent = `$${fmt(sumMonto)}`;
        if (resTotalIva) resTotalIva.textContent = `$${fmt(sumIva)}`;
        if (resTotalIvaCom) resTotalIvaCom.textContent = `$${fmt(sumIvaCom)}`;

        if (resComSinIva) resComSinIva.textContent = `$${fmt(sumIvaCom - sumIva)}`;
        const div = Number(divisorCom?.value || 1) || 1;
        if (resComPorPersona) resComPorPersona.textContent = `$${fmt((sumIvaCom - sumIva) / div)}`;

        if (resumenTotales) resumenTotales.style.display = 'grid';

        // métricas por estado (small chart)
        if (metEstado && metChart) {
            // si el servidor no devuelve desglose, construimos uno a partir de items
            const items = data.items || data.ventas || (Array.isArray(data) ? data : []);
            const byState = {};
            for (const it of (items || [])) {
                const s = (getEstado(it) || 'OTROS').toString();
                byState[s] = (byState[s] || 0) + Number(it.Monto || 0);
            }
            drawStateChart(byState);
        }
        // porcentaje canceladas y monto promedio y top agentes
        const itemsAll = data.items || data.ventas || (Array.isArray(data) ? data : []);
        const totalItems = (itemsAll || []).length;
        const cancelCount = (itemsAll || []).filter(it => {
            const sp = (it.StatusPago || it.statusPago || '').toString().trim().toUpperCase();
            return sp === 'CANCELADO' || it.FechaCancelacion || it.MotivoCancelacion;
        }).length;
        if (resPctCanceladas) resPctCanceladas.textContent = totalItems > 0 ? `${Math.round((cancelCount/totalItems)*100)}%` : '0%';
        const avg = totalItems > 0 ? (itemsAll.reduce((s,it)=>s+Number(it.Monto||0),0)/totalItems) : 0;
        if (resAvgMonto) resAvgMonto.textContent = `$${fmt(avg)}`;
        // top agentes
        const byAgent = {};
        for (const it of (itemsAll||[])) {
            const a = (it.AgenteResponsable || it.Agente || '—').toString();
            byAgent[a] = (byAgent[a]||0) + Number(it.Monto||0);
        }
        const top = Object.entries(byAgent).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>`${e[0]} (${fmt(e[1])})`);
        if (resTopAgentes) resTopAgentes.textContent = top.length? top.join(', ') : '-';
        // metSuma (monto sin IVA)
        if (metSuma) metSuma.textContent = `Σ Monto s/IVA: $${fmt(sumMonto)}`;
    }

    function drawStateChart(byState) {
        if (!metChart) return;
        try {
            const ctx = metChart.getContext && metChart.getContext('2d');
            if (!ctx) return;
            // simple barras pintadas en canvas (no dependencias). Limpiar
            const labels = Object.keys(byState).slice(0,8);
            const values = labels.map(l => byState[l]);
            const w = metChart.width;
            const h = metChart.height;
            ctx.clearRect(0,0,w,h);
            const max = Math.max(1, ...values);
            const pad = 8;
            const bw = (w - pad*2) / Math.max(1, labels.length);
            values.forEach((val,i) => {
                const x = pad + i * bw + 4;
                const bh = (val / max) * (h - 40);
                const y = h - bh - 20;
                ctx.fillStyle = '#1d4ed8';
                ctx.fillRect(x, y, bw - 8, bh);
                ctx.fillStyle = '#111827';
                ctx.font = '10px sans-serif';
                ctx.fillText(labels[i], x, h - 6);
            });
        } catch (e) { console.warn('Error dibujando chart', e); }
    }

    // ============================================================
    // FUNCIONES DE FILTROS Y PERSISTENCIA
    // ============================================================
    function limpiarFiltros() {
        if (filtroFolio) filtroFolio.value = '';
        if (filtroEstado) filtroEstado.value = '';
        if (filtroOvsr3) filtroOvsr3.value = '';
        if (filtroMin) filtroMin.value = '';
        if (filtroMax) filtroMax.value = '';
        pageNumber = 1;
        cargarTabla();
        saveFilters();
    }

    function saveFilters() {
        try {
            const filtros = {
                folio: filtroFolio?.value || '',
                estado: filtroEstado?.value || '',
                ovsr3: filtroOvsr3?.value || '',
                min: filtroMin?.value || '',
                max: filtroMax?.value || ''
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtros));
        } catch (e) {
            console.warn('No se pudieron guardar los filtros:', e);
        }
    }

    function loadFilters() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const filtros = JSON.parse(saved);
                if (filtroFolio) filtroFolio.value = filtros.folio || '';
                if (filtroEstado) filtroEstado.value = filtros.estado || '';
                if (filtroOvsr3) filtroOvsr3.value = filtros.ovsr3 || '';
                if (filtroMin) filtroMin.value = filtros.min || '';
                if (filtroMax) filtroMax.value = filtros.max || '';
            }
        } catch (e) {
            console.warn('No se pudieron cargar los filtros:', e);
        }
    }

    // ============================================================
    // FUNCIONES GLOBALES EXPUESTAS
    // ============================================================
    window.copiarTexto = async function(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                textArea.remove();
            }
            toast('Texto copiado al portapapeles', true);
        } catch (err) {
            console.error('Error copiando texto:', err);
            toast('No se pudo copiar el texto', false);
        }
    };

    window.cancelarVenta = function(ovsr3) {
        abrirModalCancelacion(ovsr3);
    };

    // Reactivar/activar una venta (si el backend lo permite)
    window.activarVenta = async function(ovsr3) {
        if (window.VentasValidator && !window.VentasValidator.validarActivacion(ovsr3)) {
            return; // errores ya notificados
        }
        mostrarConfirm('Activar OV', `¿Deseas activar la venta ${ovsr3}? Esto validará que no existan otras ventas activas para el mismo folio.`, async () => {
            try {
                const resp = await fetch('/ventas/activar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ovsr3 }) });
                const data = await resp.json().catch(() => null);
                if (resp.status === 409) {
                    toast(data?.message || 'No se puede activar: existen otras ventas activas para este folio.', false);
                    return;
                }
                if (!resp.ok) {
                    toast(data?.message || 'Error activando la venta.', false);
                    return;
                }
                toast('Venta activada correctamente.', true);
                cargarTabla();
            } catch (err) {
                console.error('Error activando venta', err);
                toast('Error de conexión al activar la venta.', false);
            }
        });
    };

    window.cerrarModalConfirmacion = function() {
        const modal = $('modalConfirmacion');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    window.cerrarModalCancelacion = function() {
        if (modalCancelacion) {
            modalCancelacion.style.display = 'none';
            document.body.style.overflow = '';
        }
    };

    // ============================================================
    // EVENT LISTENERS
    // ============================================================

    // Cálculo automático
    if (monto) monto.addEventListener('input', calcular);

    // Usuario inicial
    if (agente) agente.value = getUsuarioCookie();

    // Contador de caracteres para comentarios 0/2000
    if (comentarios) {
        const counter = document.getElementById('comentariosCounter');
        const updateCounter = () => {
            const len = (comentarios.value || '').length;
            if (counter) counter.textContent = `${len}/2000`;
        };
        comentarios.addEventListener('input', updateCounter);
        // Inicializar
        updateCounter();
    }

    // Modal ventas
    if (btnAbrirModalVenta) btnAbrirModalVenta.addEventListener('click', abrirModalVenta);
    if (fabNuevaVenta) fabNuevaVenta.addEventListener('click', abrirModalVenta);
    if (mvClose) mvClose.addEventListener('click', cerrarModalVenta);
    if (mvCancel) mvCancel.addEventListener('click', cerrarModalVenta);
    if (modalVenta) {
        modalVenta.addEventListener('click', (e) => {
            if (e.target === modalVenta) cerrarModalVenta();
        });
    }

    // --- Modal Leer más: obtener referencias y listeners ---
    const modalLeerMas = document.getElementById('modalLeerMas');
    const btnCerrarLeerMas = document.getElementById('btnCerrarLeerMas');
    const btnCerrarLeerMasFooter = document.getElementById('btnCerrarLeerMasFooter');
    const modalLeerMasContenido = document.getElementById('modalLeerMasContenido');

    function abrirLeerMas(texto, titulo = 'Leer más') {
        if (!modalLeerMas || !modalLeerMasContenido) return;
        const tituloEl = document.getElementById('modalLeerMasTitulo');
        if (tituloEl) tituloEl.textContent = titulo;
        modalLeerMasContenido.textContent = texto || '';
        modalLeerMas.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function cerrarLeerMas() {
        if (!modalLeerMas) return;
        modalLeerMas.style.display = 'none';
        document.body.style.overflow = '';
        if (modalLeerMasContenido) modalLeerMasContenido.textContent = '';
    }

    if (btnCerrarLeerMas) btnCerrarLeerMas.addEventListener('click', cerrarLeerMas);
    if (btnCerrarLeerMasFooter) btnCerrarLeerMasFooter.addEventListener('click', cerrarLeerMas);
    if (modalLeerMas) {
        modalLeerMas.addEventListener('click', (e) => {
            if (e.target === modalLeerMas) cerrarLeerMas();
        });
    }

    // Delegación: si una celda con clase js-leer-mas se clickea, abrir modal con su texto
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            let el = e.target;
            while (el && el !== tbody && el.nodeName !== 'TD') el = el.parentElement;
            if (!el || el === tbody) return;
            if (el.classList && el.classList.contains('js-leer-mas')) {
                abrirLeerMas(el.textContent || el.innerText || '', 'Leer más');
            }
        });
    }

    // Consultar folio
    if (btnConsultar) btnConsultar.addEventListener('click', consultarFolio);

    // Formulario
    if (btnLimpiarForm) btnLimpiarForm.addEventListener('click', () => limpiarFormulario(true));
    if (btnGuardar) {
        btnGuardar.addEventListener('click', (e) => {
            e.preventDefault();
            const form = document.getElementById('formVenta');
            if (window.VentasValidator && !window.VentasValidator.validarFormularioNuevaVenta(form)) {
                return; // errores ya notificados con toast
            }
            mostrarConfirm('Registrar Venta', '¿Deseas registrar esta venta?', guardarVenta);
        });
    }

    // Filtros y tabla
    if (btnCargar) btnCargar.addEventListener('click', () => cargarTabla(true));
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltros);
    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            // Validar filtros antes de buscar
            if (window.VentasValidator) {
                const ok = window.VentasValidator.validarFiltros({
                    folio: filtroFolio?.value,
                    estado: filtroEstado?.value,
                    ovsr3: filtroOvsr3?.value,
                    min: filtroMin?.value,
                    max: filtroMax?.value,
                    divisorCom: divisorCom?.value
                });
                if (!ok) return;
            }
            pageNumber = 1;
            cargarTabla();
            saveFilters();
        });
    }

    // Paginación se gestiona con SWGROI.Pagination

    // Exportaciones con filtros actuales
    function buildExportUrl(opts = {}) {
        const { full = false, format = 'xls' } = opts;
        const url = new URL('/ventas/exportar-excel', location.origin);
        if (full) url.searchParams.set('full', '1');
        if (format) url.searchParams.set('format', format);
        const folioVal = (filtroFolio?.value || '').trim();
        const estadoVal = (filtroEstado?.value || '').trim();
        const ovsr3Val = (filtroOvsr3?.value || '').trim();
        const minVal = (filtroMin?.value || '').trim();
        const maxVal = (filtroMax?.value || '').trim();
        if (folioVal) url.searchParams.set('folio', folioVal);
        if (estadoVal) url.searchParams.set('estado', estadoVal);
        if (ovsr3Val) url.searchParams.set('ovsr3', ovsr3Val);
        if (minVal) url.searchParams.set('min', minVal);
        if (maxVal) url.searchParams.set('max', maxVal);
        return url.toString();
    }

    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            try {
                window.open(buildExportUrl({ full: false, format: 'xls', style: 'pretty' }), '_blank');
            } catch (e) {
                const base = '/ventas/exportar-excel';
                const params = new URLSearchParams();
                params.set('format', 'xls'); params.set('style', 'pretty');
                const folioVal = (filtroFolio?.value || '').trim();
                const estadoVal = (filtroEstado?.value || '').trim();
                const ovsr3Val = (filtroOvsr3?.value || '').trim();
                const minVal = (filtroMin?.value || '').trim();
                const maxVal = (filtroMax?.value || '').trim();
                if (folioVal) params.set('folio', folioVal);
                if (estadoVal) params.set('estado', estadoVal);
                if (ovsr3Val) params.set('ovsr3', ovsr3Val);
                if (minVal) params.set('min', minVal);
                if (maxVal) params.set('max', maxVal);
                window.open(base + '?' + params.toString(), '_blank');
            }
        });
    }
    if (btnExportarFull) {
        btnExportarFull.addEventListener('click', () => {
            try {
                window.open(buildExportUrl({ full: true, format: 'xls', style: 'pretty' }), '_blank');
            } catch (e) {
                const base = '/ventas/exportar-excel';
                const params = new URLSearchParams();
                params.set('format', 'xls'); params.set('full', '1'); params.set('style', 'pretty');
                const folioVal = (filtroFolio?.value || '').trim();
                const estadoVal = (filtroEstado?.value || '').trim();
                const ovsr3Val = (filtroOvsr3?.value || '').trim();
                const minVal = (filtroMin?.value || '').trim();
                const maxVal = (filtroMax?.value || '').trim();
                if (folioVal) params.set('folio', folioVal);
                if (estadoVal) params.set('estado', estadoVal);
                if (ovsr3Val) params.set('ovsr3', ovsr3Val);
                if (minVal) params.set('min', minVal);
                if (maxVal) params.set('max', maxVal);
                window.open(base + '?' + params.toString(), '_blank');
            }
        });
    }

    // Event listener delegado para botones de acciones (patrón estándar)
    if (tbody) {
        tbody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const ovsr3 = button.dataset.ovsr3;

            switch (action) {
                case 'view':
                    verDetallesVenta(ovsr3);
                    break;
                case 'copy':
                    copiarTexto(ovsr3);
                    break;
                case 'cancel':
                    cancelarVenta(ovsr3);
                    break;
                case 'activate':
                    activarVenta(ovsr3);
                    break;
            }
        });
    }

    // Buscar con Enter
    [filtroFolio, filtroOvsr3, filtroMin, filtroMax].forEach(el => {
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    // Validar filtros antes de buscar
                    if (window.VentasValidator) {
                        const ok = window.VentasValidator.validarFiltros({
                            folio: filtroFolio?.value,
                            estado: filtroEstado?.value,
                            ovsr3: filtroOvsr3?.value,
                            min: filtroMin?.value,
                            max: filtroMax?.value,
                            divisorCom: divisorCom?.value
                        });
                        if (!ok) return;
                    }
                    pageNumber = 1;
                    cargarTabla();
                    saveFilters();
                }
            });
        }
    });

    // Construir OVSR3 al cambiar campos
    // Sincronizar radios segmentados con el hidden ovsr3Pref
    const ovPrefPre = document.getElementById('ovPrefPre');
    const ovPrefPost = document.getElementById('ovPrefPost');
    if (ovPrefPre) ovPrefPre.addEventListener('change', () => { if (ovPrefPre.checked) { if (ovsr3Pref) ovsr3Pref.value = 'PRE-OV'; buildOVSR3(); } });
    if (ovPrefPost) ovPrefPost.addEventListener('change', () => { if (ovPrefPost.checked) { if (ovsr3Pref) ovsr3Pref.value = 'POST-OV'; buildOVSR3(); } });
    if (ovsr3Pref) ovsr3Pref.addEventListener('change', buildOVSR3);
    if (ovsr3Num) ovsr3Num.addEventListener('input', buildOVSR3);

    // Métricas: divisor y filtros de métricas
    if (divisorCom) divisorCom.addEventListener('input', () => {
        // recalcular última métrica usando últimos datos en pantalla
        // recargar tabla sin feedback para actualizar métricas desde server
        cargarTabla(false);
    });
    if (metEstado) metEstado.addEventListener('change', () => cargarTabla(false));
    if (metMes) metMes.addEventListener('change', () => cargarTabla(false));

    // ============================================================
    // INICIALIZACIÓN AUTOMÁTICA
    // ============================================================
    // Cargar filtros guardados y datos iniciales de la tabla
    loadFilters();
    cargarTabla(false, true);

    // ============================================================
    
    // Validación de folio
    if (folio) {
        folio.addEventListener('blur', function() {
            const valor = this.value.trim();
            if (valor && valor.length < 3) {
                this.classList.add('ui-form__input--error');
                setMv('El folio debe tener al menos 3 caracteres', false);
            } else {
                this.classList.remove('ui-form__input--error');
            }
        });
        
        folio.addEventListener('input', function() {
            this.classList.remove('ui-form__input--error');
        });
    }
    
    // Validación de monto
    if (monto) {
        monto.addEventListener('blur', function() {
            const valor = parseFloat(this.value);
            if (this.value.trim() && (isNaN(valor) || valor <= 0)) {
                this.classList.add('ui-form__input--error');
                setMv('El monto debe ser un número mayor a 0', false);
            } else {
                this.classList.remove('ui-form__input--error');
            }
        });
        
        monto.addEventListener('input', function() {
            this.classList.remove('ui-form__input--error');
            // Solo permitir números y punto decimal
            this.value = this.value.replace(/[^0-9.]/g, '');
        });
    }
    
    // Validación de estado
    if (estado) {
        estado.addEventListener('change', function() {
            if (!this.value) {
                this.classList.add('ui-form__input--error');
                setMv('Debe seleccionar un estado', false);
            } else {
                this.classList.remove('ui-form__input--error');
            }
        });
    }
    
    // Validación de OVSR3 número
    if (ovsr3Num) {
        ovsr3Num.addEventListener('blur', function() {
            const valor = this.value.trim();
            if (valor && valor.length < 2) {
                this.classList.add('ui-form__input--error');
                setMv('El número OVSR3 debe tener al menos 2 caracteres', false);
            } else {
                this.classList.remove('ui-form__input--error');
            }
        });
        
        ovsr3Num.addEventListener('input', function() {
            this.classList.remove('ui-form__input--error');
            // Solo permitir números y letras
            this.value = this.value.replace(/[^a-zA-Z0-9]/g, '');
        });
    }
    
    // Validación de cuenta
    if (cuenta) {
        cuenta.addEventListener('input', function() {
            // Solo permitir números
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
    
    // Validación de razón social
    if (razon) {
        razon.addEventListener('blur', function() {
            const valor = this.value.trim();
            if (valor && valor.length < 3) {
                this.classList.add('ui-form__input--error');
                setMv('La razón social debe tener al menos 3 caracteres', false);
            } else {
                this.classList.remove('ui-form__input--error');
            }
        });
        
        razon.addEventListener('input', function() {
            this.classList.remove('ui-form__input--error');
        });
    }

    // ============================================================
    // FUNCIÓN PARA VER DETALLES DE VENTA
    // ============================================================

    window.verDetallesVenta = function(ovsr3) {
        if (!ovsr3) {
            toast('OVSR3 no válido', false);
            return;
        }
        
        // Intentar localizar la venta en los datos actuales de la tabla
        const filas = document.querySelectorAll('#tbody .ui-tabla__row');
        let ventaEncontrada = null;

        // Buscar en las filas visibles; preferir datos embebidos (data-attrs) si están disponibles
        filas.forEach(fila => {
            const celdas = fila.querySelectorAll('.ui-tabla__cell');
            if (celdas.length > 0 && celdas[0].textContent.trim() === ovsr3) {
                // Extraer valores de celdas; si la fila contiene un objeto JSON en data-row, parsearlo
                let rowObj = null;
                try {
                    const dr = fila.getAttribute('data-row');
                    if (dr) rowObj = JSON.parse(dr);
                } catch (e) { rowObj = null; }

                ventaEncontrada = {
                    ovsr3: (rowObj && (rowObj.OVSR3 || rowObj.ovsr3)) || celdas[0]?.textContent.trim() || '-',
                    folio: (rowObj && (rowObj.Folio || rowObj.FolioTicket || rowObj.folioTicket)) || celdas[1]?.textContent.trim() || '-',
                    montoBase: (rowObj && (rowObj.Monto || rowObj.MontoBase)) || celdas[2]?.textContent.trim() || '-',
                    totalIva: (rowObj && (rowObj.TotalIva || rowObj.totalIva)) || celdas[3]?.textContent.trim() || '-',
                    totalComision: (rowObj && (rowObj.TotalComision || rowObj.totalComision)) || celdas[4]?.textContent.trim() || '-',
                    fecha: (rowObj && (rowObj.FechaAtencion || rowObj.Fecha)) || celdas[5]?.textContent.trim() || '-',
                    cuenta: (rowObj && (rowObj.Cuenta || rowObj.cuenta)) || celdas[6]?.textContent.trim() || '-',
                    razonSocial: (rowObj && (rowObj.RazonSocial || rowObj.razonSocial)) || celdas[7]?.textContent.trim() || '-',
                    agente: (rowObj && (rowObj.AgenteResponsable || rowObj.Agente)) || celdas[8]?.textContent.trim() || '-',
                    estado: (rowObj && (rowObj.EstadoTicket || rowObj.Estado || rowObj.estado)) || celdas[9]?.textContent.trim() || '-', // Estado Ticket
                    estadoOVSR3: (rowObj && (rowObj.EstadoCotizacion || rowObj.EstadoOVSR3)) || celdas[10]?.textContent.trim() || '-',
                    descripcion: (rowObj && (rowObj.Descripcion || rowObj.descripcion)) || celdas[11]?.textContent.trim() || '-',
                    comentarios: (rowObj && (rowObj.ComentariosCotizacion || rowObj.Comentarios)) || celdas[12]?.textContent.trim() || '-',
                    statusPago: (rowObj && (rowObj.StatusPago || rowObj.statusPago)) || celdas[13]?.textContent.trim() || '-',
                    fechaCancelacion: (rowObj && (rowObj.FechaCancelacion || rowObj.fechaCancelacion)) || celdas[14]?.textContent.trim() || '-',
                    motivoCancelacion: (rowObj && (rowObj.MotivoCancelacion || rowObj.motivoCancelacion)) || celdas[15]?.textContent.trim() || '-',
                    usuarioCancelacion: (rowObj && getUsuarioCancelacion(rowObj)) || celdas[16]?.textContent.trim() || '-'
                };
            }
        });
        
        if (!ventaEncontrada) {
            toast('No se pudo encontrar la información de la venta', false);
            return;
        }
        
        // Mostrar modal con los datos
        mostrarModalDetalles(ventaEncontrada);
    };

    function mostrarModalDetalles(venta) {
        const modal = document.getElementById('modalDetallesVenta');
        if (!modal) return;

        // Llenar información principal
        // OVSR3 y su badge (texto + badge)
        const ovEl = document.getElementById('detalleOvsr3');
        const ovBadgeEl = document.getElementById('detalleOvsr3Badge');
        const estadoOvsr3Raw = (venta.estadoOVSR3 || venta.estadoOvsr3 || venta.estado || '').toString();
        if (ovEl) ovEl.textContent = venta.ovsr3 || '-';
        if (ovBadgeEl) {
            ovBadgeEl.innerHTML = estadoOvsr3Raw ? (`<span style="font-weight:700;margin-right:0.5rem">OVSR3:</span>` + badgeEstado(estadoOvsr3Raw)) : '';
        }

        document.getElementById('detalleFolio').textContent = venta.folio;
        // Estado del ticket (mostrar texto junto al badge)
        const estadoTicketBadge = document.getElementById('detalleEstadoTicketBadge');
        const estadoTicketRaw = (venta.estado || venta.estadoTicket || '').toString();
        if (estadoTicketBadge) {
            estadoTicketBadge.innerHTML = estadoTicketRaw ? (`<span style="font-weight:700;margin-right:0.5rem">Estado Ticket:</span>` + badgeEstadoTicket(estadoTicketRaw)) : '';
        }
        document.getElementById('detalleStatusPago').textContent = venta.statusPago;

        // Llenar información comercial
        document.getElementById('detalleCuenta').textContent = venta.cuenta;
        document.getElementById('detalleRazonSocial').textContent = venta.razonSocial;
        document.getElementById('detalleAgente').textContent = venta.agente;
        document.getElementById('detalleFecha').textContent = venta.fecha;

        // Llenar información financiera
        document.getElementById('detalleMontoBase').textContent = venta.montoBase;
        document.getElementById('detalleTotalIva').textContent = venta.totalIva;
        document.getElementById('detalleTotalComision').textContent = venta.totalComision;

        // Llenar descripción y comentarios
        document.getElementById('detalleDescripcion').textContent = venta.descripcion;
        document.getElementById('detalleComentarios').textContent = venta.comentarios;

        // Mostrar información de cancelación si existe
        const cancelacionCard = document.getElementById('detalleCancelacion');
            if (venta.fechaCancelacion && venta.fechaCancelacion !== '-') {
            document.getElementById('detalleFechaCancelacion').textContent = venta.fechaCancelacion;
            // Mostrar usuario cancelación: combinar usuario backend + usuario de sesión (evitar duplicados)
            const backendUser = String(venta.usuarioCancelacion || getUsuarioCancelacion(venta) || '').trim();
            const sessionUser = String(getUsuarioCookie() || '').trim();
            let detalleUsuarioHtml = '';
            if (backendUser && sessionUser) {
                if (backendUser.toLowerCase() !== sessionUser.toLowerCase()) {
                    detalleUsuarioHtml = `Canceló: ${esc(backendUser)} <span style="opacity:.7; margin:0 0.5rem">—</span> Sesión: ${esc(sessionUser)}`;
                } else {
                    detalleUsuarioHtml = `Canceló: ${esc(sessionUser)}`;
                }
            } else if (backendUser) {
                detalleUsuarioHtml = `Canceló: ${esc(backendUser)}`;
            } else if (sessionUser) {
                detalleUsuarioHtml = `Sesión: ${esc(sessionUser)}`;
            } else {
                detalleUsuarioHtml = '-';
            }
            const detalleEl = document.getElementById('detalleUsuarioCancelacion');
            detalleEl.innerHTML = detalleUsuarioHtml;
            const fullName = getUsuarioCancelacionFull(venta) || '';
            detalleEl.title = fullName || 'Usuario que canceló el registro (si aplica). Si aparecen dos nombres, el segundo indica el usuario de la sesión.';
            document.getElementById('detalleMotivoCancelacion').textContent = venta.motivoCancelacion;
            cancelacionCard.style.display = 'block';
        } else {
            cancelacionCard.style.display = 'none';
        }

        // Configurar botones del modal
    const btnCopiar = document.getElementById('modalDetallesCopiar');
    const btnCerrar = document.getElementById('modalDetallesCerrar');
    const btnClose = document.getElementById('modalDetallesClose');

        btnCopiar.onclick = () => copiarTexto(venta.ovsr3);
        btnCerrar.onclick = () => cerrarModalDetalles();
        btnClose.onclick = () => cerrarModalDetalles();

        // Cerrar al hacer clic en el overlay
        modal.onclick = (e) => {
            if (e.target === modal) cerrarModalDetalles();
        };

        // Mostrar modal y administrar foco/teclado
        lastFocusDetalles = document.activeElement;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        const btnCloseEl = document.getElementById('modalDetallesClose');
        if (btnCloseEl && typeof btnCloseEl.focus === 'function') {
            btnCloseEl.focus();
        }
        // Cerrar con Escape
        detallesKeyHandler = (ev) => {
            if (ev.key === 'Escape') {
                cerrarModalDetalles();
            }
        };
        document.addEventListener('keydown', detallesKeyHandler);
    }

    function cerrarModalDetalles() {
        const modal = document.getElementById('modalDetallesVenta');
        if (modal) {
            modal.style.display = 'none';
            modal.setAttribute('aria-hidden', 'true');
            if (detallesKeyHandler) {
                document.removeEventListener('keydown', detallesKeyHandler);
                detallesKeyHandler = null;
            }
            // Restaurar foco al disparador si aún existe en el DOM
            if (lastFocusDetalles && typeof lastFocusDetalles.focus === 'function') {
                try { lastFocusDetalles.focus(); } catch (e) { /* noop */ }
            }
        }
    }

})();
