document.addEventListener("DOMContentLoaded", function () {
    cargarTiemposPromedio();
    cargarTicketsPorTecnico();
});

// Auto-refresh de métricas pesadas: recargar cada 60s
(function(){
    try {
        if (window._metricasAutoRefresh) return;
        window._metricasAutoRefresh = true;
        setInterval(() => { try { cargarTiemposPromedio(); cargarTicketsPorTecnico(); } catch(e){} }, 60000);
    } catch(e) { console.warn('No se pudo iniciar auto-refresh metricas', e); }
})();

function cargarTiemposPromedio() {
    fetch("/metricas?tipo=tiempos")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#tablaTiempos tbody");
            data.forEach(reg => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td>${reg.Estado}</td>
                    <td>${reg.Promedio}</td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(err => console.error("Error al cargar tiempos:", err));
}

function cargarTicketsPorTecnico() {
    fetch("/metricas?tipo=tecnicos")
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector("#tablaTecnicos tbody");
            data.forEach(reg => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td>${reg.Tecnico}</td>
                    <td>${reg.Total}</td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(err => console.error("Error al cargar técnicos:", err));
}
