// ================================================
// ADMIN.JS - Lógica del módulo de Administración de Usuarios
// Solo maneja lógica de negocio, sin HTML/CSS
// ================================================

// Estado global del módulo
const AdminModule = {
    usuarios: [],
    usuariosFiltrados: [],
    paginaActual: 1,
    porPagina: 10,
    filtroTexto: '',
    filtroRol: '',
    usuarioEditando: null
};

// Configuración de la API
const API_CONFIG = {
    endpoints: {
        listar: '/admin',
        crear: '/admin',
        actualizar: '/admin',
        eliminar: (id) => `/admin?id=${encodeURIComponent(id)}`
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
                const message = (data && (data.mensaje || data.message)) || `Error ${response.status}`;
                throw new Error(message);
            }
            
            return data;
        } catch (error) {
            console.error('Network error:', error);
            throw error;
        }
    }
};

// Gestión de notificaciones (unificada con SWGROI.UI)
const NotificationManager = {
    show(message, type = 'info') {
        // Preferir sistema unificado si está disponible
        if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
            window.SWGROI.UI.mostrarMensaje(message, type, 'leyenda');
            return;
        }
        // Fallback mínimo
        const leyenda = document.getElementById('leyenda');
        if (!leyenda) return;
        leyenda.className = `ui-message ui-message--${type} ui-message--visible`;
        leyenda.textContent = message;
        leyenda.style.display = 'inline-flex';
        setTimeout(() => { leyenda.classList.remove('ui-message--visible'); leyenda.style.display = 'none'; }, 3500);
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
        ['modalFormulario', 'modalUsuario', 'modalEliminar'].forEach(id => {
            this.hide(id);
        });
    }
};

// Operaciones CRUD
const UserOperations = {
    async cargarUsuarios() {
        try {
            // Construir URL con soporte de paginación y filtros server-side
            const params = new URLSearchParams();
            params.set('page', AdminModule.paginaActual.toString());
            params.set('size', AdminModule.porPagina.toString());
            if (AdminModule.filtroTexto) params.set('q', AdminModule.filtroTexto);
            if (AdminModule.filtroRol) params.set('rol', AdminModule.filtroRol);

            const url = `${API_CONFIG.endpoints.listar}?${params.toString()}`;
            const data = await NetworkUtils.safeFetch(url);

            // La API puede devolver arreglo (modo antiguo) o un objeto paginado
            if (Array.isArray(data)) {
                AdminModule._serverTotal = undefined;
                AdminModule.usuarios = data;
                FilterManager.aplicarFiltros();
                UIUpdater.actualizarKPIs();
            } else if (data && Array.isArray(data.items)) {
                AdminModule._serverTotal = Number(data.total || 0);
                AdminModule._serverPage = Number(data.page || 1);
                AdminModule._serverSize = Number(data.size || AdminModule.porPagina);
                AdminModule.usuarios = data.items; // para KPIs parciales
                AdminModule.usuariosFiltrados = data.items; // página actual
                UIUpdater.renderizarTabla();
                UIUpdater.renderizarPaginacion(true);
                UIUpdater.actualizarKPIs();
            } else {
                AdminModule._serverTotal = undefined;
                AdminModule.usuarios = [];
                FilterManager.aplicarFiltros();
                UIUpdater.actualizarKPIs();
            }
            NotificationManager.show('Usuarios cargados correctamente', 'success');
        } catch (error) {
            NotificationManager.show(error.message || 'Error al cargar usuarios', 'error');
        }
    },
    
    async crearUsuario(datos) {
        try {
            await NetworkUtils.safeFetch(API_CONFIG.endpoints.crear, {
                method: 'POST',
                body: JSON.stringify(datos)
            });
            
            NotificationManager.show('Usuario creado exitosamente', 'success');
            ModalManager.hide('modalFormulario');
            await this.cargarUsuarios();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al crear usuario', 'error');
        }
    },
    
    async actualizarUsuario(datos) {
        try {
            await NetworkUtils.safeFetch(API_CONFIG.endpoints.actualizar, {
                method: 'PUT',
                body: JSON.stringify(datos)
            });
            
            NotificationManager.show('Usuario actualizado exitosamente', 'success');
            ModalManager.hide('modalFormulario');
            await this.cargarUsuarios();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al actualizar usuario', 'error');
        }
    },
    
    async eliminarUsuario(id) {
        try {
            await NetworkUtils.safeFetch(API_CONFIG.endpoints.eliminar(id), {
                method: 'DELETE'
            });
            
            NotificationManager.show('Usuario eliminado exitosamente', 'success');
            ModalManager.hide('modalEliminar');
            await this.cargarUsuarios();
        } catch (error) {
            NotificationManager.show(error.message || 'Error al eliminar usuario', 'error');
        }
    }
};

// Gestión de filtros
const FilterManager = {
    aplicarFiltros() {
        const texto = AdminModule.filtroTexto.toLowerCase();
        const rol = AdminModule.filtroRol;
        // Si el backend soporta paginación y filtrado, recargar desde servidor
        if (AdminModule._serverTotal !== undefined) {
            AdminModule.paginaActual = 1;
            UserOperations.cargarUsuarios();
            return;
        }

        AdminModule.usuariosFiltrados = AdminModule.usuarios.filter(usuario => {
            const matchTexto = !texto || 
                (usuario.NombreCompleto || '').toLowerCase().includes(texto) ||
                (usuario.Usuario || '').toLowerCase().includes(texto);
            const matchRol = !rol || (usuario.Rol || '') === rol;
            return matchTexto && matchRol;
        });

        AdminModule.paginaActual = 1;
        UIUpdater.renderizarTabla();
        UIUpdater.renderizarPaginacion();
    },
    
    limpiarFiltros() {
        AdminModule.filtroTexto = '';
        AdminModule.filtroRol = '';
        
        const buscador = document.getElementById('buscador');
        const filtroRol = document.getElementById('filtroRol');
        
        if (buscador) buscador.value = '';
        if (filtroRol) filtroRol.value = '';
        
        this.aplicarFiltros();
    }
};

// Actualizador de UI
const UIUpdater = {
    actualizarKPIs() {
        const total = (AdminModule._serverTotal !== undefined) ? Number(AdminModule._serverTotal || 0) : AdminModule.usuarios.length;
        const admins = AdminModule.usuarios.filter(u => (u.Rol || '').toLowerCase() === 'administrador').length;
        const activos = total; // Placeholder - podría ser un campo real
        
        const kpiTotal = document.getElementById('kpiTotal');
        const kpiAdmins = document.getElementById('kpiAdmins');
        const kpiActivos = document.getElementById('kpiActivos');
        
        if (kpiTotal) kpiTotal.textContent = total;
        if (kpiAdmins) kpiAdmins.textContent = admins;
        if (kpiActivos) kpiActivos.textContent = activos;
    },
    
    renderizarTabla() {
        const tbody = document.getElementById('tablaUsuarios');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        const isServerPaged = AdminModule._serverTotal !== undefined;
        let usuariosPagina;
        if (isServerPaged) {
            usuariosPagina = AdminModule.usuariosFiltrados || [];
        } else {
            const inicio = (AdminModule.paginaActual - 1) * AdminModule.porPagina;
            const fin = inicio + AdminModule.porPagina;
            usuariosPagina = AdminModule.usuariosFiltrados.slice(inicio, fin);
        }
        
        if (usuariosPagina.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.className = 'ui-tabla__cell';
            td.colSpan = 5;
            td.textContent = 'No se encontraron usuarios';
            td.style.textAlign = 'center';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        
        usuariosPagina.forEach(usuario => {
            const tr = UIUpdater.crearFilaUsuario(usuario);
            tbody.appendChild(tr);
        });
    },
    
    crearFilaUsuario(usuario) {
        const tr = document.createElement('tr');
        tr.className = 'ui-tabla__row';
        
        // Celda de acciones
        const tdAcciones = document.createElement('td');
        tdAcciones.className = 'ui-tabla__cell ui-tabla__cell--acciones';
        
    const btnVer = UIUpdater.crearBotonAccion('view', 'Ver', () => FormManager.verUsuario(usuario), 'view');
    const btnEditar = UIUpdater.crearBotonAccion('edit', 'Editar', () => FormManager.editarUsuario(usuario), 'edit');
    const btnEliminar = UIUpdater.crearBotonAccion('delete', 'Eliminar', () => FormManager.confirmarEliminacion(usuario), 'delete');
        
        tdAcciones.appendChild(btnVer);
        tdAcciones.appendChild(btnEditar);
        tdAcciones.appendChild(btnEliminar);
        tr.appendChild(tdAcciones);
        
        // Celdas de datos
        const campos = ['IdUsuario', 'NombreCompleto', 'Usuario', 'Rol'];
        campos.forEach(campo => {
            const td = document.createElement('td');
            td.className = 'ui-tabla__cell';
            td.textContent = usuario[campo] || '';
            tr.appendChild(td);
        });
        
        return tr;
    },
    
    crearBotonAccion(icono, texto, onClick, tipo = '') {
        // tipo: 'view' | 'edit' | 'delete' (opcional) — mapea a clases visuales unificadas
        const btn = document.createElement('button');
        const tipoClass = tipo ? `ui-action ui-action--${tipo}` : 'ui-action';
        btn.className = `ui-button ui-button--sm ${tipoClass}`.trim();
        const iconId = UIUpdater._normalizeIcon ? UIUpdater._normalizeIcon(icono) : icono;
        if (iconId) {
            btn.innerHTML = `<span class="ui-button__icon" data-icon="${iconId}" aria-hidden="true"></span>`;
        } else {
            btn.innerHTML = `<span class="ui-button__icon"></span>`;
        }
        btn.title = texto;
        btn.setAttribute('aria-label', texto);
        btn.addEventListener('click', onClick);
        return btn;
    },
    
    renderizarPaginacion(isServerPaged = false) {
        const paginacionInfo = document.getElementById('paginacionInfo');
        const paginacion = document.getElementById('paginacion');
        
        if (!paginacionInfo || !paginacion) return;
        const total = isServerPaged ? Number(AdminModule._serverTotal || 0) : AdminModule.usuariosFiltrados.length;
        const page = isServerPaged ? Number(AdminModule._serverPage || AdminModule.paginaActual) : AdminModule.paginaActual;
        const size = isServerPaged ? Number(AdminModule._serverSize || AdminModule.porPagina) : AdminModule.porPagina;
        const inicio = total === 0 ? 0 : (page - 1) * size + 1;
        const fin = Math.min(page * size, total);
        
        paginacionInfo.textContent = `Mostrando ${inicio}-${fin} de ${total} usuarios`;
        
        // Limpiar controles
        paginacion.innerHTML = '';
        
        const totalPaginas = Math.ceil(total / size);
        
        if (totalPaginas <= 1) return;
        
        // Botón anterior
        const btnAnterior = UIUpdater.crearBotonPaginacion('⬅️ Anterior', page - 1);
        btnAnterior.disabled = page === 1;
    paginacion.appendChild(btnAnterior);
        
        // Números de página
        for (let i = 1; i <= totalPaginas; i++) {
            if (i === 1 || i === totalPaginas || Math.abs(i - page) <= 2) {
                const btnPagina = UIUpdater.crearBotonPaginacion(i.toString(), i);
                if (i === page) {
                    btnPagina.className = 'ui-button ui-button--primary ui-button--sm';
                    btnPagina.setAttribute('aria-current', 'page');
                }
                paginacion.appendChild(btnPagina);
            } else if (Math.abs(i - page) === 3) {
                const span = document.createElement('span');
                span.textContent = '...';
                span.className = 'ui-paginacion__ellipsis';
                paginacion.appendChild(span);
            }
        }
        
        // Botón siguiente
        const btnSiguiente = UIUpdater.crearBotonPaginacion('Siguiente ➡️', page + 1);
        btnSiguiente.disabled = page === totalPaginas;
        paginacion.appendChild(btnSiguiente);

        // Delegación de eventos: manejar clicks en botones con data-page
        if (!paginacion._pageBound) {
            paginacion.addEventListener('click', (e) => {
                const b = e.target.closest('button[data-page]');
                if (!b) return;
                const p = parseInt(b.getAttribute('data-page'));
                if (isNaN(p)) return;
                AdminModule.paginaActual = p;
                if (AdminModule._serverTotal !== undefined) {
                    // Backend con paginación: recargar
                    UserOperations.cargarUsuarios();
                } else {
                    UIUpdater.renderizarTabla();
                    UIUpdater.renderizarPaginacion();
                }
            });
            paginacion._pageBound = true;
        }
    },
    
    crearBotonPaginacion(texto, pagina) {
        const btn = document.createElement('button');
        btn.className = 'ui-button ui-button--ghost ui-button--sm';
        btn.setAttribute('data-page', String(pagina));
        // Si el texto contiene un emoji/ícono al inicio (por ejemplo '⬅️ Anterior' o 'Siguiente ➡️'),
        // envolver el icono en span.ui-button__icon para que las reglas unificadas de estilo lo controlen.
        const iconId = UIUpdater._normalizeIcon ? UIUpdater._normalizeIcon(texto) : null;
        if (iconId) {
            const textOnly = texto.replace(/[\u2600-\uFFFF]/g, '').trim();
            btn.innerHTML = textOnly ? `<span class="ui-button__icon" data-icon="${iconId}" aria-hidden="true"></span> ${textOnly}` : `<span class="ui-button__icon" data-icon="${iconId}" aria-hidden="true"></span>`;
        } else {
            btn.textContent = texto;
        }
        return btn;
    },
    
    _normalizeIcon(raw) {
        if (!raw) return null;
        const map = {
            '👁': 'view', '✏️': 'edit', '✏': 'edit', '🗑️': 'delete', '🗑': 'delete',
            '⬅️': 'prev', '➡️': 'next', '🔍': 'search', '🧹': 'clear', '💾': 'save',
            '❌': 'cancel', '✖️': 'close', '✖': 'close', '🔄': 'refresh', '📤': 'export',
            '➕': 'plus', '🔗': 'link', '📋': 'copy', '✅': 'confirm', '📥': 'download'
        };
        if (map[raw]) return map[raw];
        if (/^[a-z0-9_-]+$/i.test(raw)) return raw;
        return null;
    }
};

// Gestión de formularios
const FormManager = {
    nuevoUsuario() {
        AdminModule.usuarioEditando = null;
        this.limpiarFormulario();
        
        const titulo = document.getElementById('modalTitulo');
        const btnGuardar = document.getElementById('guardarBtn');
        const btnActualizar = document.getElementById('actualizarBtn');
        const contrasenaField = document.getElementById('contrasena');
        
        if (titulo) titulo.textContent = 'Agregar Usuario';
        if (btnGuardar) btnGuardar.style.display = 'inline-flex';
        if (btnActualizar) btnActualizar.style.display = 'none';
        if (contrasenaField) contrasenaField.required = true;
        
        ModalManager.show('modalFormulario');
    },
    
    editarUsuario(usuario) {
        AdminModule.usuarioEditando = usuario;
        this.llenarFormulario(usuario);
        
        const titulo = document.getElementById('modalTitulo');
        const btnGuardar = document.getElementById('guardarBtn');
        const btnActualizar = document.getElementById('actualizarBtn');
        const contrasenaField = document.getElementById('contrasena');
        
        if (titulo) titulo.textContent = 'Editar Usuario';
        if (btnGuardar) btnGuardar.style.display = 'none';
        if (btnActualizar) btnActualizar.style.display = 'inline-flex';
        if (contrasenaField) contrasenaField.required = false;
        
        ModalManager.show('modalFormulario');
    },
    
    verUsuario(usuario) {
        const campos = {
            'verId': usuario.IdUsuario,
            'verNombre': usuario.NombreCompleto,
            'verUsuario': usuario.Usuario,
            'verRol': usuario.Rol
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || '';
        });
        
        ModalManager.show('modalUsuario');
    },
    
    confirmarEliminacion(usuario) {
        AdminModule.usuarioEditando = usuario;
        
        const nombreUsuario = document.getElementById('usuarioEliminar');
        if (nombreUsuario) {
            nombreUsuario.textContent = `${usuario.NombreCompleto} (${usuario.Usuario})`;
        }
        
        ModalManager.show('modalEliminar');
    },
    
    limpiarFormulario() {
        const form = document.getElementById('formCrearUsuario');
        if (form) {
            form.reset();
            this.limpiarErrores();
        }
    },
    
    llenarFormulario(usuario) {
        const campos = {
            'nombre': usuario.NombreCompleto,
            'usuario': usuario.Usuario,
            'contrasena': '', // Siempre vacío para seguridad
            'rol': usuario.Rol
        };
        
        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = valor || '';
        });
        
        this.limpiarErrores();
    },
    
    limpiarErrores() {
        // Preferir la utilidad centralizada si existe
        if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.limpiarErroresFormulario === 'function') {
            window.SWGROI.UI.limpiarErroresFormulario('formCrearUsuario');
            return;
        }
        const feedbacks = document.querySelectorAll('.ui-form__feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
        });
    },
    
    obtenerDatosFormulario() {
        const form = document.getElementById('formCrearUsuario');
        if (!form) return null;
        
        const formData = new FormData(form);
        const datos = Object.fromEntries(formData.entries());
        
        // Agregar ID si estamos editando
        if (AdminModule.usuarioEditando) {
            datos.IdUsuario = AdminModule.usuarioEditando.IdUsuario.toString();
        }
        
        return datos;
    },
    
    validarFormulario(datos) {
        const errores = {};
        
        if (!datos.NombreCompleto || datos.NombreCompleto.trim().length === 0) {
            errores.nombre = 'El nombre completo es obligatorio';
        } else if (datos.NombreCompleto.length > 150) {
            errores.nombre = 'El nombre no puede exceder 150 caracteres';
        }
        
        if (!datos.Usuario || datos.Usuario.trim().length === 0) {
            errores.usuario = 'El usuario es obligatorio';
        } else if (datos.Usuario.length > 100) {
            errores.usuario = 'El usuario no puede exceder 100 caracteres';
        }
        
        if (!AdminModule.usuarioEditando && (!datos.Contrasena || datos.Contrasena.length === 0)) {
            errores.contrasena = 'La contraseña es obligatoria';
        } else if (datos.Contrasena && (datos.Contrasena.length < 6 || datos.Contrasena.length > 100)) {
            errores.contrasena = 'La contraseña debe tener entre 6 y 100 caracteres';
        }
        
        if (!datos.Rol || datos.Rol.trim().length === 0) {
            errores.rol = 'El rol es obligatorio';
        }
        
        // usar el helper centralizado para mostrar errores por campo
        if (Object.keys(errores).length > 0) {
            if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarErroresFormulario === 'function') {
                window.SWGROI.UI.mostrarErroresFormulario(errores, 5000);
            } else {
                this.mostrarErrores(errores);
            }
        }
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
    }
};

// Gestión de exportación
const ExportManager = {
    exportarCSV() {
        if (AdminModule.usuariosFiltrados.length === 0) {
            NotificationManager.show('No hay datos para exportar', 'warning');
            return;
        }
        
        const headers = ['ID', 'Nombre Completo', 'Usuario', 'Rol'];
        const csvData = [
            headers.join(','),
            ...AdminModule.usuariosFiltrados.map(usuario => [
                usuario.IdUsuario,
                `"${usuario.NombreCompleto}"`,
                `"${usuario.Usuario}"`,
                usuario.Rol
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        NotificationManager.show('Datos exportados exitosamente', 'success');
    }
};

// Event Listeners
const EventManager = {
    init() {
        this.setupFormEvents();
        this.setupFilterEvents();
        this.setupModalEvents();
        this.setupActionEvents();
    },
    
    setupFormEvents() {
        const form = document.getElementById('formCrearUsuario');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
        
        const btnGuardar = document.getElementById('guardarBtn');
        if (btnGuardar) {
            btnGuardar.addEventListener('click', () => this.handleFormSubmit());
        }
        
        const btnActualizar = document.getElementById('actualizarBtn');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', () => this.handleFormSubmit());
        }
    },
    
    setupFilterEvents() {
        const buscador = document.getElementById('buscador');
        if (buscador) {
            buscador.addEventListener('input', (e) => {
                AdminModule.filtroTexto = e.target.value;
                // En server paging, podemos hacer debounce; por simplicidad, recargar directo
                FilterManager.aplicarFiltros();
            });
        }
        
        const filtroRol = document.getElementById('filtroRol');
        if (filtroRol) {
            filtroRol.addEventListener('change', (e) => {
                AdminModule.filtroRol = e.target.value;
                FilterManager.aplicarFiltros();
            });
        }
        
        const btnBuscar = document.getElementById('btnBuscar');
        if (btnBuscar) {
            btnBuscar.addEventListener('click', () => FilterManager.aplicarFiltros());
        }
        
        const btnLimpiar = document.getElementById('btnLimpiar');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => FilterManager.limpiarFiltros());
        }
    },
    
    setupModalEvents() {
        // Eventos de cierre de modales
        const botonesClose = [
            'btnCerrarFormulario', 'btnCancelar',
            'btnCerrarUsuario', 'btnCerrarVista',
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
                if (AdminModule.usuarioEditando) {
                    UserOperations.eliminarUsuario(AdminModule.usuarioEditando.IdUsuario);
                }
            });
        }
        
        // Cerrar modal al hacer clic en overlay
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('ui-modal-overlay')) {
                ModalManager.hideAll();
            }
        });
    },
    
    setupActionEvents() {
        const btnNuevo = document.getElementById('btnNuevo');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', () => FormManager.nuevoUsuario());
        }
        
        const btnRefrescar = document.getElementById('btnRefrescar');
        if (btnRefrescar) {
            btnRefrescar.addEventListener('click', () => UserOperations.cargarUsuarios());
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
        
        if (AdminModule.usuarioEditando) {
            await UserOperations.actualizarUsuario(datos);
        } else {
            await UserOperations.crearUsuario(datos);
        }
    }
};

// Inicialización del módulo
document.addEventListener('DOMContentLoaded', async () => {
    EventManager.init();
    await UserOperations.cargarUsuarios();
});

// Auto-refresh para Admin/Usuarios: recarga cada 30s
(function(){
    if (typeof UserOperations === 'undefined') return;
    if (UserOperations._autoRefresh) return;
    UserOperations._autoRefresh = true;
    try { setInterval(() => { UserOperations.cargarUsuarios().catch(()=>{}); }, 30000); } catch(e) { console.warn('No se pudo iniciar auto-refresh admin', e); }
})();


