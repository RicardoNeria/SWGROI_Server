(function(){
  function getCookie(nombre){
    const valor = `; ${document.cookie}`;
    const partes = valor.split(`; ${nombre}=`);
    if(partes.length === 2){
      const raw = partes.pop().split(';').shift();
      try { return decodeURIComponent(raw); } catch { return raw; }
    }
    return "";
  }

  function showLeyenda(texto, tipo, tiempo=3000){
    const leyenda = document.getElementById('leyenda');
    if(!leyenda) return;
    leyenda.className = 'leyenda';
    if(tipo === 'error') leyenda.classList.add('leyenda--error');
    else if(tipo === 'warn') leyenda.classList.add('leyenda--warn');
    else if(tipo === 'info') leyenda.classList.add('leyenda--info');
    else if(tipo === 'success') leyenda.classList.add('leyenda--success');
    leyenda.textContent = texto;
    leyenda.style.display = 'block';
    clearTimeout(leyenda._timeout);
    leyenda._timeout = setTimeout(()=>{ leyenda.style.display = 'none'; }, tiempo);
  }

  function initSidebarNav(){
    const triggers = document.querySelectorAll('.nav-menu .has-submenu > a');
    triggers.forEach(link => {
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        const submenu = link.nextElementSibling;
        if(!submenu) return;
        const isOpen = submenu.style.display === 'block';
        document.querySelectorAll('.nav-menu .has-submenu .submenu').forEach(list => {
          if(list !== submenu) list.style.display = 'none';
        });
        submenu.style.display = isOpen ? 'none' : 'block';
      });
    });

    const toggleBtn = document.getElementById('btnToggleSidebar');
    if(toggleBtn){
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
      });
    }
  }

  function initDashboardCards(){
    const cards = Array.from(document.querySelectorAll('.tarjeta-dashboard'));
    cards.forEach(card => {
      const header = card.querySelector('.tarjeta-header');
      if(!header) return;
      header.addEventListener('click', () => {
        cards.forEach(other => {
          if(other !== card) other.classList.remove('is-open');
        });
        card.classList.toggle('is-open');
      });
    });
  }

  function initGreeting(){
    const saludo = document.getElementById('saludo');
    const fechaHora = document.getElementById('fecha-hora');
    if(!saludo || !fechaHora) return;
    const nombre = getCookie('nombre') || getCookie('usuario') || 'Usuario';

    const actualizarSaludo = () => {
      const ahora = new Date();
      const hora = ahora.getHours();
      let textoSaludo = 'Bienvenido/a';
      if(hora < 12) textoSaludo = 'Buenos días';
      else if(hora < 18) textoSaludo = 'Buenas tardes';
      else textoSaludo = 'Buenas noches';
      const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const formatoHora = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      saludo.textContent = `${textoSaludo}, ${nombre}.`;
      fechaHora.textContent = `Hoy es ${ahora.toLocaleDateString('es-MX', opcionesFecha)}, ${formatoHora} hrs.`;
    };

    actualizarSaludo();
    setInterval(actualizarSaludo, 60_000);
  }

  function enforceRoleVisibility(msg){
    const rol = (getCookie('rol') || '').trim();
    if(rol === 'Administrador'){
      if(msg === 'acceso-denegado') showLeyenda('Acceso denegado: solo el administrador puede entrar a esta sección.', 'warn');
      return;
    }

    document.querySelectorAll('.tarjeta-dashboard .tarjeta-header strong').forEach(el => {
      if(el.textContent.includes('Gestion Administrativa')){
        const card = el.closest('.tarjeta-dashboard');
        if(card) card.style.display = 'none';
      }
    });

    document.querySelectorAll('.nav-menu .has-submenu').forEach(item => {
      const trigger = item.querySelector('a');
      if(trigger && trigger.textContent.includes('Administración')){
        item.style.display = 'none';
      }
    });

    if(msg === 'acceso-denegado'){
      showLeyenda('Acceso denegado: solo el administrador puede entrar a esta sección.', 'warn');
    }
  }

  function loadIndicators(){
    fetch('/menu/indicadores')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => {
        if(!data) return;
        const tickets = document.getElementById('contadorTickets');
        const avisos = document.getElementById('contadorAvisos');
        if(tickets) tickets.textContent = data.tickets ?? 0;
        if(avisos) avisos.textContent = data.avisos ?? 0;
      })
      .catch(err => console.error('Error al cargar indicadores:', err));
  }

  document.addEventListener('DOMContentLoaded', function(){
    const cerrarSesion = document.getElementById('cerrarSesion');
    if(cerrarSesion){
      cerrarSesion.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = '/logout';
      });
    }

    const url = new URL(window.location.href);
    const msg = url.searchParams.get('msg');
    if (msg === 'sesion-activa') {
      showLeyenda('Es necesario cerrar sesión para regresar al inicio de sesión.', 'warn');
    }

    initSidebarNav();
    initDashboardCards();
    initGreeting();
    enforceRoleVisibility(msg);
    loadIndicators();
  });
})();
