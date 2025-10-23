// Validador del formulario de Administración de Usuarios (frontend)
(function(){
  function req(v){ return v!=null && String(v).trim()!==''; }
  function lenBetween(v,min,max){ const t=String(v||''); return t.length>=min && t.length<=max; }

  const AdminValidator = {
    validarCrearActualizar(datos, esEdicion){
      const errores = {};
      if(!req(datos.NombreCompleto)) errores.nombre = 'El nombre completo es obligatorio';
      else if(!lenBetween(datos.NombreCompleto,1,150)) errores.nombre = 'El nombre no puede exceder 150 caracteres';

      if(!req(datos.Usuario)) errores.usuario = 'El usuario es obligatorio';
      else if(!lenBetween(datos.Usuario,1,100)) errores.usuario = 'El usuario no puede exceder 100 caracteres';

      if(!esEdicion){
        if(!req(datos.Contrasena)) errores.contrasena = 'La contraseña es obligatoria';
      }
      if(req(datos.Contrasena) && !lenBetween(datos.Contrasena,6,100)) errores.contrasena = 'La contraseña debe tener entre 6 y 100 caracteres';

      if(!req(datos.Rol)) errores.rol = 'El rol es obligatorio';
      return errores;
    },

    mostrarErrores(errores){
      if(!errores) return;
      if(window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarErroresFormulario==='function'){
        window.SWGROI.UI.mostrarErroresFormulario(errores, 5000);
        return;
      }
      // Fallback: escribir en elementos *_Feedback si existen
      Object.entries(errores).forEach(([campo,msg])=>{
        const fb = document.getElementById(`${campo}Feedback`);
        if(fb){ fb.textContent = msg; fb.style.color = 'var(--ui-color-error)'; }
      });
      // Mensaje general
      if(window.ToastPremium && typeof window.ToastPremium.show==='function'){
        window.ToastPremium.show('Corrige los errores del formulario', 'warning', { duration: 4000 });
      }
    }
  };

  window.AdminValidator = AdminValidator;
})();
