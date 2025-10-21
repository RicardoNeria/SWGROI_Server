// ================================================
// TECNICOS.JS - Lógica del módulo de seguimiento técnico
// Solo maneja lógica de negocio, sin HTML/CSS
// ================================================

// Estado global del módulo
const TecnicosModule = {
    tickets: [],
    ticketSeleccionado: null,
    filtros: {
        folio: '',
        estado: '',
        responsable: ''
    }
};

// Configuración de la API
const TECNICOS_API_CONFIG = {
    endpoints: {
        seguimiento: '/seguimiento',
        tecnicos: '/tecnicos'
    },
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Utilidades para manejo de fetch seguro
const TecnicosNetworkUtils = {
    async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: { ...TECNICOS_API_CONFIG.headers }
        };
        
        const fetchOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                // Intentar leer el cuerpo para obtener mensaje de error del servidor (texto o JSON)
                let bodyText = '';
                try { bodyText = await response.text(); } catch (e) { bodyText = response.statusText; }

                // Si es JSON con campo message, extraerlo
                let serverMessage = bodyText;
                try {
                    const parsed = JSON.parse(bodyText);
                    if (parsed && (parsed.message || parsed.error)) {
                        serverMessage = parsed.message || parsed.error;
                    }
                } catch (e) { /* no es JSON */ }

                throw new Error(`Error ${response.status}: ${serverMessage || response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error('Network error:', error);
            throw error;
        }
    }
};

// Gestión de notificaciones (unificada con ToastPremium)
const TecnicosNotificationManager = {
    show(message, type = 'info', options = {}) {
        const msg = String(message || '');
        const t = String(type || 'info');
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            const duration = options.duration ?? (t === 'success' ? 2600 : t === 'error' ? 7000 : 3600);
            window.ToastPremium.show(msg, t, { duration });
            return;
        }
        if (typeof window.showTecnicosToast === 'function') { window.showTecnicosToast(msg, t, options.duration); return; }
        try { console.log('[Toast]', t, msg); } catch(_){ }
    }
};

// Definir formatFecha si no está disponible globalmente (evitar dependencia de tickets.js)
if (typeof formatFecha !== 'function') {
    function formatFecha(fechaIso) {
        if (!fechaIso) return '';
        const d = new Date(fechaIso);
        if (isNaN(d)) return fechaIso;
        return d.toLocaleString();
    }
}

// Operaciones de tickets
const TecnicosOperations = {
    async cargarTickets() {
        try {
            const response = await (window.TecnicosService ? TecnicosService.listarSeguimiento() : TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento));
            TecnicosModule.tickets = Array.isArray(response) ? response : [];
            TecnicosUIUpdater.renderizarTabla(TecnicosModule.tickets);
            return TecnicosModule.tickets;
        } catch (error) {
            TecnicosModule.tickets = [];
            TecnicosUIUpdater.renderizarTabla([]);
            TecnicosNotificationManager.show('Error al cargar tickets', 'error');
            throw error;
        }
    },

    async actualizarEstadoTicket(datos) {
        try {
            const response = await (window.TecnicosService ? TecnicosService.actualizarEstado(datos) : TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento, { method:'POST', body: JSON.stringify(datos) }));
            
            const exito = typeof response === 'string' && response.toLowerCase().includes('actualizado');
            const mensaje = typeof response === 'string' ? response : 'Estado actualizado correctamente';
            
            TecnicosNotificationManager.show(mensaje, exito ? 'success' : 'error');
            
            if (exito) {
                await this.cargarTickets();
            }
            
            return exito;
        } catch (error) {
                const msg = (error && error.message) ? error.message : 'Error al actualizar el ticket';
                TecnicosNotificationManager.show(msg, 'error');
                throw error;
        }
    },

    async buscarTicketsFiltrados() {
        try {
            const response = await (window.TecnicosService ? TecnicosService.listarSeguimiento() : TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento));
            const tickets = Array.isArray(response) ? response : [];
            
            const ticketsFiltrados = this.filtrarTickets(tickets, TecnicosModule.filtros);
            TecnicosUIUpdater.renderizarTabla(ticketsFiltrados);
            
            return ticketsFiltrados;
        } catch (error) {
            TecnicosNotificationManager.show('Error al filtrar tickets', 'error');
            throw error;
        }
    },

    filtrarTickets(tickets, filtros) {
        return tickets.filter(ticket => {
            const cumpleFolio = !filtros.folio || 
                (ticket.Folio || '').toLowerCase().includes(filtros.folio.toLowerCase());
            
            const cumpleEstado = !filtros.estado || 
                (ticket.Estado || '') === filtros.estado;
            
            const cumpleResponsable = !filtros.responsable || 
                (ticket.Responsable || '').toLowerCase().includes(filtros.responsable.toLowerCase());
            
            return cumpleFolio && cumpleEstado && cumpleResponsable;
        });
    }
};

// Actualizador de UI
const TecnicosUIUpdater = {
    _escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); },
    _escapeAttr(str){ return this._escapeHtml(str).replace(/\n/g,'&#10;'); },
    renderTextoConVerMas(texto, maxLength){
        const txt = String(texto||'');
        if (txt.length <= maxLength) return this._escapeHtml(txt);
        const corto = this._escapeHtml(txt.substring(0, maxLength)) + '...';
        const full = this._escapeAttr(txt);
        return `${corto} <a href="#" class="ver-mas" data-full="${full}">Ver más</a>`;
    },
    renderizarTabla(tickets) {
        const tbody = document.querySelector('#tablaTickets tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!tickets || tickets.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="ui-tabla__cell">
                    <div style="text-align: center; padding: 2rem; color: #64748b;">
                        No hay tickets registrados
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
            return;
        }

        // Aplicar paginación si está configurada en el módulo
        const pageSize = (TecnicosModule.pagination && TecnicosModule.pagination.pageSize) || 10;
        const currentPage = (TecnicosModule.pagination && TecnicosModule.pagination.currentPage) || 1;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageItems = tickets.slice(start, end);

        pageItems.forEach(ticket => {
            const tr = this.crearFilaTicket(ticket);
            tbody.appendChild(tr);
        });

        // Actualizar controles de paginación
        if (typeof this._updatePaginationControls === 'function') {
            this._updatePaginationControls(tickets.length);
        }
    },

    crearFilaTicket(ticket) {
        const tr = document.createElement('tr');
    tr.className = 'ui-tabla__row';
        tr.setAttribute('data-folio', ticket.Folio || '');
        tr.setAttribute('tabindex', '0');
        tr.setAttribute('role', 'button');
        tr.setAttribute('aria-label', `Seleccionar ticket ${ticket.Folio}`);
        
            tr.innerHTML = `
            <td class="ui-tabla__cell">${ticket.Folio || ''}</td>
            <td class="ui-tabla__cell">${this.renderTextoConVerMas(ticket.Descripcion || '', 100)}</td>
            <td class="ui-tabla__cell">${ticket.TipoAsunto || ''}</td>
            <td class="ui-tabla__cell">
                <span class="ui-badge ui-badge--${this.obtenerClaseEstado(ticket.Estado || '')}">
                    ${ticket.Estado || ''}
                </span>
            </td>
            <td class="ui-tabla__cell">${ticket.Responsable || ''}</td>
            <td class="ui-tabla__cell">${this.renderTextoConVerMas((ticket.Comentario || ''), 100)}</td>
            <td class="ui-tabla__cell td-fecha">${formatFecha(ticket.FechaActualizacion || ticket.Fecha_Actualizacion || ticket.fecha_actualizacion)}</td>
        `;
        
        return tr;
    },

    _updatePaginationControls(totalItems) {
        const pageSize = (TecnicosModule.pagination && TecnicosModule.pagination.pageSize) || 10;
        const currentPage = (TecnicosModule.pagination && TecnicosModule.pagination.currentPage) || 1;
        const info = document.getElementById('paginacionInfo');
        const cont = document.getElementById('paginacionTecnicos');
        if (window.SWGROI && window.SWGROI.Pagination && cont) {
            window.SWGROI.Pagination.render(cont, {
                total: totalItems,
                page: currentPage,
                size: pageSize,
                infoLabel: info,
                onChange: (p)=>{ TecnicosModule.pagination.currentPage = p; this.renderizarTabla(TecnicosModule.tickets); }
            });
        } else if (info) {
            const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
            const end = Math.min(totalItems, currentPage * pageSize);
            info.textContent = totalItems === 0 ? 'No hay tickets' : `Mostrando ${start}-${end} de ${totalItems}`;
        }
    },

    seleccionarTicket(folio) {
        // Remover selección anterior
        const filaAnterior = document.querySelector('.ui-tabla__row--selected');
        if (filaAnterior) {
            filaAnterior.classList.remove('ui-tabla__row--selected');
        }
        
        // Agregar nueva selección
        const nuevaFila = document.querySelector(`[data-folio="${folio}"]`);
        if (nuevaFila) {
            nuevaFila.classList.add('ui-tabla__row--selected');
        }
        
        // Actualizar folio visual
        const folioVisual = document.getElementById('folioVisual');
        if (folioVisual) {
            folioVisual.textContent = folio;
            folioVisual.classList.add('tecnicos-folio--selected');
        }
        
        // Buscar ticket en datos
        const ticket = TecnicosModule.tickets.find(t => t.Folio === folio);
        if (ticket) {
            TecnicosModule.ticketSeleccionado = ticket;
            this.llenarFormulario(ticket);
        }
    },

    llenarFormulario(ticket) {
        const comentarioTecnico = document.getElementById('comentarioTecnico');
        const nuevoEstado = document.getElementById('nuevoEstado');
    const tipoAsuntoVisual = document.getElementById('tipoAsuntoVisual');
        
        if (comentarioTecnico) {
            comentarioTecnico.value = ticket.Comentario || '';
        }
        
        if (nuevoEstado) {
            nuevoEstado.value = ticket.Estado || '';
        }

        if (tipoAsuntoVisual) {
            const t = ticket.TipoAsunto || '--';
            tipoAsuntoVisual.textContent = t;
            if (t && t !== '--') tipoAsuntoVisual.classList.add('tecnicos-tipoasunto--ok');
            else tipoAsuntoVisual.classList.remove('tecnicos-tipoasunto--ok');
        }
    },

    actualizarContador() {
        const comentarioTecnico = document.getElementById('comentarioTecnico');
        const feedback = document.getElementById('comentarioFeedback');
        if (!comentarioTecnico || !feedback) return;

        const max = 2000; // límite concordante con backend
        const val = comentarioTecnico.value || '';
        if (val.length > max) {
            // truncar visualmente y mantener cursor al final
            comentarioTecnico.value = val.substring(0, max);
        }

        const remaining = max - comentarioTecnico.value.length;
        if (remaining <= 100) {
            feedback.textContent = `Caracteres restantes: ${remaining}`;
            feedback.classList.add('ui-form__feedback--warning');
        } else {
            feedback.textContent = '';
            feedback.classList.remove('ui-form__feedback--warning');
        }
    },

    limpiarFormulario() {
        const folioVisual = document.getElementById('folioVisual');
        const comentarioTecnico = document.getElementById('comentarioTecnico');
    const nuevoEstado = document.getElementById('nuevoEstado');
    const tipoAsuntoVisual = document.getElementById('tipoAsuntoVisual');
        
        if (folioVisual) {
            folioVisual.textContent = 'Seleccione un ticket de la tabla';
            folioVisual.classList.remove('tecnicos-folio--selected');
        }
        
        if (comentarioTecnico) {
            comentarioTecnico.value = '';
        }
        
        if (nuevoEstado) {
            nuevoEstado.selectedIndex = 0;
        }

        if (tipoAsuntoVisual) {
            tipoAsuntoVisual.textContent = '--';
            tipoAsuntoVisual.classList.remove('tecnicos-tipoasunto--ok');
        }
        
        // Remover selección de tabla
        const filaSeleccionada = document.querySelector('.ui-tabla__row--selected');
        if (filaSeleccionada) {
            filaSeleccionada.classList.remove('ui-tabla__row--selected');
        }
        
        TecnicosModule.ticketSeleccionado = null;
    },

    limpiarFiltros() {
        const buscadorFolio = document.getElementById('buscadorFolio');
        const buscadorEstado = document.getElementById('buscadorEstado');
        const buscadorResponsable = document.getElementById('buscadorResponsable');
        
        if (buscadorFolio) buscadorFolio.value = '';
        if (buscadorEstado) buscadorEstado.selectedIndex = 0;
        if (buscadorResponsable) buscadorResponsable.value = '';
        
        TecnicosModule.filtros = { folio: '', estado: '', responsable: '' };
    },

    // contador eliminado: el textarea ahora permite longitud libre y no muestra contador

    truncarTexto(texto, maxLength) {
        if (!texto || texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength) + '...';
    },

    obtenerClaseEstado(estado) {
        const estadoLower = (estado || '').toLowerCase();
        // Devuelve el sufijo de .ui-badge--<sufijo>
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
    },

    // ...existing code...
};

// Validaciones del formulario (delegar a Validator si existe)
const TecnicosValidation = {
    validarFormulario(form) {
        if (window.TecnicosValidator && typeof window.TecnicosValidator.validarSeguimientoForm === 'function') {
            return window.TecnicosValidator.validarSeguimientoForm(form, TecnicosModule.ticketSeleccionado);
        }
        // Fallback mínimo si no está el validator
        const folio = TecnicosModule.ticketSeleccionado?.Folio;
        const comentario = document.getElementById('comentarioTecnico')?.value.trim();
        const nuevoEstado = document.getElementById('nuevoEstado')?.value;
        if (!folio) { TecnicosNotificationManager.show('Debe seleccionar un ticket de la tabla', 'error'); return false; }
        if (!comentario || comentario.length < 10) { TecnicosNotificationManager.show('El comentario debe tener al menos 10 caracteres', 'error'); return false; }
        if (!nuevoEstado) { TecnicosNotificationManager.show('Debe seleccionar un nuevo estado', 'error'); return false; }
        return true;
    }
};

// Inicialización del módulo
document.addEventListener('DOMContentLoaded', function() {
    const formSeguimiento = document.getElementById('formSeguimiento');
    const btnBuscarTickets = document.getElementById('btnBuscarTickets');
    const btnActualizarTabla = document.getElementById('btnActualizarTabla');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const comentarioTecnico = document.getElementById('comentarioTecnico');
    const tablaTickets = document.getElementById('tablaTickets');
    // Controles de paginación ahora se gestionan con SWGROI.Pagination
    
    // Evento de envío del formulario de seguimiento
    if (formSeguimiento) {
        formSeguimiento.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!TecnicosValidation.validarFormulario(formSeguimiento)) return;
            
            // Normalizar y proteger los datos antes de enviarlos
            const rawFolio = TecnicosModule.ticketSeleccionado.Folio || '';
            const folioNormalized = rawFolio.toString().trim().toUpperCase();
            let comentarioVal = (document.getElementById('comentarioTecnico').value || '').trim();
            if (comentarioVal.length > 2000) comentarioVal = comentarioVal.substring(0, 2000);

            const datos = {
                folio: folioNormalized,
                nuevoEstado: document.getElementById('nuevoEstado').value,
                comentario: comentarioVal
            };

            console.debug('Enviar payload actualizarEstadoTicket:', datos);
            
            try {
                const exito = await TecnicosOperations.actualizarEstadoTicket(datos);
                if (exito) {
                    TecnicosUIUpdater.limpiarFormulario();
                }
            } catch (error) {
                console.error('Error al actualizar estado:', error);
            }
        });
    }
    
    // Evento de búsqueda con filtros
    if (btnBuscarTickets) {
        btnBuscarTickets.addEventListener('click', async function() {
            TecnicosModule.filtros = {
                folio: document.getElementById('buscadorFolio')?.value.trim() || '',
                estado: document.getElementById('buscadorEstado')?.value || '',
                responsable: document.getElementById('buscadorResponsable')?.value.trim() || ''
            };
            
            try {
                await TecnicosOperations.buscarTicketsFiltrados();
            } catch (error) {
                console.error('Error al buscar tickets:', error);
            }
        });
    }
    
    // Evento de actualización de tabla
    if (btnActualizarTabla) {
        btnActualizarTabla.addEventListener('click', async function() {
            try {
                await TecnicosOperations.cargarTickets();
                TecnicosNotificationManager.show('Tickets actualizados correctamente', 'success');
            } catch (error) {
                console.error('Error al actualizar tickets:', error);
            }
        });
    }
    
    // Evento de limpiar formulario
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', function() {
            TecnicosUIUpdater.limpiarFormulario();
            TecnicosUIUpdater.limpiarFiltros();
            TecnicosNotificationManager.show('Formulario limpiado', 'info');
        });
    }
    
    // Contador de caracteres en tiempo real
    if (comentarioTecnico) {
        comentarioTecnico.addEventListener('input', function() {
            TecnicosUIUpdater.actualizarContador();
        });
    }
    
    // Delegación de eventos para selección de filas de tabla
    if (tablaTickets) {
        tablaTickets.addEventListener('click', function(e) {
            const link = e.target.closest('a.ver-mas');
            if (link) {
                e.preventDefault();
                const full = link.getAttribute('data-full') || '';
                const body = document.getElementById('modalTextoContenido');
                if (body) body.textContent = full;
                // Reutilizamos el mismo id de modal en todas las páginas
                if (typeof TicketsModalManager !== 'undefined') { TicketsModalManager.show('modalTextoLargo'); }
                else {
                    const modal = document.getElementById('modalTextoLargo');
                    if (modal) modal.style.display = 'flex';
                }
                return;
            }
            const fila = e.target.closest('.ui-tabla__row');
            if (fila) {
                const folio = fila.getAttribute('data-folio');
                if (folio) {
                    TecnicosUIUpdater.seleccionarTicket(folio);
                }
            }
        });
        
        // Soporte para teclado
        tablaTickets.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                const fila = e.target.closest('.ui-tabla__row');
                if (fila) {
                    e.preventDefault();
                    const folio = fila.getAttribute('data-folio');
                    if (folio) {
                        TecnicosUIUpdater.seleccionarTicket(folio);
                    }
                }
            }
        });
    }
    
    // Inicializar paginación: default 10 items por página
    TecnicosModule.pagination = { pageSize: 10, currentPage: 1 };

    // Handlers de paginación
    // (Eliminados listeners de prev/next)

    // Carga inicial de tickets
    TecnicosOperations.cargarTickets();
});

// Cerrar modal de texto largo en técnicos
function cerrarModalTextoLargo(){
    const modal = document.getElementById('modalTextoLargo');
    if (modal) modal.style.display = 'none';
}
