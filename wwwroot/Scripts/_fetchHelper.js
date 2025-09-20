(function(){
    // safeFetch: realiza fetch y devuelve { ok, status, text, json }
    async function safeFetch(url, options){
        try{
            const res = await fetch(url, options);
            const text = await res.text().catch(()=>null);
            let json = null;
            try{ json = text ? JSON.parse(text) : null; } catch(e){ json = null; }
            return { ok: res.ok, status: res.status, text, json };
        }catch(err){
            return { ok:false, status:0, text:null, json:null, error: (err && err.message) ? err.message : String(err) };
        }
    }

    function safeFetchMessage(resp){
        if(!resp) return null;
        if(resp.json){ return resp.json.error || resp.json.message || resp.json.mensaje || null; }
        if(resp.text) return resp.text;
        if(resp.error) return resp.error;
        return null;
    }

    // Exponer de forma no intrusiva
    try{ window.safeFetch = safeFetch; window.safeFetchMessage = safeFetchMessage; } catch(e) { /* no crítico */ }
})();
