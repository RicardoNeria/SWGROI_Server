// Archivo de utilidades comunes para SWGROI
(function (window) {
  'use strict';

  const Utils = {
    toast(msg, type = 'info') {
      if (window.SWGROI && window.SWGROI.UI && typeof window.SWGROI.UI.mostrarMensaje === 'function') {
        window.SWGROI.UI.mostrarMensaje(msg, type, 'leyenda', 4000);
        return;
      }
      const c = document.querySelector('#toastContainer');
      if (!c) return;
      const t = document.createElement('div');
      t.className = `ui-toast ui-toast--${type}`;
      t.textContent = msg;
      c.appendChild(t);
      setTimeout(() => t.classList.add('ui-toast--visible'), 20);
      setTimeout(() => {
        t.classList.remove('ui-toast--visible');
        setTimeout(() => t.remove(), 300);
      }, 4000);
    },

    fmtBytes(b) {
      if (!b && b !== 0) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
      const i = b > 0 ? Math.floor(Math.log(b) / Math.log(k)) : 0;
      return (b / Math.pow(k, i)).toFixed(i ? 1 : 0) + ' ' + sizes[i];
    },

    esc(s) {
      if (s == null) return '';
      return String(s).replace(/[&<>"]'/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c]));
    }
  };

  window.Utils = Utils;
})(window);