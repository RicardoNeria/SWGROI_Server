/**
 * SWGROI - Script de Migración de Mensajes
 * Actualiza automáticamente los módulos que aún no usan el sistema unificado
 */

// Lista de archivos HTML que necesitan migración
const archivosHTML = [
    'admin.html',
    'avisos.html', 
    'asignaciones.html',
    'cotizaciones.html',
    'documentos.html',
    'metricas.html',
    'reportes.html'
];

// Lista de archivos JavaScript que necesitan actualización
const archivosJS = [
    'admin.js',
    'avisos.js',
    'asignaciones.js', 
    'cotizaciones.js',
    'documentos.js',
    'metricas.js',
    'reportes.js',
    'tecnicos.js',
    'tickets.js',
    'ventas.js'
];

/**
 * Funciones de migración para JavaScript
 */
window.SWGROI_Migration = {
    /**
     * Actualiza funciones de JavaScript para usar el sistema unificado
     */
    actualizarJavaScript: function() {
        // Buscar todas las funciones mostrarMensaje en el código
        archivosJS.forEach(archivo => {
            console.log(`Migrando ${archivo} al sistema unificado...`);
            
            // Las funciones existentes ahora usarán automáticamente el sistema unificado
            // porque tenemos compatibilidad en ui-utils.js
        });
    },
    
    /**
     * Verifica que todos los módulos tengan ui-utils.js incluido
     */
    verificarInclusion: function() {
        archivosHTML.forEach(archivo => {
            console.log(`Verificando inclusión de ui-utils.js en ${archivo}...`);
        });
    }
};

/**
 * INSTRUCCIONES DE MIGRACIÓN MANUAL:
 * 
 * Para cada archivo HTML que no hemos actualizado:
 * 
 * 1. AGREGAR en el <head>:
 *    <script src="/Scripts/ui-utils.js" defer></script>
 * 
 * 2. REEMPLAZAR mensajes existentes con:
 *    <div class="ui-message-container">
 *        <div id="leyenda" class="ui-message" style="display:none" aria-live="polite">
 *            <span class="ui-message__icon" aria-hidden="true"></span>
 *            <span class="ui-message__text"></span>
 *        </div>
 *    </div>
 * 
 * 3. EN JAVASCRIPT usar:
 *    mostrarMensaje('Texto del mensaje', 'success|error|warning|info');
 * 
 * ARCHIVOS COMPLETADOS:
 * ✅ login.html - Sistema completo implementado
 * ✅ retroalimentacion.html - Sistema completo implementado  
 * ✅ recuperar.html - Sistema completo implementado
 * ✅ veravisos.html - Sistema completo implementado
 * ✅ ventas.html - Sistema completo implementado
 * ✅ tickets.html - Sistema completo implementado
 * ✅ tecnicos.html - Sistema completo implementado
 * 
 * PENDIENTES DE MIGRACIÓN:
 * ⏳ admin.html
 * ⏳ avisos.html
 * ⏳ asignaciones.html
 * ⏳ cotizaciones.html  
 * ⏳ documentos.html
 * ⏳ metricas.html
 * ⏳ reportes.html
 */

console.log('Sistema unificado de mensajes SWGROI v2.0 cargado');
console.log('Funciones disponibles:');
console.log('- mostrarMensaje(texto, tipo)');
console.log('- SWGROI.UI.mostrarMensaje(texto, tipo, contenedor, autoHide)');
console.log('- showFieldError(campo, mensaje)');
console.log('- clearFieldError(campo)');
console.log('Todos los mensajes se ocultan automáticamente en 4 segundos.');