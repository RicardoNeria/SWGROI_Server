document.addEventListener("DOMContentLoaded", function () {
    const tabla = document.getElementById("tablaReportes").getElementsByTagName("tbody")[0];
    const leyenda = document.getElementById("leyendaReportes");

    cargarTickets();

    window.buscarTickets = function () {
        const folio = document.getElementById("filtroFolio").value.trim();
        const estado = document.getElementById("filtroEstado").value;
        const fecha = document.getElementById("filtroFecha").value;
        const responsable = document.getElementById("filtroResponsable").value.trim();

        const filtros = { folio, estado, fecha, responsable };

        fetch("/reportes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(filtros)
        })
            .then(res => res.json())
            .then(data => {
                mostrarTabla(data);
                mostrarLeyenda("Filtro aplicado correctamente", true);
            })
            .catch(err => {
                console.error("Error al buscar tickets:", err);
                mostrarLeyenda("Ocurrió un error al filtrar los tickets.", false);
            });
    };

    window.limpiarFiltros = function () {
        document.getElementById("filtroFolio").value = "";
        document.getElementById("filtroEstado").value = "";
        document.getElementById("filtroFecha").value = "";
        document.getElementById("filtroResponsable").value = "";
        cargarTickets();
    };

    function cargarTickets() {
        fetch("/reportes")
            .then(res => res.json())
            .then(data => mostrarTabla(data))
            .catch(err => {
                console.error("Error al cargar tickets:", err);
                mostrarLeyenda("No se pudieron cargar los datos.", false);
            });
    }

    function mostrarTabla(data) {
        tabla.innerHTML = "";

        if (!data || data.length === 0) {
            tabla.innerHTML = `<tr><td colspan="10" style="text-align:center; font-weight:bold; padding: 15px;">No se encontraron tickets.</td></tr>`;
            return;
        }

        data.forEach(ticket => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${ticket.Folio || "—"}</td>
                <td>${ticket.Estado || "—"}</td>
                <td>${ticket.Responsable || "—"}</td>
                <td>${ticket.Descripcion || "—"}</td>
                <td>${ticket.Tecnico || "—"}</td>
                <td>${ticket.FechaRegistro || "—"}</td>
                <td>${ticket.FechaAsignada || "—"}</td>
                <td>${ticket.HoraAsignada || "—"}</td>
                <td>${ticket.FechaCierre || "—"}</td>
                <td>${ticket.Cotizacion || "—"}</td>
            `;
            tabla.appendChild(fila);
        });
    }

    function mostrarLeyenda(mensaje, exito) {
        leyenda.innerText = mensaje;
        leyenda.style.backgroundColor = exito ? "#28a745" : "#e74c3c";
        leyenda.style.color = "white";
        leyenda.style.padding = "10px 20px";
        leyenda.style.borderRadius = "8px";
        leyenda.style.marginBottom = "20px";
        leyenda.style.display = "block";
        setTimeout(() => leyenda.style.display = "none", 4000);
    }
});
