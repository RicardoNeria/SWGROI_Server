// seguridad.js: adjunta token CSRF a fetch/XMLHttpRequest y helpers de validación reutilizables.
(function(){
  function getCookie(name){
    const m = document.cookie.match(new RegExp('(?:^|; )'+name.replace(/([.$?*|{}()\[\]\\\/\+^])/g,'\\$1')+'=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // Wrapper de fetch para agregar X-CSRF-Token automáticamente.
  const _fetch = window.fetch;
  window.fetch = function(input, init){
    init = init || {};
    // Enviar cookies siempre (sesión/CSRF) para evitar problemas en HTTP/HTTPS
    if(!('credentials' in init)) init.credentials = 'include';
    init.headers = init.headers || {};
    try{
      if(!(init.headers instanceof Headers)){
        init.headers['X-CSRF-Token'] = getCookie('csrftoken') || '';
      }else{
        init.headers.set('X-CSRF-Token', getCookie('csrftoken') || '');
      }
    }catch(e){}
    return _fetch(input, init);
  };

  // Parche mínimo para XHR
  const XHR = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if(XHR){
    const _open = XHR.open; const _send = XHR.send;
    XHR.open = function(m,u, async, user, pass){ this.___method = (m||'GET').toUpperCase(); return _open.apply(this, arguments); };
    XHR.send = function(body){ try{ this.setRequestHeader('X-CSRF-Token', getCookie('csrftoken')||''); }catch(e){} return _send.apply(this, arguments); };
  }

  // Validaciones de cliente comunes (no bloqueantes)
  window.sec = window.sec || {};
  window.sec.isEmail = function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||''); };
  window.sec.isFolio = function(v){ return /^[A-Z0-9\-]{6,20}$/.test((v||'').toUpperCase()); };
  window.sec.isOVSR3 = function(v){ return /^[A-Z0-9]{3,20}$/.test((v||'').toUpperCase()); };
})();

