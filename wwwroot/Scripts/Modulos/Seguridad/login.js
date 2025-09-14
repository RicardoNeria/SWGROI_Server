// Script de login con CAPTCHA movido desde inline para mantener CSP y no romper flujo existente.
(function(){
  let captchaResultado = 0;

  function generarCaptcha(){
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 5) + 1;
    captchaResultado = a + b;
    const lbl = document.getElementById('captchaPregunta');
    if(lbl){ lbl.innerText = `¿Cuánto es ${a} + ${b}?`; }
  }

  async function onSubmit(e){
    e.preventDefault();
    const usuario = document.getElementById('usuario')?.value || '';
    const contrasena = document.getElementById('contrasena')?.value || '';
    const mensaje = document.getElementById('mensajeLogin');

    // Validar CAPTCHA (si existe en la vista)
    const respInput = document.getElementById('respuestaCaptcha');
    if(respInput){
      const respuesta = parseInt(respInput.value, 10);
      if(isNaN(respuesta) || respuesta !== captchaResultado){
        if(mensaje){ mensaje.textContent = 'Captcha incorrecto. Por favor, coloca el resultado correcto.'; mensaje.style.color = 'red'; }
        generarCaptcha();
        return;
      }
    }

    const respuesta = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ Usuario: usuario, Contrasena: contrasena })
    });
    const resultado = await respuesta.json();

    if (resultado.exito) {
      try{
        document.cookie = `usuario=${usuario}; path=/`;
        if(resultado.rol) document.cookie = `rol=${resultado.rol}; path=/`;
      }catch(_){ }
      if(mensaje){ mensaje.textContent = 'Acceso correcto, ingresando al sistema...'; mensaje.style.color = 'green'; }
      setTimeout(() => { window.location.href = '/menu.html'; }, 1000);
    } else {
      if(mensaje){ mensaje.textContent = 'Usuario o contraseña incorrectos.'; mensaje.style.color = 'red'; }
      generarCaptcha();
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    const form = document.getElementById('formLogin');
    if(form){ form.addEventListener('submit', onSubmit); }
    generarCaptcha();
  });
})();

