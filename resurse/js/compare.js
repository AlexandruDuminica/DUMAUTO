document.addEventListener('DOMContentLoaded', ()=>{
    const STORAGE_KEY = 'compareList';
    const TIME_KEY = 'compareTimestamp';
    const MAX_AGE_MS = 24*60*60*1000; // 1 day

    function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } }
    function save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); localStorage.setItem(TIME_KEY, Date.now()); }

    function renderContainer() {
        let list = load();
        let container = document.getElementById('container-comparare');
        if (!container) {
            container = document.createElement('div'); container.id = 'container-comparare';
            container.style.position = 'fixed'; container.style.right='10px'; container.style.top='10px'; container.style.background='var(--zone-bg)'; container.style.padding='0.6rem'; container.style.border='1px solid var(--border-color)'; container.style.zIndex=3000; document.body.appendChild(container);
        }
        container.innerHTML = '';
        if (list.length===0) { container.style.display='none'; return; }
        container.style.display='block';
        list.forEach((it,idx)=>{
            const div = document.createElement('div'); div.style.display='flex'; div.style.alignItems='center'; div.style.gap='0.5rem';
            div.innerHTML = `<span>${it.name}</span>`;
            const btn = document.createElement('button'); btn.className='btn btn-sm btn-danger'; btn.textContent='X'; btn.addEventListener('click', ()=>{ removeAt(idx); });
            div.appendChild(btn);
            container.appendChild(div);
        });
        if (list.length===2) {
            const btnShow = document.createElement('button'); btnShow.className='btn btn-sm btn-primary mt-2'; btnShow.textContent='Afișează';
            btnShow.addEventListener('click', ()=>{ showComparison(list[0], list[1]); }); container.appendChild(btnShow);
        }
    }

    function addItem(id,name) {
        let list = load();
        if (list.find(l=>String(l.id)===String(id))) return; // already present
        if (list.length>=2) return; // do not add more
        list.push({ id, name }); save(list); renderContainer(); updateButtons();
    }
    function removeAt(i) { let list=load(); list.splice(i,1); save(list); renderContainer(); updateButtons(); }
    function clearAll() { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(TIME_KEY); renderContainer(); updateButtons(); }

    function updateButtons() {
        const list = load();
        document.querySelectorAll('.btn-compare').forEach(b=>{
            const id = b.dataset.id;
            if (list.length===2 && !list.find(x=>String(x.id)===String(id))) { b.disabled=true; b.title='ștergeți un produs din lista de comparare'; }
            else b.disabled=false;
        });
    }

    function showComparison(a,b) {
        // fetch product data
        fetch('/api/produse').then(r=>r.json()).then(j=>{
            const prod = j.produse;
            const pa = prod.find(p=>String(p.id)===String(a.id));
            const pb = prod.find(p=>String(p.id)===String(b.id));
            const win = window.open('', '_blank');
            let html = `<html><head><title>Comparare</title><link rel="stylesheet" href="/resurse/css/produse.css"></head><body><h3>Comparare produse</h3><table border="1" style="width:100%"><tr><th>Caracteristica</th><th>${pa.nume}</th><th>${pb.nume}</th></tr>`;
            const keys = ['pret','putere_cp','culoare','subcategorie','caracteristici_multiple'];
            keys.forEach(k=>{ html += `<tr><td>${k}</td><td>${pa[k]||''}</td><td>${pb[k]||''}</td></tr>`; });
            html += `</table></body></html>`;
            win.document.write(html); win.document.close();
        });
    }

    // remove container if too old
    const ts = Number(localStorage.getItem(TIME_KEY) || 0);
    if (ts && (Date.now()-ts) > MAX_AGE_MS) clearAll();
    renderContainer(); updateButtons();

    // attach handlers
    document.querySelectorAll('.btn-compare').forEach(b=>{
        b.addEventListener('click', (e)=>{ e.preventDefault(); const id=b.dataset.id; const name=b.dataset.name||b.textContent.trim(); addItem(id,name); });
    });
});
