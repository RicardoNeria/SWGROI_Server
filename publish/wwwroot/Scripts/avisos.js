// ================================================
// AVISOS.JS - Lógica del módulo de Gestión de Avisos
// Solo maneja lógica de negocio, sin HTML/CSS
// ================================================

// Estado global del módulo
const AvisosModule = {
    avisos: [],
    avisoEditando: null,
    estado: {
        page: 1,
        pageSize: 10,
        sort: 'Fecha',
        dir: 'DESC',
        desde: '',
        hasta: '',
        asunto: ''
    }
};

// Configuración de la API
const API_CONFIG = {
    endpoints: {
        avisos: '/avisos'
    },
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Utilidades para manejo de fetch seguro
const NetworkUtils = {
    async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            headers: { ...API_CONFIG.headers }
        };
        
        const fetchOptions = { ...defaultOptions, ...options };
        
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

// Gestión de notificaciones (unificada)
const NotificationManager = {
    show(message, type = 'info') {
        // 1) Preferir sistema unificado Toast Premium
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            try { window.ToastPremium.show(String(message || ''), String(type || 'info'), { duration: 4000 }); return; } catch (_) {}
        }
        // 2) Fallback: UI global
        if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
            window.SWGROI.UI.mostrarMensaje(message, type, 'leyenda');
            return;
        }
        // 3) Fallback mínimo: leyenda en página
        const leyenda = document.getElementById('leyenda');
        if (!leyenda) return;
        leyenda.className = `ui-message ui-message--${type} ui-message--visible`;
        leyenda.textContent = message;
        leyenda.style.display = 'inline-flex';
        setTimeout(() => { leyenda.classList.remove('ui-message--visible'); leyenda.style.display = 'none'; }, 4000);
    }
};

// Gestión de modales
const ModalManager = {
    show(modalId) {
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
    },
    
    hideAll() {
        ['modalAviso', 'modalEliminar', 'modalLeerMasAviso'].forEach(id => {
            this.hide(id);
        });
    }
};

// Operaciones CRUD
const AvisoOperations = {
    async cargarAvisos(options = { toast: false, message: '' }) {
        try {
            const params = new URLSearchParams({
                page: AvisosModule.estado.page.toString(),
                pageSize: AvisosModule.estado.pageSize.toString(),
                sort: AvisosModule.estado.sort,
                dir: AvisosModule.estado.dir
            });
            
            if (AvisosModule.estado.desde) params.append('desde', AvisosModule.estado.desde);
            if (AvisosModule.estado.hasta) params.append('hasta', AvisosModule.estado.hasta);
            if (AvisosModule.estado.asunto) params.append('asunto', AvisosModule.estado.asunto);
            
            const url = `${API_CONFIG.endpoints.avisos}?${params.toString()}`;
            const data = await NetworkUtils.safeFetch(url);
            
            AvisosModule.avisos = Array.isArray(data.items) ? data.items : [];
            UIUpdater.actualizarKPIs();
            UIUpdater.renderizarTabla();
            UIUpdater.renderizarPaginacion(data.total || 0);
            
            // Notificación opcional y contextual (no spamear "cargados")
            if (options && options.toast) {
                const msg = options.message || 'Operación realizada';
                NotificationManager.show(msg, 'success');
            }
        } catch (error) {
            NotificationManager.show(error.message || 'Error al cargar avisos', 'error');
        }
    },
    
    async crearAviso(datos) {
        try {
            await NetworkUtils.safeFetch(API_CONFIG.endpoints.avisos, {
                method: 'POST',
                body: JSON.stringify(datos)
            });
            
            NotificationManager.show('Aviso creado exitosamente', 'success');
            FormManager.limpiarFormulario();
            await this.cargarAvisos();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al crear aviso', 'error');
        }
    },
    
    async actualizarAviso(datos) {
        try {
            // El backend espera el id en la query string (?id=), no en el body
            let url = API_CONFIG.endpoints.avisos;
            if (datos && (datos.id || datos.Id)) {
                const id = encodeURIComponent(datos.id || datos.Id);
                url = `${url}?id=${id}`;
            }

            await NetworkUtils.safeFetch(url, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });

            NotificationManager.show('Aviso actualizado exitosamente', 'success');
            FormManager.cancelarEdicion();
            await this.cargarAvisos();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al actualizar aviso', 'error');
        }
    },
    
    async eliminarAviso(id) {
        try {
            await NetworkUtils.safeFetch(`${API_CONFIG.endpoints.avisos}?id=${id}`, {
                method: 'DELETE'
            });
            
            NotificationManager.show('Aviso eliminado exitosamente', 'success');
            ModalManager.hide('modalEliminar');
            await this.cargarAvisos();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al eliminar aviso', 'error');
        }
    }
};

// Gestión de filtros
const FilterManager = {
    aplicarFiltros() {
        const filtroAsunto = document.getElementById('filtroAsunto');
        const filtroDesde = document.getElementById('filtroDesde');
        const filtroHasta = document.getElementById('filtroHasta');
        
        AvisosModule.estado.asunto = filtroAsunto ? filtroAsunto.value : '';
        AvisosModule.estado.desde = filtroDesde ? filtroDesde.value : '';
        AvisosModule.estado.hasta = filtroHasta ? filtroHasta.value : '';
        AvisosModule.estado.page = 1;
        
        AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
    },
    
    limpiarFiltros() {
        const filtroAsunto = document.getElementById('filtroAsunto');
        const filtroDesde = document.getElementById('filtroDesde');
        const filtroHasta = document.getElementById('filtroHasta');
        
        if (filtroAsunto) filtroAsunto.value = '';
        if (filtroDesde) filtroDesde.value = '';
        if (filtroHasta) filtroHasta.value = '';
        
        AvisosModule.estado.asunto = '';
        AvisosModule.estado.desde = '';
        AvisosModule.estado.hasta = '';
        AvisosModule.estado.page = 1;
        
        AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
    }
};

// Actualizador de UI
const UIUpdater = {
    actualizarKPIs() {
        const total = AvisosModule.avisos.length;
        const hoy = new Date().toISOString().split('T')[0];
        const avisosDeMoyores = AvisosModule.avisos.filter(aviso => {
            if (!aviso.Fecha) return false;
            const fechaAviso = new Date(aviso.Fecha).toISOString().split('T')[0];
            return fechaAviso === hoy;
        }).length;
        
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        const avisosSemana = AvisosModule.avisos.filter(aviso => {
            if (!aviso.Fecha) return false;
            const fechaAviso = new Date(aviso.Fecha);
            return fechaAviso >= inicioSemana;
        }).length;
        
        const kpiTotal = document.getElementById('kpiTotal');
        const kpiHoy = document.getElementById('kpiHoy');
        const kpiSemana = document.getElementById('kpiSemana');
        
        if (kpiTotal) kpiTotal.textContent = total;
        if (kpiHoy) kpiHoy.textContent = avisosDeMoyores;
        if (kpiSemana) kpiSemana.textContent = avisosSemana;
    },
    
    renderizarTabla() {
        const tbody = document.getElementById('tablaAvisos');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (AvisosModule.avisos.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.className = 'ui-tabla__cell';
            // Si estamos en modo readonly, la tabla tendrá 3 columnas; si no, 5 (acciones + id + fecha + asunto + mensaje)
            td.colSpan = window.AVISOS_READONLY ? 3 : 5;
            td.textContent = 'No se encontraron avisos';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        
        AvisosModule.avisos.forEach(aviso => {
            const tr = UIUpdater.crearFilaAviso(aviso);
            tbody.appendChild(tr);
        });
    },
    
    crearFilaAviso(aviso) {
        const tr = document.createElement('tr');
        tr.className = 'ui-tabla__row';
        // Si no estamos en modo readonly, añadimos columna de acciones e Id
        if (!window.AVISOS_READONLY) {
            // Celda de acciones
            const tdAcciones = document.createElement('td');
            tdAcciones.className = 'ui-tabla__cell ui-tabla__cell--acciones';
            
    const btnVer = UIUpdater.crearBotonAccion('view', 'Ver', () => FormManager.verAviso(aviso), 'view');
    const btnEditar = UIUpdater.crearBotonAccion('edit', 'Editar', () => FormManager.editarAviso(aviso), 'edit');
    const btnEliminar = UIUpdater.crearBotonAccion('delete', 'Eliminar', () => FormManager.confirmarEliminacion(aviso), 'delete');
            
            tdAcciones.appendChild(btnVer);
            tdAcciones.appendChild(btnEditar);
            tdAcciones.appendChild(btnEliminar);
            tr.appendChild(tdAcciones);

            // Celda ID
            const tdId = document.createElement('td');
            tdId.className = 'ui-tabla__cell';
            tdId.textContent = aviso.Id || '';
            tr.appendChild(tdId);
        }
        
        // Celda Fecha
        const tdFecha = document.createElement('td');
        tdFecha.className = 'ui-tabla__cell ui-tabla__cell--fecha';
        tdFecha.textContent = aviso.Fecha ? UIUpdater.formatearFecha(aviso.Fecha) : '';
        tr.appendChild(tdFecha);
        
        // Celda Asunto
        const tdAsunto = document.createElement('td');
        tdAsunto.className = 'ui-tabla__cell';
        tdAsunto.textContent = aviso.Asunto || '';
        tr.appendChild(tdAsunto);
        
    // Celda Mensaje (texto completo)
        const tdMensaje = document.createElement('td');
        // marcar como clicable para abrir modal 'Leer más'
        tdMensaje.className = 'ui-tabla__cell ui-tabla__cell--mensaje js-leer-mas';
        // Mostrar el mensaje completo; usar textContent para evitar inyección HTML
        tdMensaje.textContent = aviso.Mensaje || '';
        tdMensaje.title = aviso.Mensaje || '';
        tr.appendChild(tdMensaje);
        
        return tr;
    },
    
    crearBotonAccion(icono, texto, onClick, tipo = '') {
        const btn = document.createElement('button');
        const tipoClass = tipo ? `ui-action ui-action--${tipo}` : 'ui-action';
        btn.className = `ui-button ui-button--sm ${tipoClass}`.trim();
        // icono puede ser un id de icono o un emoji; normalizamos a un id y usamos data-icon
        // Usamos una estructura anidada para compatibilidad con selectores generados
        const iconId = UIUpdater._normalizeIcon ? UIUpdater._normalizeIcon(icono) : icono;
        if (iconId) {
            btn.innerHTML = `<span class="ui-button__icon" data-icon="${iconId}" aria-hidden="true"><span class="ui-button__icon__icon"></span></span>`;
        } else {
            btn.innerHTML = `<span class="ui-button__icon"><span class="ui-button__icon__icon"></span></span>`;
        }
        btn.title = texto;
        btn.setAttribute('aria-label', texto);
        btn.addEventListener('click', onClick);
        // For automated tests, expose test-friendly attributes when available
        try { btn.setAttribute('data-test', tipo || texto.toLowerCase()); } catch(e) {}
        return btn;
    },
    
    renderizarPaginacion(total) {
        const info = document.getElementById('paginacionInfo') || document.getElementById('lblPaginacion');
        const cont = document.getElementById('paginacionAvisos') || document.getElementById('paginacionPages');
        const totalItems = Number(total || 0);
        if (window.SWGROI && window.SWGROI.Pagination && cont) {
            window.SWGROI.Pagination.render(cont, {
                total: totalItems,
                page: AvisosModule.estado.page,
                size: AvisosModule.estado.pageSize,
                infoLabel: info,
                onChange: (p)=>{ AvisosModule.estado.page = p; AvisoOperations.cargarAvisos(); }
            });
            return;
        }
        // Fallback mínimo si el helper no está disponible
        if (info) {
            const totalPaginas = Math.max(1, Math.ceil(totalItems / AvisosModule.estado.pageSize));
            const inicio = totalItems === 0 ? 0 : ((AvisosModule.estado.page - 1) * AvisosModule.estado.pageSize + 1);
            const fin = Math.min(AvisosModule.estado.page * AvisosModule.estado.pageSize, totalItems);
            info.textContent = totalItems === 0 ? 'No hay avisos' : `Mostrando ${inicio}-${fin} de ${totalItems} avisos`;
        }
    },
    
    crearBotonPaginacion(texto, pagina) {
        const btn = document.createElement('button');
        btn.className = 'ui-button ui-button--ghost ui-button--sm';
        // Si el texto contiene iconos (emoji), normalizamos a data-icon. Si es numérico, dejamos el texto.
        const iconId = UIUpdater._normalizeIcon ? UIUpdater._normalizeIcon(texto) : null;
        if (iconId) {
            btn.innerHTML = `<span class="ui-button__icon" data-icon="${iconId}" aria-hidden="true"></span>`;
        } else {
            btn.textContent = texto;
        }
        btn.addEventListener('click', () => {
            AvisosModule.estado.page = pagina;
            AvisoOperations.cargarAvisos();
        });
        return btn;
    },

    // Helper para mapear emojis o nombres a ids de icono del sprite
    _normalizeIcon(raw) {
        if (!raw) return null;
        const map = {
            '👁': 'view', '✏️': 'edit', '✏': 'edit', '🗑️': 'delete', '🗑': 'delete',
            '⬅️': 'prev', '➡️': 'next', '🔍': 'search', '🧹': 'clear', '💾': 'save',
            '❌': 'cancel', '✖️': 'close', '✖': 'close', '🔄': 'refresh', '📤': 'export',
            '➕': 'plus', '🔗': 'link', '📋': 'copy', '✅': 'confirm', '📥': 'download'
        };
        if (map[raw]) return map[raw];
        // Si raw parece ya un id (letras y guiones), devolverlo
        if (/^[a-z0-9_-]+$/i.test(raw)) return raw;
        return null;
    },
    
    formatearFecha(fecha) {
        try {
            const date = new Date(fecha);
            return date.toLocaleDateString('es-ES') + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return fecha;
        }
    },
    
    truncarTexto(texto, maxLength) {
        if (!texto || texto.length <= maxLength) return texto;
        return texto.substring(0, maxLength) + '...';
    }
};

// Gestión de formularios
const FormManager = {
    limpiarFormulario() {
        const form = document.getElementById('formAviso');
        if (form) {
            form.reset();
            document.getElementById('avisoId').value = '';
            AvisosModule.avisoEditando = null;
            this.actualizarModoFormulario(false);
            this.limpiarErrores();
            this.actualizarContador();
        }
    },
    
    editarAviso(aviso) {
        AvisosModule.avisoEditando = aviso;
        this.llenarFormulario(aviso);
        this.actualizarModoFormulario(true);
    },
    
    cancelarEdicion() {
        this.limpiarFormulario();
    },
    
    llenarFormulario(aviso) {
        const campos = {
            'avisoId': aviso.Id,
            'asunto': aviso.Asunto,
            'mensaje': aviso.Mensaje
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = valor || '';
        });
        
        this.limpiarErrores();
        this.actualizarContador();
    },
    
    actualizarModoFormulario(esEdicion) {
        const btnCancelar = document.getElementById('btnCancelarEdicion');
        const titulo = document.querySelector('.ui-card--form .ui-card__title');
        
        if (btnCancelar) {
            btnCancelar.style.display = esEdicion ? 'inline-flex' : 'none';
        }
        
        if (titulo) {
            titulo.textContent = esEdicion ? 'Editar Aviso' : 'Crear Nuevo Aviso';
        }
    },
    
    verAviso(aviso) {
        const campos = {
            'modalAvisoId': aviso.Id,
            'modalFecha': UIUpdater.formatearFecha(aviso.Fecha),
            'modalAsunto': aviso.Asunto,
            'modalMensaje': aviso.Mensaje
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || '';
        });
        
        ModalManager.show('modalAviso');
    },
    
    confirmarEliminacion(aviso) {
        AvisosModule.avisoEditando = aviso;
        
        const asuntoElement = document.getElementById('eliminarAsunto');
        if (asuntoElement) {
            asuntoElement.textContent = aviso.Asunto || '';
        }
        
        ModalManager.show('modalEliminar');
    },
    
    obtenerDatosFormulario() {
        const form = document.getElementById('formAviso');
        if (!form) return null;
        
        const formData = new FormData(form);
        const datos = Object.fromEntries(formData.entries());
        
        // Agregar ID si estamos editando
        if (AvisosModule.avisoEditando) {
            datos.id = AvisosModule.avisoEditando.Id.toString();
        }
        
        return datos;
    },
    
    validarFormulario(datos) {
        const errores = {};
        
        if (!datos.asunto || datos.asunto.trim().length === 0) {
            errores.asunto = 'El asunto es obligatorio';
        } else if (datos.asunto.length > 255) {
            errores.asunto = 'El asunto no puede exceder 255 caracteres';
        }
        
        if (!datos.mensaje || datos.mensaje.trim().length === 0) {
            errores.mensaje = 'El mensaje es obligatorio';
        } else if (datos.mensaje.length > 2000) {
            errores.mensaje = 'El mensaje no puede exceder 2000 caracteres';
        }
        
        this.mostrarErrores(errores);
        return Object.keys(errores).length === 0;
    },
    
    mostrarErrores(errores) {
        this.limpiarErrores();
        
        Object.entries(errores).forEach(([campo, mensaje]) => {
            const feedback = document.getElementById(`${campo}Feedback`);
            if (feedback) {
                feedback.textContent = mensaje;
                feedback.style.color = 'var(--ui-color-error)';
            }
        });
    },
    
    limpiarErrores() {
        const feedbacks = document.querySelectorAll('.ui-form__feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
        });
    },
    
    actualizarContador() {
        const mensaje = document.getElementById('mensaje');
        const contador = document.getElementById('contadorMensaje');
        
        if (!mensaje || !contador) return;
        
        const len = mensaje.value.length;
        contador.textContent = `${len}/2000`;
        contador.style.color = len > 1800 ? 'var(--ui-color-advertencia)' : 'var(--ui-color-texto-muted)';
    }
};

// Gestión de exportación
const ExportManager = {
    async exportarCSV() {
        try {
            const params = new URLSearchParams({
                export: 'csv',
                sort: AvisosModule.estado.sort,
                dir: AvisosModule.estado.dir
            });
            
            if (AvisosModule.estado.desde) params.append('desde', AvisosModule.estado.desde);
            if (AvisosModule.estado.hasta) params.append('hasta', AvisosModule.estado.hasta);
            if (AvisosModule.estado.asunto) params.append('asunto', AvisosModule.estado.asunto);
            
            const url = `${API_CONFIG.endpoints.avisos}?${params.toString()}`;
            const response = await fetch(url, { credentials: 'include' });
            
            if (!response.ok) {
                throw new Error('Error al exportar datos');
            }
            
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `avisos_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            NotificationManager.show('Datos exportados exitosamente', 'success');
        } catch (error) {
            NotificationManager.show(error.message || 'Error al exportar datos', 'error');
        }
    }
};

// Event Listeners
const EventManager = {
    init() {
        this.setupFormEvents();
        this.setupFilterEvents();
        this.setupModalEvents();
        this.setupTableEvents();
        this.setupActionEvents();
    },
    
    setupFormEvents() {
        const form = document.getElementById('formAviso');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => FormManager.limpiarFormulario());
        }
        
        const btnCancelar = document.getElementById('btnCancelarEdicion');
        if (btnCancelar) {
            btnCancelar.addEventListener('click', () => FormManager.cancelarEdicion());
        }
        
        // Contador de caracteres
        const mensaje = document.getElementById('mensaje');
        if (mensaje) {
            mensaje.addEventListener('input', () => FormManager.actualizarContador());
        }
    },
    
    setupFilterEvents() {
        const btnBuscar = document.getElementById('btnBuscar');
        if (btnBuscar) {
            btnBuscar.addEventListener('click', () => FilterManager.aplicarFiltros());
        }
        
        const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
        if (btnLimpiarFiltros) {
            btnLimpiarFiltros.addEventListener('click', () => FilterManager.limpiarFiltros());
        }
    },
    
    setupModalEvents() {
        // Eventos de cierre de modales
        const botonesClose = [
            'btnCerrarModal', 'btnCerrarDetalle',
            'btnCerrarEliminar', 'btnCancelarEliminar'
        ];
        
        botonesClose.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => ModalManager.hideAll());
            }
        });
        
        // Confirmar eliminación
        const btnConfirmarEliminar = document.getElementById('btnConfirmarEliminar');
        if (btnConfirmarEliminar) {
            btnConfirmarEliminar.addEventListener('click', () => {
                if (AvisosModule.avisoEditando) {
                    AvisoOperations.eliminarAviso(AvisosModule.avisoEditando.Id);
                }
            });
        }
        
        // Cerrar modal al hacer clic en overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ui-modal-overlay')) {
                ModalManager.hideAll();
            }
        });

        // --- Modal 'Leer más' (patrón igual que en ventas.js) ---
        const modalLeerMas = document.getElementById('modalLeerMasAviso');
        const btnCerrarLeerMas = document.getElementById('btnCerrarLeerMasAviso');
        const btnCerrarLeerMasFooter = document.getElementById('btnCerrarLeerMasAvisoFooter');
        const modalLeerMasContenido = document.getElementById('modalLeerMasAvisoContenido');

        function abrirLeerMasAviso(texto, titulo = 'Leer más') {
            if (!modalLeerMas || !modalLeerMasContenido) return;
            const tituloEl = document.getElementById('modalLeerMasAvisoTitulo');
            if (tituloEl) tituloEl.textContent = titulo;
            modalLeerMasContenido.textContent = texto || '';
            modalLeerMas.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function cerrarLeerMasAviso() {
            if (!modalLeerMas) return;
            modalLeerMas.style.display = 'none';
            document.body.style.overflow = '';
            if (modalLeerMasContenido) modalLeerMasContenido.textContent = '';
        }

        if (btnCerrarLeerMas) btnCerrarLeerMas.addEventListener('click', cerrarLeerMasAviso);
        if (btnCerrarLeerMasFooter) btnCerrarLeerMasFooter.addEventListener('click', cerrarLeerMasAviso);
        if (modalLeerMas) {
            modalLeerMas.addEventListener('click', (e) => {
                if (e.target === modalLeerMas) cerrarLeerMasAviso();
            });
        }

        // Delegación: abrir modal cuando se hace click en una celda con la clase js-leer-mas
        // NOTA: tbody tiene id 'tablaAvisos' (es el elemento <tbody>), por eso seleccionamos por id directo
        const tabla = document.getElementById('tablaAvisos');
        if (tabla) {
            tabla.addEventListener('click', (e) => {
                let el = e.target;
                while (el && el !== tabla && el.nodeName !== 'TD') el = el.parentElement;
                if (!el || el === tabla) return;
                if (el.classList && el.classList.contains('js-leer-mas')) {
                    abrirLeerMasAviso(el.textContent || el.innerText || '', 'Leer más');
                }
            });
        }
    },
    
    setupTableEvents() {
        // Controles de tabla
        const selPageSize = document.getElementById('selPageSize');
        if (selPageSize) {
            selPageSize.addEventListener('change', (e) => {
                AvisosModule.estado.pageSize = parseInt(e.target.value);
                AvisosModule.estado.page = 1;
                AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
            });
        }
        
        const selSort = document.getElementById('selSort');
        if (selSort) {
            selSort.addEventListener('change', (e) => {
                AvisosModule.estado.sort = e.target.value;
                AvisosModule.estado.page = 1;
                AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
            });
        }
        
        const selDir = document.getElementById('selDir');
        if (selDir) {
            selDir.addEventListener('change', (e) => {
                AvisosModule.estado.dir = e.target.value;
                AvisosModule.estado.page = 1;
                AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
            });
        }
        
        // Paginación se gestiona con SWGROI.Pagination (no listeners directos aquí)
    },
    
    setupActionEvents() {
        const btnRefrescar = document.getElementById('btnRefrescar');
        if (btnRefrescar) {
            btnRefrescar.addEventListener('click', () => {
                AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
            });
        }
        
        const btnExportar = document.getElementById('btnExportar');
        if (btnExportar) {
            btnExportar.addEventListener('click', () => ExportManager.exportarCSV());
        }
    },
    
    async handleFormSubmit() {
        const datos = FormManager.obtenerDatosFormulario();
        if (!datos || !FormManager.validarFormulario(datos)) {
            return;
        }
        
        if (AvisosModule.avisoEditando) {
            await AvisoOperations.actualizarAviso(datos);
        } else {
            await AvisoOperations.crearAviso(datos);
        }
    }
};

// Inicialización del módulo
document.addEventListener('DOMContentLoaded', async () => {
    EventManager.init();
    FormManager.actualizarContador();
    // Mostrar el toast una sola vez al entrar al módulo
    await AvisoOperations.cargarAvisos({ toast: true, message: 'Avisos cargados correctamente' });
});

// Auto-refresh de avisos (KPIs y lista) cada 30s
(function(){
    if (typeof AvisoOperations === 'undefined') return;
    if (AvisoOperations._autoRefresh) return;
    AvisoOperations._autoRefresh = true;
    try { setInterval(() => { AvisoOperations.cargarAvisos().catch(()=>{}); }, 30000); } catch(e) { console.warn('No se pudo iniciar auto-refresh avisos', e); }
})();

