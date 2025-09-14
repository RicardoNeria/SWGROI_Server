// tecnicos.js

document.addEventListener("DOMContentLoaded", () => {
    const buscadorFolio = document.getElementById("buscadorFolio");
    const buscadorEstado = document.getElementById("buscadorEstado");
    const buscadorResponsable = document.getElementById("buscadorResponsable");
    const btnBuscarTickets = document.getElementById("btnBuscarTickets");

    const tabla = document.querySelector("#tablaTickets tbody");
    const form = document.getElementById("formSeguimiento");
    const folioVisual = document.getElementById("folioVisual");
    const comentarioTecnico = document.getElementById("comentarioTecnico");
    const nuevoEstado = document.getElementById("nuevoEstado");
    const leyenda = document.getElementById("leyenda");
    const btnActualizarTabla = document.getElementById("btnActualizarTabla");
    const btnLimpiar = document.getElementById("btnLimpiar");

    // Buscar por filtros
    btnBuscarTickets.addEventListener("click", () => {
        const folio = buscadorFolio.value.trim().toLowerCase();
        const estado = buscadorEstado.value;
        const responsable = buscadorResponsable.value.trim().toLowerCase();

        fetch("/seguimiento")
            .then(res => res.json())
            .then(data => {
                const filtrado = data.filter(t => {
                    return (
                        (!folio || t.Folio.toLowerCase().includes(folio)) &&
                        (!estado || t.Estado === estado) &&
                        (!responsable || t.Responsable.toLowerCase().includes(responsable))
                    );
                });
                renderizarTabla(filtrado);
            })
            .catch(() => mostrarMensaje("Error al filtrar tickets.", false));
    });

    // Enviar actualización del estado del ticket
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const folio = folioVisual.textContent;
        const comentario = comentarioTecnico.value.trim();
        const estado = nuevoEstado.value;

        if (!folio || folio === "-" || !comentario || !estado) {
            mostrarMensaje("Todos los campos son obligatorios.", false);
            return;
        }

        const datos = {
            folio: folio,
            nuevoEstado: estado,
            comentario: comentario
        };

        fetch("/seguimiento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.text())
            .then(msg => {
                const exito = msg.toLowerCase().includes("actualizado");
                mostrarMensaje(msg, exito);
                if (exito) cargarTickets();
            })
            .catch(() => mostrarMensaje("No se pudo actualizar el ticket.", false));
    });

    // Cargar todos los tickets
    btnActualizarTabla.addEventListener("click", cargarTickets);

    function cargarTickets() {
        fetch("/seguimiento")
            .then(res => res.json())
            .then(data => renderizarTabla(data))
            .catch(() => mostrarMensaje("Error al cargar tickets.", false));
    }

    function renderizarTabla(data) {
        tabla.innerHTML = "";
        if (!data || data.length === 0) {
            tabla.innerHTML = `<tr><td colspan="5">No hay tickets registrados.</td></tr>`;
            return;
        }

        data.forEach(ticket => {
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${ticket.Folio}</td>
                <td>${ticket.Descripcion || "-"}</td>
                <td>${ticket.Estado || "-"}</td>
                <td>${ticket.Responsable || "-"}</td>
                <td>${ticket.Comentario || "-"}</td>
            `;
            fila.addEventListener("click", () => {
                folioVisual.textContent = ticket.Folio;
                comentarioTecnico.value = ticket.Comentario || "";
                nuevoEstado.value = ticket.Estado || "";
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
            tabla.appendChild(fila);
        });
    }

    btnLimpiar.addEventListener("click", () => {
        buscadorFolio.value = "";
        buscadorEstado.value = "";
        buscadorResponsable.value = "";
        folioVisual.textContent = "-";
        comentarioTecnico.value = "";
        nuevoEstado.selectedIndex = 0;
        leyenda.style.display = "none";
    });

    function mostrarMensaje(texto, exito) {
        leyenda.textContent = texto;
        leyenda.style.backgroundColor = exito ? "#28a745" : "#e74c3c";
        leyenda.style.color = "#fff";
        leyenda.style.padding = "10px 20px";
        leyenda.style.borderRadius = "6px";
        leyenda.style.marginBottom = "15px";
        leyenda.style.display = "block";
        setTimeout(() => leyenda.style.display = "none", 3500);
    }

    cargarTickets();
});
