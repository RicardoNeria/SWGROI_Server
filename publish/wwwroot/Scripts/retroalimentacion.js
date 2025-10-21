/**
 * RETROALIMENTACIÓN.JS - Lógica de Negocio
 * Módulo de Retroalimentación CCC - SWGROI
 * Solo maneja la lógica del módulo, sin estilos ni estructura HTML
 */

(function() {
    'use strict';

    // ================================
    // VARIABLES Y CONFIGURACIÓN
    // ================================
    // Proveer wrapper global de toast para Retro: delega a ToastPremium si está disponible
    if (typeof window.showRetroToast !== 'function') {
        window.showRetroToast = function(message, type = 'info', options = {}) {
            try {
                if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
                    const { duration = (type === 'error' ? 5000 : 3000) } = options || {};
                    window.ToastPremium.show(String(message || ''), String(type || 'info'), { duration });
                    return;
                }
            } catch (e) { /* ignore */ }
            // Fallback suave
            console[(type === 'error' ? 'warn' : 'log')](String(message || ''));
        };
    }
    
    let estadoFormulario = {
        cargado: false,
        token: null,
        retroId: null,
        cliente: '',
        folio: '',
        contestada: false,
        preguntas: [],
        respuestas: {}
    };

    // último porcentaje mostrado (para evitar anunciar repetidamente)
    estadoFormulario.lastProgressPct = null;

    let elementos = {};
    
    // ================================
    // INICIALIZACIÓN
    // ================================
    
    document.addEventListener('DOMContentLoaded', function() {
        inicializarElementos();
        obtenerToken();
        cargarFormulario();
        // Cargar panel dev si se solicita
        loadExampleFromJSON();
        // Si estamos en la vista de encuesta, forzar ocultar scroll del documento
        try {
            if (document.body && document.body.classList.contains('ui-layout--survey')) {
                // ocultar overflow en html y body para quitar la scrollbar global
                document.documentElement.style.overflow = 'hidden';
                document.body.style.overflow = 'hidden';
                // Restaurar al salir de la página (por si se navega internamente)
                window.addEventListener('beforeunload', () => {
                    document.documentElement.style.overflow = '';
                    document.body.style.overflow = '';
                });
            }
        } catch (e) { console.warn('No se pudo ajustar scroll del documento', e); }
    });

    function inicializarElementos() {
        elementos = {
            leyenda: document.getElementById('leyenda'),
            seccionCargando: document.getElementById('seccionCargando'),
            seccionCliente: document.getElementById('seccionCliente'),
            seccionExito: document.getElementById('seccionExito'),
            seccionError: document.getElementById('seccionError'),
            infoCliente: document.getElementById('infoCliente'),
            formRespuestas: document.getElementById('formRespuestas'),
            preguntasContainer: document.getElementById('preguntasContainer'),
            btnEnviar: document.getElementById('btnEnviar'),
            btnCerrarFormulario: document.getElementById('btnCerrarFormulario'),
            mensajeError: document.getElementById('mensajeError')
        };
    }

    function obtenerToken() {
        const urlParams = new URLSearchParams(window.location.search);
        estadoFormulario.token = urlParams.get('t');
        
        if (!estadoFormulario.token) {
            mostrarError('Token no proporcionado. Verifique el enlace recibido.');
            return;
        }
    }

    // ================================
    // CARGA DE FORMULARIO
    // ================================
    
    async function cargarFormulario() {
        if (!estadoFormulario.token) {
            return;
        }

        mostrarSeccion('seccionCargando');
        
        try {
            const response = await fetch(`/retroalimentacion?op=form&token=${encodeURIComponent(estadoFormulario.token)}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar formulario');
            }

            procesarDatosFormulario(data);
            
        } catch (error) {
            console.error('Error cargando formulario:', error);
            mostrarError(error.message || 'Error de conexión');
        }
    }

    function procesarDatosFormulario(data) {
        estadoFormulario.retroId = data.retroId;
        estadoFormulario.cliente = data.cliente || '';
        estadoFormulario.folio = data.folio || '';
        estadoFormulario.contestada = data.contestada || false;
        estadoFormulario.preguntas = data.preguntas || [];
        estadoFormulario.cargado = true;

        // Actualizar badges si existen en DOM
        const badgeC = document.getElementById('badgeCliente');
        const badgeF = document.getElementById('badgeFolio');
        if (badgeC) badgeC.textContent = estadoFormulario.cliente || '—';
        if (badgeF) badgeF.textContent = estadoFormulario.folio || '—';

        if (estadoFormulario.contestada) {
            // Si ya fue contestada, mostrar mensaje adecuado y ocultar notas de llamada a contestar
            actualizarInfoCliente();
            mostrarSeccion('seccionCliente');
            mostrarEncuestaContestada();
            return;
        }

        // Normal flow when not contestada
        actualizarInfoCliente();
        // normalize preguntas to plain strings to avoid '[object Object]'
        estadoFormulario.preguntas = (estadoFormulario.preguntas || []).map(p => normalizePreguntaText(p));
        generarPreguntas();
        configurarEventos();
        // Inicializar barra de progreso según respuestas (si ya existen)
        updateProgressBar();
        // mostrar leyendas de obligatorio y nota
        mostrarLeyendaObligatoria(true);
        mostrarSeccion('seccionCliente');
    }

    function normalizePreguntaText(p) {
        if (p == null) return '';
        if (typeof p === 'string') return p;
        if (typeof p === 'object') {
            // buscar propiedades comunes
            // Soporte para backend que usa 'texto' como clave
            if (p.text) return String(p.text);
            if (p.texto) return String(p.texto);
            if (p.label) return String(p.label);
            if (p.pregunta) return String(p.pregunta);
            if (p.descripcion) return String(p.descripcion);
            // buscar en propiedades anidadas comunes (ej. p.data.texto)
            for (const key of ['data', 'detalle', 'meta']) {
                if (p[key] && typeof p[key] === 'object') {
                    const nested = p[key];
                    if (nested.text) return String(nested.text);
                    if (nested.texto) return String(nested.texto);
                    if (nested.label) return String(nested.label);
                    if (nested.pregunta) return String(nested.pregunta);
                    if (nested.descripcion) return String(nested.descripcion);
                }
            }
            // fallback a JSON stringify (mejor que [object Object])
            try { return JSON.stringify(p); } catch (e) { return String(p); }
        }
        return String(p);
    }

    // Dev helper: si la URL contiene ?debug=1, mostrar un panel para pegar JSON de ejemplo
    function loadExampleFromJSON() {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('debug') !== '1') return;

            const devPanel = document.createElement('div');
            devPanel.className = 'dev-panel';
            devPanel.innerHTML = '<label style="font-weight:600">JSON de ejemplo para preguntas (debug)</label>' +
                '<textarea id="devJson">[{"numero":1,"texto":"¿Cómo califica la atención brindada por nuestro operador CCC?","tipo":"escala"},{"numero":5,"texto":"Comentarios adicionales","tipo":"texto"}]</textarea>' +
                '<div class="dev-actions"><button id="devLoad" class="ui-button ui-button--secondary">Cargar ejemplo</button></div>';

            const card = document.querySelector('.ui-card--form');
            if (card) card.insertBefore(devPanel, card.firstChild.nextSibling);

            document.getElementById('devLoad').addEventListener('click', () => {
                const txt = document.getElementById('devJson').value;
                try {
                    const parsed = JSON.parse(txt);
                    estadoFormulario.preguntas = parsed.map(p => normalizePreguntaText(p));
                    generarPreguntas();
                    configurarEventos();
                    updateProgressBar();
                    mostrarLeyendaObligatoria(true);
                } catch (e) {
                    showRetroToast('JSON inválido: ' + e.message, 'error');
                }
            });
        } catch (e) { console.warn('Dev panel init error', e); }
    }

    function mostrarLeyendaObligatoria(mostrar) {
        const ley = document.getElementById('leyendaObligatoria');
        const nota = document.getElementById('retroNota');
        if (ley) ley.style.display = mostrar ? 'block' : 'none';
        if (nota) nota.style.display = mostrar ? 'block' : 'none';
    }

    function mostrarEncuestaContestada() {
        // Eliminar leyendas duplicadas para evitar textos repetidos al consultar
        eliminarLeyendasDuplicadas();

        // ocultar leyenda de obligatorio/nota
        mostrarLeyendaObligatoria(false);

        // Preferimos mostrar la sección de éxito con un diseño más rico
        const seccion = document.getElementById('seccionExito');
        const form = document.getElementById('formRespuestas');
        if (form) form.style.display = 'none';
        if (seccion) {
            // Mostrar una sección de éxito minimal: sin imagen, sin barra de progreso y sin botones internos.
            seccion.style.display = 'block';
            seccion.className = 'ui-card retro-exito retro-card-spacing';

            const cliente = estadoFormulario.cliente ? `<div class="retro-exito__meta">Cliente: <strong>${sanitizarTexto(estadoFormulario.cliente)}</strong></div>` : '';
            const folio = estadoFormulario.folio ? `<div class="retro-exito__meta">Folio: <strong>${sanitizarTexto(estadoFormulario.folio)}</strong></div>` : '';

            seccion.innerHTML = `
                <div style="display:flex; gap:1rem; align-items:center;">
                    <div style="flex:1">
                        <h3 class="retro-exito__titulo">¡Gracias! Encuesta recibida</h3>
                        <p class="retro-exito__mensaje">Hemos registrado su opinión correctamente. Su retroalimentación nos ayuda a mejorar el servicio.</p>
                        ${cliente}
                        ${folio}
                    </div>
                </div>
            `;

            // Ocultar elementos de la cabecera/información que no deben mostrarse cuando se consulta una encuesta ya contestada
            try {
                    const info = document.getElementById('infoCliente'); if (info) info.style.display = 'none';
                    // Ocultar badges/metadata (cliente/folio) que aparecen en la cabecera
                    const meta = document.querySelector('.ui-card__meta'); if (meta) meta.style.display = 'none';
                    const badgeC = document.getElementById('badgeCliente'); if (badgeC) badgeC.style.display = 'none';
                    const badgeF = document.getElementById('badgeFolio'); if (badgeF) badgeF.style.display = 'none';
                    const progressRow = document.querySelector('.retro-progress-row'); if (progressRow) progressRow.style.display = 'none';
                    const progressContainer = document.getElementById('progressContainer'); if (progressContainer) progressContainer.style.display = 'none';
                    const progressMeta = document.querySelector('.retro-progress__meta'); if (progressMeta) progressMeta.style.display = 'none';
                    // Asegurar que el formulario y botones de envío no estén visibles
                    const acciones = document.querySelector('.retro-acciones'); if (acciones) acciones.style.display = 'none';
            // Ocultar el botón de cerrar del header en la vista de consulta
            try { if (elementos.btnCerrarFormulario) elementos.btnCerrarFormulario.style.display = 'none'; } catch (e) { /* ignore */ }
            } catch (e) { console.warn('No se pudieron ocultar algunos elementos de la UI al mostrar encuesta contestada', e); }
        // Añadir un único botón de cierre funcional en la sección de éxito
        try { agregarBotonCerrarEnExito(); } catch (e) { /* ignore */ }
        }
    }

    function eliminarLeyendasDuplicadas() {
        try {
            const seen = new Set();
            // Seleccionamos nodos que típicamente contienen leyendas repetidas
            const candidates = document.querySelectorAll('.ui-message, .ui-card__subtitle');
            candidates.forEach(node => {
                if (!node || !node.textContent) return;
                const txt = node.textContent.trim().replace(/\s+/g, ' ');
                if (!txt) return;
                if (seen.has(txt)) {
                    // eliminar nodo duplicado
                    node.parentNode && node.parentNode.removeChild(node);
                } else {
                    seen.add(txt);
                }
            });
        } catch (e) { console.warn('Error eliminando leyendas duplicadas', e); }
    }

    // Actualiza la barra de progreso según las preguntas contestadas
    function updateProgressBar() {
        const THRESHOLD_IN_BAR = 40; // porcentaje mínimo para mostrar dentro de la barra
        const progress = document.getElementById('progressBar');
        const progressContainer = document.getElementById('progressContainer');
        const progressPct = document.getElementById('progressPct');
        const progressCount = document.getElementById('progressCount');
        const progressMeta = document.querySelector('.retro-progress__meta');
        const progressBarLabel = document.getElementById('progressBarLabel');
        if (!progress || !estadoFormulario.preguntas) return;
        const total = estadoFormulario.preguntas.length || 0;
        if (total === 0) {
            progress.style.width = '0%';
            if (progressContainer) progressContainer.setAttribute('aria-valuenow', '0');
            if (progressPct) progressPct.textContent = '0%';
            if (progressCount) progressCount.textContent = '0/0';
            return;
        }
        let answered = 0;
        for (let i = 1; i <= total; i++) {
            if (i <= 4) {
                const radio = document.querySelector(`input[name="r${i}"]:checked`);
                if (radio) answered++;
            } else {
                const ta = document.querySelector(`textarea[name="r${i}"]`);
                if (ta && ta.value.trim() !== '') answered++;
            }
        }
    const pct = Math.round((answered / total) * 100);
        progress.style.width = pct + '%';

        // ARIA: establecer valores en el contenedor role=progressbar
        if (progressContainer) {
            progressContainer.setAttribute('aria-valuenow', String(pct));
            progressContainer.setAttribute('aria-valuemin', '0');
            progressContainer.setAttribute('aria-valuemax', '100');
            // label accesible descriptivo
            progressContainer.setAttribute('aria-label', `Has respondido ${answered} de ${total} preguntas, ${pct} por ciento`);
        }

        // Actualizar meta lateral (contador y pct lateral)
        if (progressPct) {
            // animación ligera: scale
            progressPct.style.transform = 'scale(0.92)';
            progressPct.textContent = pct + '%';
            setTimeout(() => { progressPct.style.transform = ''; }, 300);
        }
        if (progressCount) progressCount.textContent = `${answered}/${total}`;

        // Mostrar el porcentaje dentro de la barra cuando pase cierto umbral para mejorar legibilidad
        try {
            const showInBar = pct >= THRESHOLD_IN_BAR;
            if (progressBarLabel) {
                progressBarLabel.textContent = pct + '%';
                // toggle visibility classes (CSS controla la opacidad/transform)
                if (showInBar) {
                    if (progressMeta) progressMeta.classList.add('retro-progress__meta--hidden');
                    progressBarLabel.classList.remove('retro-progress__bar-label--hidden');
                    // añadir clase visible para animación
                    progressBarLabel.classList.add('retro-progress__bar-label--visible');
                    progressBarLabel.setAttribute('aria-hidden', 'false');
                } else {
                    if (progressMeta) progressMeta.classList.remove('retro-progress__meta--hidden');
                    progressBarLabel.classList.add('retro-progress__bar-label--hidden');
                    progressBarLabel.classList.remove('retro-progress__bar-label--visible');
                    progressBarLabel.setAttribute('aria-hidden', 'true');
                }
            }
        } catch (e) {
            // No crítico; continuar sin fallback
            console.warn('Progress label toggle error', e);
        }

        // Region aria-live para anunciar el progreso (solo cuando cambia)
        try {
            let live = document.getElementById('progressLive');
            if (!live) {
                live = document.createElement('div');
                live.id = 'progressLive';
                live.setAttribute('aria-live', 'polite');
                live.setAttribute('aria-atomic', 'true');
                // visually hidden
                live.style.position = 'absolute';
                live.style.width = '1px';
                live.style.height = '1px';
                live.style.margin = '-1px';
                live.style.border = '0';
                live.style.padding = '0';
                live.style.overflow = 'hidden';
                live.style.clip = 'rect(0 0 0 0)';
                const container = document.querySelector('.ui-card--form') || document.body;
                container.appendChild(live);
            }
            if (estadoFormulario.lastProgressPct !== pct) {
                // anunciar solo si cambió
                live.textContent = `Has respondido ${answered} de ${total} preguntas, ${pct} por ciento.`;
                estadoFormulario.lastProgressPct = pct;
            }
        } catch (e) { console.warn('Progress live region error', e); }
    }

    function actualizarInfoCliente() {
        if (elementos.infoCliente) {
            // Si el elemento contiene ya una leyenda estática (texto explícito del HTML), no la sobreescribimos
            const contenidoActual = elementos.infoCliente.getAttribute('data-original') || elementos.infoCliente.textContent || '';
            if (contenidoActual && contenidoActual.trim() !== '') {
                // Guardar original si no está guardado
                if (!elementos.infoCliente.getAttribute('data-original')) {
                    elementos.infoCliente.setAttribute('data-original', contenidoActual.trim());
                }
                // No sobrescribimos la leyenda estática colocada en HTML
                return;
            }

            // Si no hay leyenda estática, construimos una desde los datos recibidos
            let texto = 'Evaluación de servicio CCC';
            if (estadoFormulario.folio) {
                texto += ` - Ticket: ${estadoFormulario.folio}`;
            }
            if (estadoFormulario.cliente) {
                texto += ` - Cliente: ${estadoFormulario.cliente}`;
            }
            elementos.infoCliente.textContent = texto;
        }
    }

    // ================================
    // GENERACIÓN DE PREGUNTAS
    // ================================
    
    function generarPreguntas() {
        if (!elementos.preguntasContainer || !estadoFormulario.preguntas.length) {
            return;
        }

        elementos.preguntasContainer.innerHTML = '';

        estadoFormulario.preguntas.forEach((pregunta, index) => {
            const esPreguntaEscala = index < 4; // Las primeras 4 son de escala 1-5
            const preguntaDiv = crearElementoPregunta(pregunta, index + 1, esPreguntaEscala);
            elementos.preguntasContainer.appendChild(preguntaDiv);
        });
    }

    function crearElementoPregunta(texto, numero, esEscala) {
        const preguntaDiv = document.createElement('div');
        preguntaDiv.className = 'retro-pregunta';

        // Cabecera de la pregunta con número y texto
        const header = document.createElement('div');
        header.className = 'retro-pregunta__header';

        const numeroSpan = document.createElement('div');
        numeroSpan.className = 'retro-pregunta__numero';
        numeroSpan.textContent = String(numero);

        const titulo = document.createElement('div');
        titulo.className = 'retro-pregunta__texto';
        // usar sanitizarTexto para evitar inyección y marcar la pregunta en negritas
        try {
            titulo.innerHTML = '<strong>' + sanitizarTexto(String(texto).trim()) + '</strong>';
        } catch (e) {
            titulo.textContent = String(texto).trim();
        }

        header.appendChild(numeroSpan);
        header.appendChild(titulo);
        preguntaDiv.appendChild(header);

        const respuestaDiv = document.createElement('div');
        respuestaDiv.className = 'retro-respuesta';

        if (esEscala) {
            respuestaDiv.appendChild(crearEscala(numero));
        } else {
            respuestaDiv.appendChild(crearTextarea(numero));
        }

        preguntaDiv.appendChild(respuestaDiv);
        return preguntaDiv;
    }

    function crearEscala(numeroPregunta) {
        const escalaDiv = document.createElement('div');
        escalaDiv.className = 'retro-escala';

        const opciones = [
            { valor: '1', etiqueta: 'Muy malo' },
            { valor: '2', etiqueta: 'Malo' },
            { valor: '3', etiqueta: 'Regular' },
            { valor: '4', etiqueta: 'Bueno' },
            { valor: '5', etiqueta: 'Excelente' }
        ];

        opciones.forEach(opcion => {
            const opcionDiv = document.createElement('div');
            opcionDiv.className = 'retro-escala__opcion';

            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `r${numeroPregunta}`;
            radio.value = opcion.valor;
            radio.className = 'retro-escala__radio';
            radio.id = `r${numeroPregunta}_${opcion.valor}`;
            radio.required = true;

            const label = document.createElement('label');
            label.htmlFor = radio.id;
            label.className = 'retro-escala__label';
            label.textContent = opcion.etiqueta;

            opcionDiv.appendChild(radio);
            opcionDiv.appendChild(label);
            escalaDiv.appendChild(opcionDiv);
        });

        return escalaDiv;
    }

    function crearTextarea(numeroPregunta) {
        const textarea = document.createElement('textarea');
        textarea.name = `r${numeroPregunta}`;
        textarea.id = `r${numeroPregunta}`;
        textarea.className = 'ui-form__textarea';
        textarea.placeholder = 'Sus comentarios son importantes para nosotros...';
        textarea.maxLength = 1000;
        textarea.rows = 4;

        return textarea;
    }

    // ================================
    // EVENTOS Y VALIDACIONES
    // ================================
    
    function configurarEventos() {
        if (elementos.formRespuestas) {
            elementos.formRespuestas.addEventListener('submit', manejarEnvio);
        }

        // Cerrar formulario (en header): solo si ya fue contestada
        try {
            if (elementos.btnCerrarFormulario) {
                elementos.btnCerrarFormulario.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (estadoFormulario && estadoFormulario.contestada) {
                        try { window.close ? window.close() : window.history.back(); } catch (err) { window.history.back(); }
                    } else {
                        mostrarMensaje('Debe contestar la encuesta antes de cerrar el formulario.', 'warning');
                    }
                });
            }
        } catch (e) { console.warn('No se pudo enlazar btnCerrarFormulario', e); }

        // Validación en tiempo real
        const inputs = elementos.preguntasContainer.querySelectorAll('input[type="radio"], textarea');
        inputs.forEach(input => {
            input.addEventListener('change', validarCampo);
            input.addEventListener('input', validarCampo);
            // Actualizar barra de progreso cuando cambian las respuestas
            input.addEventListener('change', updateProgressBar);
            input.addEventListener('input', updateProgressBar);
        });

        // Refrescar campos (nuevo comportamiento del antiguo 'Volver')
        try {
            const btnRefrescar = document.getElementById('btnCancelar');
            if (btnRefrescar) {
                btnRefrescar.addEventListener('click', (e) => {
                    e.preventDefault();
                    limpiarRespuestas();
                    mostrarMensaje('Campos reiniciados', 'info');
                });
            }
        } catch (e) { console.warn('No se pudo enlazar btnCancelar', e); }
    }

    function validarCampo(event) {
        // La validación ahora se maneja por el RetroalimentacionValidator
        // Este método se mantiene para compatibilidad pero delega al validador centralizado
        const campo = event.target;
        
        if (window.RetroalimentacionValidator) {
            window.RetroalimentacionValidator.validateField(campo.name, campo.value);
        }
    }

    // ================================
    // ENVÍO DE RESPUESTAS
    // ================================
    
    async function manejarEnvio(event) {
        event.preventDefault();
        
        // NUEVA INTEGRACIÓN: Usar el validador centralizado
        if (!window.RetroalimentacionValidator) {
            console.error('Validador no disponible');
            showRetroToast('Error: Sistema de validación no disponible', 'error');
            return;
        }

        // Validar usando el sistema centralizado
        if (!window.RetroalimentacionValidator.validarFormularioRetro(elementos.formRespuestas)) {
            // El validador ya mostró los mensajes de error via Toast
            return;
        }

        deshabilitarFormulario(true);
        mostrarProcesando();

        try {
            const respuestas = recopilarRespuestas();
            await enviarRespuestas(respuestas);
            // marcar como contestada y mostrar éxito
            estadoFormulario.contestada = true;

            // NUEVA INTEGRACIÓN: Usar Toast para éxito
            showRetroToast('¡Respuestas enviadas exitosamente!', 'success', {
                title: 'Envío completado',
                duration: 3000
            });

            // Mostrar texto de enviado y estado visual inmediatamente
            if (elementos.btnEnviar) {
                try {
                    elementos.btnEnviar.disabled = true;
                    // Mantener icono y texto claros
                    elementos.btnEnviar.innerHTML = '<span class="ui-button__icon" data-icon="confirm"></span>Enviado';
                } catch (e) { /* ignore */ }
            }

            // Intentar cerrar inmediatamente la ventana (sin redirección).
            try { window.close && window.close(); } catch (e) { /* ignore */ }

            // Si el navegador bloquea el cierre, mostramos la sección de éxito persistente
            // y añadimos un botón para que el usuario cierre manualmente.
            setTimeout(() => {
                if (typeof window.closed === 'boolean' && !window.closed) {
                    mostrarExito();
                    agregarBotonCerrarEnExito();
                }
            }, 700);
            
        } catch (error) {
            console.error('Error enviando respuestas:', error);
            
            // NUEVA INTEGRACIÓN: Usar Toast para errores
            showRetroToast(error.message || 'Error al enviar respuestas', 'error', {
                title: 'Error de envío',
                duration: 5000
            });
            
            deshabilitarFormulario(false);
        }
    }

    // ================================
    // ENVÍO DE RESPUESTAS
    // ================================

    // ================================
    // RECOPILACIÓN Y ENVÍO DE DATOS
    // ================================

    function recopilarRespuestas() {
        const respuestas = {};
        
        for (let i = 1; i <= 5; i++) {
            if (i <= 4) {
                // Preguntas de escala
                const radio = document.querySelector(`input[name="r${i}"]:checked`);
                respuestas[`r${i}`] = radio ? radio.value : '';
            } else {
                // Pregunta de texto
                const textarea = document.querySelector(`textarea[name="r${i}"]`);
                respuestas[`r${i}`] = textarea ? textarea.value.trim() : '';
            }
        }
        
        return respuestas;
    }

    async function enviarRespuestas(respuestas) {
        const response = await fetch(`/retroalimentacion?op=responder&token=${encodeURIComponent(estadoFormulario.token)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(respuestas)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al enviar respuestas');
        }

        return data;
    }

    // ================================
    // INTERFAZ Y MENSAJES
    // ================================
    
    function mostrarSeccion(seccionId) {
        // Ocultar todas las secciones
        Object.keys(elementos).forEach(key => {
            if (key.startsWith('seccion') && elementos[key]) {
                elementos[key].style.display = 'none';
            }
        });

        // Mostrar la sección solicitada
        if (elementos[seccionId]) {
            elementos[seccionId].style.display = 'block';
        }
    }

    function mostrarError(mensaje) {
        // NUEVA INTEGRACIÓN: Usar Toast preferentemente
        if (window.showRetroToast) {
            showRetroToast(mensaje, 'error', {
                title: 'Error',
                duration: 6000
            });
        } else {
            // Fallback al sistema unificado si está disponible
            if (window.SWGROI && window.SWGROI.UI) {
                window.SWGROI.UI.mostrarMensaje(mensaje, 'error', elementos.leyenda);
            }
        }
        
        // Fallback específico del módulo
        if (elementos.mensajeError) {
            elementos.mensajeError.textContent = mensaje;
        }
        mostrarSeccion('seccionError');
    }

    function mostrarExito() {
        // Mostrar la sección de éxito y aclarar que la ventana se cerrará inmediatamente
        mostrarSeccion('seccionExito');
        try {
            const seccion = elementos.seccionExito;
            if (seccion) {
                // Añadir nota informativa si no existe
                if (!seccion.querySelector('.retro-exito__nota-cierre')) {
                    const nota = document.createElement('div');
                    nota.className = 'retro-exito__nota-cierre';
                    nota.style.marginTop = '0.5rem';
                    nota.style.color = 'var(--ui-color-texto-muted)';
                    nota.textContent = 'La ventana se cerrará.';
                    seccion.appendChild(nota);
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Intenta cerrar la ventana de forma inmediata con fallbacks (recurso compartido)
    function closeWindowImmediate() {
        try { window.close(); } catch (err) { /* ignore */ }
        setTimeout(() => {
            try {
                if (!window.closed) {
                    window.open('', '_self');
                    window.close();
                }
            } catch (err) { /* ignore */ }
        }, 150);
        setTimeout(() => {
            try {
                if (!window.closed) {
                    window.location.href = 'about:blank';
                }
            } catch (err) { /* ignore */ }
        }, 450);
    }

    function agregarBotonCerrarEnExito() {
        try {
            const seccion = elementos.seccionExito;
            if (!seccion) return;

            // Evitar duplicados
            if (seccion.querySelector('.retro-exito__cerrar')) return;

            const acciones = document.createElement('div');
            acciones.className = 'retro-exito__acciones';
            acciones.style.marginTop = '1rem';

            const botonCerrar = document.createElement('button');
            botonCerrar.type = 'button';
            botonCerrar.className = 'ui-button ui-button--primary retro-exito__cerrar';
            botonCerrar.textContent = 'Cerrar';
            botonCerrar.addEventListener('click', () => {
                closeWindowImmediate();
            });

            acciones.appendChild(botonCerrar);
            seccion.appendChild(acciones);
        } catch (e) {
            console.warn('No se pudo agregar boton de cierre en seccionExito', e);
        }
    }

    function mostrarYaContestada() {
        mostrarError('Esta encuesta ya fue contestada anteriormente. Gracias por su participación.');
    }

    function mostrarMensaje(mensaje, tipo = 'info') {
        // Preferir ToastPremium/showRetroToast
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            try { window.ToastPremium.show(String(mensaje || ''), String(tipo || 'info'), { duration: (tipo === 'error' ? 5000 : 3000) }); return; } catch (e) {}
        }
        if (typeof window.showRetroToast === 'function') {
            showRetroToast(mensaje, tipo, { duration: tipo === 'error' ? 5000 : 3000 });
            return;
        }
        
        // Fallback al sistema unificado si está disponible
        if (window.SWGROI && window.SWGROI.UI) {
            return window.SWGROI.UI.mostrarMensaje(mensaje, tipo, elementos.leyenda);
        }
        
        // Fallback para compatibilidad (código simplificado)
        if (!elementos.leyenda) return;
        
        elementos.leyenda.textContent = mensaje;
        elementos.leyenda.className = `ui-message ui-message--${tipo} ui-message--visible`;
        elementos.leyenda.style.display = 'flex';
    }

    function mostrarProcesando() {
        if (elementos.btnEnviar) {
            try {
                const iconEl = elementos.btnEnviar.querySelector('.ui-button__icon');
                if (iconEl) {
                    // cambiar a icono de envío
                    iconEl.setAttribute('data-icon', 'send');
                }
                // Reemplazo seguro del texto visible (fallback si no coincide exacto)
                if (elementos.btnEnviar.textContent && elementos.btnEnviar.textContent.includes('Enviar')) {
                    elementos.btnEnviar.innerHTML = (iconEl ? iconEl.outerHTML : '') + 'Enviando...';
                } else {
                    elementos.btnEnviar.innerHTML = (iconEl ? iconEl.outerHTML : '') + 'Enviando...';
                }
            } catch (e) { console.warn('mostrarProcesando error', e); }
        }
    }

    function deshabilitarFormulario(deshabilitar) {
        const inputs = elementos.formRespuestas.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
            input.disabled = deshabilitar;
        });
    }

    // Limpia los campos de respuesta para permitir reingresar valores
    function limpiarRespuestas() {
        try {
            const radios = document.querySelectorAll('input[type="radio"]');
            radios.forEach(r => { r.checked = false; });
            const textareas = document.querySelectorAll('#preguntasContainer textarea');
            textareas.forEach(t => { t.value = ''; });
            // Restablecer botón enviar si fue deshabilitado
            if (elementos.btnEnviar) {
                elementos.btnEnviar.disabled = false;
                // Restaurar icono/texto usando data-icon en lugar de emoji
                const icon = elementos.btnEnviar.querySelector('.ui-button__icon');
                if (icon) {
                    icon.setAttribute('data-icon', 'send');
                }
                elementos.btnEnviar.innerHTML = (icon ? icon.outerHTML : '<span class="ui-button__icon" data-icon="send"></span>') + 'Enviar respuestas';
            }
            updateProgressBar();
        } catch (e) { console.warn('Error limpiando respuestas', e); }
    }

    // ================================
    // UTILIDADES
    // ================================
    
    function sanitizarTexto(texto) {
        if (!texto) return '';
        return texto.replace(/[<>\"'&]/g, function(match) {
            const chars = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return chars[match];
        });
    }

    // ================================
    // API PÚBLICA (opcional para debugging)
    // ================================
    
    window.RetroalimentacionModule = {
        getEstado: () => estadoFormulario,
        recargar: cargarFormulario,
        validar: () => window.RetroalimentacionValidator ? 
                      window.RetroalimentacionValidator.validarFormularioRetro(elementos.formRespuestas) : 
                      false
    };

})();