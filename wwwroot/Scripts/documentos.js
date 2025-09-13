(() => {
  const $ = (s) => document.querySelector(s);
  const api = {
    async listar(page=1){
      const q = new URLSearchParams();
      const buscar = $('#filtro').value.trim(); if (buscar) q.set('buscar', buscar);
      const cat = $('#categoria').value.trim(); if (cat) q.set('categoria', cat);
      q.set('page', page); q.set('pageSize', 10);
      const r = await fetch('/api/documentos?' + q.toString());
      return r.json();
    },
    async subir(){
      const f = $('#file').files[0];
      if (!f) throw new Error('Seleccione un archivo');
      if (f.size <= 0 || f.size > 10*1024*1024) throw new Error('Tamaño inválido (<=10MB)');
      const cat = $('#categoria').value.trim();
      if (!cat) throw new Error('Seleccione categoría');
      const et = $('#etiquetas').value.trim();
      const no = $('#nota').value.trim();
      const fd = new FormData();
      fd.append('file', f);
      fd.append('categoria', cat);
      if (et) fd.append('etiquetas', et);
      if (no) fd.append('notas', no);
      const xhr = new XMLHttpRequest();
      const p = new Promise((resolve,reject)=>{
        xhr.onreadystatechange = () => { if (xhr.readyState === 4){ try { resolve(JSON.parse(xhr.responseText)); } catch(e){ reject(e);} } };
        xhr.upload.onprogress = (ev)=>{ if(ev.lengthComputable){ $('#progreso').hidden = false; $('#progreso').textContent = 'Subiendo ' + Math.round(100*ev.loaded/ev.total) + '%'; } };
        xhr.onerror = ()=> reject(new Error('Error de red'));
      });
      xhr.open('POST','/api/documentos');
      xhr.send(fd);
      return p;
    },
    async descargar(id){ location.href = '/api/documentos/'+id+'/descargar'; }
  };

  function bytes(n){ if(n>1024*1024) return (n/1048576).toFixed(1)+' MB'; if(n>1024) return (n/1024).toFixed(1)+' KB'; return n+' B'; }
  async function render(page=1){
    const t = $('#tabla tbody');
    t.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
    try{
      const j = await api.listar(page);
      if (!j.ok){ t.innerHTML = '<tr><td colspan="6">Error</td></tr>'; return; }
      t.innerHTML = '';
      (j.items||[]).forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${d.id}</td><td>${d.nombre}</td><td>${d.cat||''}</td><td>${bytes(d.tam)}</td><td>${d.ver}</td>
        <td><button data-id="${d.id}" class="dl">Descargar</button></td>`;
        t.appendChild(tr);
      });
      document.querySelectorAll('button.dl').forEach(b=> b.addEventListener('click',()=> api.descargar(b.dataset.id)) );
    }catch(e){ t.innerHTML = '<tr><td colspan="6">Error cargando</td></tr>'; }
  }

  $('#btn-buscar').addEventListener('click', ()=> render(1));
  $('#btn-subir').addEventListener('click', async ()=>{
    try{ const r = await api.subir(); if(!r.ok) throw new Error(r.code||'Error al subir'); $('#progreso').textContent = 'Completado'; setTimeout(()=> $('#progreso').hidden = true, 1500); render(1); }
    catch(e){ alert(e.message||e); }
  });

  render(1);
})();

