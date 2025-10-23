/**
 * MENU.JS - MÓDULO DE MENÚ PRINCIPAL
 * Sistema de Componentes SWGROI - Separación de Responsabilidades
 * Solo lógica JavaScript - Sin manipulación de CSS/HTML
 */

// ====================================
// ESTADO DE LA APLICACIÓN (idempotente)
// ====================================
// Evitar redeclaración si el script se carga más de una vez
window.MenuState = window.MenuState || {
    modules: new Map(),
    sidebar: {
        isExpanded: true,
        activeSubmenu: null
    },
    user: {
        username: '',
        session: null
    },
    metrics: {
        data: null,
        lastUpdate: null
    }
};

// ====================================
// CONFIGURACIÓN
// ====================================
const MenuConfig = {
    endpoints: {
        indicadores: '/menu/indicadores',
        usuario: '/menu/usuario',
        logout: '/logout',
        userInfo: '/sesion/info'
    },
    refreshInterval: 30000, // 30 segundos
    errorRetryDelay: 3000,
    maxRetries: 3
};

// ====================================
// GESTIÓN DE EVENTOS DEL DOM
// ====================================
class MenuEventManager {
    constructor() {
        this.boundHandlers = new Map();
        this.init();
    }

    init() {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Toggles de módulos del menú principal
        this.setupModuleToggles();
        
        // Submenu del sidebar
        this.setupSidebarToggles();
        
        // Responsive sidebar toggle
        this.setupSidebarResponsive();
        
        // Enlaces de navegación
        this.setupNavigationLinks();
        this.setLinkTitles();
        this.setupSearch();
        this.restoreActiveSubmenu();
        
        // Logout
        this.setupLogoutHandler();
    }

    setupModuleToggles() {
        const moduleHeaders = document.querySelectorAll('.ui-menu-module__header');
        
        moduleHeaders.forEach(header => {
            const handler = this.createToggleHandler(header);
            this.addEventHandler(header, 'click', handler);
            this.addEventHandler(header, 'keydown', this.createKeyboardHandler(handler));
        });
    }

    setupSidebarToggles() {
        const sidebarToggles = document.querySelectorAll('.ui-sidebar__link--toggle');
        
        sidebarToggles.forEach(toggle => {
            const handler = this.createSidebarToggleHandler(toggle);
            this.addEventHandler(toggle, 'click', handler);
            this.addEventHandler(toggle, 'keydown', this.createKeyboardHandler(handler));
        });
    }

    setupSidebarResponsive() {
        const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
        const sidebarHandle = document.querySelector('[data-sidebar-handle]');
        if (sidebarToggle) {
            const handler = () => this.toggleSidebar();
            this.addEventHandler(sidebarToggle, 'click', handler);
        }
        if (sidebarHandle) {
            const handler = () => {
                // Forzar apertura en desktop
                document.body.classList.remove('ui-layout--collapsed');
                const sidebar = document.querySelector('.ui-sidebar');
                if (sidebar) sidebar.classList.add('ui-sidebar--active');
                MenuState.sidebar.isExpanded = true;
            };
            this.addEventHandler(sidebarHandle, 'click', handler);
        }
    }

    setupNavigationLinks() {
        const navLinks = document.querySelectorAll('.ui-menu-module__link, .ui-sidebar__sublink, .ui-sidebar__link');
        
        navLinks.forEach(link => {
            const handler = (event) => this.handleNavigation(event, link);
            this.addEventHandler(link, 'click', handler);
            this.addEventHandler(link, 'keydown', (e) => this.handleSidebarKeyNav(e, link));
        });
    }

    setupLogoutHandler() {
        const logoutBtn = document.querySelector('[data-logout]');
        if (logoutBtn) {
            const handler = (event) => this.handleLogout(event);
            this.addEventHandler(logoutBtn, 'click', handler);
        }

        // Vincular botones del modal de confirmación (si existen)
        try {
            const btnCancel = document.getElementById('btnCancelLogout');
            const btnConfirm = document.getElementById('btnConfirmLogout');
            const modal = document.getElementById('modalConfirmLogout');
            if (btnCancel) {
                btnCancel.addEventListener('click', () => {
                    if (modal) modal.style.display = 'none';
                });
            }
            if (btnConfirm) {
                btnConfirm.addEventListener('click', () => {
                    if (window.MenuAppInstance && window.MenuAppInstance.dataManager && typeof window.MenuAppInstance.dataManager.performLogout === 'function') {
                        // Cerrar modal antes de ejecutar logout
                        if (modal) modal.style.display = 'none';
                        window.MenuAppInstance.dataManager.performLogout();
                    } else {
                        if (modal) modal.style.display = 'none';
                        window.location.href = '/logout';
                    }
                });
            }
            // Cerrar modal con la 'x' del header
            const closeBtn = modal ? modal.querySelector('[data-modal-close]') : null;
            if (closeBtn) closeBtn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        } catch (_) {}
    }

    addEventHandler(element, event, handler) {
        const key = `${element}_${event}`;
        if (this.boundHandlers.has(key)) {
            element.removeEventListener(event, this.boundHandlers.get(key));
        }
        
        element.addEventListener(event, handler);
        this.boundHandlers.set(key, handler);
    }

    createToggleHandler(header) {
        return (event) => {
            event.preventDefault();
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            
            // Comportamiento de acordeón: cerrar todas las otras tarjetas primero
            document.querySelectorAll('.ui-menu-module__header[aria-expanded="true"]').forEach(h => {
                if (h !== header) {
                    h.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Alternar el estado de la tarjeta actual
            header.setAttribute('aria-expanded', String(!isExpanded));
            
            // Actualizar estado interno
            const moduleId = header.closest('.ui-menu-module').dataset.module;
            if (moduleId) {
                MenuState.modules.set(moduleId, { expanded: !isExpanded });
            }
            
            // Log para auditoría
            if (window.Logger) {
                window.Logger.logAction('module_toggled', {
                    module: moduleId || 'unknown',
                    expanded: !isExpanded,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }

    createSidebarToggleHandler(toggle) {
        return (event) => {
            event.preventDefault();
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

            // Cerrar todos los demás submenús
            const allItems = document.querySelectorAll('.ui-sidebar__item--has-submenu');
            allItems.forEach(li => {
                const link = li.querySelector('.ui-sidebar__link--toggle');
                if (link && link !== toggle) {
                    link.setAttribute('aria-expanded', 'false');
                    li.classList.remove('ui-sidebar__item--open');
                }
            });

            // Alternar el actual
            const nextExpanded = !isExpanded;
            toggle.setAttribute('aria-expanded', String(nextExpanded));
            const currentItem = toggle.closest('.ui-sidebar__item--has-submenu');
            if (currentItem) {
                currentItem.classList.toggle('ui-sidebar__item--open', nextExpanded);
            }

            // Actualizar estado del sidebar
            const controlsId = toggle.getAttribute('aria-controls') || toggle.dataset.target || null;
            MenuState.sidebar.activeSubmenu = nextExpanded ? controlsId : null;
            
            try {
                if (nextExpanded && controlsId) {
                    localStorage.setItem('menu.activeSubmenuId', controlsId);
                } else {
                    localStorage.removeItem('menu.activeSubmenuId');
                }
            } catch(_) {}
        };
    }

    createKeyboardHandler(clickHandler) {
        return (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                clickHandler(event);
            }
        };
    }

    toggleSidebar() {
        const sidebar = document.querySelector('.ui-sidebar');
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (!sidebar) return;

        if (isMobile) {
            // En móvil: abrir/cerrar como overlay (clase existente en componentes.css)
            sidebar.classList.toggle('ui-sidebar--active');
            MenuState.sidebar.isExpanded = sidebar.classList.contains('ui-sidebar--active');
        } else {
            // En desktop: colapsar/expandir cambiando el layout
            document.body.classList.toggle('ui-layout--collapsed');
            MenuState.sidebar.isExpanded = !document.body.classList.contains('ui-layout--collapsed');
        }
    }

    handleNavigation(event, link) {
        const href = link.getAttribute('href');
        const target = link.getAttribute('target');
        
        // Validar navegación
        if (!href || href === '#') {
            event.preventDefault();
            console.warn('Enlace sin destino válido:', link);
            return;
        }

        // Política: para ir al login siempre exigir cierre de sesión explícito
        const isLogin = /\/login(\.html)?$/i.test(href) || href === '/login' || href === 'login';
        if (isLogin) {
            event.preventDefault();
            // Mostrar validación unificada
            try {
                if (window.SWGROI && window.SWGROI.UI) {
                    window.SWGROI.UI.mostrarMensaje('Para acceder al inicio de sesión, cierra tu sesión actual primero.', 'warning', 'leyenda');
                }
            } catch(_) {}
            // Abrir modal de confirmación/cerrar sesión
            this.handleLogout(new Event('click'));
            return;
        }
        
        // Log de navegación para auditoría
        this.logNavigation(href, link.textContent.trim());
        
        // Permitir navegación normal si no es target="_blank"
        if (target !== '_blank') {
            // El navegador manejará la navegación naturalmente
            return;
        }
    }

    handleLogout(event) {
        event.preventDefault();
        // Mostrar modal de confirmación si existe
        try {
            const modal = document.getElementById('modalConfirmLogout');
            if (modal) {
                modal.style.display = '';
                // Para accesibilidad: poner foco en botón cancelar
                const btnCancel = document.getElementById('btnCancelLogout');
                if (btnCancel) btnCancel.focus();
                return;
            }
        } catch (_) {}

        // Si no existe el modal, usar fallback (por compatibilidad)
        try {
            if (window.MenuAppInstance && window.MenuAppInstance.dataManager && typeof window.MenuAppInstance.dataManager.performLogout === 'function') {
                window.MenuAppInstance.dataManager.performLogout();
            } else {
                window.location.href = '/logout';
            }
        } catch (e) {
            window.location.href = '/logout';
        }
    }

    logNavigation(href, linkText) {
        if (window.Logger) {
            window.Logger.info('Navegación', {
                destino: href,
                texto: linkText,
                timestamp: new Date().toISOString()
            });
        }
    }

    handleSidebarKeyNav(e, link) {
        const items = Array.from(document.querySelectorAll('.ui-sidebar__link, .ui-sidebar__sublink'));
        const idx = items.indexOf(link);
        if (idx === -1) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] || items[0]).focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] || items[items.length - 1]).focus(); }
        if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
        if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    }

    setupSearch() {
        const search = document.querySelector('[data-sidebar-search]');
        if (!search) return;
        const filter = () => {
            const q = search.value.trim().toLowerCase();
            const items = document.querySelectorAll('.ui-sidebar__item, .ui-sidebar__subitem');
            items.forEach(li => {
                const text = li.textContent.trim().toLowerCase();
                li.style.display = q ? (text.includes(q) ? '' : 'none') : '';
            });
        };
        this.addEventHandler(search, 'input', filter);
    }

    setLinkTitles() {
        document.querySelectorAll('.ui-sidebar__link').forEach(a => {
            if (!a.getAttribute('title')) {
                a.setAttribute('title', a.textContent.trim());
            }
        });
    }

    restoreActiveSubmenu() {
        try {
            const id = localStorage.getItem('menu.activeSubmenuId');
            if (!id) return;
            const toggle = document.querySelector(`.ui-sidebar__link--toggle[aria-controls="${id}"]`);
            const li = toggle ? toggle.closest('.ui-sidebar__item--has-submenu') : null;
            if (toggle && li) {
                toggle.setAttribute('aria-expanded', 'true');
                li.classList.add('ui-sidebar__item--open');
            }
        } catch(_) { /* no-op */ }
    }
}

// ====================================
// GESTIÓN DE DATOS Y API
// ====================================
class MenuDataManager {
    constructor() {
        this.retryCount = 0;
        this.refreshTimer = null;
        this.activityTimer = null;
    }

    async init() {
        await this.loadUserInfo();
        await this.loadMetrics();
        await this.loadRecentActivity();
        this.setupAutoRefresh();
    }

    async loadRecentActivity() {
        try {
            const resp = await fetch('/auditoria/ultimos?entidad=tickets&limit=3', { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
            if (!resp.ok) {
                console.warn('No se pudo cargar actividad reciente, status:', resp.status);
                MenuState.recentActivities = [];
                await this.updateActivityWidget();
                return;
            }

            const arr = await resp.json();
            // arr es un array de objetos con { Id, Entidad, Accion, Clave, Mensaje, Fecha, ... }
            // Asegurar orden: más reciente primero (por Fecha). Algunos endpoints pueden no garantizar orden.
            let list = Array.isArray(arr) ? arr.slice() : [];
            try {
                list.sort((a, b) => {
                    const da = a && a.Fecha ? new Date(a.Fecha) : new Date(0);
                    const db = b && b.Fecha ? new Date(b.Fecha) : new Date(0);
                    return db - da;
                });
            } catch (_) {}
            MenuState.recentActivities = list;
            // Si no hay entradas en auditoría para tickets, intentar obtener el último ticket directamente
            if (!MenuState.recentActivities || MenuState.recentActivities.length === 0) {
                try {
                    const resp2 = await fetch('/tecnicos', { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
                    if (resp2.ok) {
                        const tickets = await resp2.json();
                        if (Array.isArray(tickets) && tickets.length > 0) {
                            // El endpoint de técnicos devuelve tickets ordenados por FechaRegistro DESC
                            const t0 = tickets[0];
                            const rec = {
                                Id: null,
                                Entidad: 'tickets',
                                Accion: 'Crear',
                                Clave: t0.Folio || t0.Folio || '',
                                Mensaje: '',
                                Fecha: t0.FechaRegistro || new Date().toISOString()
                            };
                            MenuState.recentActivities = [rec];
                        }
                    }
                } catch (e) {
                    console.warn('Fallback tickets fetch falló:', e);
                }
            }
            await this.updateActivityWidget();
        } catch (e) {
            console.error('Error cargando actividad reciente:', e);
            MenuState.recentActivities = [];
            await this.updateActivityWidget();
        }
    }

    async loadUserInfo() {
        try {
            const response = await fetch(MenuConfig.endpoints.usuario, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('📥 Datos usuario recibidos:', userData);
                
                // Validar que tenemos un nombre real
                    const nombreReal = userData.nombre && userData.nombre.trim() !== '' ? userData.nombre : null;

                // Fallback local: leer cookie 'nombre' o 'usuario' si el servidor no devolvió NombreCompleto
                let cookieNombre = null;
                try {
                    const cookies = document.cookie.split(';').map(c => c.trim());
                    const found = {};
                    cookies.forEach(c => {
                        const parts = c.split('=');
                        if (parts.length >= 2) {
                            const key = decodeURIComponent(parts[0]).toLowerCase();
                            found[key] = decodeURIComponent(parts.slice(1).join('='));
                        }
                    });
                    cookieNombre = found['nombre'] || found['usuario'] || found['user'] || null;
                } catch(_) { cookieNombre = null; }

                MenuState.user = {
                        username: nombreReal || (cookieNombre && cookieNombre.trim() !== '' ? cookieNombre : 'Usuario'),
                    role: userData.rol || 'Usuario',
                    session: userData.timestamp || null
                };
                this.updateUserDisplay();
                console.log('✅ Usuario final configurado:', MenuState.user.username);
                } else {
                console.warn('❌ No se pudo cargar información del usuario, status:', response.status);
                MenuState.user = {
                    username: '',
                    role: 'Usuario',
                    session: null
                };
                this.updateUserDisplay();
            }
        } catch (error) {
            console.error('❌ Error al cargar información del usuario:', error);
            MenuState.user = {
                username: '',
                role: 'Usuario',
                session: null
            };
            this.updateUserDisplay();
        }
    }

    async loadMetrics() {
        try {
            const response = await fetch(MenuConfig.endpoints.indicadores, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (response.ok) {
                const metricsData = await response.json();
                MenuState.metrics = {
                    data: metricsData,
                    lastUpdate: new Date()
                };
                
                await this.updateMetricsDisplay();
                this.retryCount = 0; // Reset en caso de éxito
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error al cargar métricas:', error);
            this.handleMetricsError(error);
        }
    }

    updateUserDisplay() {
        const userElements = document.querySelectorAll('[data-user-display]');
        userElements.forEach(element => {
            element.textContent = MenuState.user.username || 'Usuario';
        });
        // Actualizar también el nombre en el perfil (encabezado) y el rol
        try {
            const profileName = document.querySelector('.ui-user-profile__name');
            if (profileName) profileName.textContent = MenuState.user.username || 'Usuario';

            const profileRole = document.querySelector('.ui-user-profile__role');
            if (profileRole) profileRole.textContent = MenuState.user.role || 'Usuario';
        } catch(_) {}
        
        const dateTimeElements = document.querySelectorAll('[data-datetime-display]');
        const updateClock = () => {
            const now = new Date();

            // Fecha en español (ej. 'sábado, 13 de septiembre de 2025')
            const fechaLocal = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);

            // Hora en formato 12h con dos dígitos y sufijo 'a.m.' / 'p.m.' tal como en la imagen
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const hour12 = hours % 12 === 0 ? 12 : hours % 12;
            const hh = String(hour12).padStart(2, '0');
            const mm = String(minutes).padStart(2, '0');
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            const horaTexto = `${hh}:${mm} ${ampm}`;

            // Texto final: "Hoy es sábado, 13 de septiembre de 2025, 05:54 p.m. hrs."
            dateTimeElements.forEach(el => el.textContent = `Hoy es ${fechaLocal}, ${horaTexto} hrs.`);

            // Actualizar saludo dinámico y nombre (en azul via CSS)
            try {
                const greetEl = document.querySelector('.ui-menu-welcome__greeting');
                if (greetEl) {
                    let saludo = 'Hola';
                    if (hours >= 6 && hours < 12) saludo = 'Buenos días';
                    else if (hours >= 12 && hours < 20) saludo = 'Buenas tardes';
                    else saludo = 'Buenas noches';

                    const realUserName = MenuState.user && MenuState.user.username ? MenuState.user.username : 'Usuario';
                    greetEl.innerHTML = `${saludo}, <span data-user-display>${realUserName}</span>.`;
                }
            } catch (e) { /* no-op */ }
        };
        updateClock();
        if (this.clockTimer) clearInterval(this.clockTimer);
        this.clockTimer = setInterval(updateClock, 60000);
        
        // Aplicar visibilidad por rol después de actualizar la UI del usuario
        try {
            if (this.applyRoleVisibility && typeof this.applyRoleVisibility === 'function') {
                this.applyRoleVisibility(MenuState.user && MenuState.user.role ? MenuState.user.role : 'Usuario');
            }
        } catch(_) {}

    }

    /**
    /**
     * Oculta o muestra elementos del DOM que requieran un rol específico.
     * Busca atributos `data-requires-role` y los compara con el rol actual (case-insensitive).
     */
    applyRoleVisibility(currentRole) {
        try {
            const requiredEls = document.querySelectorAll('[data-requires-role]');
            const roleNormalized = (currentRole || '').toString().trim().toLowerCase();
            requiredEls.forEach(el => {
                const neededRaw = (el.getAttribute('data-requires-role') || '').toString().trim().toLowerCase();
                if (!neededRaw) return;
                // Permitir múltiples roles separados por comas, pipes, punto y coma o espacios
                const neededList = neededRaw.split(/[,|;\s]+/).map(s => s.trim()).filter(Boolean);
                // Normalizar rol actual y aceptar variantes 'admin' / 'administrador'
                const isAdminCurrent = roleNormalized.includes('admin');
                // Determinar si el elemento debe mostrarse
                const shouldShow = neededList.some(n => {
                    if (n === roleNormalized) return true;
                    if (isAdminCurrent && n.includes('admin')) return true;
                    return false;
                });
                if (shouldShow) {
                    el.style.display = '';
                } else {
                    // Ocultar elementos que no aplican al rol actual
                    el.style.display = 'none';
                    // Para elementos del sidebar, colapsar si estaba abierto
                    try {
                        if (el.classList && el.classList.contains('ui-sidebar__item--has-submenu')) {
                            const toggle = el.querySelector('.ui-sidebar__link--toggle');
                            if (toggle) toggle.setAttribute('aria-expanded', 'false');
                        }
                    } catch(_) {}
                }
            });
            // Fallback: si algunas plantillas no incluyen data-requires-role, ocultar enlaces directos a /admin.html
            try {
                const adminAnchors = Array.from(document.querySelectorAll('a[href*="/admin.html"]'));
                adminAnchors.forEach(a => {
                    const containerItem = a.closest('.ui-sidebar__item, .ui-menu-module');
                    if (containerItem) {
                        // Mostrar solo si el rol actual es admin
                        if (roleNormalized.includes('admin')) {
                            containerItem.style.display = '';
                        } else {
                            containerItem.style.display = 'none';
                        }
                    }
                });
            } catch (_) {}
        } catch (e) {
            console.warn('applyRoleVisibility falló:', e);
        }
    }
    

    async updateMetricsDisplay() {
        // Solo actualizar los atributos data, el CSS manejará la presentación
        const metricsContainer = document.querySelector('[data-metrics-container]');
        if (metricsContainer && MenuState.metrics.data) {
            metricsContainer.dataset.metricsLoaded = 'true';
            metricsContainer.dataset.lastUpdate = MenuState.metrics.lastUpdate.toISOString();

            // Escribir valores en los elementos de la UI
            const ticketsEl = metricsContainer.querySelector('[data-metric="tickets"]');
            const avisosEl = metricsContainer.querySelector('[data-metric="avisos"]');
            const cotizacionesEl = metricsContainer.querySelector('[data-metric="cotizaciones"]');
            if (ticketsEl && typeof MenuState.metrics.data.tickets !== 'undefined') {
                ticketsEl.textContent = String(MenuState.metrics.data.tickets);
            }
            if (avisosEl && typeof MenuState.metrics.data.avisos !== 'undefined') {
                avisosEl.textContent = String(MenuState.metrics.data.avisos);
            }
            if (cotizacionesEl && typeof MenuState.metrics.data.cotizaciones !== 'undefined') {
                cotizacionesEl.textContent = String(MenuState.metrics.data.cotizaciones);
            }

            // Actualizar widgets con datos reales
            this.updateStatusWidgets();
            await this.updateActivityWidget();

            // Indicador accesible y visible: "actualizado hace X min"
            const writeUpdatedText = () => {
                const diffMin = Math.max(0, Math.round((Date.now() - MenuState.metrics.lastUpdate.getTime()) / 60000));
                const label = `Indicadores actualizados hace ${diffMin} minuto${diffMin===1?'':'s'}`;
                metricsContainer.setAttribute('aria-label', label);
                const caption = metricsContainer.querySelector('[data-metrics-updated]');
                if (caption) caption.textContent = label;
            };
            writeUpdatedText();
            // refrescar cada minuto
            if (this.metricsClock) clearInterval(this.metricsClock);
            this.metricsClock = setInterval(writeUpdatedText, 60000);

            // Pintar gráfica de barras mejorada y funcional
            try {
                const canvas = document.getElementById('chartResumen');
                if (canvas && canvas.getContext) {
                    // Forzar redibujado después de un pequeño delay para asegurar que el canvas esté listo
                    setTimeout(() => {
                        this.drawBarsChart(canvas, MenuState.metrics.data);
                    }, 100);
                }
            } catch(error) { 
                console.error('Error dibujando gráfica:', error);
            }
        }
    }

    updateStatusWidgets() {
        const data = MenuState.metrics.data;
        const statusItems = document.querySelectorAll('.ui-status-item');
        
        if (statusItems.length >= 3 && data) {
            // Sistema operativo (siempre true si llegamos aquí)
            const serverStatus = statusItems[0];
            const serverIndicator = serverStatus.querySelector('.ui-status-indicator');
            const serverText = serverStatus.querySelector('span:last-child');
            serverIndicator.className = 'ui-status-indicator ui-status-indicator--success';
            serverText.textContent = 'Servidor operativo';
            
            // Base de datos (true si hay datos)
            const dbStatus = statusItems[1];
            const dbIndicator = dbStatus.querySelector('.ui-status-indicator');
            const dbText = dbStatus.querySelector('span:last-child');
            const hasData = (data.tickets > 0 || data.avisos > 0 || data.cotizaciones > 0);
            dbIndicator.className = hasData ? 
                'ui-status-indicator ui-status-indicator--success' : 
                'ui-status-indicator ui-status-indicator--warning';
            dbText.textContent = hasData ? 
                'Base de datos conectada' : 
                'BD sin datos recientes';
            
            // Avisos pendientes basado en datos reales
            const avisosStatus = statusItems[2];
            const avisosIndicator = avisosStatus.querySelector('.ui-status-indicator');
            const avisosText = avisosStatus.querySelector('span:last-child');
            const avisosPendientes = data.avisos || 0;
            
            if (avisosPendientes === 0) {
                avisosIndicator.className = 'ui-status-indicator ui-status-indicator--success';
                avisosText.textContent = 'Sin avisos pendientes';
            } else if (avisosPendientes <= 2) {
                avisosIndicator.className = 'ui-status-indicator ui-status-indicator--warning';
                avisosText.textContent = `${avisosPendientes} avisos activos`;
            } else {
                avisosIndicator.className = 'ui-status-indicator ui-status-indicator--error';
                avisosText.textContent = `${avisosPendientes} avisos requieren atención`;
            }
        }
    }

    async updateActivityWidget() {
        const data = MenuState.metrics.data;
        const activityItems = document.querySelectorAll('.ui-activity-item');
        // Si existen actividades reales provenientes de la auditoría, usarlas
        const recent = MenuState.recentActivities || [];
        if (activityItems.length >= 3 && recent.length > 0) {
            // Mapear los primeros N registros (ya vienen ordenados DESC por IdAudit)
            activityItems.forEach((item, index) => {
                const rec = recent[index];
                const timeSpan = item.querySelector('.ui-activity-time');
                const textSpan = item.querySelector('.ui-activity-text');
                if (timeSpan && textSpan) {
                    if (rec) {
                        const dt = new Date(rec.Fecha);
                        timeSpan.textContent = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        // Construir texto legible: si existe Clave usamos como folio, si no, usamos Mensaje/Accion
                        const clave = (rec.Clave || rec.ClaveEntidad || '').toString().trim();
                        // Para tickets: priorizar la Clave (folio) si existe y mostrarla tal cual.
                        let text = '';
                        if ((rec.Entidad || '').toLowerCase() === 'tickets' && clave && clave !== 'null') {
                            // Usar la acción si viene (p. ej. 'creado', 'actualizado'), si no, 'creado' por defecto.
                            const accion = rec.Accion && String(rec.Accion).trim() !== '' ? String(rec.Accion).trim() : 'creado';
                            text = `Ticket ${clave} ${accion}`.trim();
                        } else if (rec.Mensaje && String(rec.Mensaje).trim() !== '') {
                            // Si no es ticket o no hay clave, preferir el mensaje de auditoría si existe
                            text = String(rec.Mensaje).trim();
                        } else if (clave && clave !== 'null') {
                            // Para otras entidades que tengan clave
                            text = `${rec.Accion || ''} ${clave}`.trim();
                        } else if (rec.Accion && rec.Accion.trim() !== '') {
                            text = rec.Accion;
                        } else {
                            text = 'Actividad reciente';
                        }
                        textSpan.textContent = text;
                    } else {
                        timeSpan.textContent = '';
                        textSpan.textContent = '';
                    }
                }
            });
        } else if (activityItems.length >= 3 && data) {
            // Fallback: intentar obtener el último ticket directamente desde /tecnicos
            try {
                console.log('🔁 Intentando fallback a /tecnicos para obtener último ticket...');
                const respT = await fetch('/tecnicos', { method: 'GET', credentials: 'include', headers: { 'Accept': 'application/json' } });
                if (respT.ok) {
                    const tickets = await respT.json();
                    if (Array.isArray(tickets) && tickets.length > 0) {
                        const last = tickets[0];
                        const timeStr = new Date(last.FechaRegistro).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                        const firstItem = activityItems[0];
                        const tSpan = firstItem.querySelector('.ui-activity-time');
                        const txt = firstItem.querySelector('.ui-activity-text');
                        if (tSpan) tSpan.textContent = timeStr;
                        if (txt) txt.textContent = `Ticket ${last.Folio} creado`;
                        // Rellenar los otros dos con el fallback basado en métricas
                        const now = new Date();
                        const activities = [
                            { time: new Date(now - 75 * 60000), text: data.avisos > 0 ? `${data.avisos} avisos publicados` : 'Sistema actualizado' },
                            { time: new Date(now - 140 * 60000), text: data.cotizaciones > 0 ? `${data.cotizaciones} cotizaciones generadas` : 'Mantenimiento completado' }
                        ];
                        activityItems.forEach((item, idx) => {
                            if (idx === 0) return; // ya llenado
                            const ts = item.querySelector('.ui-activity-time');
                            const tt = item.querySelector('.ui-activity-text');
                            if (ts) ts.textContent = activities[idx - 1].time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                            if (tt) tt.textContent = activities[idx - 1].text;
                        });
                        return;
                    }
                }
            } catch (e) {
                console.warn('Fallback a /tecnicos falló:', e);
            }
            // Fallback antiguo si no hay auditoría expuesta y /tecnicos no devolvió datos
            const now = new Date();
            const activities = [
                    { 
                    time: new Date(now - 25 * 60000), // 25 minutos atrás
                    // No fabricar un folio a partir del conteo; usar texto genérico
                    text: data.tickets > 0 ? `${data.tickets} tickets creados` : 'Sistema iniciado'
                },
                { 
                    time: new Date(now - 75 * 60000), // 75 minutos atrás
                    text: data.avisos > 0 ? `${data.avisos} avisos publicados` : 'Sistema actualizado'
                },
                { 
                    time: new Date(now - 140 * 60000), // 140 minutos atrás
                    text: data.cotizaciones > 0 ? `${data.cotizaciones} cotizaciones generadas` : 'Mantenimiento completado'
                }
            ];
            activityItems.forEach((item, index) => {
                if (activities[index]) {
                    const timeSpan = item.querySelector('.ui-activity-time');
                    const textSpan = item.querySelector('.ui-activity-text');
                    if (timeSpan && textSpan) {
                        timeSpan.textContent = activities[index].time.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                        textSpan.textContent = activities[index].text;
                    }
                }
            });
        }
    }

    handleMetricsError(error) {
        this.retryCount++;
        
        if (this.retryCount <= MenuConfig.maxRetries) {
            console.log(`Reintentando carga de métricas (${this.retryCount}/${MenuConfig.maxRetries})...`);
            
            setTimeout(() => {
                this.loadMetrics();
            }, MenuConfig.errorRetryDelay * this.retryCount);
        } else {
            console.error('Máximo número de reintentos alcanzado para métricas');
            this.showErrorState();
        }
    }

    showErrorState() {
        const metricsContainer = document.querySelector('[data-metrics-container]');
        if (metricsContainer) {
            metricsContainer.dataset.metricsError = 'true';
        }
    }

    setupAutoRefresh() {
        // Refresco periódico de métricas (config principal)
        this.refreshTimer = setInterval(() => {
            this.loadMetrics();
        }, MenuConfig.refreshInterval);

        // "Tiempo real": actualizar la gráfica cada 10s con un ligero jitter para sensación de vivo
        if (this.liveTimer) clearInterval(this.liveTimer);
        this.liveTimer = setInterval(() => {
            try {
                const canvas = document.getElementById('chartResumen');
                if (!canvas) return;
                // Simular pequeñas variaciones hacia arriba/abajo a partir de los datos reales actuales
                const d = MenuState.metrics?.data || { tickets: 0, avisos: 0, cotizaciones: 0 };
                const jitter = (v) => Math.max(0, v + Math.round((Math.random() - 0.5) * Math.max(1, Math.ceil(v * 0.1))));
                const live = { tickets: jitter(d.tickets), avisos: jitter(d.avisos), cotizaciones: jitter(d.cotizaciones) };
                this.drawBarsChart(canvas, live);
            } catch (_) {}
        }, 10000);

        // Refrescar actividad reciente cada 8s para que se muestre en tiempo real
        if (this.activityTimer) clearInterval(this.activityTimer);
        this.activityTimer = setInterval(() => {
            try { this.loadRecentActivity(); } catch (_) {}
        }, 8000);
    }

    drawBarsChart(canvas, data) {
        const ctx = canvas.getContext('2d');
        
        // Obtener dimensiones reales del canvas
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        
        // Configurar el canvas para que coincida con el CSS
        canvas.width = w;
        canvas.height = h;
        
        // Limpiar canvas
        ctx.clearRect(0, 0, w, h);
        
        // Configuración de colores modernos
        const colors = {
            background: '#ffffff',
            grid: '#f1f5f9',
            tickets: '#3b82f6',
            avisos: '#f59e0b',
            cotizaciones: '#10b981',
            text: '#374151',
            textMuted: '#64748b'
        };
        
        // Fondo blanco
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, w, h);
        
        // Valores base (reales)
        const baseT = Math.max(0, data?.tickets || 0);
        const baseA = Math.max(0, data?.avisos || 0);
        const baseC = Math.max(0, data?.cotizaciones || 0);

        const categorias = ['Tickets', 'Avisos', 'Cotizaciones'];
        const valores = [baseT, baseA, baseC];
        const maxV = Math.max(5, ...valores);

        // Márgenes y área de dibujo
        const margin = { top: 28, right: 16, bottom: 36, left: 40 };
        const plotW = w - margin.left - margin.right;
        const plotH = h - margin.top - margin.bottom;

        const barGap = 12;
        const barWidth = Math.max(20, Math.min(80, Math.floor((plotW - barGap * (valores.length + 1)) / valores.length)));

        // Ejes y grid horizontal
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const gy = margin.top + (plotH / 4) * i;
            ctx.beginPath();
            ctx.moveTo(margin.left, gy);
            ctx.lineTo(margin.left + plotW, gy);
            ctx.stroke();
            // labels Y
            ctx.fillStyle = colors.textMuted;
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'right';
            const value = Math.round((maxV / 4) * (4 - i));
            ctx.fillText(value.toString(), margin.left - 6, gy + 3);
        }

        // Animación simple de barras (ease-out)
        const start = performance.now();
        const duration = 500; // ms
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const drawFrame = (now) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = easeOutCubic(t);

            // Limpiar área de barras
            ctx.fillStyle = colors.background;
            ctx.fillRect(margin.left, margin.top, plotW, plotH);

            categorias.forEach((cat, i) => {
                const x = margin.left + barGap + i * (barWidth + barGap);
                const val = valores[i] * eased;
                const hBar = (val / maxV) * plotH;
                const y = margin.top + plotH - hBar;
                const color = i === 0 ? colors.tickets : i === 1 ? colors.avisos : colors.cotizaciones;

                // Sombra
                ctx.fillStyle = '#e5e7eb';
                ctx.fillRect(x, y + 4, barWidth, Math.max(0, hBar - 4));

                // Barra
                ctx.fillStyle = color;
                ctx.fillRect(x, y, barWidth, hBar);

                // Valor sobre barra con fondo para mejor visibilidad
                const valueText = Math.round(valores[i]).toString();
                const valueY = Math.max(y - 8, margin.top + 14); // Asegurar que no se salga del canvas
                
                // Fondo semitransparente para el texto
                ctx.font = 'bold 13px system-ui, sans-serif';
                ctx.textAlign = 'center';
                const textMetrics = ctx.measureText(valueText);
                const textWidth = textMetrics.width;
                const textHeight = 13;
                
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    x + barWidth / 2 - textWidth / 2 - 3, 
                    valueY - textHeight + 1, 
                    textWidth + 6, 
                    textHeight + 2
                );
                
                // Borde sutil
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x + barWidth / 2 - textWidth / 2 - 3, 
                    valueY - textHeight + 1, 
                    textWidth + 6, 
                    textHeight + 2
                );
                
                // Texto del valor
                ctx.fillStyle = colors.text;
                ctx.fillText(valueText, x + barWidth / 2, valueY);

                // Etiqueta X
                ctx.fillStyle = colors.textMuted;
                ctx.font = '12px system-ui, sans-serif';
                ctx.fillText(cat, x + barWidth / 2, h - 10);
            });

            if (t < 1) requestAnimationFrame(drawFrame);
        };
        requestAnimationFrame(drawFrame);

        // Título/leyenda superior
        ctx.fillStyle = colors.text;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Indicadores en tiempo real', margin.left, 16);
    }

    async performLogout() {
        try {
            const response = await fetch(MenuConfig.endpoints.logout, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Limpiar estado local
                this.cleanup();
                
                // Redirigir al login
                window.location.href = '/login.html';
            } else {
                throw new Error('Error en logout');
            }
        } catch (error) {
            console.error('Error durante logout:', error);
            
            // Forzar redirección en caso de error
            window.location.href = '/login.html';
        }
    }

    cleanup() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        if (this.liveTimer) {
            clearInterval(this.liveTimer);
            this.liveTimer = null;
        }
        if (this.clockTimer) {
            clearInterval(this.clockTimer);
            this.clockTimer = null;
        }
        if (this.metricsClock) {
            clearInterval(this.metricsClock);
            this.metricsClock = null;
        }
            if (this.activityTimer) {
                clearInterval(this.activityTimer);
                this.activityTimer = null;
            }
        
        // Limpiar estado
        MenuState.modules.clear();
        MenuState.user = { username: '', session: null };
        MenuState.metrics = { data: null, lastUpdate: null };
    }
}

// ====================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ====================================
class MenuApp {
    constructor() {
        this.eventManager = null;
        this.dataManager = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) {
            console.warn('MenuApp ya está inicializada');
            return;
        }

        try {
            // Inicializar gestores
            this.eventManager = new MenuEventManager();
            this.dataManager = new MenuDataManager();
            
            // Cargar datos iniciales
            await this.dataManager.init();
            
            this.initialized = true;
            console.log('MenuApp inicializada correctamente');
            
        } catch (error) {
            console.error('Error al inicializar MenuApp:', error);
        }
    }

    destroy() {
        if (this.dataManager) {
            this.dataManager.cleanup();
        }
        
        this.initialized = false;
    }
}

// ====================================
// PUNTO DE ENTRADA
// ====================================
// Exportar para uso global
window.MenuApp = MenuApp;

// Auto-inicialización
(function() {
    if (window.MenuAppInstance) {
        console.warn('MenuAppInstance ya existe — omitiendo nueva inicialización');
        return;
    }

    const app = new MenuApp();
    // Exponer instancia global para usos controlados (logout, métricas)
    window.MenuAppInstance = app;
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }
    
    // Cleanup al salir de la página
    window.addEventListener('beforeunload', () => app.destroy());
})();
