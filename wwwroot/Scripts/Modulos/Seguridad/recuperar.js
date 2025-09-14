document.addEventListener("DOMContentLoaded", function () {
    const formulario = document.getElementById("formRecuperar");
    const leyenda = document.getElementById("leyenda");

    formulario.addEventListener("submit", function (e) {
        e.preventDefault();

        const usuario = formulario.usuario.value.trim();
        const contrasena = formulario.nuevaContrasena.value.trim();

        if (usuario === "" || contrasena === "") {
            mostrarLeyenda("Ambos campos son obligatorios.", false);
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
                    mostrarLeyenda("Contraseña actualizada correctamente.", true);
                    formulario.reset();
                } else {
                    mostrarLeyenda("No se pudo actualizar la contraseña.", false);
                }
            })
            .catch(() => mostrarLeyenda("Error de conexión con el servidor.", false));
    });

    function mostrarLeyenda(mensaje, exito) {
        leyenda.textContent = mensaje;
        leyenda.style.color = exito ? "green" : "red";
        leyenda.style.display = "block";
        setTimeout(() => leyenda.style.display = "none", 3000);
    }
});
