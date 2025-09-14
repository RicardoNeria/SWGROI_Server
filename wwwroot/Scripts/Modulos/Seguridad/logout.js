document.addEventListener("DOMContentLoaded", function () {
    const cerrarSesion = document.getElementById("cerrarSesion");

    if (cerrarSesion) {
        cerrarSesion.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/logout";
        });
    }
});
