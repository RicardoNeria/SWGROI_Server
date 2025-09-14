document.addEventListener("DOMContentLoaded", function () {
    const cerrarSesion = document.getElementById("cerrarSesion");
    if (cerrarSesion) {
        cerrarSesion.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/logout";
        });
    }

    const url = new URL(window.location.href);
    const msg = url.searchParams.get("msg");
    if (msg === "sesion-activa") {
        const leyenda = document.getElementById("leyenda");
        leyenda.innerText = "Es necesario cerrar sesión para poder regresar al INICIO DE SESIÓN.";
        leyenda.style.color = "red";
        leyenda.style.display = "block";
        setTimeout(() => { leyenda.style.display = "none"; }, 3000);
    }

    // Función para obtener cookies
    function getCookie(nombre) {
        const valor = `; ${document.cookie}`;
        const partes = valor.split(`; ${nombre}=`);
        if (partes.length === 2) {
            const raw = partes.pop().split(';').shift();
            try { return decodeURIComponent(raw); } catch { return raw; }
        }
        return "";
    }

    const rol = getCookie("rol");

    console.log("Rol actual:", rol);
});
