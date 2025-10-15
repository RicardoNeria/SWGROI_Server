/**
 * MENU FUSIONADO COMPLETO - Todas las funcionalidades de menu.js integradas
 * Simplicidad mantenida + Funcionalidad 100% completa
 */

// ====================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ====================================
window.MenuState = window.MenuState || {
    modules: new Map(),
    sidebar: {
        isExpanded: true,
        activeSubmenu: null
    },
    user: {
        username: '',
        role: 'Usuario',
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

// Función simple para obtener cookies
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) {
            return decodeURIComponent(value);
        }
    }
    return null;
}

// ====================================
// GESTIÓN COMPLETA DE EVENTOS (fusión completa de menu.js)
// ====================================
function setupEventListeners() {
    console.log('Configurando event listeners completos...');
    
    // Toggles de tarjetas de módulos principales
    setupModuleToggles();
    
    // Toggles del sidebar (submenu desplegable)  
    setupSidebarToggles();
    
    // Sidebar responsive y móvil
    setupSidebarResponsive();
    
    // Enlaces de navegación con soporte completo
    setupNavigationLinks();
    
    // Logout con modal
    setupLogoutHandler();
    
    // Búsqueda en sidebar
    setupSearch();
    
    // Funcionalidades adicionales del menu.js original
    setLinkTitles();
    restoreActiveSubmenu();
}

function setupModuleToggles() {
    const moduleHeaders = document.querySelectorAll('.ui-menu-module__header');
    
    moduleHeaders.forEach(header => {
        header.addEventListener('click', function(event) {
            event.preventDefault();
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Comportamiento de acordeón: cerrar todas las otras tarjetas primero
            document.querySelectorAll('.ui-menu-module__header[aria-expanded="true"]').forEach(h => {
                if (h !== this) {
                    h.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Alternar el estado de la tarjeta actual
            this.setAttribute('aria-expanded', String(!isExpanded));
            
            // Actualizar estado interno (del menu.js original)
            const moduleElement = this.closest('.ui-menu-module');
            const moduleId = moduleElement ? moduleElement.dataset.module : null;
            if (moduleId) {
                MenuState.modules.set(moduleId, { expanded: !isExpanded });
            }
            
            console.log('Módulo toggled:', this.querySelector('.ui-menu-module__title')?.textContent, 'expandido:', !isExpanded);
        });
        
        // Soporte para teclado (Enter y Espacio)
        header.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

function setupSidebarToggles() {
    const sidebarToggles = document.querySelectorAll('.ui-sidebar__link--toggle');
    
    sidebarToggles.forEach(toggle => {
        toggle.addEventListener('click', function(event) {
            event.preventDefault();
            const isExpanded = this.getAttribute('aria-expanded') === 'true';

            // Cerrar todos los demás submenús
            document.querySelectorAll('.ui-sidebar__item--has-submenu').forEach(li => {
                const link = li.querySelector('.ui-sidebar__link--toggle');
                if (link && link !== this) {
                    link.setAttribute('aria-expanded', 'false');
                    li.classList.remove('ui-sidebar__item--open');
                }
            });

            // Alternar el actual
            const nextExpanded = !isExpanded;
            this.setAttribute('aria-expanded', String(nextExpanded));
            const currentItem = this.closest('.ui-sidebar__item--has-submenu');
            if (currentItem) {
                currentItem.classList.toggle('ui-sidebar__item--open', nextExpanded);
            }

            // Actualizar estado del sidebar (del menu.js original)
            const controlsId = this.getAttribute('aria-controls') || this.dataset.target || null;
            MenuState.sidebar.activeSubmenu = nextExpanded ? controlsId : null;
            
            // Persistir estado en localStorage
            try {
                if (nextExpanded && controlsId) {
                    localStorage.setItem('menu.activeSubmenuId', controlsId);
                } else {
                    localStorage.removeItem('menu.activeSubmenuId');
                }
            } catch(_) {}
        });
        
        // Soporte para teclado
        toggle.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.click();
            }
        });
    });
}

// ====================================
// FUNCIONES ADICIONALES DEL MENU.JS ORIGINAL
// ====================================
function setupSidebarResponsive() {
    const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
    const sidebarHandle = document.querySelector('[data-sidebar-handle]');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }
    
    if (sidebarHandle) {
        sidebarHandle.addEventListener('click', function() {
            // Forzar apertura en desktop
            document.body.classList.remove('ui-layout--collapsed');
            const sidebar = document.querySelector('.ui-sidebar');
            if (sidebar) sidebar.classList.add('ui-sidebar--active');
            MenuState.sidebar.isExpanded = true;
        });
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.ui-sidebar');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!sidebar) return;

    if (isMobile) {
        // En móvil: abrir/cerrar como overlay
        sidebar.classList.toggle('ui-sidebar--active');
        MenuState.sidebar.isExpanded = sidebar.classList.contains('ui-sidebar--active');
    } else {
        // En desktop: colapsar/expandir cambiando el layout
        document.body.classList.toggle('ui-layout--collapsed');
        MenuState.sidebar.isExpanded = !document.body.classList.contains('ui-layout--collapsed');
    }
}

function setupNavigationLinks() {
    const navLinks = document.querySelectorAll('.ui-menu-module__link, .ui-sidebar__sublink, .ui-sidebar__link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            const href = this.getAttribute('href');
            const target = this.getAttribute('target');
            
            // Validar navegación
            if (!href || href === '#') {
                event.preventDefault();
                console.warn('Enlace sin destino válido:', this);
                return;
            }

            // Política: para ir al login o recuperación siempre exigir cierre de sesión explícito
            const isLogin = /\/login(\.html)?$/i.test(href) || href === '/login' || href === 'login' || 
                           /\/recuperar(\.html)?$/i.test(href) || href === '/recuperar' || href === 'recuperar' ||
                           href === '/' || href === '/index.html' || href === 'index.html';
            if (isLogin) {
                event.preventDefault();
                // Mostrar mensaje si hay sistema de UI disponible
                try {
                    if (window.SWGROI && window.SWGROI.UI) {
                        window.SWGROI.UI.mostrarMensaje('Para acceder al inicio de sesión, cierra tu sesión actual primero.', 'warning', 'leyenda');
                    } else {
                        alert('Para acceder al inicio de sesión, cierra tu sesión actual primero.');
                    }
                } catch(_) {
                    alert('Para acceder al inicio de sesión, cierra tu sesión actual primero.');
                }
                handleLogout();
                return;
            }
            
            // Log de navegación para auditoría
            console.log('Navegando a:', href, 'Texto:', this.textContent.trim());
            
            // Permitir navegación normal si no es target="_blank"
            if (target !== '_blank') {
                // El navegador manejará la navegación naturalmente
                return;
            }
        });
        
        // Soporte completo para navegación con teclado (del menu.js original)
        link.addEventListener('keydown', function(event) {
            const items = Array.from(document.querySelectorAll('.ui-sidebar__link, .ui-sidebar__sublink'));
            const idx = items.indexOf(this);
            if (idx === -1) return;
            
            if (event.key === 'ArrowDown') { 
                event.preventDefault(); 
                (items[idx + 1] || items[0]).focus(); 
            }
            if (event.key === 'ArrowUp') { 
                event.preventDefault(); 
                (items[idx - 1] || items[items.length - 1]).focus(); 
            }
            if (event.key === 'Home') { 
                event.preventDefault(); 
                items[0].focus(); 
            }
            if (event.key === 'End') { 
                event.preventDefault(); 
                items[items.length - 1].focus(); 
            }
        });
    });
}

function setupLogoutHandler() {
    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            handleLogout();
        });
    }

    // Vincular botones del modal de confirmación (del menu.js original)
    try {
        const btnCancel = document.getElementById('btnCancelLogout');
        const btnConfirm = document.getElementById('btnConfirmLogout');
        const modal = document.getElementById('modalConfirmLogout');
        
        if (btnCancel) {
            btnCancel.addEventListener('click', function() {
                if (modal) modal.style.display = 'none';
            });
        }
        
        if (btnConfirm) {
            btnConfirm.addEventListener('click', function() {
                if (modal) modal.style.display = 'none';
                // Realizar logout
                window.location.href = '/logout';
            });
        }
        
        // Cerrar modal con la 'x' del header
        const closeBtn = modal ? modal.querySelector('[data-modal-close]') : null;
        if (closeBtn) {
            closeBtn.addEventListener('click', function() { 
                if (modal) modal.style.display = 'none'; 
            });
        }
    } catch (_) {}
}

function setupSearch() {
    const search = document.querySelector('[data-sidebar-search]');
    if (!search) return;
    
    search.addEventListener('input', function() {
        const q = this.value.trim().toLowerCase();
        const items = document.querySelectorAll('.ui-sidebar__item, .ui-sidebar__subitem');
        items.forEach(li => {
            const text = li.textContent.trim().toLowerCase();
            li.style.display = q ? (text.includes(q) ? '' : 'none') : '';
        });
    });
}

function setLinkTitles() {
    // Configurar títulos para enlaces del sidebar (del menu.js original)
    document.querySelectorAll('.ui-sidebar__link').forEach(a => {
        if (!a.getAttribute('title')) {
            a.setAttribute('title', a.textContent.trim());
        }
    });
}

function restoreActiveSubmenu() {
    // Restaurar estado del sidebar desde localStorage (del menu.js original)
    try {
        const id = localStorage.getItem('menu.activeSubmenuId');
        if (!id) return;
        
        const toggle = document.querySelector(`.ui-sidebar__link--toggle[aria-controls="${id}"]`);
        const li = toggle ? toggle.closest('.ui-sidebar__item--has-submenu') : null;
        if (toggle && li) {
            toggle.setAttribute('aria-expanded', 'true');
            li.classList.add('ui-sidebar__item--open');
            MenuState.sidebar.activeSubmenu = id;
        }
    } catch(_) { 
        // Error en localStorage, no hacer nada
    }
}

function handleLogout() {
    // Mostrar modal de confirmación si existe (del menu.js original)
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

    // Si no existe el modal, usar fallback con confirm
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        window.location.href = '/logout';
    }
}
function actualizarUsuario() {
    // Intentar obtener datos del usuario de diferentes fuentes
    let nombre = getCookie('nombre') || getCookie('usuario') || 'Usuario';
    let rol = getCookie('rol') || 'Usuario';
    
    console.log('Datos obtenidos - Nombre:', nombre, 'Rol:', rol);
    
    // Actualizar nombre en la bienvenida
    const nombreElemento = document.getElementById('nombre-usuario');
    if (nombreElemento) {
        nombreElemento.textContent = nombre;
    }
    
    // Actualizar perfil
    const perfilNombre = document.getElementById('perfil-nombre');
    if (perfilNombre) {
        perfilNombre.textContent = nombre;
    }
    
    const perfilRol = document.getElementById('perfil-rol');
    if (perfilRol) {
        perfilRol.textContent = rol;
    }
    
    // Mostrar módulo de administración si es admin
    const rolLower = rol.toLowerCase();
    const esAdmin = rolLower.includes('admin') || rolLower === 'administrador' || rolLower === 'administración' || rolLower === 'administracion';
    
    // Manejo del sidebar admin
    const menuAdmin = document.getElementById('admin-menu');
    if (menuAdmin) {
        if (esAdmin) {
            menuAdmin.style.display = '';
            console.log('Módulo de administración mostrado para rol:', rol);
        } else {
            menuAdmin.style.display = 'none';
            console.log('Módulo de administración oculto para rol:', rol);
        }
    }
    
    // Manejo de tarjetas de módulos con data-requires-role
    const tarjetasConRol = document.querySelectorAll('.ui-menu-module[data-requires-role]');
    tarjetasConRol.forEach(tarjeta => {
        const rolRequerido = tarjeta.getAttribute('data-requires-role').toLowerCase();
        if (rolRequerido === 'administrador' || rolRequerido === 'admin') {
            if (esAdmin) {
                tarjeta.style.display = '';
                console.log('Tarjeta de módulo mostrada para admin:', tarjeta.querySelector('.ui-menu-module__title')?.textContent);
            } else {
                tarjeta.style.display = 'none';
                console.log('Tarjeta de módulo oculta para no-admin:', tarjeta.querySelector('.ui-menu-module__title')?.textContent);
            }
        }
    });
}

// Función para actualizar saludo dinámico
function actualizarSaludo() {
    const ahora = new Date();
    const hora = ahora.getHours();
    
    let saludo = 'Hola';
    if (hora >= 6 && hora < 12) {
        saludo = 'Buenos días';
    } else if (hora >= 12 && hora < 20) {
        saludo = 'Buenas tardes';
    } else {
        saludo = 'Buenas noches';
    }
    
    const nombre = getCookie('nombre') || getCookie('usuario') || 'Usuario';
    const saludoElemento = document.getElementById('saludo');
    if (saludoElemento) {
        saludoElemento.innerHTML = `${saludo}, <span id="nombre-usuario">${nombre}</span>.`;
    }
}

// Función para actualizar fecha y hora
function actualizarFechaHora() {
    const ahora = new Date();
    
    const opciones = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    };
    const fecha = new Intl.DateTimeFormat('es-ES', opciones).format(ahora);
    
    const horas = ahora.getHours();
    const minutos = ahora.getMinutes();
    const hora12 = horas % 12 === 0 ? 12 : horas % 12;
    const horaFormateada = String(hora12).padStart(2, '0');
    const minutosFormateados = String(minutos).padStart(2, '0');
    const ampm = horas >= 12 ? 'p.m.' : 'a.m.';
    
    const fechaHoraTexto = `Hoy es ${fecha}, ${horaFormateada}:${minutosFormateados} ${ampm} hrs.`;
    
    const fechaHoraElemento = document.getElementById('fecha-hora');
    if (fechaHoraElemento) {
        fechaHoraElemento.textContent = fechaHoraTexto;
    }
}

// Función para cargar métricas simples
async function cargarMetricas() {
    try {
        const response = await fetch('/menu/indicadores');
        if (response.ok) {
            const data = await response.json();
            
            // Actualizar contadores
            const ticketsEl = document.getElementById('contadorTickets');
            if (ticketsEl) ticketsEl.textContent = data.tickets || 0;
            
            const avisosEl = document.getElementById('contadorAvisos');
            if (avisosEl) avisosEl.textContent = data.avisos || 0;
            
            const cotizacionesEl = document.getElementById('contadorCotizaciones');
            if (cotizacionesEl) cotizacionesEl.textContent = data.cotizaciones || 0;
        }
    } catch (error) {
        console.error('Error cargando métricas:', error);
    }
}

// ====================================
// INICIALIZACIÓN COMPLETA - FUSIÓN 100% FUNCIONAL
// ====================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando menú fusionado completo...');
    
    // Configurar eventos de navegación (TODAS las funcionalidades del menu.js original)
    setupEventListeners();
    
    // Actualizar datos del usuario
    actualizarUsuario();
    
    // Actualizar saludo dinámico
    actualizarSaludo();
    
    // Actualizar fecha y hora
    actualizarFechaHora();
    
    // Cargar métricas
    cargarMetricas();
    
    // Actualizar cada minuto
    setInterval(function() {
        actualizarSaludo();
        actualizarFechaHora();
    }, 60000);
    
    // Recargar métricas cada 30 segundos
    setInterval(cargarMetricas, 30000);
    
    console.log('Menú fusionado completo inicializado correctamente - TODAS las funcionalidades activas');
});

// Función para manejar el sidebar en móviles
function toggleSidebar() {
    const sidebar = document.querySelector('.ui-sidebar');
    if (sidebar) {
        sidebar.classList.toggle('ui-sidebar--active');
    }
}