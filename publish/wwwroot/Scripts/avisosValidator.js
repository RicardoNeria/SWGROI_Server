/* AVISOS-VALIDATOR.JS - Validador central para el módulo de Avisos */
(function(window){
  'use strict';

  const AvisosValidator = {
    validarFormularioAviso(form){
      if(!form) return true; // nada que validar
      const asunto = (form.querySelector('#asunto')?.value || '').trim();
      const mensaje = (form.querySelector('#mensaje')?.value || '').trim();

      if(!asunto){ try{ window.showAvisosToast('El asunto es obligatorio','error'); }catch{} return false; }
      if(asunto.length>255){ try{ window.showAvisosToast('El asunto no puede exceder 255 caracteres','error'); }catch{} return false; }
      if(!mensaje){ try{ window.showAvisosToast('El mensaje es obligatorio','error'); }catch{} return false; }
      if(mensaje.length>2000){ try{ window.showAvisosToast('El mensaje no puede exceder 2000 caracteres','error'); }catch{} return false; }

      return true;
    }
  };

  window.AvisosValidator = AvisosValidator;

})(window);
