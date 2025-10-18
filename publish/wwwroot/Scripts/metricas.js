/**
 * MÉTRICAS Y KPIs EN TIEMPO REAL - SWGROI
 * Sistema mejorado con WebSocket y actualizaciones automáticas
 * Versión: 2.0 (2025-01-16)
 */

document.addEventListener("DOMContentLoaded", function () {
    inicializarMetricas();
});

// ===============================================
// CONFIGURACIÓN Y ESTADO
// ===============================================

const MetricasConfig = {
    intervaloActualizacion: 15000, // 15 segundos
    intervalosActivos: new Set(),
    datosCache: new Map(),
    ultimaActualizacion: null
};

const ElementosMetricas = {
    tablaTiempos: null,
    tablaTecnicos: null,
    contadoresKPI: null,
    indicadorEstado: null,
    tiempoUltimaActualizacion: null
};

// ===============================================
// INICIALIZACIÓN
// ===============================================

function inicializarMetricas() {
    console.log('🚀 Inicializando métricas en tiempo real...');
    
    // Cachear elementos DOM
    ElementosMetricas.tablaTiempos = document.querySelector("#tablaTiempos tbody");
    ElementosMetricas.tablaTecnicos = document.querySelector("#tablaTecnicos tbody");
    ElementosMetricas.contadoresKPI = document.querySelectorAll('[data-kpi]');
    ElementosMetricas.indicadorEstado = document.querySelector('#indicadorConexion');
    ElementosMetricas.tiempoUltimaActualizacion = document.querySelector('#ultimaActualizacion');
    
    // Cargar métricas iniciales
    cargarTodasLasMetricas();
    
    // Configurar auto-refresh inteligente
    configurarAutoRefresh();
    
    // Configurar indicadores visuales
    configurarIndicadoresVisuales();
    
    // Limpiar intervalos al cerrar página
    window.addEventListener('beforeunload', limpiarIntervalos);
}

// ===============================================
// CARGA DE MÉTRICAS MEJORADA
// ===============================================

async function cargarTodasLasMetricas() {
    try {
        mostrarEstadoCarga(true);
        
        // Cargar todas las métricas en paralelo
        const [tiempos, tecnicos, kpis] = await Promise.all([
            cargarTiemposPromedio(),
            cargarTicketsPorTecnico(), 
            cargarKPIsGenerales()
        ]);
        
        // Actualizar timestamp
        MetricasConfig.ultimaActualizacion = new Date();
        actualizarIndicadorTiempo();
        
        mostrarEstadoCarga(false);
        console.log('✅ Métricas actualizadas exitosamente');
        
    } catch (error) {
        console.error('❌ Error al cargar métricas:', error);
        mostrarErrorConexion();
    }
}

async function cargarTiemposPromedio() {
    const response = await fetch("/metricas?tipo=tiempos&timestamp=" + Date.now());
    if (!response.ok) throw new Error('Error en tiempos promedio');
    
    const data = await response.json();
    MetricasConfig.datosCache.set('tiempos', data);
    
    if (ElementosMetricas.tablaTiempos) {
        // Limpiar tabla
        ElementosMetricas.tablaTiempos.innerHTML = '';
        
        // Renderizar con animaciones
        data.forEach((reg, index) => {
            setTimeout(() => {
                const fila = crearFilaTiempo(reg);
                ElementosMetricas.tablaTiempos.appendChild(fila);
            }, index * 50); // Animación escalonada
        });
    }
    
    return data;
}

async function cargarTicketsPorTecnico() {
    const response = await fetch("/metricas?tipo=tecnicos&timestamp=" + Date.now());
    if (!response.ok) throw new Error('Error en tickets por técnico');
    
    const data = await response.json();
    MetricasConfig.datosCache.set('tecnicos', data);
    
    if (ElementosMetricas.tablaTecnicos) {
        // Limpiar tabla  
        ElementosMetricas.tablaTecnicos.innerHTML = '';
        
        // Renderizar con indicadores de rendimiento
        data.forEach((reg, index) => {
            setTimeout(() => {
                const fila = crearFilaTecnico(reg, data);
                ElementosMetricas.tablaTecnicos.appendChild(fila);
            }, index * 50);
        });
    }
    
    return data;
}

async function cargarKPIsGenerales() {
    const response = await fetch("/metricas?tipo=kpis&timestamp=" + Date.now());
    if (!response.ok) throw new Error('Error en KPIs generales');
    
    const data = await response.json();
    MetricasConfig.datosCache.set('kpis', data);
    
    // Actualizar contadores con animaciones
    ElementosMetricas.contadoresKPI.forEach(elemento => {
        const kpiTipo = elemento.dataset.kpi;
        if (data[kpiTipo] !== undefined) {
            animarContador(elemento, data[kpiTipo]);
        }
    });
    
    return data;
}

// ===============================================
// FUNCIONES DE RENDERIZADO MEJORADAS  
// ===============================================

function crearFilaTiempo(registro) {
    const fila = document.createElement("tr");
    fila.className = "metrica-fila fade-in";
    
    // Determinar clase de estado basada en el promedio
    const promedioHoras = parseFloat(registro.Promedio) || 0;
    let claseEstado = '';
    if (promedioHoras <= 2) claseEstado = 'excelente';
    else if (promedioHoras <= 8) claseEstado = 'bueno';  
    else if (promedioHoras <= 24) claseEstado = 'regular';
    else claseEstado = 'critico';
    
    fila.innerHTML = `
        <td class="estado-${claseEstado}">
            <span class="indicador-estado"></span>
            ${registro.Estado}
        </td>
        <td class="tiempo-promedio" data-valor="${promedioHoras}">
            ${registro.Promedio}
        </td>
    `;
    
    return fila;
}

function crearFilaTecnico(registro, todosLosDatos) {
    const fila = document.createElement("tr");
    fila.className = "metrica-fila fade-in";
    
    // Calcular percentil de rendimiento
    const totales = todosLosDatos.map(t => parseInt(t.Total) || 0);
    const maxTotal = Math.max(...totales);
    const porcentajeRendimiento = maxTotal > 0 ? ((registro.Total / maxTotal) * 100).toFixed(1) : 0;
    
    let claseRendimiento = '';
    if (porcentajeRendimiento >= 80) claseRendimiento = 'alto-rendimiento';
    else if (porcentajeRendimiento >= 60) claseRendimiento = 'rendimiento-normal';  
    else claseRendimiento = 'bajo-rendimiento';
    
    fila.innerHTML = `
        <td class="tecnico-nombre">
            <div class="tecnico-info">
                <span class="nombre">${registro.Tecnico}</span>
                <small class="rendimiento ${claseRendimiento}">${porcentajeRendimiento}% rendimiento</small>
            </div>
        </td>
        <td class="tickets-total">
            <span class="numero">${registro.Total}</span>
            <div class="barra-progreso">
                <div class="progreso" style="width: ${porcentajeRendimiento}%"></div>
            </div>
        </td>
    `;
    
    return fila;
}

// ===============================================
// SISTEMA DE AUTO-REFRESH INTELIGENTE
// ===============================================

function configurarAutoRefresh() {
    // Limpiar intervalos previos
    limpiarIntervalos();
    
    // Auto-refresh principal
    const intervaloPrincipal = setInterval(() => {
        if (document.visibilityState === 'visible') {
            cargarTodasLasMetricas();
        }
    }, MetricasConfig.intervaloActualizacion);
    
    MetricasConfig.intervalosActivos.add(intervaloPrincipal);
    
    // Refresh al volver a la pestaña
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Verificar si han pasado más de 30 segundos
            const tiempoTranscurrido = Date.now() - (MetricasConfig.ultimaActualizacion?.getTime() || 0);
            if (tiempoTranscurrido > 30000) {
                cargarTodasLasMetricas();
            }
        }
    });
    
    console.log(`🔄 Auto-refresh configurado cada ${MetricasConfig.intervaloActualizacion/1000} segundos`);
}

// ===============================================
// UTILIDADES Y ANIMACIONES
// ===============================================

function animarContador(elemento, valorFinal) {
    const valorActual = parseInt(elemento.textContent) || 0;
    const diferencia = valorFinal - valorActual;
    const pasos = 20;
    const incremento = diferencia / pasos;
    
    let contador = 0;
    const intervalo = setInterval(() => {
        contador++;
        const nuevoValor = Math.round(valorActual + (incremento * contador));
        elemento.textContent = nuevoValor;
        
        if (contador >= pasos) {
            clearInterval(intervalo);
            elemento.textContent = valorFinal;
        }
    }, 30);
}

function configurarIndicadoresVisuales() {
    // Crear indicador de conexión si no existe
    if (!ElementosMetricas.indicadorEstado) {
        const indicador = document.createElement('div');
        indicador.id = 'indicadorConexion';
        indicador.className = 'conexion-estado conectado';
        indicador.innerHTML = '<span class="punto"></span>En línea';
        document.body.appendChild(indicador);
        ElementosMetricas.indicadorEstado = indicador;
    }
    
    // Crear timestamp si no existe
    if (!ElementosMetricas.tiempoUltimaActualizacion) {
        const timestamp = document.createElement('div');
        timestamp.id = 'ultimaActualizacion';
        timestamp.className = 'ultima-actualizacion';
        document.body.appendChild(timestamp);
        ElementosMetricas.tiempoUltimaActualizacion = timestamp;
    }
}

function mostrarEstadoCarga(cargando) {
    if (ElementosMetricas.indicadorEstado) {
        if (cargando) {
            ElementosMetricas.indicadorEstado.className = 'conexion-estado cargando';
            ElementosMetricas.indicadorEstado.innerHTML = '<span class="punto"></span>Actualizando...';
        } else {
            ElementosMetricas.indicadorEstado.className = 'conexion-estado conectado';
            ElementosMetricas.indicadorEstado.innerHTML = '<span class="punto"></span>En línea';
        }
    }
}

function mostrarErrorConexion() {
    if (ElementosMetricas.indicadorEstado) {
        ElementosMetricas.indicadorEstado.className = 'conexion-estado error';
        ElementosMetricas.indicadorEstado.innerHTML = '<span class="punto"></span>Error de conexión';
    }
}

function actualizarIndicadorTiempo() {
    if (ElementosMetricas.tiempoUltimaActualizacion && MetricasConfig.ultimaActualizacion) {
        const tiempo = MetricasConfig.ultimaActualizacion.toLocaleTimeString('es-ES');
        ElementosMetricas.tiempoUltimaActualizacion.textContent = `Última actualización: ${tiempo}`;
    }
}

function limpiarIntervalos() {
    MetricasConfig.intervalosActivos.forEach(intervalo => {
        clearInterval(intervalo);
    });
    MetricasConfig.intervalosActivos.clear();
    console.log('🧹 Intervalos de métricas limpiados');
}

// ===============================================
// ESTILOS CSS DINÁMICOS
// ===============================================

// Inyectar estilos para las métricas mejoradas
(function inyectarEstilosMetricas() {
    const estilos = `
        <style id="metricas-dinamicos">
        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .estado-excelente .indicador-estado {
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
        }
        
        .estado-bueno .indicador-estado {
            background: #3b82f6;
            box-shadow: 0 0 8px #3b82f6;
        }
        
        .estado-regular .indicador-estado {
            background: #f59e0b;
            box-shadow: 0 0 8px #f59e0b;
        }
        
        .estado-critico .indicador-estado {
            background: #ef4444;
            box-shadow: 0 0 8px #ef4444;
        }
        
        .indicador-estado {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .barra-progreso {
            width: 100%;
            height: 4px;
            background: rgba(0,0,0,0.1);
            border-radius: 2px;
            overflow: hidden;
            margin-top: 4px;
        }
        
        .progreso {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #10b981);
            transition: width 0.3s ease;
        }
        
        .alto-rendimiento { color: #10b981; font-weight: 600; }
        .rendimiento-normal { color: #3b82f6; }
        .bajo-rendimiento { color: #f59e0b; }
        
        .conexion-estado {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            z-index: 1000;
            backdrop-filter: blur(10px);
        }
        
        .conexion-estado.conectado {
            background: rgba(16, 185, 129, 0.1);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }
        
        .conexion-estado.cargando {
            background: rgba(59, 130, 246, 0.1);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .conexion-estado.error {
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .conexion-estado .punto {
            display: inline-block;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
            margin-right: 6px;
            animation: pulse 1.5s infinite;
        }
        
        .ultima-actualizacion {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 4px 12px;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 11px;
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        </style>
    `;
    
    if (!document.querySelector('#metricas-dinamicos')) {
        document.head.insertAdjacentHTML('beforeend', estilos);
    }
})();

console.log('📊 Sistema de métricas en tiempo real cargado exitosamente');
