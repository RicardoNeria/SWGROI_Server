// ================================================
// TICKETS.JS - Lógica del módulo de Gestión de Tickets
// Solo maneja lógica de negocio, sin HTML/CSS
// ================================================

// Estado global del módulo
const TicketsModule = {
    tickets: [],
    ticketEditando: null,
    estado: {
        page: 1,
        pageSize: 10,
        filtro: '',
        estado: ''
    }
};

// Configuración de la API
const TICKETS_API_CONFIG = {
    endpoints: {
        tickets: '/tickets',
        seguimiento: '/seguimiento',
        actualizar: '/tickets/actualizar',
        eliminar: '/tickets/eliminar'
    },
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Utilidades para manejo de fetch seguro
const TicketsNetworkUtils = {
    _getCookie(name){ try{ const v=document.cookie.split('; ').find(c=>c.startsWith(name+'=')); return v?decodeURIComponent(v.split('=')[1]):''; }catch{ return ''; } },
    async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: { ...TICKETS_API_CONFIG.headers }
        };
        
    const csrf = this._getCookie('csrftoken');
    const fetchOptions = { ...defaultOptions, ...options };
    const headers = { ...(fetchOptions.headers||{}) };
    if (csrf) headers['X-CSRF-Token'] = csrf;
    fetchOptions.headers = headers;
        
        try {
            const response = await fetch(url, fetchOptions);
            const contentType = response.headers.get('content-type') || '';
            
            let data = null;
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            if (!response.ok) {
                const message = (data && (data.error || data.mensaje || data.message)) || `Error ${response.status}`;
                throw new Error(message);
            }
            
            return data;
        } catch (error) {
            console.error('Network error:', error);
            throw error;
        }
    }
};

// Gestión de notificaciones (unificada con ToastPremium)
const TicketsNotificationManager = {
    show(message, type = 'info', options = {}) {
        const msg = String(message || '');
        const t = String(type || 'info');
        // Preferir ToastPremium si está disponible
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            const duration = options.duration ?? (t === 'success' ? 2600 : t === 'error' ? 7000 : 3600);
            window.ToastPremium.show(msg, t, { duration });
            return;
        }
        // Compatibilidad con UI global anterior si existiese
        if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
            window.SWGROI.UI.mostrarMensaje(msg, t, 'leyenda');
            return;
        }
        // Fallback: usar la leyenda embebida
        const leyenda = document.getElementById('leyenda');
        if (!leyenda) { try { console.log('[Toast]', t, msg); } catch(_){} return; }
        const textEl = leyenda.querySelector('.ui-message__text');
        if (textEl) textEl.textContent = msg; else leyenda.textContent = msg;
        leyenda.className = `ui-message ui-message--${t} ui-message--visible`;
        leyenda.style.display = 'inline-flex';
        setTimeout(() => { leyenda.classList.remove('ui-message--visible'); leyenda.style.display = 'none'; }, options.duration ?? 4000);
    }
};

// Gestión de modales
const TicketsModalManager = {
    show(modalId) {
        // Mostrar el modal identificado por modalId
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Operaciones CRUD de tickets
const TicketOperations = {
    async buscarTicketPorFolio(folio) {
        try {
            const data = await (window.TicketsService ? TicketsService.getSeguimiento(folio) : TicketsNetworkUtils.safeFetch(`${TICKETS_API_CONFIG.endpoints.seguimiento}?folio=${encodeURIComponent(folio)}`));
            return data;
        } catch (error) {
            throw new Error(error.message || 'Error al buscar el ticket');
        }
    },
    
    async registrarTicket(datos) {
        try {
            const response = await (window.TicketsService ? TicketsService.registrarTicket(datos) : TicketsNetworkUtils.safeFetch(TICKETS_API_CONFIG.endpoints.tickets, { method:'POST', body: JSON.stringify(datos) }));
            
            TicketsNotificationManager.show('Ticket registrado correctamente', 'success');
            return response;
        } catch (error) {
            TicketsNotificationManager.show(error.message || 'Error al registrar ticket', 'error');
            throw error;
        }
    },
    
    async actualizarTicket(datos) {
        try {
            const response = await (window.TicketsService ? TicketsService.actualizarTicket(datos) : TicketsNetworkUtils.safeFetch(TICKETS_API_CONFIG.endpoints.actualizar, { method:'POST', body: JSON.stringify(datos) }));
            
            TicketsNotificationManager.show('Ticket actualizado correctamente', 'success');
            return response;
        } catch (error) {
            TicketsNotificationManager.show(error.message || 'Error al actualizar ticket', 'error');
            throw error;
        }
    },
    
    async eliminarTicket(folio) {
        try {
            const response = await (window.TicketsService ? TicketsService.eliminarTicket(folio) : TicketsNetworkUtils.safeFetch(TICKETS_API_CONFIG.endpoints.eliminar, { method:'POST', body: JSON.stringify({ folio }) }));
            
            TicketsNotificationManager.show('Ticket eliminado correctamente', 'success');
            return response;
        } catch (error) {
            TicketsNotificationManager.show(error.message || 'Error al eliminar ticket', 'error');
            throw error;
        }
    },
    
    async cargarTickets() {
        try {
            const response = await TicketsNetworkUtils.safeFetch(TICKETS_API_CONFIG.endpoints.seguimiento);
            TicketsModule.tickets = Array.isArray(response) ? response : [];
            TicketsUIUpdater.renderizarKPIs();
            TicketsUIUpdater.renderizarTabla();
            return TicketsModule.tickets;
        } catch (error) {
            TicketsModule.tickets = [];
            TicketsUIUpdater.renderizarTabla();
            TicketsNotificationManager.show('Error al cargar tickets', 'error');
            throw error;
        }
    }
};

// Actualizador de UI
const TicketsUIUpdater = {
    _escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); },
    _escapeAttr(str){ return this._escapeHtml(str).replace(/\n/g,'&#10;'); },
    renderTextoConVerMas(texto, maxLength){
        const txt = String(texto||'');
        if (txt.length <= maxLength) return this._escapeHtml(txt);
        const corto = this._escapeHtml(txt.substring(0, maxLength)) + '...';
        const full = this._escapeAttr(txt);
        return `${corto} <a href="#" class="ver-mas" data-full="${full}">Ver más</a>`;
    },
    renderizarKPIs() {
        const tickets = TicketsModule.tickets;
        const abiertos = tickets.filter(t => (t.Estado || '').toLowerCase() === 'abierto').length;
        const proceso = tickets.filter(t => (t.Estado || '').toLowerCase() === 'en proceso').length;
        const cerrados = tickets.filter(t => (t.Estado || '').toLowerCase() === 'cerrado').length;
        
        const kpiAbiertos = document.getElementById('kpiAbiertos');
        const kpiProceso = document.getElementById('kpiProceso');
        const kpiCerrados = document.getElementById('kpiCerrados');
        const kpisContainer = document.querySelector('.tickets-metricas');
        
        if (kpiAbiertos) kpiAbiertos.textContent = abiertos;
        if (kpiProceso) kpiProceso.textContent = proceso;
        if (kpiCerrados) kpiCerrados.textContent = cerrados;
        if (kpisContainer) kpisContainer.classList.remove('ui-hidden');
    },
    
    renderizarTabla() {
        const tbody = document.querySelector('#tablaTickets tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const ticketsFiltrados = this.filtrarTickets();
        const total = ticketsFiltrados.length;
        const maxPage = Math.max(1, Math.ceil(total / TicketsModule.estado.pageSize));
        
        if (TicketsModule.estado.page > maxPage) {
            TicketsModule.estado.page = maxPage;
        }
        
        const inicio = (TicketsModule.estado.page - 1) * TicketsModule.estado.pageSize;
        const ticketsPagina = ticketsFiltrados.slice(inicio, inicio + TicketsModule.estado.pageSize);
        
        if (ticketsPagina.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="8" class="ui-tabla__cell">
                    <div class="tickets-mensaje-vacio">
                        ${total === 0 ? 'No hay tickets registrados' : 'No se encontraron tickets con los filtros aplicados'}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        } else {
            ticketsPagina.forEach(ticket => {
                const tr = this.crearFilaTicket(ticket);
                tbody.appendChild(tr);
            });
        }
        
        this.actualizarPaginacion(total);
    },
    
    crearFilaTicket(ticket) {
        const tr = document.createElement('tr');
        tr.className = 'ui-tabla__row';
        
        const estadoCerrado = (ticket.Estado || '').toLowerCase() === 'cerrado';
        
        tr.innerHTML = `
            <td class="ui-tabla__cell" title="${ticket.Folio || ''}">${ticket.Folio || ''}</td>
            <td class="ui-tabla__cell">${this.renderTextoConVerMas(ticket.Descripcion || '', 80)}</td>
            <td class=\"ui-tabla__cell\">${(ticket.TipoAsunto || '')}</td>
            <td class="ui-tabla__cell">
                <span class="ui-badge ui-badge--${this.obtenerClaseEstado(ticket.Estado || '')}">${this.formatearEstado(ticket.Estado || '')}</span>
            </td>
            <td class="ui-tabla__cell">${ticket.Responsable || ''}</td>
            <td class="ui-tabla__cell">${this.renderTextoConVerMas((ticket.Comentario || ''), 80)}</td>
            <td class="ui-tabla__cell td-fecha">${formatFecha(ticket.FechaActualizacion || ticket.Fecha_Actualizacion || ticket.fecha_actualizacion)}</td>
            <td class="ui-tabla__cell ui-tabla__cell--acciones">
                <button class="ui-button ui-action ui-action--edit" 
                        data-action="edit" data-folio="${ticket.Folio || ''}" 
                        title="Editar ticket" aria-label="Editar ticket" ${estadoCerrado ? 'disabled' : ''}>
                    <span class="ui-button__icon" data-icon="edit" aria-hidden="true"></span>
                </button>
                <button class="ui-button ui-action ui-action--delete" 
                        data-action="delete" data-folio="${ticket.Folio || ''}" 
                        title="Eliminar ticket" aria-label="Eliminar ticket" ${estadoCerrado ? 'disabled' : ''}>
                    <span class="ui-button__icon" data-icon="delete" aria-hidden="true"></span>
                </button>
            </td>
        `;
        
        return tr;
    },
    
    filtrarTickets() {
        const filtro = TicketsModule.estado.filtro.toLowerCase();
        const estado = TicketsModule.estado.estado.toLowerCase();
        
        return TicketsModule.tickets.filter(ticket => {
            const cumpleFiltro = !filtro || 
                (ticket.Folio || '').toLowerCase().includes(filtro) ||
                (ticket.Responsable || '').toLowerCase().includes(filtro);
            
            const cumpleEstado = !estado || 
                (ticket.Estado || '').toLowerCase() === estado;
            
            return cumpleFiltro && cumpleEstado;
        });
    },
    
    actualizarPaginacion(total) {
        const lbl = document.getElementById('lblPaginacionTickets');
        const cont = document.getElementById('paginacionTickets');
        const page = TicketsModule.estado.page;
        const size = TicketsModule.estado.pageSize;
        if (window.SWGROI && window.SWGROI.Pagination && cont) {
            window.SWGROI.Pagination.render(cont, {
                total,
                page,
                size,
                infoLabel: lbl,
                onChange: (p)=>{ TicketsModule.estado.page = p; TicketsUIUpdater.renderizarTabla(); }
            });
        } else if (lbl) {
            const maxPage = Math.max(1, Math.ceil(total/size));
            const inicio = total===0?0:((page-1)*size+1);
            const fin = Math.min(page*size, total);
            lbl.textContent = total===0? 'No hay tickets' : `Página ${page} de ${maxPage} · ${inicio}-${fin} de ${total} tickets`;
        }
    },
    
    truncarTexto(texto, maxLength) {
        if (!texto || texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength) + '...';
    },
    formatearEstado(estado) {
        // Mostrar siempre el estado en mayúsculas para la tabla
        return (estado || '').toString().toUpperCase();
    },
    
    obtenerClaseEstado(estado) {
        const estadoLower = (estado || '').toLowerCase();
        switch (estadoLower) {
            case 'almacén':
            case 'almacen':
                return 'almacen';
            case 'capturado':
                return 'capturado';
            case 'programado/asignado':
            case 'programado':
                return 'programado';
            case 'abierto':
                return 'abierto';
            case 'en proceso':
            case 'proceso':
                return 'proceso';
            case 'cerrado':
                return 'cerrado';
            default:
                return 'default';
        }
    }
};

// Gestión de formularios
const TicketsFormManager = {
    obtenerResponsableDesdeCookie() {
        const cookie = document.cookie.split('; ').find(c => c.startsWith('usuario='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    },
    
    llenarFormulario(ticket) {
        const elements = {
            folio: document.getElementById('folio'),
            descripcion: document.getElementById('descripcion'),
            tipoAsunto: document.getElementById('tipoAsunto'),
            estado: document.getElementById('estado'),
            responsable: document.getElementById('responsable'),
            estadoSeguimiento: document.getElementById('estadoSeguimiento'),
            comentarioTecnico: document.getElementById('comentarioTecnico')
        };
        
        if (elements.folio) elements.folio.value = ticket.Folio || '';
        if (elements.descripcion) elements.descripcion.value = ticket.Descripcion || '';
    if (elements.tipoAsunto) elements.tipoAsunto.value = ticket.TipoAsunto || '';
        if (elements.estado) elements.estado.value = ticket.Estado || '';
        if (elements.responsable) elements.responsable.value = ticket.Responsable || '';
        if (elements.estadoSeguimiento) elements.estadoSeguimiento.value = ticket.Estado || '';
        if (elements.comentarioTecnico) elements.comentarioTecnico.textContent = ticket.Comentario || '(Sin comentarios técnicos)';
        
        const estadoCerrado = (ticket.Estado || '').toLowerCase() === 'cerrado';
        this.configurarEstadoFormulario(estadoCerrado);
        
        TicketsModule.ticketEditando = ticket;
    },
    
    limpiarFormulario() {
        const form = document.getElementById('formularioTicket');
        if (form) form.reset();
        
        const responsable = document.getElementById('responsable');
        if (responsable) responsable.value = this.obtenerResponsableDesdeCookie();
        
        const estadoSeguimiento = document.getElementById('estadoSeguimiento');
        if (estadoSeguimiento) estadoSeguimiento.value = '';
        
        const comentarioTecnico = document.getElementById('comentarioTecnico');
        if (comentarioTecnico) comentarioTecnico.textContent = '(No hay comentarios técnicos aún)';
    const tipoAsunto = document.getElementById('tipoAsunto');
    if (tipoAsunto) tipoAsunto.value = '';
        
        this.configurarEstadoFormulario(false);
        TicketsModule.ticketEditando = null;
        
        // Actualizar contador de caracteres
        this.actualizarContador();
    },
    
    configurarEstadoFormulario(cerrado) {
        const elements = {
            folio: document.getElementById('folio'),
            descripcion: document.getElementById('descripcion'),
            estado: document.getElementById('estado'),
            actualizarBtn: document.getElementById('actualizarBtn')
        };
        
        Object.values(elements).forEach(el => {
            if (el && el.id !== 'responsable') {
                el.readOnly = cerrado;
                el.disabled = cerrado;
            }
        });
        
        const formulario = document.getElementById('formularioTicket');
        if (formulario) {
            formulario.classList.toggle('tickets-estado-cerrado', cerrado);
        }
    },
    
    actualizarContador() {
        const descripcion = document.getElementById('descripcion');
        const contador = document.querySelector('.ui-form__counter');
        
        if (descripcion && contador) {
            const length = descripcion.value.length;
            // Mostrar 2000 como capacidad visual unificada aunque la validación siga en 500 para este módulo
            contador.textContent = `${length}/2000`;
        }
    },
    
    validarFormulario() {
        const folio = document.getElementById('folio')?.value.trim();
        const descripcion = document.getElementById('descripcion')?.value.trim();
        const tipoAsunto = document.getElementById('tipoAsunto')?.value;
        const estado = document.getElementById('estado')?.value;
        const responsable = document.getElementById('responsable')?.value.trim();

        const errores = {};

        if (!folio) errores.folio = 'El folio es obligatorio';
        if (!descripcion) errores.descripcion = 'La descripción es obligatoria';
        if (!tipoAsunto) errores.tipoAsunto = 'El tipo de asunto es obligatorio';
        if (!estado) errores.estado = 'El estado es obligatorio';
        if (!responsable) errores.responsable = 'El responsable es obligatorio';

        if (folio && !/^[A-Z0-9\-]{6,20}$/.test(folio)) {
            errores.folio = 'El folio debe tener 6-20 caracteres alfanuméricos (A-Z, 0-9 y guiones)';
        }

        if (descripcion && (descripcion.length < 10 || descripcion.length > 2000)) {
            errores.descripcion = 'La descripción debe tener entre 10 y 2000 caracteres';
        }

        if (Object.keys(errores).length > 0) {
            if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarErroresFormulario === 'function') {
                window.SWGROI.UI.mostrarErroresFormulario(errores, 5000);
            } else {
                // fallback: mostrar primer error como notificación
                const first = Object.values(errores)[0];
                TicketsNotificationManager.show(first || 'Errores en el formulario', 'error');
            }
            return false;
        }

        return true;
    }
};

// Gestión de exportación
const TicketsExportManager = {
    exportarCSV() {
        const ticketsFiltrados = TicketsUIUpdater.filtrarTickets();
        const headers = ['Folio', 'Descripción', 'TipoAsunto', 'Estado', 'Responsable', 'Comentario'];
        
        const csvContent = [
            headers.join(',') ,
            ...ticketsFiltrados.map(ticket => [
                `"${(ticket.Folio || '').replace(/"/g, '""')}"`,
                `"${(ticket.Descripcion || '').replace(/"/g, '""')}"`,
                `"${(ticket.TipoAsunto || '').replace(/"/g, '""')}"`,
                `"${(TicketsUIUpdater.formatearEstado(ticket.Estado || '')).replace(/"/g, '""')}"`,
                `"${(ticket.Responsable || '').replace(/"/g, '""')}"`,
                `"${(ticket.Comentario || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tickets_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    }
};

// Inicialización del módulo
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('formularioTicket');
    const buscadorFolio = document.getElementById('buscadorFolio');
    const btnBuscar = document.getElementById('btnBuscar');
    const btnLimpiar = document.getElementById('limpiarBtn');
    const btnActualizar = document.getElementById('actualizarBtn');
    const descripcion = document.getElementById('descripcion');
    
    // Inicializar responsable desde cookie
    const responsable = document.getElementById('responsable');
    if (responsable) {
        responsable.value = TicketsFormManager.obtenerResponsableDesdeCookie();
    }
    
    // Evento de búsqueda de ticket
    if (btnBuscar) {
        btnBuscar.addEventListener('click', async function() {
            const folio = buscadorFolio?.value.trim();
            if (window.TicketsValidator && !TicketsValidator.validarBusquedaFolio(folio)) return;
            
            try {
                const ticket = await TicketOperations.buscarTicketPorFolio(folio);
                if (ticket && ticket.Descripcion && ticket.Estado) {
                    TicketsFormManager.llenarFormulario(ticket);
                    const estadoCerrado = (ticket.Estado || '').toLowerCase() === 'cerrado';
                    TicketsNotificationManager.show(
                        estadoCerrado ? 'Ticket encontrado (cerrado, no editable)' : 'Ticket encontrado correctamente',
                        estadoCerrado ? 'info' : 'success'
                    );
                } else {
                    TicketsNotificationManager.show('No se encontró el ticket', 'error');
                }
            } catch (error) {
                TicketsNotificationManager.show('Error al buscar el ticket', 'error');
            }
        });
    }
    
    // Búsqueda con Enter
    if (buscadorFolio) {
        buscadorFolio.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnBuscar?.click();
            }
        });
    }
    
    // Evento de envío del formulario
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (window.TicketsValidator) { if (!TicketsValidator.validarRegistroFromForm(form)) return; }
            else { if (!TicketsFormManager.validarFormulario()) return; }
            
            const datos = {
                Folio: document.getElementById('folio')?.value.trim(),
                Descripcion: document.getElementById('descripcion')?.value.trim(),
                TipoAsunto: document.getElementById('tipoAsunto')?.value,
                Estado: document.getElementById('estado')?.value,
                Responsable: document.getElementById('responsable')?.value.trim(),
                Comentario: ''
            };
            
            try {
                await TicketOperations.registrarTicket(datos);
                TicketsFormManager.limpiarFormulario();
                await TicketOperations.cargarTickets();
            } catch (error) {
                console.error('Error al registrar ticket:', error);
            }
        });
    }
    
    // Evento de actualización
    if (btnActualizar) {
        btnActualizar.addEventListener('click', async function() {
            if (window.TicketsValidator) { if (!TicketsValidator.validarActualizacionFromForm(form)) return; }
            else { if (!TicketsFormManager.validarFormulario()) return; }
            
            const datos = {
                folio: document.getElementById('folio')?.value.trim(),
                descripcion: document.getElementById('descripcion')?.value.trim(),
                tipoAsunto: document.getElementById('tipoAsunto')?.value,
                estado: document.getElementById('estado')?.value,
                responsable: document.getElementById('responsable')?.value.trim()
            };
            
            try {
                await TicketOperations.actualizarTicket(datos);
                await TicketOperations.cargarTickets();
            } catch (error) {
                console.error('Error al actualizar ticket:', error);
            }
        });
    }
    
    // Evento de limpiar formulario
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            TicketsFormManager.limpiarFormulario();
            if (buscadorFolio) buscadorFolio.value = '';
        });
    }
    
    // Contador de caracteres
    if (descripcion) {
        descripcion.addEventListener('input', function() {
            TicketsFormManager.actualizarContador();
        });
    }
    
    // Eventos de filtros y tabla
    const filtroTicket = document.getElementById('filtroTicket');
    const filtroEstadoTicket = document.getElementById('filtroEstadoTicket');
    const btnBuscarTicket = document.getElementById('btnBuscarTicket');
    const btnLimpiarTabla = document.getElementById('btnLimpiarTabla');
    // Controles ahora se renderizan por helper en #paginacionTickets
    const btnExportCsv = document.getElementById('btnExportCsvTickets');
    const btnImprimir = document.getElementById('btnImprimirTickets');
    
    if (btnBuscarTicket) {
        btnBuscarTicket.addEventListener('click', function() {
            TicketsModule.estado.filtro = filtroTicket?.value.trim() || '';
            TicketsModule.estado.estado = filtroEstadoTicket?.value.trim() || '';
            TicketsModule.estado.page = 1;
            TicketsUIUpdater.renderizarTabla();
        });
    }
    
    if (btnLimpiarTabla) {
        btnLimpiarTabla.addEventListener('click', function() {
            if (filtroTicket) filtroTicket.value = '';
            if (filtroEstadoTicket) filtroEstadoTicket.value = '';
            TicketsModule.estado.filtro = '';
            TicketsModule.estado.estado = '';
            TicketsModule.estado.page = 1;
            TicketsUIUpdater.renderizarTabla();
        });
    }
    
    // (Eliminados listeners específicos prev/next)
    
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', function() {
            TicketsExportManager.exportarCSV();
        });
    }
    
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            window.print();
        });
    }
    
    // Delegación de eventos para acciones de tabla
    const tbody = document.querySelector('#tablaTickets tbody');
    if (tbody) {
        tbody.addEventListener('click', function(e) {
            const link = e.target.closest('a.ver-mas');
            if (link) {
                e.preventDefault();
                const full = link.getAttribute('data-full') || '';
                const body = document.getElementById('modalTextoContenido');
                if (body) body.textContent = full;
                TicketsModalManager.show('modalTextoLargo');
                return;
            }

            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const folio = button.dataset.folio;
            
            switch (action) {
                case 'edit':
                    const ticket = TicketsModule.tickets.find(t => t.Folio === folio);
                    if (ticket) {
                        TicketsFormManager.llenarFormulario(ticket);
                        if (buscadorFolio) buscadorFolio.value = folio;
                    }
                    break;
                    
                case 'delete':
                    mostrarModalConfirmacion(
                        'Eliminar Ticket',
                        `¿Está seguro de que desea eliminar el ticket ${folio}?`,
                        async function() {
                            try {
                                await TicketOperations.eliminarTicket(folio);
                                await TicketOperations.cargarTickets();
                            } catch (error) {
                                console.error('Error al eliminar ticket:', error);
                            }
                        }
                    );
                    break;
            }
        });
    }
    
    // Evento para cerrar modal de confirmación
    const btnCerrarModal = document.getElementById('btnCerrarModal');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', function() {
            TicketsModalManager.hide('modalConfirmacion');
        });
    }
    
    // Carga inicial de tickets
    TicketOperations.cargarTickets();
});

// Auto-refresh: recargar tickets cada 30s para mantener KPIs en tiempo real
(function(){
    if (typeof TicketOperations === 'undefined') return;
    if (TicketOperations._autoRefresh) return;
    TicketOperations._autoRefresh = true;
    try { setInterval(() => { TicketOperations.cargarTickets().catch(()=>{}); }, 30000); } catch(e) { console.warn('No se pudo iniciar auto-refresh tickets', e); }
})();

// Función para mostrar modal de confirmación
function mostrarModalConfirmacion(titulo, mensaje, callback) {
    const modal = document.getElementById('modalConfirmacion');
    const tituloEl = document.getElementById('modalConfirmacionTitulo');
    const mensajeEl = document.getElementById('modalConfirmacionMensaje');
    const btnConfirmar = document.getElementById('btnConfirmarAccion');
    
    if (tituloEl) tituloEl.textContent = titulo;
    if (mensajeEl) mensajeEl.textContent = mensaje;
    
    // Limpiar event listeners previos
    const nuevoBtn = btnConfirmar?.cloneNode(true);
    if (btnConfirmar && nuevoBtn) {
        btnConfirmar.parentNode?.replaceChild(nuevoBtn, btnConfirmar);
        nuevoBtn.addEventListener('click', function() {
            TicketsModalManager.hide('modalConfirmacion');
            if (typeof callback === 'function') callback();
        });
    }
    
    TicketsModalManager.show('modalConfirmacion');
}

// Función para cerrar modal de confirmación
function cerrarModalConfirmacion() {
    TicketsModalManager.hide('modalConfirmacion');
}

// Cerrar modal de texto largo
function cerrarModalTextoLargo(){ TicketsModalManager.hide('modalTextoLargo'); }

// Añadir utilitary para formatear fecha (si no existe)
function formatFecha(fechaIso) {
    if (!fechaIso) return '';
    const d = new Date(fechaIso);
    if (isNaN(d)) return fechaIso;
    return d.toLocaleString(); // formato local
}

// La función global `renderFilaTicket` se eliminó deliberadamente.
// Use TicketsUIUpdater.crearFilaTicket(ticket) como la fuente canónica
// para generar las filas de la tabla de tickets.
