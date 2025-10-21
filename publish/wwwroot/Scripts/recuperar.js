document.addEventListener("DOMContentLoaded", function () {
    const formulario = document.getElementById("formRecuperar");

    formulario.addEventListener("submit", function (e) {
        e.preventDefault();

        const usuario = formulario.usuario.value.trim();
        const contrasena = formulario.nuevaContrasena.value.trim();

        if (usuario === "" || contrasena === "") {
            notificar("Ambos campos son obligatorios.", false);
            return;
        }

        const datos = {
            Usuario: usuario,
            NuevaContrasena: contrasena
        };

        fetch("/recuperar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        })
            .then(res => res.json())
            .then(data => {
                if (data.exito) {
                    notificar("Contraseña actualizada correctamente.", true);
                    formulario.reset();
                } else {
                    notificar("No se pudo actualizar la contraseña.", false);
                }
            })
            .catch(() => notificar("Error de conexión con el servidor.", false));
    });

    function notificar(mensaje, exito) {
        // Mostrar mensaje unificado en el contenedor del formulario
        try {
            const cont = document.querySelector('#formRecuperar .ui-message-container');
            if (window.SWGROI && window.SWGROI.UI && cont) {
                window.SWGROI.UI.mostrarMensaje(mensaje, exito ? 'success' : 'error', cont);
            }
        } catch(_) {}
        // Además emitir evento por compatibilidad
        const evento = new CustomEvent("recuperar:mensaje", {
            detail: { mensaje, exito }
        });
        document.dispatchEvent(evento);
    }

    // Listener de compatibilidad: pintar mensaje cuando otros scripts escuchen el evento
    document.addEventListener('recuperar:mensaje', function(e){
        const cont = document.querySelector('#formRecuperar .ui-message-container');
        if (!cont) return;
        if (window.SWGROI && window.SWGROI.UI) {
            window.SWGROI.UI.mostrarMensaje(e.detail?.mensaje || '', e.detail?.exito ? 'success' : 'error', cont);
        }
    });
});
