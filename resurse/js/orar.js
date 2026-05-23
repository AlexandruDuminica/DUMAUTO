document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('open-orar');
    const overlay = document.getElementById('orar-overlay');
    const close = document.getElementById('orar-close');
    const status = document.getElementById('orar-status');
    if (!btn || !overlay) return;
    btn.addEventListener('click', (e)=>{ e.preventDefault(); overlay.style.display='flex';
        // compute open/closed
        const now = new Date(); const day = now.getDay(); const hour = now.getHours(); const minute = now.getMinutes();
        let open = false; let msg='';
        // simple schedule
        if (day>=1 && day<=5 && hour>=9 && hour<17) open = true;
        if (day===6 && hour>=10 && hour<14) open = true;
        msg = open ? '<span class="text-success">Deschis acum</span>' : '<span class="text-danger">Inchis acum</span>';
        if (status) status.innerHTML = msg;
        // auto hide after 10s
        setTimeout(()=>{ overlay.style.display='none'; }, 10000);
    });
    if (close) close.addEventListener('click', ()=> overlay.style.display='none');
    overlay.addEventListener('click', (e)=>{ if (e.target===overlay) overlay.style.display='none'; });
});
