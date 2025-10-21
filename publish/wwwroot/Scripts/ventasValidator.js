// Validador central del módulo de Ventas
// No modifica contratos; solo valida y muestra toast de error cuando aplica
(function(){
  function req(v){ return v!=null && String(v).trim()!==''; }
  function gt0(n){ const x=Number(n); return Number.isFinite(x) && x>0; }
  function minLen(v,n){ return String(v||'').trim().length>=n; }
  function alnum(v){ return /^[a-zA-Z0-9]+$/.test(String(v||'')); }

  const VentasValidator = {
    validarFormularioNuevaVenta(form){
      if(!form){ return true; }
      const folio = form.querySelector('#folio')?.value;
      const monto = form.querySelector('#monto')?.value;
      const estado = form.querySelector('#estado')?.value;
      const ovPref = form.querySelector('#ovsr3Pref')?.value;
      const ovNum = form.querySelector('#ovsr3Num')?.value;

      if(!req(folio) || !minLen(folio,3)){
        showVentasToast('El folio es requerido y debe tener al menos 3 caracteres.','error');
        return false;
      }
      if(!req(monto) || !gt0(monto)){
        showVentasToast('El monto debe ser numérico y mayor a 0.','error');
        return false;
      }
      if(!req(estado)){
        showVentasToast('Debe seleccionar un estado OVSR3.','error');
        return false;
      }
      if(req(ovNum) && !alnum(ovNum)){
        showVentasToast('El número OVSR3 solo puede contener letras y números.','error');
        return false;
      }
      return true;
    },

    validarAgregarProducto(payload){
      // Placeholder para futuras extensiones; mantener API consistente
      if(!payload) return true;
      return true;
    },

    // Validación para la acción de cancelación
    validarCancelacion(ovsr3, motivo){
      const ov = String(ovsr3||'').trim();
      const mot = String(motivo||'').trim();
      if(!ov){ showVentasToast('OVSR3 requerido para cancelar.','error'); return false; }
      // Permitir letras, números y guión intermedio (p.ej. PRE-OV-123)
      if(!/^[A-Za-z0-9-]+$/.test(ov)){
        showVentasToast('OVSR3 inválido. Solo se permite letras, números y guiones.','error');
        return false;
      }
      if(!mot || mot.length < 3){
        showVentasToast('Especifique el motivo de cancelación (mínimo 3 caracteres).','error');
        return false;
      }
      return true;
    },

    // Validación para la acción de activación
    validarActivacion(ovsr3){
      const ov = String(ovsr3||'').trim();
      if(!ov){ showVentasToast('OVSR3 inválido.','error'); return false; }
      if(!/^[A-Za-z0-9-]+$/.test(ov)){
        showVentasToast('OVSR3 inválido. Solo se permite letras, números y guiones.','error');
        return false;
      }
      return true;
    },

    // Validación de filtros de búsqueda
    validarFiltros(filtros){
      const { folio, estado, ovsr3, min, max, divisorCom } = filtros || {};
      // Validar montos numéricos
      const hasMin = String(min||'').trim() !== '';
      const hasMax = String(max||'').trim() !== '';
      const nMin = Number(min);
      const nMax = Number(max);
      if(hasMin && (!Number.isFinite(nMin) || nMin < 0)){
        showVentasToast('El monto mínimo debe ser un número válido mayor o igual a 0.','error');
        return false;
      }
      if(hasMax && (!Number.isFinite(nMax) || nMax <= 0)){
        showVentasToast('El monto máximo debe ser un número válido mayor a 0.','error');
        return false;
      }
      if(hasMin && hasMax && nMin > nMax){
        showVentasToast('El monto mínimo no puede ser mayor que el máximo.','error');
        return false;
      }
      // OVSR3 alfanumérico con guiones permitido
      if(String(ovsr3||'').trim() && !/^[A-Za-z0-9-]+$/.test(String(ovsr3))){
        showVentasToast('El filtro OVSR3 solo puede contener letras, números y guiones.','error');
        return false;
      }
      // Divisor de comisión
      const div = Number(divisorCom);
      if(Number.isFinite(div) && div < 1){
        showVentasToast('El divisor de comisión debe ser un número mayor o igual a 1.','error');
        return false;
      }
      return true;
    }
  };

  window.VentasValidator = VentasValidator;
})();
