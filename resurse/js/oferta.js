document.addEventListener('DOMContentLoaded', ()=>{
    const el = document.getElementById('timer-home');
    if (!el) return;
    fetch('/api/oferte').then(r=>r.json()).then(j=>{
        if (!j.oferte || j.oferte.length===0) return;
        const end = new Date(j.oferte[0]['data-finalizare']);
        const tick = ()=>{
            const diff = end - Date.now();
            if (diff<=0) { location.reload(); return; }
            const s = Math.floor(diff/1000)%60; const m = Math.floor(diff/1000/60)%60; const h = Math.floor(diff/1000/3600);
            el.textContent = `${h}h ${m}m ${s}s`;
            if (diff<=10000) el.style.color='red';
        };
        tick(); setInterval(tick,1000);
    }).catch(()=>{});
});
