document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'compareList';
    const TIME_KEY = 'compareTimestamp';
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

    function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; } }
    function save(list) { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); localStorage.setItem(TIME_KEY, Date.now()); }

    function renderContainer() {
        let list = load();
        let container = document.getElementById('container-comparare');
        if (!container) {
            container = document.createElement('div');
            container.id = 'container-comparare';
            Object.assign(container.style, {
                position: 'fixed', right: '12px', bottom: '70px',
                background: 'var(--zone-bg)', color: 'var(--text-color)',
                padding: '0.75rem', border: '2px solid var(--primary, #1E3A8A)',
                borderRadius: '0.5rem', zIndex: '3000', minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            });
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        if (list.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'block';

        const title = document.createElement('p');
        title.style.cssText = 'font-weight:bold;margin:0 0 0.4rem 0;font-size:0.9rem;';
        title.textContent = 'Comparare produse';
        container.appendChild(title);

        list.forEach((it, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;align-items:center;gap:0.4rem;margin-bottom:0.3rem;';
            const span = document.createElement('span');
            span.style.cssText = 'flex:1;font-size:0.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            span.textContent = it.name;
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-danger';
            btn.style.cssText = 'padding:0 0.3rem;font-size:0.75rem;line-height:1.4;';
            btn.textContent = '✕';
            btn.title = 'Elimină din comparare';
            btn.addEventListener('click', () => { removeAt(idx); });
            div.appendChild(span);
            div.appendChild(btn);
            container.appendChild(div);
        });

        if (list.length === 2) {
            const btnShow = document.createElement('button');
            btnShow.className = 'btn btn-sm btn-primary mt-2 w-100';
            btnShow.textContent = 'Afișează comparație';
            btnShow.addEventListener('click', () => { showComparison(list[0], list[1]); });
            container.appendChild(btnShow);
        }
    }

    function addItem(id, name) {
        let list = load();
        if (list.find(l => String(l.id) === String(id))) return; // already present
        if (list.length >= 2) return; // max 2
        list.push({ id, name });
        save(list);
        renderContainer();
        updateButtons();
    }

    function removeAt(i) { let list = load(); list.splice(i, 1); save(list); renderContainer(); updateButtons(); }

    function updateButtons() {
        const list = load();
        document.querySelectorAll('.btn-compare').forEach(b => {
            const id = b.dataset.id;
            const alreadyIn = !!list.find(x => String(x.id) === String(id));
            if (list.length === 2 && !alreadyIn) {
                b.disabled = true;
                b.title = 'Ștergeți un produs din lista de comparare';
            } else {
                b.disabled = false;
                if (!b.dataset.origTitle) b.dataset.origTitle = b.title || 'Compară';
                b.title = alreadyIn ? 'Deja în lista de comparare' : (b.dataset.origTitle || 'Compară');
            }
        });
    }

    function showComparison(a, b) {
        fetch('/api/produse').then(r => r.json()).then(j => {
            const prod = j.produse;
            const pa = prod.find(p => String(p.id) === String(a.id));
            const pb = prod.find(p => String(p.id) === String(b.id));
            if (!pa || !pb) { alert('Nu s-au putut găsi datele produselor.'); return; }
            const win = window.open('', '_blank', 'width=900,height=600');
            const keys = [
                ['Nume', 'nume'], ['Preț (EUR)', 'pret'], ['Categorie', 'categorie_mare'],
                ['Subcategorie', 'subcategorie'], ['Putere (CP)', 'putere_cp'],
                ['Culoare', 'culoare'], ['Caracteristici', 'caracteristici_multiple'],
                ['In stoc', 'in_stoc'], ['Data adăugare', 'data_adaugare']
            ];
            let rows = keys.map(([label, key]) => {
                const va = pa[key] !== undefined ? pa[key] : '—';
                const vb = pb[key] !== undefined ? pb[key] : '—';
                const diff = String(va) !== String(vb);
                return `<tr${diff ? ' style="background:#fef3c7"' : ''}><td><strong>${label}</strong></td><td>${va}</td><td>${vb}</td></tr>`;
            }).join('');
            const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="UTF-8"><title>Comparare: ${pa.nume} vs ${pb.nume}</title>
<link rel="stylesheet" href="/resurse/css/produse.css">
<style>body{padding:1rem;font-family:Arial,sans-serif} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:0.5rem 0.75rem} th{background:#1E3A8A;color:#fff} tr:hover{background:#f0f4ff} .img-row img{height:120px;object-fit:cover;border-radius:0.3rem;}</style>
</head><body>
<h2>Comparare produse</h2>
<table>
<thead><tr><th>Caracteristică</th><th>${pa.nume}</th><th>${pb.nume}</th></tr></thead>
<tbody>
<tr class="img-row"><td>Imagine</td><td><img src="${pa.imagine||''}"></td><td><img src="${pb.imagine||''}"></td></tr>
${rows}
</tbody></table>
<p style="margin-top:0.5rem;color:#888;font-size:0.8rem;">Rândurile <span style="background:#fef3c7;padding:0 4px;">colorate</span> indică diferențele.</p>
</body></html>`;
            win.document.write(html);
            win.document.close();
        }).catch(() => alert('Eroare la încărcarea datelor.'));
    }

    // check expiry
    const ts = Number(localStorage.getItem(TIME_KEY) || 0);
    if (ts && (Date.now() - ts) > MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TIME_KEY);
    }

    renderContainer();
    updateButtons();

    // Use event delegation on document for dynamically added btn-compare buttons
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-compare');
        if (!btn || btn.disabled) return;
        e.preventDefault();
        const id = btn.dataset.id;
        const name = btn.dataset.name || btn.textContent.trim();
        addItem(id, name);
    });
});
