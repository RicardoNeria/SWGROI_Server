(() => {
  const qs = new URLSearchParams(location.search);
  const token = qs.get('token') || '';
  const folio = (qs.get('folio') || '').toUpperCase();
  const cont = document.getElementById('preguntas');
  const leyenda = document.getElementById('leyenda');
  const form = document.getElementById('form-encuesta');
  const msg = document.getElementById('msg');

  function el(tag, attrs={}, text='') { const e=document.createElement(tag); Object.assign(e, attrs); if(text) e.textContent=text; return e; }
  function aviso(t) { msg.textContent = t; }

  async function cargar(){
    if(!token){ aviso('Falta token.'); return; }
    try{
      const r = await fetch('/retroalimentacion/form?token=' + encodeURIComponent(token) + (folio?('&folio='+encodeURIComponent(folio)) : ''));
      const j = await r.json();
      if(!j.ok){ aviso(j.message||'Enlace inválido'); return; }
      leyenda.textContent = j.leyenda || '';
      cont.innerHTML = '';
      (j.preguntas||[]).forEach((p,idx)=>{
        const wrap = el('div',{className:'enc-pregunta'});
        wrap.appendChild(el('div',{},(idx+1)+'. '+p));
        const opts = el('div',{className:'enc-opciones'});
        for(let v=1; v<=5; v++){
          const id = `q${idx}_${v}`;
          const input = el('input',{type:'radio',name:`q${idx}`,id,value:String(v)});
          const label = el('label',{htmlFor:id},String(v));
          opts.appendChild(input); opts.appendChild(label);
        }
        wrap.appendChild(opts); cont.appendChild(wrap);
      });
    }catch(e){ aviso('Error cargando formulario'); }
  }

  form.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    // recolectar respuestas como números 1-5
    const vals = [];
    const groups = cont.querySelectorAll('.enc-pregunta');
    groups.forEach((g,i)=>{
      const sel = g.querySelector('input[type="radio"]:checked');
      vals.push(sel?Number(sel.value):null);
    });
    if(vals.some(v=>v==null)){ aviso('Responda todas las preguntas.'); return; }
    try{
      const r = await fetch('/retroalimentacion/responder',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, folio, respuestas: vals })
      });
      const j = await r.json();
      if(!j.ok){ aviso(j.message||'No se pudo registrar'); return; }
      aviso('¡Gracias! Respuesta registrada.');
      form.querySelector('button[type="submit"]').disabled = true;
    }catch(e){ aviso('Error al enviar'); }
  });

  cargar();
})();

