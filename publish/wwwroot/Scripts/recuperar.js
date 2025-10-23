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
        // Preferir ToastPremium
        if (window.ToastPremium && typeof window.ToastPremium.show === 'function') {
            try { window.ToastPremium.show(mensaje, exito ? 'success' : 'error', { duration: exito ? 2600 : 5000 }); return; } catch(_){}
        }
        // Fallback al sistema unificado de UI si existiera
        try { if (window.SWGROI && window.SWGROI.UI) { window.SWGROI.UI.mostrarMensaje(mensaje, exito ? 'success' : 'error'); return; } } catch(_){ }
        // Último recurso: consola
        try { console.log('[Recuperar]', exito ? 'OK' : 'ERR', mensaje); } catch(_){ }
    }

    // Listener de compatibilidad: pintar mensaje cuando otros scripts escuchen el evento
    // Compat: seguir emitiendo evento, por si algún listener externo desea reaccionar
    document.addEventListener('recuperar:mensaje', function(e){
        const msg = e.detail?.mensaje || '';
        const ok  = !!e.detail?.exito;
        notificar(msg, ok);
    });
});
