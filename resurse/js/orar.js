document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('open-orar');
    const overlay = document.getElementById('orar-overlay');
    const close = document.getElementById('orar-close');
    const status = document.getElementById('orar-status');
    const countdownEl = document.getElementById('orar-countdown');
    if (!btn || !overlay) return;

    // schedule: index 0=Luni(JS 1)..5=Sambata(JS 6), 6=Duminica(JS 0)
    // null = closed all day
    const orar = [
        { start: 9, end: 17 },  // Luni
        { start: 9, end: 17 },  // Marti
        { start: 9, end: 17 },  // Miercuri
        { start: 9, end: 17 },  // Joi
        { start: 9, end: 17 },  // Vineri
        { start: 10, end: 14 }, // Sambata
        null                    // Duminica
    ];

    function getOrarIdx(jsDay) {
        // JS: 0=Sun..6=Sat; our idx: 0=Mon..5=Sat, 6=Sun
        return jsDay === 0 ? 6 : jsDay - 1;
    }

    function highlightToday() {
        const today = getOrarIdx(new Date().getDay());
        document.querySelectorAll('#orar-table .orar-row').forEach(row => {
            const idx = Number(row.dataset.idx);
            row.style.background = idx === today ? 'var(--col-2, #ede9fe)' : '';
            row.style.fontWeight = idx === today ? 'bold' : '';
        });
    }

    function computeStatus() {
        const now = new Date();
        const jsDay = now.getDay();
        const idx = getOrarIdx(jsDay);
        const zi = orar[idx];
        let open = false;
        if (zi) {
            const h = now.getHours();
            const m = now.getMinutes();
            const totalMin = h * 60 + m;
            open = totalMin >= zi.start * 60 && totalMin < zi.end * 60;
        }
        if (status) status.innerHTML = open
            ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Firma este DESCHISĂ acum</span>'
            : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> Firma este ÎNCHISĂ acum</span>';
    }

    let autoCloseTimer = null;
    let countdownInterval = null;

    function openOrar() {
        overlay.style.display = 'flex';
        highlightToday();
        computeStatus();
        // countdown 10s
        let secs = 10;
        if (countdownEl) countdownEl.textContent = secs;
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = setInterval(() => {
            secs--;
            if (countdownEl) countdownEl.textContent = secs;
            if (secs <= 0) { clearInterval(countdownInterval); }
        }, 1000);
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(closeOrar, 10000);
    }

    function closeOrar() {
        overlay.style.display = 'none';
        if (autoCloseTimer) { clearTimeout(autoCloseTimer); autoCloseTimer = null; }
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
    }

    btn.addEventListener('click', (e) => { e.preventDefault(); openOrar(); });
    if (close) close.addEventListener('click', closeOrar);
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.style.position === 'absolute') closeOrar(); });
});
