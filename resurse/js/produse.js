document.addEventListener('DOMContentLoaded', () => {
    const btnFiltreaza = document.getElementById('btn-filtreaza');
    const btnSortAsc = document.getElementById('btn-sort-asc');
    const btnSortDesc = document.getElementById('btn-sort-desc');
    const btnCalc = document.getElementById('btn-calc');
    const btnReset = document.getElementById('btn-reset');
    const rangePret = document.getElementById('filtru-pret');
    const minPretSpan = document.getElementById('min-pret');
    const maxPretSpan = document.getElementById('max-pret');
    const produseSection = document.getElementById('lista-produse');

    const originalOrder = Array.from(produseSection.children);

    rangePret.addEventListener('input', () => { maxPretSpan.textContent = rangePret.value; });

    function getVisibleArticles() { return Array.from(produseSection.querySelectorAll('article')).filter(a => a.style.display !== 'none'); }

    function validateInputs() {
        const name = document.getElementById('filtru-nume').value.trim();
        if (name && /\d/.test(name)) {
            alert('Numele nu trebuie sa contina cifre.');
            return false;
        }
        // textarea must not be empty for this app
        const ta = document.getElementById('filtru-desc');
        if (ta) {
            if (ta.value.trim() === '') {
                ta.classList.add('is-invalid');
                return false;
            } else {
                ta.classList.remove('is-invalid');
            }
        }
        return true;
    }

    // textarea live validation: remove is-invalid when non-empty
    const taEl = document.getElementById('filtru-desc');
    if (taEl) {
        taEl.addEventListener('input', () => {
            if (taEl.value.trim() !== '') taEl.classList.remove('is-invalid');
        });
    }

    // Theme switch: remember choice in localStorage
    const themeSwitch = document.getElementById('theme-switch');
    const themeIcon = document.getElementById('theme-icon');
    function applyTheme(t) {
        if (t === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeIcon) themeIcon.className = 'bi bi-moon-stars-fill';
            if (themeSwitch) themeSwitch.checked = true;
        } else {
            document.body.classList.remove('dark-theme');
            if (themeIcon) themeIcon.className = 'bi bi-sun-fill';
            if (themeSwitch) themeSwitch.checked = false;
        }
    }
    const saved = localStorage.getItem('theme');
    applyTheme(saved || 'light');
    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            const t = themeSwitch.checked ? 'dark' : 'light';
            applyTheme(t);
            localStorage.setItem('theme', t);
        });
    }

    btnFiltreaza.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateInputs()) return;
        const name = document.getElementById('filtru-nume').value.trim().toLowerCase();
        const pretMax = Number(rangePret.value);
        const sub = document.getElementById('filtru-sub').value.trim().toLowerCase();
        const culoare = document.querySelector('input[name="culoare"]:checked').value;
        const discountOnly = document.getElementById('filtru-discount').checked;
        const luniSelect = Array.from(document.getElementById('filtru-luni').selectedOptions).map(o=>o.value);

        Array.from(produseSection.querySelectorAll('article')).forEach(art => {
            let pretText = art.querySelector('.pret').textContent || '';
            let pret = Number(pretText.replace(/\D/g, ''));
            let descr = art.querySelector('.descriere').textContent.toLowerCase();
            let subc = art.querySelector('.col-2').textContent.toLowerCase();
            let culoareText = '';
            art.querySelectorAll('ul li').forEach(li => { if(li.textContent.toLowerCase().includes('culoare')) culoareText = li.textContent.toLowerCase(); });
            let culoareMatch = culoare === 'toate' ? true : culoareText.includes(culoare.toLowerCase());
            // compute month by parsing the formatted date inside time tag (format: d-Month-yyyy (Day))
            let timeEl = art.querySelector('time');
            let monthMatch = true;
            if (timeEl) {
                // attempt to parse month name to number by mapping
                const txt = timeEl.textContent;
                const luniMap = {Ianuarie:1,Februarie:2,Martie:3,Aprilie:4,Mai:5,Iunie:6,Iulie:7,August:8,Septembrie:9,Octombrie:10,Noiembrie:11,Decembrie:12};
                let m = 0;
                Object.keys(luniMap).forEach(k=>{ if(txt.includes(k)) m = luniMap[k]; });
                monthMatch = luniSelect.includes(String(m));
            }
            // discount criteria: pret > 30000
            let discountOk = pret > 30000;

            let show = true;
            if (name && !art.querySelector('h3').textContent.toLowerCase().includes(name) && !descr.includes(name)) show = false;
            if (pret > pretMax) show = false;
            if (sub && !subc.includes(sub)) show = false;
            if (!culoareMatch) show = false;
            if (discountOnly && !discountOk) show = false;
            if (!monthMatch) show = false;

            art.style.display = show ? '' : 'none';
        });
    });

    function sortArticles(asc = true) {
        let arr = Array.from(produseSection.querySelectorAll('article'));
        arr.sort((a,b)=>{
            let pa = Number((a.querySelector('.pret').textContent||'').replace(/\D/g, '')) || 0;
            let pb = Number((b.querySelector('.pret').textContent||'').replace(/\D/g, '')) || 0;
            if (pa === pb) {
                let aMulti = (a.querySelector('li:nth-child(2)')? a.querySelector('li:nth-child(2)').textContent.split(',').length : 0);
                let bMulti = (b.querySelector('li:nth-child(2)')? b.querySelector('li:nth-child(2)').textContent.split(',').length : 0);
                return asc ? aMulti - bMulti : bMulti - aMulti;
            }
            return asc ? pa - pb : pb - pa;
        });
        arr.forEach(a=>produseSection.appendChild(a));
    }

    btnSortAsc.addEventListener('click', (e) => { e.preventDefault(); sortArticles(true); });
    btnSortDesc.addEventListener('click', (e) => { e.preventDefault(); sortArticles(false); });

    btnCalc.addEventListener('click', (e) => {
        e.preventDefault();
        let vis = getVisibleArticles();
        let vals = vis.map(a => Number((a.querySelector('.pret').textContent||'').replace(/\D/g, '')) || 0);
        if (vals.length === 0) { alert('Niciun produs selectat pentru calcul.'); return; }
        let sum = vals.reduce((s,v)=>s+v,0);
        let avg = Math.round(sum / vals.length);
        let min = Math.min(...vals);
        let max = Math.max(...vals);
        let msg = `Suma: ${sum} EUR\nMedia: ${avg} EUR\nMin: ${min} EUR\nMax: ${max} EUR`;
        const d = document.createElement('div'); d.className = 'calc-popup'; d.textContent = msg; document.body.appendChild(d);
        setTimeout(()=>{ d.remove(); }, 2000);
    });

    btnReset.addEventListener('click', (e) => {
        e.preventDefault();
        if (!confirm('Doriti sa resetati filtrele la valorile implicite?')) return;
        document.getElementById('filtru-nume').value = '';
        rangePret.value = rangePret.max; maxPretSpan.textContent = rangePret.value;
        document.getElementById('filtru-sub').value = '';
        document.querySelector('input[name="culoare"][value="toate"]').checked = true;
        document.getElementById('filtru-discount').checked = false;
        document.getElementById('filtru-desc').value = '';
        Array.from(document.getElementById('filtru-luni').options).forEach(o=>o.selected = true);
        // restore display and original order
        originalOrder.forEach(a=>{ a.style.display = ''; produseSection.appendChild(a); });
    });

    // update displayed product count
    function updateCount() {
        const cnt = getVisibleArticles().length;
        const el = document.getElementById('numar-produse');
        if (el) el.textContent = cnt;
    }
    updateCount();

    // ensure count updates after filtering / sorting
    btnFiltreaza.addEventListener('click', updateCount);
    btnSortAsc.addEventListener('click', updateCount);
    btnSortDesc.addEventListener('click', updateCount);

    // Modal: show product details when clicking an article (except clicking links)
    const modal = document.getElementById('prod-modal');
    const modalContent = document.getElementById('prod-modal-content');
    const modalClose = document.getElementById('prod-modal-close');

    function closeModal() { modal.style.display = 'none'; modalContent.innerHTML = ''; }
    function openModal(html) { modalContent.innerHTML = html; modal.style.display = 'flex'; }

    document.querySelectorAll('#lista-produse article').forEach(article => {
        article.addEventListener('click', (ev) => {
            // if clicked link inside, allow navigation
            if (ev.target.closest('a')) return;
            const id = article.dataset.id;
            // build modal content from article
            const title = article.querySelector('h3').textContent;
            const img = article.querySelector('img').src;
            const descr = article.querySelector('.descriere').innerHTML;
            const specs = article.querySelector('details').innerHTML;
            let html = `<h3>${title}</h3><div class="row"><div class="col-md-4"><img src="${img}" style="width:100%;height:auto;border-radius:0.4rem"></div><div class="col-md-8">${specs}<p>${descr}</p><p><a href="/produs/${id}" class="btn btn-sm btn-primary">Pagina produs</a></p></div></div>`;
            openModal(html);
        });
    });
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (ev) => { if (ev.target.classList.contains('prod-modal-backdrop')) closeModal(); });

    // Offer timer: if banner exists, count down using data from server via element text
    const timerEl = document.getElementById('timer-oferta');
    if (timerEl) {
        // fetch offers JSON to get end time
        fetch('/api/oferte').then(r=>r.json()).then(j=>{
            if (!j.oferte || j.oferte.length === 0) return;
            const end = new Date(j.oferte[0]['data-finalizare']);
            const tick = () => {
                const diff = end - Date.now();
                if (diff <= 0) { location.reload(); return; }
                const s = Math.floor(diff/1000)%60; const m = Math.floor(diff/1000/60)%60; const h = Math.floor(diff/1000/3600);
                timerEl.textContent = `${h}h ${m}m ${s}s`;
                if (diff <= 10000) timerEl.style.color = 'red';
            };
            tick(); setInterval(tick, 1000);
        }).catch(()=>{});
    }
});
