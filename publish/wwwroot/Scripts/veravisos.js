// ================================================
// VERAVISOS.JS - Lógica del módulo Ver Avisos (solo lectura)
// Basado en avisos.js pero sin acciones de creación/edición/eliminación
// ================================================

// Estado global del módulo
const VerAvisosModule = {
	avisos: [],
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

// Configuración de la API (coincide con avisos.js)
const API_CONFIG_VER = {
	endpoints: {
		avisos: '/avisos'
	},
	headers: {
		'Content-Type': 'application/json',
		'Accept': 'application/json'
	}
};

// Utilidades para manejo de fetch seguro (copiado de avisos.js)
const NetworkUtilsVer = {
	async safeFetch(url, options = {}) {
		const defaultOptions = {
			credentials: 'include',
			headers: { ...API_CONFIG_VER.headers }
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

// Gestión de notificaciones (delegar a la utilidad unificada cuando exista)
const NotificationVer = {
	show(message, type = 'info') {
		// Si la utilidad central está disponible, delegamos
		if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
			try { window.SWGROI.UI.mostrarMensaje(message, type); return; } catch (e) { console.warn('SWGROI.UI.mostrarMensaje falló', e); }
		}

		// Fallback local: mantener compatibilidad con estructura de leyenda
		const leyenda = document.getElementById('leyenda');
		if (!leyenda) return;

		// Crear o actualizar nodos internos simplificados
		let iconNode = leyenda.querySelector('.ui-message__icon');
		let textNode = leyenda.querySelector('.ui-message__text');
		if (!iconNode) {
			iconNode = document.createElement('span');
			iconNode.className = 'ui-message__icon';
			iconNode.setAttribute('aria-hidden', 'true');
			leyenda.insertAdjacentElement('afterbegin', iconNode);
		}
		if (!textNode) {
			textNode = document.createElement('span');
			textNode.className = 'ui-message__text';
			leyenda.appendChild(textNode);
		}

		// icon visual simple
		const iconMap = { success: '✔', error: '✖', warning: '⚠', info: 'ℹ️' };
		iconNode.textContent = iconMap[type] || iconMap.info;
		textNode.textContent = message;

		leyenda.className = `ui-message ui-message--${type} ui-message--visible`;
		leyenda.style.display = 'inline-flex';

		setTimeout(() => {
			leyenda.classList.remove('ui-message--visible');
			leyenda.style.display = 'none';
		}, 4000);
	}
};

// UI updater (render de tabla simplificado)
const UIUpdaterVer = {
	renderizarTabla() {
		const tbody = document.getElementById('tablaAvisos');
		if (!tbody) return;

		tbody.innerHTML = '';

		if (!VerAvisosModule.avisos || VerAvisosModule.avisos.length === 0) {
			const tr = document.createElement('tr');
			const td = document.createElement('td');
			td.className = 'ui-tabla__cell';
			td.colSpan = 3;
			td.textContent = 'No se encontraron avisos';
			td.style.textAlign = 'center';
			tr.appendChild(td);
			tbody.appendChild(tr);
			return;
		}

		VerAvisosModule.avisos.forEach(aviso => {
			const tr = document.createElement('tr');
			tr.className = 'ui-tabla__row';

			// Mensaje
			const tdMensaje = document.createElement('td');
			tdMensaje.className = 'ui-tabla__cell ui-tabla__cell--mensaje js-leer-mas';
			// Mostrar el mensaje completo; usar textContent para evitar inyección HTML
			tdMensaje.textContent = aviso.Mensaje || aviso.mensaje || '';
			tdMensaje.title = aviso.Mensaje || aviso.mensaje || '';
			tr.appendChild(tdMensaje);

			tbody.appendChild(tr);
		});
	},

	renderizarPaginacion(total, page = VerAvisosModule.estado.page, pageSize = VerAvisosModule.estado.pageSize) {
		const paginacionInfo = document.getElementById('lblPaginacion');
		const btnPrev = document.getElementById('btnPrev');
		const btnNext = document.getElementById('btnNext');

		if (!paginacionInfo) return;

		const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
		const inicio = (page - 1) * pageSize + 1;
		const fin = Math.min(page * pageSize, total);

		paginacionInfo.textContent = total === 0 ? '0-0 de 0' : `${inicio}-${fin} de ${total}`;

		if (btnPrev) btnPrev.disabled = page <= 1;
		if (btnNext) btnNext.disabled = page >= totalPaginas;
	},

	formatearFecha(fecha) {
		if (!fecha) return '';
		try {
			// AvisosController devuelve fechas como "yyyy-MM-dd HH:mm" (sin 'T').
			// Normalizamos a un formato que Date() acepta bien: reemplazamos el espacio por 'T'.
			let f = String(fecha).trim();
			if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(f)) {
				f = f.replace(' ', 'T');
			}
			const d = new Date(f);
			if (isNaN(d.getTime())) return fecha;
			return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
		} catch { return fecha; }
	}
};

// Operaciones de datos (solo lectura)
const DataOperationsVer = {
	async cargarAvisos() {
		const loader = document.getElementById('tablaLoader');
		if (loader) loader.style.display = 'block';
		try {
			const params = new URLSearchParams({
				page: VerAvisosModule.estado.page.toString(),
				pageSize: VerAvisosModule.estado.pageSize.toString(),
				sort: VerAvisosModule.estado.sort,
				dir: VerAvisosModule.estado.dir
			});

			if (VerAvisosModule.estado.desde) params.append('desde', VerAvisosModule.estado.desde);
			if (VerAvisosModule.estado.hasta) params.append('hasta', VerAvisosModule.estado.hasta);
			if (VerAvisosModule.estado.asunto) params.append('asunto', VerAvisosModule.estado.asunto);

			const url = `${API_CONFIG_VER.endpoints.avisos}?${params.toString()}`;
			const data = await NetworkUtilsVer.safeFetch(url);

			let avisos = [];
			let total = 0;
			let page = VerAvisosModule.estado.page;
			let pageSize = VerAvisosModule.estado.pageSize;

			if (Array.isArray(data)) {
				avisos = data;
				total = data.length;
			} else if (data && typeof data === 'object') {
				avisos = data.items || data.avisos || [];
				total = data.total || avisos.length;
				page = data.page || page;
				pageSize = data.pageSize || pageSize;
			}

			VerAvisosModule.avisos = avisos;
			UIUpdaterVer.renderizarTabla();
			UIUpdaterVer.renderizarPaginacion(total, page, pageSize);
			NotificationVer.show(`Se cargaron ${avisos.length} avisos`, 'success');
		} catch (error) {
			console.error('Error cargando avisos:', error);
			UIUpdaterVer.renderizarTabla();
			NotificationVer.show(error.message || 'Error al cargar avisos', 'error');
		} finally {
			if (loader) loader.style.display = 'none';
		}
	}
};

// Gestión de filtros y eventos
const EventManagerVer = {
	init() {
		this.setupFilterEvents();
		this.setupPaginationEvents();
		this.setupSortEvents();
		this.setupRefreshEvents();
		this.setupLeerMasEvents();
	},

	setupLeerMasEvents() {
		const tabla = document.getElementById('tablaAvisos');
		const modalLeerMas = document.getElementById('modalLeerMasAviso');
		const modalContenido = document.getElementById('modalLeerMasAvisoContenido');
		const btnCerrar = document.getElementById('btnCerrarLeerMasAviso');
		const btnCerrarFooter = document.getElementById('btnCerrarLeerMasAvisoFooter');

		function abrirLeerMas(texto, titulo = 'Leer más') {
			if (!modalLeerMas || !modalContenido) return;
			const tituloEl = document.getElementById('modalLeerMasAvisoTitulo');
			if (tituloEl) tituloEl.textContent = titulo;
			modalContenido.textContent = texto || '';
			modalLeerMas.style.display = 'flex';
			document.body.style.overflow = 'hidden';
		}

		function cerrarLeerMas() {
			if (!modalLeerMas) return;
			modalLeerMas.style.display = 'none';
			document.body.style.overflow = '';
			if (modalContenido) modalContenido.textContent = '';
		}

		if (btnCerrar) btnCerrar.addEventListener('click', cerrarLeerMas);
		if (btnCerrarFooter) btnCerrarFooter.addEventListener('click', cerrarLeerMas);
		if (modalLeerMas) {
			modalLeerMas.addEventListener('click', (e) => {
				if (e.target === modalLeerMas) cerrarLeerMas();
			});
		}

		if (!tabla) return;
		tabla.addEventListener('click', (e) => {
			let el = e.target;
			while (el && el !== tabla && el.nodeName !== 'TD') el = el.parentElement;
			if (!el || el === tabla) return;
			if (el.classList && el.classList.contains('js-leer-mas')) {
				abrirLeerMas(el.textContent || el.innerText || '', 'Leer más');
			}
		});
	},

	setupFilterEvents() {
		const btnBuscar = document.getElementById('btnBuscar');
		const btnLimpiar = document.getElementById('btnLimpiar');

		if (btnBuscar) btnBuscar.addEventListener('click', () => {
			const filtroAsunto = document.getElementById('filtroAsunto');
			const filtroDesde = document.getElementById('filtroDesde');
			const filtroHasta = document.getElementById('filtroHasta');

			VerAvisosModule.estado.asunto = filtroAsunto ? filtroAsunto.value.trim() : '';
			VerAvisosModule.estado.desde = filtroDesde ? filtroDesde.value.trim() : '';
			VerAvisosModule.estado.hasta = filtroHasta ? filtroHasta.value.trim() : '';
			VerAvisosModule.estado.page = 1;
			DataOperationsVer.cargarAvisos();
		});

		if (btnLimpiar) btnLimpiar.addEventListener('click', () => {
			const filtroAsunto = document.getElementById('filtroAsunto');
			const filtroDesde = document.getElementById('filtroDesde');
			const filtroHasta = document.getElementById('filtroHasta');

			if (filtroAsunto) filtroAsunto.value = '';
			if (filtroDesde) filtroDesde.value = '';
			if (filtroHasta) filtroHasta.value = '';

			VerAvisosModule.estado.asunto = '';
			VerAvisosModule.estado.desde = '';
			VerAvisosModule.estado.hasta = '';
			VerAvisosModule.estado.page = 1;
			DataOperationsVer.cargarAvisos();
		});

		// Enter en campos para buscar
		['filtroAsunto','filtroDesde','filtroHasta'].forEach(id => {
			const el = document.getElementById(id);
			if (el) el.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					const btn = document.getElementById('btnBuscar');
					if (btn) btn.click();
				}
			});
		});
	},

	setupPaginationEvents() {
		const btnPrev = document.getElementById('btnPrev');
		const btnNext = document.getElementById('btnNext');

		if (btnPrev) btnPrev.addEventListener('click', () => {
			if (VerAvisosModule.estado.page > 1) {
				VerAvisosModule.estado.page--;
				DataOperationsVer.cargarAvisos();
			}
		});

		if (btnNext) btnNext.addEventListener('click', () => {
			VerAvisosModule.estado.page++;
			DataOperationsVer.cargarAvisos();
		});
	},

	setupSortEvents() {
		const selSort = document.getElementById('selSort');
		const selDir = document.getElementById('selDir');

		if (selSort) selSort.addEventListener('change', (e) => {
			VerAvisosModule.estado.sort = e.target.value;
			VerAvisosModule.estado.page = 1;
			DataOperationsVer.cargarAvisos();
		});

		if (selDir) selDir.addEventListener('change', (e) => {
			VerAvisosModule.estado.dir = e.target.value;
			VerAvisosModule.estado.page = 1;
			DataOperationsVer.cargarAvisos();
		});
	},

	setupRefreshEvents() {
		const btnRefrescar = document.getElementById('btnRefrescar');
		if (btnRefrescar) btnRefrescar.addEventListener('click', () => DataOperationsVer.cargarAvisos());
	}
};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
	EventManagerVer.init();
	await DataOperationsVer.cargarAvisos();
});

