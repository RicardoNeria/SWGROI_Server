// admin.js mejorado

// Esperar al DOM completamente cargado
document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("formCrearUsuario");
    const tabla = document.getElementById("tablaUsuarios");
    const buscador = document.getElementById("buscador");
    const filtroRol = document.getElementById("filtroRol");
    const actualizarBtn = document.getElementById("actualizarBtn");
    const guardarBtn = document.getElementById("guardarBtn");
    const modalFormulario = document.getElementById("modalFormulario");
    const modalUsuario = document.getElementById("modalUsuario");
    const paginacion = document.querySelector(".paginacion");

    let usuarios = [];
    let usuariosFiltrados = [];
    let paginaActual = 1;
    const porPagina = 10;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (form.NombreCompleto.dataset.id) return;

        // Validación manual
        if (!form.NombreCompleto.value.trim() || !form.Usuario.value.trim() || !form.Contrasena.value.trim() || !form.Rol.value.trim()) {
            mostrarLeyenda("Completa todos los campos.", false); return;
        }
        if ((form.Contrasena.value||'').length < 8) { mostrarLeyenda("La contraseña debe tener al menos 8 caracteres.", false); return; }

        const datos = Object.fromEntries(new FormData(form).entries());
        guardarBtn.disabled = true;

        try {
            const res = await fetch("/admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            const data = await res.json().catch(() => ({}));

            // Cierra el modal antes de mostrar leyenda
            cerrarFormulario();

            if (res.status === 409) {
                mostrarLeyenda(data.mensaje || "El nombre de usuario ya existe", false);
                return;
            }
            if (!res.ok || data.exito === false) {
                mostrarLeyenda(data.mensaje || "No se pudo guardar.", false);
                return;
            }

            mostrarLeyenda("Usuario guardado exitosamente.", true);
            cargarUsuarios();
        } catch {
            cerrarFormulario();
            mostrarLeyenda("Fallo de red.", false);
        } finally {
            guardarBtn.disabled = false;
        }
    });




    actualizarBtn.addEventListener("click", async () => {
        const actualizado = {
            IdUsuario: form.NombreCompleto.dataset.id,
            NombreCompleto: form.NombreCompleto.value,
            Usuario: form.Usuario.value,
            Contrasena: form.Contrasena.value,
            Rol: form.Rol.value
        };
        actualizarBtn.disabled = true;

        try {
            const res = await fetch("/admin", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(actualizado)
            });

            const data = await res.json().catch(() => ({}));

            // Cierra el modal antes de mostrar leyenda
            cerrarFormulario();

            if (res.status === 409) {
                mostrarLeyenda(data.mensaje || "El nombre de usuario ya existe", false);
                return;
            }
            if (!res.ok || data.exito === false) {
                mostrarLeyenda(data.mensaje || "Error al actualizar.", false);
                return;
            }

            mostrarLeyenda("Usuario actualizado.", true);
            cargarUsuarios();
        } catch {
            cerrarFormulario();
            mostrarLeyenda("Fallo de red.", false);
        } finally {
            actualizarBtn.disabled = false;
        }
    });



    function cargarUsuarios() {
        fetch("/admin")
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                usuarios = Array.isArray(data) ? data : [];
                usuariosFiltrados = usuarios;
                paginaActual = 1;
                renderizarTabla();
                renderizarPaginacion();
            })
            .catch(error => {
                console.error('Error loading users:', error);
                mostrarLeyenda("Error al cargar usuarios.", false);
                usuarios = [];
                usuariosFiltrados = [];
                renderizarTabla();
                renderizarPaginacion();
            });
    }

    function renderizarTabla() {
        tabla.innerHTML = "";
        const inicio = (paginaActual - 1) * porPagina;
        const pagina = usuariosFiltrados.slice(inicio, inicio + porPagina);

        for (const u of pagina) {
            tabla.innerHTML += `
                <tr>
                    <td>
                        <button class="btn-accion btn-ver" onclick="verUsuario(${u.IdUsuario})">👁</button>
                        <button class="btn-accion btn-editar" onclick="editarUsuario(${u.IdUsuario})">✏️</button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarUsuario(${u.IdUsuario})">🗑️</button>
                    </td>
                    <td>${u.IdUsuario}</td>
                    <td>${u.NombreCompleto}</td>
                    <td>${u.Usuario}</td>
                    <td>${u.Rol}</td>
                </tr>`;
        }

        document.querySelector(".paginacion-total").innerText = `Resultados ${inicio + 1} a ${Math.min(inicio + porPagina, usuariosFiltrados.length)} de ${usuariosFiltrados.length}`;
    }

    function renderizarPaginacion() {
        paginacion.innerHTML = `<span>Páginas</span>`;
        const total = Math.ceil(usuariosFiltrados.length / porPagina);
        for (let i = 1; i <= total; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = `btn-pag${i === paginaActual ? " activo" : ""}`;
            btn.onclick = () => {
                paginaActual = i;
                renderizarTabla();
                renderizarPaginacion();
            };
            paginacion.appendChild(btn);
        }
        paginacion.appendChild(document.createElement("span")).className = "paginacion-total";
    }

    window.editarUsuario = function (id) {
        const u = usuarios.find(u => u.IdUsuario == id);
        if (!u) return mostrarLeyenda("Usuario no encontrado.", false);

        form.NombreCompleto.value = u.NombreCompleto;
        form.NombreCompleto.dataset.id = u.IdUsuario;
        form.Usuario.value = u.Usuario;
        form.Contrasena.value = u.Contrasena;
        form.Rol.value = u.Rol;

        document.getElementById("tituloFormulario").innerText = "Editar Usuario";
        guardarBtn.style.display = "none";
        actualizarBtn.style.display = "inline-block";
        modalFormulario.style.display = "flex";
    };

    window.verUsuario = function (id) {
        const u = usuarios.find(u => u.IdUsuario == id);
        if (!u) return;
        document.getElementById("verId").textContent = u.IdUsuario;
        document.getElementById("verNombre").textContent = u.NombreCompleto;
        document.getElementById("verUsuario").textContent = u.Usuario;
        document.getElementById("verRol").textContent = u.Rol;
        modalUsuario.style.display = "flex";
    };

    window.cerrarModal = () => modalUsuario.style.display = "none";

    window.eliminarUsuario = id => {
        if (!confirm("¿Eliminar este usuario?")) return;
        fetch(`/admin?id=${id}`, { method: "DELETE" })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                mostrarLeyenda(data.exito ? "Usuario eliminado." : (data.mensaje || "Error al eliminar."), data.exito);
                if (data.exito) cargarUsuarios();
            })
            .catch(error => {
                console.error('Error deleting user:', error);
                mostrarLeyenda("Error de red al eliminar usuario.", false);
            });
    };

    window.aplicarFiltros = function () {
        const texto = buscador.value.toLowerCase();
        const rol = filtroRol.value;
        usuariosFiltrados = usuarios.filter(u =>
            (u.NombreCompleto.toLowerCase().includes(texto) || u.Usuario.toLowerCase().includes(texto)) &&
            (rol === "" || u.Rol === rol)
        );
        paginaActual = 1;
        renderizarTabla();
        renderizarPaginacion();
    };

    window.limpiarFiltros = function () {
        buscador.value = "";
        filtroRol.value = "";
        aplicarFiltros();
    };

    function mostrarLeyenda(msg, exito) {
        const leyenda = document.getElementById("leyenda");
        leyenda.textContent = msg;
        leyenda.className = "leyenda " + (exito ? "exito" : "error");
        leyenda.style.display = "block";
        setTimeout(() => leyenda.style.display = "none", 3000);
    }

    // Wrappers con nombres solicitados
    window.abrirModalUsuario = function () { abrirFormulario(); };
    window.cerrarModalUsuario = function () { cerrarFormulario(); };

    window.abrirFormulario = function () {
        form.reset();
        delete form.NombreCompleto.dataset.id;
        document.getElementById("tituloFormulario").innerText = "Agregar Usuario";
        guardarBtn.style.display = "inline-block";
        actualizarBtn.style.display = "none";
        modalFormulario.style.display = "flex";
    };

    window.cerrarFormulario = function () {
        form.reset();
        document.getElementById("tituloFormulario").innerText = "Agregar Usuario";
        guardarBtn.style.display = "inline-block";
        actualizarBtn.style.display = "none";
        modalFormulario.style.display = "none";
    };

    document.getElementById("btnExportar").addEventListener("click", () => {
        if (!usuariosFiltrados.length) return mostrarLeyenda("No hay datos para exportar.", false);

        const csv = ["ID,Nombre Completo,Usuario,Rol", ...usuariosFiltrados.map(u =>
            `${u.IdUsuario},"${u.NombreCompleto}","${u.Usuario}",${u.Rol}`)].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "usuarios_exportados.csv";
        a.click();
    });

    // Cerrar modal al hacer clic en el overlay
    window.addEventListener("click", e => {
        if (e.target === modalFormulario) cerrarModalUsuario();
        if (e.target === modalUsuario) cerrarModal();
    });

    cargarUsuarios();
});
    // Cargar roles dinámicamente
    (async function cargarRoles(){
        try{
            const res = await fetch('/usuarios/roles');
            const roles = await res.json();
            const sel = document.getElementById('rol');
            if(sel && Array.isArray(roles)){
                sel.innerHTML = roles.map(r=>`<option value="${r.nombre}">${r.nombre}</option>`).join('');
            }
        }catch{}
    })();
