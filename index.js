const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');
const sharp = require('sharp');

const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

const obGlobal = { 
    obErori: null,
    folderScss: path.join(__dirname, 'resurse', 'scss'),
    folderCss: path.join(__dirname, 'resurse', 'css')
};

const { Pool } = require('pg');

// Offer generation and backup cleanup configuration (demo-friendly values)
const OFFERT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes for demo
const OFFERT_T2_MINUTES = 5; // cleanup expired offers older than T2 minutes
const BACKUP_CLEANUP_MINUTES = 60; // remove backup files older than this (minutes)

const oferteFile = path.join(__dirname, 'data', 'oferte.json');

function readOffersFile() {
    try {
        if (!fs.existsSync(oferteFile)) return { oferte: [] };
        return JSON.parse(fs.readFileSync(oferteFile));
    } catch (e) { return { oferte: [] }; }
}

function writeOffersFile(obj) {
    try { fs.writeFileSync(oferteFile, JSON.stringify(obj, null, 2)); } catch (e) {}
}

async function generateRandomOffer(availableCategories) {
    try {
        if (!availableCategories || availableCategories.length === 0) return;
        const vals = [5,10,15,20,25,30,35,40,45,50];
        let data = readOffersFile();
        const prev = data.oferte && data.oferte[0] ? data.oferte[0].categorie : null;
        // pick a random category not equal to prev
        let pool = availableCategories.filter(c => c !== prev);
        if (pool.length === 0) pool = availableCategories.slice();
        const categorie = pool[Math.floor(Math.random() * pool.length)];
        const reducere = vals[Math.floor(Math.random() * vals.length)];
        const incepe = new Date();
        const termina = new Date(incepe.getTime() + OFFERT_INTERVAL_MS);
        const oferta = { categorie: categorie, 'data-incepere': incepe.toISOString(), 'data-finalizare': termina.toISOString(), reducere };
        data.oferte = data.oferte || [];
        data.oferte.unshift(oferta);
        // cleanup offers older than OFFERT_T2_MINUTES
        const cutoff = new Date(Date.now() - OFFERT_T2_MINUTES * 60 * 1000);
        data.oferte = data.oferte.filter(o => new Date(o['data-finalizare']) >= cutoff);
        writeOffersFile(data);
        return oferta;
    } catch (e) { return null; }
}

// periodic backup cleanup
setInterval(() => {
    try {
        const folder = path.join(__dirname, 'backup');
        if (!fs.existsSync(folder)) return;
        const files = fs.readdirSync(folder, { withFileTypes: true });
        const cutoff = Date.now() - BACKUP_CLEANUP_MINUTES * 60 * 1000;
        files.forEach(f => {
            const full = path.join(folder, f.name);
            try {
                const stat = fs.statSync(full);
                if (stat.mtimeMs < cutoff) {
                    if (f.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
                    else fs.unlinkSync(full);
                }
            } catch (e) {}
        });
    } catch (e) {}
}, 5 * 60 * 1000);

async function loadProductsFromDB() {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const client = await pool.connect();
        try {
            // attempt to get enum values for categorie_mare
            let enumRes = await client.query("SELECT unnest(enum_range(NULL::categorie_mare))::text AS val");
            let categs = enumRes.rows.map(r => r.val);
            let prodRes = await client.query('SELECT * FROM produse ORDER BY id');
            let produse = prodRes.rows.map(p => ({
                ...p,
                imagine: path.posix.join('/resurse', p.imagine),
                luni_data: (new Date(p.data_adaugare)).getMonth() + 1
            }));
            client.release();
            await pool.end();
            return { produse, categs };
        } catch (e) {
            client.release();
            await pool.end();
            throw e;
        }
    } catch (e) {
        throw e;
    }
}

function loadProductsFromFile() {
    let f = path.join(__dirname, 'data', 'produse.json');
    if (!fs.existsSync(f)) return { produse: [], categs: [] };
    let raw = fs.readFileSync(f);
    let produse = JSON.parse(raw);
    // build categs from values (unique)
    let set = new Set();
    produse.forEach(p => set.add(p.categorie_mare));
    produse.forEach(p => p.imagine = path.posix.join('/resurse', p.imagine));
    return { produse, categs: Array.from(set) };
}
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
vect_foldere.forEach(f => {
    let c = path.join(__dirname, f);
    if (!fs.existsSync(c)) fs.mkdirSync(c);
});

function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisier = path.basename(caleScss, '.scss');
        caleCss = path.join(obGlobal.folderCss, numeFisier + '.css');
    }
    if (!path.isAbsolute(caleScss)) caleScss = path.join(obGlobal.folderScss, caleScss);
    if (!path.isAbsolute(caleCss)) caleCss = path.join(obGlobal.folderCss, caleCss);

    if (fs.existsSync(caleCss)) {
        let backupFolderCss = path.join(__dirname, 'backup', 'resurse', 'css');
        if (!fs.existsSync(backupFolderCss)) fs.mkdirSync(backupFolderCss, { recursive: true });
        
        let numeCss = path.basename(caleCss);
        let timestamp = new Date().getTime();
        let backupPath = path.join(backupFolderCss, numeCss.replace('.css', `_${timestamp}.css`));
        
        try {
            fs.copyFileSync(caleCss, backupPath);
        } catch (e) {}
    }

    try {
        let result = sass.compile(caleScss, { logger: sass.Logger.silent });
        fs.writeFileSync(caleCss, result.css);
    } catch (err) {}
}

if (fs.existsSync(obGlobal.folderScss)) {
    fs.readdirSync(obGlobal.folderScss).forEach(file => {
        if (file.endsWith('.scss')) compileazaScss(file);
    });

    fs.watch(obGlobal.folderScss, (eventType, filename) => {
        if (filename && filename.endsWith('.scss')) compileazaScss(filename);
    });
}

function initErori() {
    let raw = fs.readFileSync(path.join(__dirname, 'erori.json'));
    obGlobal.obErori = JSON.parse(raw);
    let cb = obGlobal.obErori.cale_baza;
    obGlobal.obErori.eroare_default.imagine = path.join(cb, obGlobal.obErori.eroare_default.imagine);
    obGlobal.obErori.info_erori.forEach(e => { e.imagine = path.join(cb, e.imagine); });
}
initErori();

function afisareEroare(res, id, titlu, text, img) {
    let g = obGlobal.obErori.info_erori.find(e => e.identificator == id);
    let o = {};
    if (g) {
        o.titlu = titlu || g.titlu; o.text = text || g.text; o.imagine = img || g.imagine;
        if(g.status) res.status(id);
    } else {
        let d = obGlobal.obErori.eroare_default;
        o.titlu = titlu || d.titlu; o.text = text || d.text; o.imagine = img || d.imagine;
    }
    res.render('pagini/eroare', { err: o });
}

async function pregatesteGalerie() {
    try {
        let jsonPath = path.join(__dirname, 'galerie.json');
        if (!fs.existsSync(jsonPath)) return [];
        
        let json = JSON.parse(fs.readFileSync(jsonPath));
        let hour = new Date().getHours();
        let timp = "noapte";
        
        if(hour >= 5 && hour < 12) timp = "dimineata";
        else if(hour >= 12 && hour < 20) timp = "zi";

        let imaginiFiltrate = json.imagini.filter(img => img.timp === timp);
        let limit = Math.min(Math.floor(imaginiFiltrate.length / 3) * 3, 6);
        let imaginiFinale = imaginiFiltrate.slice(0, limit);

        for (let img of imaginiFinale) {
            let basePath = path.join(__dirname, 'resurse', json.cale_galerie);
            let inputPath = path.join(basePath, img.cale_relativa);
            let micName = img.cale_relativa.replace(/(\.[a-zA-Z]+)$/, '-mic$1');
            let outputPath = path.join(basePath, micName);

            img.cale_mica = path.posix.join('/resurse', json.cale_galerie, micName);
            img.cale_mare = path.posix.join('/resurse', json.cale_galerie, img.cale_relativa);

            if (fs.existsSync(inputPath) && !fs.existsSync(outputPath)) {
                try { await sharp(inputPath).resize(300).toFile(outputPath); } 
                catch(e) {}
            }
        }
        return imaginiFinale;
    } catch (e) {
        return [];
    }
}

app.use((req, res, next) => {
    res.locals.userIP = req.ip;
    res.locals.galerie = []; 
    res.locals.produseCategs = [];
    // attach current offer to locals for all views
    try {
        const of = readOffersFile();
        res.locals.currentOffer = of.oferte && of.oferte.length ? of.oferte[0] : null;
    } catch (e) { res.locals.currentOffer = null; }
    next();
});

app.get(/^\/resurse(\/[a-zA-Z0-9_-]+)*\/?$/, (req, res) => { afisareEroare(res, 403); });
app.get(/\.ejs$/, (req, res) => { afisareEroare(res, 400); });

app.get(['/', '/index', '/home'], async (req, res) => {
    try {
        res.locals.galerie = await pregatesteGalerie();
    } catch (e) {}
    res.render('pagini/index');
});

// Produse list - supports optional query ?categ=category
app.get('/produse', async (req, res) => {
    try {
        let data;
        try { data = await loadProductsFromDB(); } catch(e) { data = loadProductsFromFile(); }
        let produse = data.produse;
        let categs = data.categs;
        res.locals.produseCategs = categs;
        // ensure offers file exists
        if (!fs.existsSync(oferteFile)) writeOffersFile({ oferte: [] });
        // if no offers exist, generate one
        let offersData = readOffersFile();
        if ((!offersData.oferte || offersData.oferte.length === 0) && categs.length) {
            await generateRandomOffer(categs);
            offersData = readOffersFile();
        }
        const currentOffer = offersData.oferte && offersData.oferte.length ? offersData.oferte[0] : null;
        res.locals.currentOffer = currentOffer;
        // server-side category filter (menu links will pass ?categ=...)
        if (req.query.categ) {
            produse = produse.filter(p => p.categorie_mare.toLowerCase() === req.query.categ.toLowerCase());
        }
        // compute cheapest per category
        const cheapest = {};
        produse.forEach(p => {
            if (!(p.categorie_mare in cheapest) || Number(p.pret) < Number(cheapest[p.categorie_mare].pret)) cheapest[p.categorie_mare] = p;
        });

        // provide formatted date for each product
        produse = produse.map(p => {
            let d = new Date(p.data_adaugare);
            const luni = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
            const zile = ['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata'];
            p.formattedDate = `${d.getDate()}-${luni[d.getMonth()]}-${d.getFullYear()} (${zile[d.getDay()]})`;
            // mark cheapest
            p.isCheapest = cheapest[p.categorie_mare] && Number(cheapest[p.categorie_mare].id) === Number(p.id);
            // mark new product (demo: within 365 days -> use 180 days for demo)
            const NEW_DAYS = 180;
            p.isNew = (Date.now() - d.getTime()) <= NEW_DAYS * 24 * 60 * 60 * 1000;
            // apply current offer discount if category matches
            if (currentOffer && p.categorie_mare === currentOffer.categorie) {
                p.discount = Number(currentOffer.reducere);
                p.pret_redus = Math.round(Number(p.pret) * (100 - p.discount) / 100);
            }
            return p;
        });
        res.render('pagini/produse', { produse });
    } catch (err) {
        afisareEroare(res, 500, 'Eroare Produse', err.message);
    }
});

// Single product page
app.get('/produs/:id', async (req, res) => {
    try {
        let data;
        try { data = await loadProductsFromDB(); } catch(e) { data = loadProductsFromFile(); }
        let produs = data.produse.find(p => String(p.id) === String(req.params.id));
        if (!produs) return afisareEroare(res, 404);
        let d = new Date(produs.data_adaugare);
        const luni = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
        const zile = ['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata'];
        produs.formattedDate = `${d.getDate()}-${luni[d.getMonth()]}-${d.getFullYear()} (${zile[d.getDay()]})`;
        // find similar products (same categorie)
        let allData = loadProductsFromFile();
        let similare = allData.produse.filter(x => String(x.categorie_mare) === String(produs.categorie_mare) && String(x.id) !== String(produs.id)).slice(0,4);
        // format similar dates
        similare = similare.map(s=>{ let d=new Date(s.data_adaugare); const luni=['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']; const zile=['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata']; s.formattedDate = `${d.getDate()}-${luni[d.getMonth()]}-${d.getFullYear()} (${zile[d.getDay()]})`; s.imagine = path.posix.join('/resurse', s.imagine); return s; });
        res.render('pagini/produs', { produs, similare });
    } catch (err) {
        afisareEroare(res, 500, 'Eroare Produs', err.message);
    }
});

// API route to serve offers JSON
app.get('/api/oferte', (req, res) => {
    res.json(readOffersFile());
});

// API route for products (JSON fallback)
app.get('/api/produse', (req, res) => {
    try { let data = loadProductsFromFile(); res.json({ produse: data.produse }); } catch (e) { res.json({ produse: [] }); }
});

// Sets route (simple JSON-driven sets fallback)
app.get('/seturi', (req, res) => {
    let f = path.join(__dirname, 'data', 'seturi.json');
    if (!fs.existsSync(f)) return afisareEroare(res, 404, 'Nu exista seturi');
    let sets = JSON.parse(fs.readFileSync(f));
    // compute prices
    let data = loadProductsFromFile();
    sets = sets.map(s => {
        let produseSet = s.produse.map(id => data.produse.find(p=>String(p.id)===String(id))).filter(Boolean);
        let sum = produseSet.reduce((acc,p)=>acc+Number(p.pret),0);
        let n = produseSet.length;
        let reduc = Math.min(5,n) * 5; // percent
        let price = Math.round(sum * (100 - reduc) / 100);
        return { ...s, produseSet, price, reduc };
    });
    res.render('pagini/seturi', { sets });
});

// Start periodic offer generator using categories from data file
setInterval(async () => {
    try {
        let data = loadProductsFromFile();
        await generateRandomOffer(data.categs);
    } catch (e) {}
}, OFFERT_INTERVAL_MS);

app.get(/(.*)/, (req, res) => {
    let p = req.params[0] ? req.params[0].replace(/^\//, '').replace(/\/$/, '').toLowerCase() : 'index';
    
    res.render('pagini/' + p, (err, html) => {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res, 500, "Eroare Server", err.message, null);
        } else {
            res.send(html);
        }
    });
});

app.listen(port, () => console.log(`Server la: http://localhost:${port}`));