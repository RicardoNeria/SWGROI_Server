document.addEventListener("DOMContentLoaded", function () {
    const selectTicket = document.getElementById("ticketSeleccionado");
    const selectTecnico = document.getElementById("tecnicoAsignado");
    const form = document.getElementById("formAsignacion");
    const mensaje = document.getElementById("mensajeAsignacion");

    // Cargar lista de tickets y técnicos
    cargarTickets();
    cargarTecnicos();

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const datos = {
            folio: selectTicket.value,
            tecnico: selectTecnico.value,
            fecha: document.getElementById("fechaServicio").value,
            hora: document.getElementById("horaServicio").value
        };

        fetch("/asignaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.text())
            .then(respuesta => {
                mensaje.textContent = respuesta;
                mensaje.style.color = respuesta.includes("correctamente") ? "green" : "red";
                mensaje.style.display = "block";
                form.reset();

                setTimeout(() => {
                    mensaje.style.display = "none";
                }, 3000);
            })
            .catch(err => {
                console.error("Error al enviar asignación:", err);
                mensaje.textContent = "Error al asignar servicio.";
                mensaje.style.color = "red";
                mensaje.style.display = "block";
                setTimeout(() => {
                    mensaje.style.display = "none";
                }, 3000);
            });
    });

    function cargarTickets() {
        fetch("/asignaciones?tipo=tickets")
            .then(res => res.json())
            .then(data => {
                data.forEach(ticket => {
                    const opcion = document.createElement("option");
                    opcion.value = ticket.Folio;
                    opcion.textContent = `${ticket.Folio} - ${ticket.Descripcion}`;
                    selectTicket.appendChild(opcion);
                });
            })
            .catch(err => {
                console.error("Error al cargar tickets:", err);
            });
    }

    function cargarTecnicos() {
        fetch("/asignaciones?tipo=tecnicos")
            .then(res => res.json())
            .then(data => {
                data.forEach(tecnico => {
                    const opcion = document.createElement("option");
                    opcion.value = tecnico.Nombre;
                    opcion.textContent = tecnico.Nombre;
                    selectTecnico.appendChild(opcion);
                });
            })
            .catch(err => {
                console.error("Error al cargar técnicos:", err);
            });
    }
});
