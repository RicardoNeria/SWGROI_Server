// Optimización para navegación - evita acumulación de conexiones
(function() {
    // Detectar navegación hacia atrás/adelante
    let isNavigating = false;
    
    window.addEventListener('beforeunload', function(e) {
        isNavigating = true;
        // Cancelar requests pendientes si existen
        if (window.activeRequests) {
            window.activeRequests.forEach(req => {
                try { req.abort(); } catch(e) {}
            });
        }
    });
    
    window.addEventListener('pagehide', function(e) {
        isNavigating = true;
    });
    
    // Wrapper mejorado para fetch con cleanup automático
    const _originalFetch = window.fetch;
    window.activeRequests = window.activeRequests || new Set();
    
    window.fetch = function(input, init) {
        if (isNavigating) {
            return Promise.reject(new Error('Navigation in progress'));
        }
        
        init = init || {};
        const controller = new AbortController();
        init.signal = controller.signal;
        
        const request = _originalFetch(input, init);
        window.activeRequests.add(controller);
        
        request.finally(() => {
            window.activeRequests.delete(controller);
        });
        
        return request;
    };
    
    // Optimización de eventos del navegador
    let pageVisibilityTimeout;
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Página oculta - limpiar después de 30 segundos
            pageVisibilityTimeout = setTimeout(() => {
                if (window.activeRequests) {
                    window.activeRequests.forEach(req => {
                        try { req.abort(); } catch(e) {}
                    });
                    window.activeRequests.clear();
                }
            }, 30000);
        } else {
            // Página visible - cancelar limpieza
            if (pageVisibilityTimeout) {
                clearTimeout(pageVisibilityTimeout);
                pageVisibilityTimeout = null;
            }
        }
    });
})();