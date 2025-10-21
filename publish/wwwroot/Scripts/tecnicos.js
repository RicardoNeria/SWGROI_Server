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

// Gestión de notificaciones (unificada)
const TecnicosNotificationManager = {
    show(message, type = 'info') {
        if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
            window.SWGROI.UI.mostrarMensaje(message, type, 'leyenda');
            return;
        }
        const leyenda = document.getElementById('leyenda');
        if (!leyenda) return;
        leyenda.className = `ui-message ui-message--${type} ui-message--visible`;
        leyenda.textContent = message;
        leyenda.style.display = 'inline-flex';
        setTimeout(() => { leyenda.classList.remove('ui-message--visible'); leyenda.style.display = 'none'; }, 4000);
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
            const response = await TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento);
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
            const response = await TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento, {
                method: 'POST',
                body: JSON.stringify(datos)
            });
            
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
            const response = await TecnicosNetworkUtils.safeFetch(TECNICOS_API_CONFIG.endpoints.seguimiento);
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
    renderizarTabla(tickets) {
        const tbody = document.querySelector('#tablaTickets tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!tickets || tickets.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="6" class="ui-tabla__cell">
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
            <td class="ui-tabla__cell">${this.truncarTexto(ticket.Descripcion || '', 100)}</td>
            <td class="ui-tabla__cell">
                <span class="ui-badge ui-badge--${this.obtenerClaseEstado(ticket.Estado || '')}">
                    ${ticket.Estado || ''}
                </span>
            </td>
            <td class="ui-tabla__cell">${ticket.Responsable || ''}</td>
            <td class="ui-tabla__cell">${(ticket.Comentario || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>
            <td class="ui-tabla__cell td-fecha">${formatFecha(ticket.FechaActualizacion || ticket.Fecha_Actualizacion || ticket.fecha_actualizacion)}</td>
        `;
        
        return tr;
    },

    _updatePaginationControls(totalItems) {
        const pageSize = (TecnicosModule.pagination && TecnicosModule.pagination.pageSize) || 10;
        const currentPage = (TecnicosModule.pagination && TecnicosModule.pagination.currentPage) || 1;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

        const info = document.getElementById('paginacionInfo');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');

        if (info) {
            const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
            const end = Math.min(totalItems, currentPage * pageSize);
            info.textContent = totalItems === 0 ? 'No hay tickets' : `Mostrando ${start}-${end} de ${totalItems}`;
        }

        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
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
        
        if (comentarioTecnico) {
            comentarioTecnico.value = ticket.Comentario || '';
        }
        
        if (nuevoEstado) {
            nuevoEstado.value = ticket.Estado || '';
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

// Validaciones del formulario
const TecnicosValidation = {
    validarFormulario() {
        const folio = TecnicosModule.ticketSeleccionado?.Folio;
        const comentario = document.getElementById('comentarioTecnico')?.value.trim();
        const nuevoEstado = document.getElementById('nuevoEstado')?.value;
        
        if (!folio) {
            TecnicosNotificationManager.show('Debe seleccionar un ticket de la tabla', 'error');
            return false;
        }
        
        if (!comentario) {
            TecnicosNotificationManager.show('El comentario técnico es obligatorio', 'error');
            return false;
        }
        
        if (comentario.length < 10) {
            TecnicosNotificationManager.show('El comentario debe tener al menos 10 caracteres', 'error');
            return false;
        }
        
        // Nota: ya no limitamos a 500 caracteres. Se permite texto libre.
        
        if (!nuevoEstado) {
            TecnicosNotificationManager.show('Debe seleccionar un nuevo estado', 'error');
            return false;
        }
        
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
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    
    // Evento de envío del formulario de seguimiento
    if (formSeguimiento) {
        formSeguimiento.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!TecnicosValidation.validarFormulario()) return;
            
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
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', function() {
            if (TecnicosModule.pagination.currentPage > 1) {
                TecnicosModule.pagination.currentPage -= 1;
                TecnicosUIUpdater.renderizarTabla(TecnicosModule.tickets);
            }
        });
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', function() {
            const totalPages = Math.max(1, Math.ceil(TecnicosModule.tickets.length / TecnicosModule.pagination.pageSize));
            if (TecnicosModule.pagination.currentPage < totalPages) {
                TecnicosModule.pagination.currentPage += 1;
                TecnicosUIUpdater.renderizarTabla(TecnicosModule.tickets);
            }
        });
    }

    // Carga inicial de tickets
    TecnicosOperations.cargarTickets();
});
