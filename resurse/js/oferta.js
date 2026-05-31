document.addEventListener('DOMContentLoaded', ()=>{
    // --- Tab active class toggle ---
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            tabLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // --- Offer timer ---
    const el = document.getElementById('timer-home');
    if (!el) return;

    let intervalId = null;

    function startTimer(end) {
        if (intervalId) clearInterval(intervalId);
        const tick = () => {
            const diff = end - Date.now();
            if (diff <= 0) {
                clearInterval(intervalId);
                el.textContent = 'Expirat!';
                el.style.color = 'red';
                // reload page so the new offer (text + timer) is shown correctly
                setTimeout(() => { location.reload(); }, 1500);
                return;
            }
            const s = Math.floor(diff / 1000) % 60;
            const m = Math.floor(diff / 1000 / 60) % 60;
            const h = Math.floor(diff / 1000 / 3600);
            el.textContent = `${h}h ${m}m ${s}s`;
            // last 10 seconds: red + bold
            if (diff <= 10000) {
                el.style.color = 'red';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '1.1em';
            } else {
                el.style.color = '';
                el.style.fontWeight = '';
                el.style.fontSize = '';
            }
        };
        tick();
        intervalId = setInterval(tick, 1000);
    }

    function loadOffer() {
        fetch('/api/oferte').then(r => r.json()).then(j => {
            if (!j.oferte || j.oferte.length === 0) { el.textContent = 'Nicio ofertă'; return; }
            const end = new Date(j.oferte[0]['data-finalizare']);
            if (end <= Date.now()) { el.textContent = 'Expirat'; return; }
            startTimer(end);
        }).catch(() => {});
    }

    loadOffer();
});
