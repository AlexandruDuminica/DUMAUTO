document.addEventListener('DOMContentLoaded', () => {
    const btnFiltreaza = document.getElementById('btn-filtreaza');
    const btnSortAsc = document.getElementById('btn-sort-asc');
    const btnCalc = document.getElementById('btn-calc');
    const btnReset = document.getElementById('btn-reset');
    const rangePret = document.getElementById('filtru-pret');
    const valPretSpan = document.getElementById('val-pret');
    const produseSection = document.getElementById('lista-produse');

    const originalOrder = Array.from(produseSection.children);

    // range span updated via onchange listener below

    // restore saved filters into inputs (if any)
    try {
        const savedFilters = localStorage.getItem('produse_filters');
        const saveFlag = localStorage.getItem('produse_filters_saved') === '1';
        if (savedFilters && saveFlag) {
            const f = JSON.parse(savedFilters);
            if (f.nume) document.getElementById('filtru-nume').value = f.nume;
            if (f.pretMax) {
                document.getElementById('filtru-pret').value = f.pretMax;
                if (valPretSpan) valPretSpan.textContent = f.pretMax;
            }
            if (f.sub) document.getElementById('filtru-sub').value = f.sub;
            if (f.desc) document.getElementById('filtru-desc').value = f.desc;
            // select luni
            if (f.luni && document.getElementById('filtru-luni')) {
                Array.from(document.getElementById('filtru-luni').options).forEach(o => { o.selected = f.luni.includes(o.value); });
            }
            // check the save checkbox
            const cb = document.getElementById('salveaza-filtrare'); if (cb) cb.checked = true;
        }
    } catch(e) {}


    function getVisibleArticles() { return getMatchingArticles(); }

    function validateInputs() {
        const name = document.getElementById('filtru-nume').value.trim();
        if (name && /\d/.test(name)) {
            alert('Numele nu trebuie sa contina cifre.');
            return false;
        }
        // textarea: daca s-a introdus ceva, trebuie sa aiba minim 3 caractere
        const ta = document.getElementById('filtru-desc');
        if (ta && ta.value.trim() !== '' && ta.value.trim().length < 3) {
            ta.classList.add('is-invalid');
            return false;
        } else if (ta) {
            ta.classList.remove('is-invalid');
        }
        return true;
    }

    // textarea live validation: remove is-invalid when value becomes valid (>= 3 chars or empty)
    const taEl = document.getElementById('filtru-desc');
    if (taEl) {
        taEl.addEventListener('input', () => {
            if (taEl.value.trim() === '' || taEl.value.trim().length >= 3) taEl.classList.remove('is-invalid');
        });
    }

    // Tema: gestionata global de tema.js (nu mai e nevoie de cod aici)

    // ── DIACRITICE (Bonus 7) ─────────────────────────────────────────────────
    function normalizeDiacritice(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    // ── ACCORDION STATE PERSISTENCE ────────────────────────────────────────
    const ACC_STATE_KEY = 'accordion_produse_state';
    function loadAccordionState() {
        try { return JSON.parse(localStorage.getItem(ACC_STATE_KEY) || '{}'); } catch(e) { return {}; }
    }
    function saveAccordionState(id, isOpen) {
        const s = loadAccordionState(); s[id] = isOpen;
        localStorage.setItem(ACC_STATE_KEY, JSON.stringify(s));
    }
    function restoreAccordionState() {
        const state = loadAccordionState();
        Object.keys(state).forEach(id => {
            if (state[id]) {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('show') && window.bootstrap) {
                    try { new bootstrap.Collapse(el, { toggle: false }).show(); } catch(e) {}
                }
            }
        });
    }
    document.addEventListener('show.bs.collapse', e => { if (e.target.id) saveAccordionState(e.target.id, true); });
    document.addEventListener('hide.bs.collapse', e => { if (e.target.id) saveAccordionState(e.target.id, false); });
    restoreAccordionState();

    // ── PAGINATION (Bonus 5) ─────────────────────────────────────────────────
    const K = 6; // produse pe pagina
    let currentPage = 1;

    function getMatchingArticles() {
        return Array.from(produseSection.querySelectorAll('article')).filter(a => !a.dataset.hidden && a.dataset.filtered !== 'false');
    }

    function renderPage(articles, page) {
        const start = (page - 1) * K;
        articles.forEach((a, i) => {
            a.style.display = (i >= start && i < start + K) ? '' : 'none';
        });
        renderPagination(articles.length, page);
        const noMsg = document.getElementById('no-products-msg');
        if (noMsg) noMsg.style.display = articles.length === 0 ? '' : 'none';
        const cntEl = document.getElementById('numar-produse');
        if (cntEl) cntEl.textContent = articles.length;
    }

    function renderPagination(total, active) {
        let container = document.getElementById('paginator');
        if (!container) {
            container = document.createElement('nav');
            container.id = 'paginator';
            container.className = 'mt-3';
            produseSection.parentNode.insertBefore(container, produseSection.nextSibling);
        }
        const nrl = Math.ceil(total / K);
        if (nrl <= 1) { container.innerHTML = ''; return; }
        let html = '<ul class="pagination pagination-sm flex-wrap">';
        for (let p = 1; p <= nrl; p++) {
            html += `<li class="page-item${p === active ? ' active' : ''}"><button class="page-link" data-page="${p}">${p}</button></li>`;
        }
        html += '</ul>';
        container.innerHTML = html;
        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = Number(btn.dataset.page);
                renderPage(getMatchingArticles(), currentPage);
            });
        });
    }

    // ── CORE FILTER (Bonus 3 + 4) ────────────────────────────────────────────
    function applyFilters() {
        const name = normalizeDiacritice(document.getElementById('filtru-nume').value.trim());
        const pretMax = Number(rangePret.value);
        const sub = normalizeDiacritice(document.getElementById('filtru-sub').value.trim());
        const culoare = document.querySelector('input[name="culoare"]:checked').value;
        const discountOnly = document.getElementById('filtru-discount').checked;
        const luniSelect = Array.from(document.getElementById('filtru-luni').selectedOptions).map(o => o.value);
        const descFilter = normalizeDiacritice(document.getElementById('filtru-desc').value.trim());

        const luniMap = {Ianuarie:1,Februarie:2,Martie:3,Aprilie:4,Mai:5,Iunie:6,Iulie:7,August:8,Septembrie:9,Octombrie:10,Noiembrie:11,Decembrie:12};

        Array.from(produseSection.querySelectorAll('article')).forEach(art => {
            // skip permanently hidden (Bonus 6: buton 3)
            if (art.dataset.hidden === 'true') { art.style.display = 'none'; art.dataset.filtered = 'false'; return; }
            // pinned (Bonus 6: buton 1) — always show
            if (art.dataset.pinned === 'true') { art.style.display = ''; art.dataset.filtered = 'true'; return; }
            // temporarily removed (Bonus 6: buton 2)
            if (art.dataset.removed === 'true') { art.style.display = 'none'; art.dataset.filtered = 'false'; return; }

            const pretText = art.querySelector('.pret') ? art.querySelector('.pret').textContent : '';
            const pret = Number(pretText.replace(/[^\d]/g, ''));
            const h3 = art.querySelector('h3');
            const numeNorm = normalizeDiacritice(h3 ? h3.textContent : '');
            const descEl = art.querySelector('.descriere');
            const descrNorm = normalizeDiacritice(descEl ? descEl.textContent : '');
            const subcEl = art.querySelector('.col-2');
            const subcNorm = normalizeDiacritice(subcEl ? subcEl.textContent : '');

            let culoareText = '';
            art.querySelectorAll('ul li').forEach(li => { if (li.textContent.toLowerCase().includes('culoare')) culoareText = normalizeDiacritice(li.textContent); });
            const culoareMatch = culoare === 'toate' ? true : culoareText.includes(normalizeDiacritice(culoare));

            const timeEl = art.querySelector('time');
            let monthMatch = true;
            if (timeEl) {
                let m = 0;
                const txt = timeEl.textContent;
                Object.keys(luniMap).forEach(k => { if (txt.includes(k)) m = luniMap[k]; });
                monthMatch = luniSelect.includes(String(m));
            }

            const discountOk = pret > 30000;

            let show = true;
            if (name && !numeNorm.includes(name) && !descrNorm.includes(name)) show = false;
            if (pret > pretMax) show = false;
            if (sub && !subcNorm.includes(sub)) show = false;
            if (!culoareMatch) show = false;
            if (discountOnly && !discountOk) show = false;
            if (!monthMatch) show = false;
            if (descFilter && descFilter.length >= 3 && !descrNorm.includes(descFilter)) show = false;

            art.dataset.filtered = show ? 'true' : 'false';
        });

        currentPage = 1;
        renderPage(getMatchingArticles(), currentPage);
    }

    // ── BUTTON CLICK FILTER ──────────────────────────────────────────────────
    btnFiltreaza.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validateInputs()) return;
        const saveCheckbox = document.getElementById('salveaza-filtrare');
        const filterObj = {
            nume: document.getElementById('filtru-nume').value.trim(),
            pretMax: rangePret.value,
            sub: document.getElementById('filtru-sub').value.trim(),
            luni: Array.from(document.getElementById('filtru-luni').selectedOptions).map(o => o.value),
            desc: document.getElementById('filtru-desc').value.trim()
        };
        try {
            if (saveCheckbox && saveCheckbox.checked) {
                localStorage.setItem('produse_filters', JSON.stringify(filterObj));
                localStorage.setItem('produse_filters_saved', '1');
                if (window.myCookies && window.myCookies.setCookie) window.myCookies.setCookie('ultimeFiltre', JSON.stringify(filterObj), 7);
            } else {
                localStorage.removeItem('produse_filters');
                localStorage.removeItem('produse_filters_saved');
                if (window.myCookies && window.myCookies.deleteCookie) window.myCookies.deleteCookie('ultimeFiltre');
            }
        } catch(e) {}
        applyFilters();
    });

    // ── ONCHANGE — Bonus 4 (toate cele 8 filtre) ─────────────────────────────
    document.getElementById('filtru-nume').addEventListener('input', applyFilters);
    rangePret.addEventListener('input', () => {
        if (valPretSpan) valPretSpan.textContent = rangePret.value;
        applyFilters();
    });
    document.getElementById('filtru-sub').addEventListener('input', applyFilters);
    document.querySelectorAll('input[name="culoare"]').forEach(r => r.addEventListener('change', applyFilters));
    document.getElementById('filtru-discount').addEventListener('change', applyFilters);
    document.getElementById('filtru-luni').addEventListener('change', applyFilters);
    if (taEl) taEl.addEventListener('input', () => {
        if (taEl.value.trim() === '' || taEl.value.trim().length >= 3) { taEl.classList.remove('is-invalid'); applyFilters(); }
    });
    // 8th input — putereCp: search in ul list (implicit through applyFilters on filtru-sub which also scans col-2)

    // initial render with pagination
    applyFilters();

    // ── BONUS 8: multi-key sort ────────────────────────────────────────────────
    function getArticleValue(art, key) {
        if (key === 'pret') {
            const pt = art.querySelector('.pret');
            return Number((pt ? pt.textContent : '').replace(/[^\d]/g, '')) || 0;
        }
        if (key === 'nome' || key === 'nume') {
            const h3 = art.querySelector('h3');
            return (h3 ? h3.textContent : '').trim().toLowerCase();
        }
        if (key === 'putere_cp') {
            let val = 0;
            art.querySelectorAll('ul li').forEach(li => {
                if (li.textContent.toLowerCase().includes('putere')) {
                    val = Number(li.textContent.replace(/[^\d]/g, '')) || 0;
                }
            });
            return val;
        }
        if (key === 'data') {
            const t = art.querySelector('time');
            return t ? t.textContent.trim() : '';
        }
        return '';
    }

    function compareValues(a, b) {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return String(a).localeCompare(String(b), 'ro');
    }

    function sortArticles() {
        const key1 = document.getElementById('sort-key1') ? document.getElementById('sort-key1').value : 'pret';
        const key2 = document.getElementById('sort-key2') ? document.getElementById('sort-key2').value : 'none';
        const dir = document.getElementById('sort-dir') ? document.getElementById('sort-dir').value : 'asc';
        const asc = dir === 'asc';

        let arr = Array.from(produseSection.querySelectorAll('article'));
        arr.sort((a, b) => {
            let v1a = getArticleValue(a, key1);
            let v1b = getArticleValue(b, key1);
            let c = compareValues(v1a, v1b);
            if (c === 0 && key2 && key2 !== 'none') {
                let v2a = getArticleValue(a, key2);
                let v2b = getArticleValue(b, key2);
                c = compareValues(v2a, v2b);
            }
            return asc ? c : -c;
        });
        arr.forEach(a => produseSection.appendChild(a));
    }

    btnSortAsc.addEventListener('click', (e) => { e.preventDefault(); sortArticles(); applyFilters(); });

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
        rangePret.value = rangePret.max; if (valPretSpan) valPretSpan.textContent = rangePret.value;
        document.getElementById('filtru-sub').value = '';
        document.querySelector('input[name="culoare"][value="toate"]').checked = true;
        document.getElementById('filtru-discount').checked = false;
        document.getElementById('filtru-desc').value = '';
        document.getElementById('filtru-desc').classList.remove('is-invalid');
        Array.from(document.getElementById('filtru-luni').options).forEach(o=>o.selected = true);
        // remove per-article state for removed (reset) but keep pinned/hidden
        Array.from(produseSection.querySelectorAll('article[data-removed="true"]')).forEach(a => { delete a.dataset.removed; });
        originalOrder.forEach(a => produseSection.appendChild(a));
        if (valPretSpan) valPretSpan.textContent = rangePret.value;
        try { localStorage.removeItem('produse_filters'); localStorage.removeItem('produse_filters_saved'); } catch(e){}
        try { const cb = document.getElementById('salveaza-filtrare'); if (cb) cb.checked = false; } catch(e){}
        try { if (window.myCookies && window.myCookies.deleteCookie) window.myCookies.deleteCookie('ultimeFiltre'); } catch(e){}
        applyFilters();
    });

    // Modal: show product details when clicking an article (except clicking links)
    const modal = document.getElementById('prod-modal');
    const modalContent = document.getElementById('prod-modal-content');
    const modalClose = document.getElementById('prod-modal-close');

    function closeModal() { modal.style.display = 'none'; modalContent.innerHTML = ''; }
    function openModal(html) { modalContent.innerHTML = html; modal.style.display = 'flex'; }

    // Bonus 11: modal is opened via event delegation in the produseSection listener below
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (ev) => { if (ev.target.classList.contains('prod-modal-backdrop')) closeModal(); });

    // ── BONUS 6: 3 action buttons per product ─────────────────────────────────
    const SESSION_HIDDEN_KEY = 'produse_session_hidden';
    // restore session-hidden from sessionStorage
    try {
        const sh = JSON.parse(sessionStorage.getItem(SESSION_HIDDEN_KEY) || '[]');
        sh.forEach(id => {
            const art = document.getElementById('produs_' + id);
            if (art) { art.dataset.hidden = 'true'; art.style.display = 'none'; }
        });
    } catch(e) {}

    function saveSessionHidden() {
        const ids = Array.from(produseSection.querySelectorAll('article[data-hidden="true"]')).map(a => a.dataset.id);
        try { sessionStorage.setItem(SESSION_HIDDEN_KEY, JSON.stringify(ids)); } catch(e) {}
    }

    // Button 1 — PIN (keep visible during filter)
    produseSection.addEventListener('click', (ev) => {
        const btnPin = ev.target.closest('.btn-pin');
        if (btnPin) {
            const id = btnPin.dataset.id;
            const art = document.getElementById('produs_' + id);
            if (!art) return;
            const isPinned = art.dataset.pinned === 'true';
            if (isPinned) {
                delete art.dataset.pinned;
                art.classList.remove('prod-pinned');
                btnPin.classList.remove('active', 'btn-warning');
                btnPin.classList.add('btn-outline-warning');
            } else {
                art.dataset.pinned = 'true';
                art.classList.add('prod-pinned');
                btnPin.classList.add('active', 'btn-warning');
                btnPin.classList.remove('btn-outline-warning');
            }
            applyFilters();
        }

        // Button 2 — REMOVE TEMPORARILY
        const btnRemTemp = ev.target.closest('.btn-remove-temp');
        if (btnRemTemp) {
            const id = btnRemTemp.dataset.id;
            const art = document.getElementById('produs_' + id);
            if (!art) return;
            art.dataset.removed = 'true';
            delete art.dataset.pinned;
            art.classList.remove('prod-pinned');
            applyFilters();
        }

        // Button 3 — REMOVE FOR SESSION
        const btnRemSess = ev.target.closest('.btn-remove-session');
        if (btnRemSess) {
            const id = btnRemSess.dataset.id;
            const art = document.getElementById('produs_' + id);
            if (!art) return;
            art.dataset.hidden = 'true';
            delete art.dataset.pinned;
            art.classList.remove('prod-pinned');
            saveSessionHidden();
            applyFilters();
            return;
        }

        // Bonus 11: modal — open when clicking article body (not button/link)
        if (!ev.target.closest('button') && !ev.target.closest('a')) {
            const article = ev.target.closest('article');
            if (article) {
                const id = article.dataset.id;
                const title = article.querySelector('h3') ? article.querySelector('h3').textContent.trim() : '';
                const imgEl = article.querySelector('img');
                const img = imgEl ? imgEl.src : '';
                const descr = article.querySelector('.descriere') ? article.querySelector('.descriere').innerHTML : '';
                const detailsEl = article.querySelector('details');
                const specs = detailsEl && detailsEl.querySelector('ul') ? detailsEl.querySelector('ul').outerHTML : '';
                const pretEl = article.querySelector('.pret');
                const pretHtml = pretEl ? pretEl.innerHTML : '';
                const html = `<h3>${title}</h3><div class="row"><div class="col-md-4"><img src="${img}" style="width:100%;height:auto;border-radius:0.4rem;"></div><div class="col-md-8"><p><strong>Preț:</strong> ${pretHtml}</p>${specs}<p>${descr}</p><p class="mt-2"><a href="/produs/${id}" class="btn btn-sm btn-primary">Pagina produsului</a></p></div></div>`;
                openModal(html);
            }
        }
    });

    // ── BONUS 10a+10b: server-side filter+sort via fetch ──────────────────────
    const btnServerFilter = document.getElementById('btn-server-filter');
    if (btnServerFilter) {
        btnServerFilter.addEventListener('click', async (e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            const numeVal = document.getElementById('filtru-nume').value.trim();
            if (numeVal) params.set('nume', numeVal);
            params.set('pretMax', rangePret.value);
            const subVal = document.getElementById('filtru-sub').value.trim();
            if (subVal) params.set('sub', subVal);
            const culoare = document.querySelector('input[name="culoare"]:checked');
            if (culoare && culoare.value !== 'toate') params.set('culoare', culoare.value);
            if (document.getElementById('filtru-discount').checked) params.set('discountOnly', '1');
            const luniSel = Array.from(document.getElementById('filtru-luni').selectedOptions).map(o => o.value);
            if (luniSel.length > 0) params.set('luni', luniSel.join(','));
            const descVal = document.getElementById('filtru-desc').value.trim();
            if (descVal) params.set('desc', descVal);
            // sort params
            const k1 = document.getElementById('sort-key1');
            const k2 = document.getElementById('sort-key2');
            const sd = document.getElementById('sort-dir');
            if (k1) params.set('key1', k1.value);
            if (k2) params.set('key2', k2.value);
            if (sd) params.set('dir', sd.value);

            try {
                btnServerFilter.disabled = true;
                btnServerFilter.innerHTML = '<i class="bi bi-hourglass-split"></i>';
                const resp = await fetch('/api/produse-filtrate?' + params.toString());
                const json = await resp.json();
                if (json.error) { alert('Eroare server: ' + json.error); return; }

                // render results into lista-produse (replace existing articles)
                const arts = Array.from(produseSection.querySelectorAll('article'));
                arts.forEach(a => a.remove());

                const noMsg = document.getElementById('no-products-msg');

                if (!json.produse || json.produse.length === 0) {
                    if (noMsg) noMsg.style.display = '';
                    const cntEl = document.getElementById('numar-produse');
                    if (cntEl) cntEl.textContent = '0';
                    return;
                }
                if (noMsg) noMsg.style.display = 'none';

                json.produse.forEach(p => {
                    const art = document.createElement('article');
                    art.id = 'produs_' + p.id;
                    art.className = 'prod ' + (p.categorie_mare || '').replace(/\s+/g, '') + (p.isCheapest ? ' prod-cheapest' : '');
                    art.dataset.id = p.id;
                    const pretHtml = p.pret_redus
                        ? `<span class="text-decoration-line-through text-muted">${p.pret} EUR</span> <strong class="text-danger ms-2">${p.pret_redus} EUR</strong>`
                        : `<span>${p.pret} EUR</span>`;
                    art.innerHTML = `
                        <h3><a href="/produs/${p.id}">${p.nume}</a></h3>
                        <div class="col-1">
                            <img src="${p.imagine}" alt="${p.nume}">
                            <div class="meta"><span class="categ">${p.categorie_mare}</span> - <span class="pret">${pretHtml}</span></div>
                            ${p.isCheapest ? '<div class="cheapest-label"><i class="bi bi-star-fill"></i> Cel mai ieftin din categorie</div>' : ''}
                            ${p.isNew ? '<span class="badge bg-info text-dark">NOU</span>' : ''}
                            <div class="mt-2 d-flex gap-1 flex-wrap">
                                <button class="btn btn-outline-primary btn-sm btn-compare" data-id="${p.id}" data-name="${p.nume}" title="Compară produsul"><i class="bi bi-link-45deg"></i></button>
                                <button class="btn btn-outline-warning btn-sm btn-pin" data-id="${p.id}" title="Fixează produsul"><i class="bi bi-pin-angle-fill"></i></button>
                                <button class="btn btn-outline-secondary btn-sm btn-remove-temp" data-id="${p.id}" title="Ascunde temporar"><i class="bi bi-eye-slash"></i></button>
                                <button class="btn btn-outline-danger btn-sm btn-remove-session" data-id="${p.id}" title="Ascunde pe sesiune"><i class="bi bi-trash3"></i></button>
                            </div>
                        </div>
                        <div class="col-2">
                            <details>
                                <summary>Specificații</summary>
                                <ul>
                                    <li><strong>Subcategorie:</strong> <i>${p.subcategorie||''}</i></li>
                                    <li><strong>Caracteristici multiple:</strong> <i>${p.caracteristici_multiple||''}</i></li>
                                    <li><strong>Putere (CP):</strong> <i>${p.putere_cp||''}</i></li>
                                    <li><strong>Data adăugare:</strong> <i><time>${p.formattedDate||''}</time></i></li>
                                    <li><strong>In stoc:</strong> <i>${p.in_stoc ? 'Da' : 'Nu'}</i></li>
                                    <li><strong>Culoare:</strong> <i>${p.culoare||''}</i></li>
                                </ul>
                            </details>
                            <p class="descriere">${p.descriere||''}</p>
                        </div>`;
                    produseSection.appendChild(art);
                });

                const cntEl = document.getElementById('numar-produse');
                if (cntEl) cntEl.textContent = json.produse.length;
                // re-apply session hidden state and pagination
                try {
                    const sh = JSON.parse(sessionStorage.getItem(SESSION_HIDDEN_KEY) || '[]');
                    sh.forEach(id => {
                        const a = document.getElementById('produs_' + id);
                        if (a) { a.dataset.hidden = 'true'; a.style.display = 'none'; }
                    });
                } catch(e) {}
                // show first page
                const allArts = Array.from(produseSection.querySelectorAll('article'));
                allArts.forEach((a, i) => { a.dataset.filtered = i < K ? 'true' : 'false'; });
                renderPage(allArts.slice(0, K).concat(allArts.slice(K)), 1);
                restoreAccordionState();
            } catch(err) {
                alert('Eroare comunicare server: ' + err.message);
            } finally {
                btnServerFilter.disabled = false;
                btnServerFilter.innerHTML = '<i class="bi bi-cloud-download"></i> <span class="d-none d-md-inline">Server</span>';
            }
        });
    }

    // Offer timer: if banner exists, count down using data from server via element text
    const timerEl = document.getElementById('timer-oferta');
    if (timerEl) {
        // fetch offers JSON to get end time
        fetch('/api/oferte').then(r=>r.json()).then(j=>{
            if (!j.oferte || j.oferte.length === 0) return;
            const end = new Date(j.oferte[0]['data-finalizare']);
            let intervalId = null;
            const tick = () => {
                const diff = end - Date.now();
                if (diff <= 0) {
                    if (intervalId) clearInterval(intervalId);
                    timerEl.textContent = 'Expirată!';
                    timerEl.style.color = 'red';
                    setTimeout(() => { location.reload(); }, 1500);
                    return;
                }
                const s = Math.floor(diff/1000)%60;
                const m = Math.floor(diff/1000/60)%60;
                const h = Math.floor(diff/1000/3600);
                timerEl.textContent = `${h}h ${m}m ${s}s`;
                if (diff <= 10000) {
                    timerEl.style.color = 'red';
                    timerEl.style.fontWeight = 'bold';
                    timerEl.style.fontSize = '1.15em';
                } else {
                    timerEl.style.color = '';
                    timerEl.style.fontWeight = '';
                    timerEl.style.fontSize = '';
                }
            };
            tick();
            intervalId = setInterval(tick, 1000);
        }).catch(()=>{});
    }
});
