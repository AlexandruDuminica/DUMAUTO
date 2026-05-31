const express = require('express');
const path = require('path');
const fs = require('fs');
const sass = require('sass');
const sharp = require('sharp');

const app = express();
const port = 8080;

// Cerinta 3: afisare cai la pornirea serverului
console.log('__dirname   :', __dirname);
console.log('__filename  :', __filename);
console.log('process.cwd():', process.cwd());
console.log('Notă: __dirname și process.cwd() NU sunt întotdeauna același lucru. __dirname este calea absolută a directorului în care se află fișierul curent (index.js), indiferent de unde este pornit procesul. process.cwd() returnează directorul de lucru curent al procesului Node.js, care poate diferi dacă serverul este pornit dintr-un alt director cu "node cale/catre/index.js".');

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

// Bonus 13: periodic backup cleanup — recursively delete files older than BACKUP_CLEANUP_MINUTES
function cleanBackupDir(dir, cutoff) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(f => {
            const full = path.join(dir, f.name);
            try {
                if (f.isDirectory()) {
                    cleanBackupDir(full, cutoff);
                } else {
                    const stat = fs.statSync(full);
                    if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
                }
            } catch (e) {}
        });
    } catch (e) {}
}

setInterval(() => {
    const folder = path.join(__dirname, 'backup');
    if (!fs.existsSync(folder)) return;
    const cutoff = Date.now() - BACKUP_CLEANUP_MINUTES * 60 * 1000;
    cleanBackupDir(folder, cutoff);
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
    obGlobal.obErori.eroare_default.imagine = path.posix.join(cb, obGlobal.obErori.eroare_default.imagine);
    obGlobal.obErori.info_erori.forEach(e => { e.imagine = path.posix.join(cb, e.imagine); });
}

// Functie helper: detecteaza chei duplicate per obiect in string JSON (verificare pe string, nu pe obiect)
function gasesteCheiDuplicate(jsonString) {
    const probleme = [];
    const stiva = []; // { type: 'object'|'array', chei: {}, expectKey: bool }
    let inString = false, escape = false, cheieCurrenta = '', esteKey = false;

    for (let i = 0; i < jsonString.length; i++) {
        const ch = jsonString[i];
        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') {
            if (!inString) {
                inString = true;
                cheieCurrenta = '';
                const top = stiva.length > 0 ? stiva[stiva.length - 1] : null;
                esteKey = top && top.type === 'object' && top.expectKey;
            } else {
                inString = false;
                if (esteKey) {
                    const top = stiva[stiva.length - 1];
                    if (top.chei[cheieCurrenta]) {
                        probleme.push({ cheie: cheieCurrenta, nivel: stiva.length });
                    } else {
                        top.chei[cheieCurrenta] = true;
                    }
                    top.expectKey = false; // urmeaza ':' si valoarea
                }
                esteKey = false;
            }
            continue;
        }
        if (inString) { if (esteKey) cheieCurrenta += ch; continue; }
        if (ch === ',') {
            const top = stiva.length > 0 ? stiva[stiva.length - 1] : null;
            if (top && top.type === 'object') top.expectKey = true;
        } else if (ch === '{') {
            stiva.push({ type: 'object', chei: {}, expectKey: true });
        } else if (ch === '}') {
            stiva.pop();
        } else if (ch === '[') {
            stiva.push({ type: 'array', chei: {}, expectKey: false });
        } else if (ch === ']') {
            stiva.pop();
        }
    }
    return probleme;
}

// Functia de verificare a datelor din erori.json — apelata la pornirea serverului
function verificaErori() {
    const caleJson = path.join(__dirname, 'erori.json');

    // 1. Fisierul nu exista -> iesire din aplicatie
    if (!fs.existsSync(caleJson)) {
        console.error('[ERORI] CRITIC: Fisierul erori.json nu exista in radacina proiectului! Verificati ca fisierul este prezent. Aplicatia se inchide.');
        process.exit(1);
    }

    const rawString = fs.readFileSync(caleJson, 'utf8');
    let obj;
    try { obj = JSON.parse(rawString); } catch (e) {
        console.error('[ERORI] CRITIC: erori.json contine JSON invalid:', e.message, '— Aplicatia se inchide.');
        process.exit(1);
    }

    // 2. Proprietati obligatorii la nivel de radacina
    for (const prop of ['info_erori', 'cale_baza', 'eroare_default']) {
        if (!(prop in obj)) {
            console.error(`[ERORI] Proprietatea obligatorie "${prop}" lipseste din erori.json. Adaugati aceasta proprietate.`);
        }
    }

    // 3. eroare_default trebuie sa aiba titlu, text, imagine
    if (obj.eroare_default) {
        for (const prop of ['titlu', 'text', 'imagine']) {
            if (!(prop in obj.eroare_default)) {
                console.error(`[ERORI] Proprietatea "${prop}" lipseste din obiectul "eroare_default". Completati proprietatea lipsa.`);
            }
        }
    }

    // 4. Folderul cale_baza trebuie sa existe pe disc
    if (obj.cale_baza) {
        const folderAbs = path.join(__dirname, obj.cale_baza.replace(/^\//, ''));
        if (!fs.existsSync(folderAbs)) {
            console.error(`[ERORI] Folderul specificat in "cale_baza" ("${obj.cale_baza}") nu exista pe disc la calea: ${folderAbs}. Creati folderul sau corectati calea in erori.json.`);
        }
    }

    // 5. Imaginile asociate erorilor trebuie sa existe pe disc
    if (obj.cale_baza) {
        const folderAbs = path.join(__dirname, obj.cale_baza.replace(/^\//, ''));
        const verificaImg = (imagine, context) => {
            if (!imagine) return;
            const imgPath = path.join(folderAbs, imagine);
            if (!fs.existsSync(imgPath)) {
                console.error(`[ERORI] Imaginea "${imagine}" asociata ${context} nu exista la calea: ${imgPath}. Adaugati fisierul imagine sau corectati calea.`);
            }
        };
        if (obj.eroare_default) verificaImg(obj.eroare_default.imagine, '"eroare_default"');
        if (obj.info_erori) obj.info_erori.forEach(e => verificaImg(e.imagine, `erorii cu identificatorul ${e.identificator}`));
    }

    // 6. Proprietati duplicate in acelasi obiect (verificare pe string-ul JSON brut)
    const duplicate = gasesteCheiDuplicate(rawString);
    duplicate.forEach(({ cheie, nivel }) => {
        console.error(`[ERORI] Proprietatea "${cheie}" apare de mai multe ori in acelasi obiect (nivel de imbricare: ${nivel}) in erori.json. Stergeti aparitia duplicata.`);
    });

    // 7. Identificatori duplicati in vectorul info_erori
    if (obj.info_erori) {
        const grupate = {};
        obj.info_erori.forEach(e => {
            const id = e.identificator;
            if (!grupate[id]) grupate[id] = [];
            grupate[id].push(e);
        });
        for (const [id, lista] of Object.entries(grupate)) {
            if (lista.length > 1) {
                const detalii = lista.map(e => `[titlu: "${e.titlu}", text: "${e.text}", imagine: "${e.imagine}"]`).join('; ');
                console.error(`[ERORI] Exista ${lista.length} erori cu acelasi identificator ${id} in "info_erori". Detaliile lor (fara identificator): ${detalii}. Eliminati duplicatele.`);
            }
        }
    }
}

verificaErori();
initErori();

// Bonus 5: Verificare date din galerie.json la pornirea serverului
function verificaGalerie() {
    const caleJson = path.join(__dirname, 'galerie.json');

    if (!fs.existsSync(caleJson)) {
        console.error('[GALERIE] Fisierul galerie.json nu exista in radacina proiectului! Adaugati fisierul.');
        return;
    }

    let obj;
    try { obj = JSON.parse(fs.readFileSync(caleJson, 'utf8')); } catch (e) {
        console.error('[GALERIE] galerie.json contine JSON invalid:', e.message);
        return;
    }

    // 1. Folderul specificat in "cale_galerie" trebuie sa existe pe disc
    if (!obj.cale_galerie) {
        console.error('[GALERIE] Proprietatea "cale_galerie" lipseste din galerie.json.');
        return;
    }
    const folderAbs = path.join(__dirname, 'resurse', obj.cale_galerie);
    if (!fs.existsSync(folderAbs)) {
        console.error(`[GALERIE] Folderul specificat in "cale_galerie" ("resurse/${obj.cale_galerie}") nu exista pe disc la calea: ${folderAbs}. Creati folderul sau corectati calea in galerie.json.`);
    }

    // 2. Fiecare fisier imagine specificat in lista trebuie sa existe pe disc
    if (obj.imagini && Array.isArray(obj.imagini)) {
        obj.imagini.forEach(img => {
            const imgPath = path.join(folderAbs, img.cale_relativa);
            if (!fs.existsSync(imgPath)) {
                console.error(`[GALERIE] Imaginea "${img.cale_relativa}" (${img.nume || 'fara nume'}) nu exista pe disc la calea: ${imgPath}. Adaugati fisierul sau corectati "cale_relativa" in galerie.json.`);
            }
        });
    }
}
verificaGalerie();

// Galerie animata (Bonus 1): generare dinamica SCSS + compilare pe fiecare request
async function pregatesteGalerieAnimata() {
    try {
        const allowed = [7, 8, 9, 11]; // N in [7,11], N != 10
        const n = allowed[Math.floor(Math.random() * allowed.length)];

        const jsonPath = path.join(__dirname, 'galerie.json');
        if (!fs.existsSync(jsonPath)) return [];

        const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const allImages = [...json.imagini];

        // Shuffle Fisher-Yates
        for (let i = allImages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
        }

        const selectedImages = allImages.slice(0, n).map(img => ({
            ...img,
            cale_mare: path.posix.join('/resurse', json.cale_galerie, img.cale_relativa)
        }));

        // Genereaza galerie_animata.scss cu $galerie-count setat dinamic
        // si compileaza-l cu compileazaScss (care face si backup-ul CSS vechi)
        const scssContent = `// Fisier generat automat de server la fiecare request\n// galerie-count: ${n} imagini selectate aleator\n@use 'galerie_animata_base' with ($galerie-count: ${n});\n`;
        const scssPath = path.join(obGlobal.folderScss, 'galerie_animata.scss');
        fs.writeFileSync(scssPath, scssContent);
        compileazaScss('galerie_animata.scss', 'galerie_animata.css');

        return selectedImages;
    } catch (e) {
        console.error('[GALERIE-ANIM] Eroare pregatesteGalerieAnimata:', e.message);
        return [];
    }
}

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
    // parse cookies (simple)
    res.locals.lastVisitedProduct = null;
    try {
        const cookies = {};
        if (req.headers.cookie) req.headers.cookie.split(';').forEach(c => { const [k,v] = c.split('='); if (k && v) cookies[k.trim()] = decodeURIComponent(v.trim()); });
        if (cookies.ultimulProdus) res.locals.lastVisitedProduct = cookies.ultimulProdus;
    } catch (e) {}
    next();
});

app.get(/^\/resurse(\/[a-zA-Z0-9_-]+)*\/?$/, (req, res) => { afisareEroare(res, 403); });
app.get(/\.ejs$/, (req, res) => { afisareEroare(res, 400); });

app.get(['/', '/index', '/home'], async (req, res) => {
    try {
        res.locals.galerie = await pregatesteGalerie();
    } catch (e) {}
    try {
        res.locals.galerieAnimata = await pregatesteGalerieAnimata();
    } catch (e) { res.locals.galerieAnimata = []; }
    // Bonus 12: ensure an offer exists when visiting homepage
    try {
        const offersData = readOffersFile();
        if (!offersData.oferte || offersData.oferte.length === 0) {
            const d = loadProductsFromFile();
            if (d.categs.length) {
                await generateRandomOffer(d.categs);
                const freshOffers = readOffersFile();
                res.locals.currentOffer = freshOffers.oferte && freshOffers.oferte.length ? freshOffers.oferte[0] : null;
            }
        }
    } catch (e) {}
    // Bonus 18: compute new products (added within 365 days), sorted reverse-chronological
    try {
        const allData = loadProductsFromFile();
        const NEW_DAYS = 365;
        const now = Date.now();
        res.locals.produseNoi = allData.produse
            .filter(p => (now - new Date(p.data_adaugare).getTime()) <= NEW_DAYS * 24 * 60 * 60 * 1000)
            .sort((a, b) => new Date(b.data_adaugare) - new Date(a.data_adaugare));
    } catch (e) { res.locals.produseNoi = []; }
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

        // compute global min/max pret for range input (Bonus 1)
        const allPrets = produse.map(p => Number(p.pret)).filter(v => !isNaN(v));
        const pretMin = allPrets.length ? Math.min(...allPrets) : 0;
        const pretMax = allPrets.length ? Math.max(...allPrets) : 100000;

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
        res.render('pagini/produse', { produse, pretMin, pretMax });
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
        // Bonus 9: find all images for this product (same base name, e.g. car1.jpg → car1-2.jpg, car1-3.jpg)
        let imaginiProdus = [produs.imagine];
        try {
            const imgRel = produs.imagine; // e.g. /resurse/imagini/galerie/car1.jpg
            const imgAbs = path.join(__dirname, imgRel.replace(/^\//, ''));
            const imgDir = path.dirname(imgAbs);
            const baseName = path.basename(imgAbs, path.extname(imgAbs)); // e.g. car1
            const ext = path.extname(imgAbs); // e.g. .jpg
            if (fs.existsSync(imgDir)) {
                const siblings = fs.readdirSync(imgDir)
                    .filter(f => f.startsWith(baseName + '-') && f.endsWith(ext))
                    .sort()
                    .map(f => path.posix.join(path.dirname(imgRel), f));
                imaginiProdus = [produs.imagine, ...siblings];
            }
        } catch(e) {}
        // find similar products (same categorie)
        let allData = loadProductsFromFile();
        let similare = allData.produse.filter(x => String(x.categorie_mare) === String(produs.categorie_mare) && String(x.id) !== String(produs.id)).slice(0,4);
        // format similar dates
        similare = similare.map(s=>{ let d=new Date(s.data_adaugare); const luni=['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']; const zile=['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata']; s.formattedDate = `${d.getDate()}-${luni[d.getMonth()]}-${d.getFullYear()} (${zile[d.getDay()]})`; return s; });
        // Bonus 17.4: find sets that contain this product
        let seturiProdus = [];
        try {
            const seturiF = path.join(__dirname, 'data', 'seturi.json');
            if (fs.existsSync(seturiF)) {
                const seturiRaw = JSON.parse(fs.readFileSync(seturiF));
                seturiProdus = seturiRaw
                    .filter(s => s.produse && s.produse.map(String).includes(String(produs.id)))
                    .map(s => {
                        const produseSet = s.produse
                            .map(pid => allData.produse.find(p => String(p.id) === String(pid)))
                            .filter(Boolean);
                        const sum = produseSet.reduce((acc, p) => acc + Number(p.pret), 0);
                        const n = produseSet.length;
                        const reduc = Math.min(5, n) * 5;
                        const price = Math.round(sum * (100 - reduc) / 100);
                        return { ...s, produseSet, price, reduc };
                    });
            }
        } catch(e) {}
        // Bonus 18: mark isNew
        const NEW_DAYS_PRODUS = 365;
        produs.isNew = (Date.now() - new Date(produs.data_adaugare).getTime()) <= NEW_DAYS_PRODUS * 24 * 60 * 60 * 1000;
        // set cookie for last visited product (1 week)
        try { res.setHeader('Set-Cookie', `ultimulProdus=${encodeURIComponent(produs.nume)}; Max-Age=${7*24*60*60}; Path=/`); } catch(e){}
        res.render('pagini/produs', { produs, similare, imaginiProdus, seturiProdus });
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

// Bonus 10a+10b: server-side filter + sort via fetch
app.get('/api/produse-filtrate', async (req, res) => {
    try {
        let data;
        try { data = await loadProductsFromDB(); } catch(e) { data = loadProductsFromFile(); }
        let produse = data.produse;

        // apply offer discount
        const offersData = readOffersFile();
        const currentOffer = offersData.oferte && offersData.oferte.length ? offersData.oferte[0] : null;

        const luni = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie'];
        const zile = ['Duminica','Luni','Marti','Miercuri','Joi','Vineri','Sambata'];

        produse = produse.map(p => {
            const d = new Date(p.data_adaugare);
            p.formattedDate = `${d.getDate()}-${luni[d.getMonth()]}-${d.getFullYear()} (${zile[d.getDay()]})`;
            p.luni_data = d.getMonth() + 1;
            if (currentOffer && p.categorie_mare === currentOffer.categorie) {
                p.discount = Number(currentOffer.reducere);
                p.pret_redus = Math.round(Number(p.pret) * (100 - p.discount) / 100);
            }
            return p;
        });

        // ─ Filtrare ─
        const { nume, pretMax, sub, culoare, discountOnly, luni: luniQ, desc } = req.query;
        if (nume) produse = produse.filter(p => (p.nume||'').toLowerCase().includes(nume.toLowerCase()) || (p.descriere||'').toLowerCase().includes(nume.toLowerCase()));
        if (pretMax) produse = produse.filter(p => Number(p.pret) <= Number(pretMax));
        if (sub) produse = produse.filter(p => (p.subcategorie||'').toLowerCase().includes(sub.toLowerCase()));
        if (culoare && culoare !== 'toate') produse = produse.filter(p => (p.culoare||'').toLowerCase() === culoare.toLowerCase());
        if (discountOnly === '1') produse = produse.filter(p => Number(p.pret) > 30000);
        if (luniQ) {
            const luniArr = Array.isArray(luniQ) ? luniQ : luniQ.split(',');
            produse = produse.filter(p => luniArr.includes(String(p.luni_data)));
        }
        if (desc && desc.length >= 3) produse = produse.filter(p => (p.descriere||'').toLowerCase().includes(desc.toLowerCase()));

        // ─ Sortare ─
        const key1 = req.query.key1 || 'pret';
        const key2 = req.query.key2 || 'none';
        const dir = req.query.dir || 'asc';
        const asc = dir === 'asc';

        function getVal(p, key) {
            if (key === 'pret') return Number(p.pret) || 0;
            if (key === 'nume') return (p.nume||'').toLowerCase();
            if (key === 'putere_cp') return Number(p.putere_cp) || 0;
            if (key === 'data') return p.data_adaugare || '';
            return '';
        }
        produse.sort((a, b) => {
            let v1a = getVal(a, key1), v1b = getVal(b, key1);
            let c = (typeof v1a === 'number' && typeof v1b === 'number') ? v1a - v1b : String(v1a).localeCompare(String(v1b), 'ro');
            if (c === 0 && key2 && key2 !== 'none') {
                let v2a = getVal(a, key2), v2b = getVal(b, key2);
                c = (typeof v2a === 'number' && typeof v2b === 'number') ? v2a - v2b : String(v2a).localeCompare(String(v2b), 'ro');
            }
            return asc ? c : -c;
        });

        // mark cheapest per category
        const cheapest = {};
        produse.forEach(p => {
            if (!(p.categorie_mare in cheapest) || Number(p.pret) < Number(cheapest[p.categorie_mare].pret)) cheapest[p.categorie_mare] = p;
        });
        produse = produse.map(p => ({
            ...p,
            isCheapest: cheapest[p.categorie_mare] && Number(cheapest[p.categorie_mare].id) === Number(p.id),
            isNew: (Date.now() - new Date(p.data_adaugare).getTime()) <= 180 * 24 * 60 * 60 * 1000
        }));

        res.json({ produse });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
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

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse', 'imagini', 'favicon', 'favicon.ico'));
});

app.get('/galerie', async (req, res) => {
    try {
        res.locals.galerie = await pregatesteGalerie();
    } catch (e) { res.locals.galerie = []; }
    res.render('pagini/galerie');
});

app.get(/(.*)/, (req, res) => {
    let p = req.params[0] ? req.params[0].replace(/^\//, '').replace(/\/$/, '').toLowerCase() : 'index';

    // Daca URL-ul are extensie de fisier (nu EJS), nu incercam sa renderam
    const ext = path.extname(p);
    if (ext && ext !== '.ejs') return afisareEroare(res, 404);

    res.render('pagini/' + p, (err, html) => {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) afisareEroare(res, 404);
            else afisareEroare(res, 500, "Eroare Server", err.message, null);
        } else {
            res.send(html);
        }
    });
});

app.listen(port, () => {
    console.log(`Server la: http://localhost:${port}`);
    // Genereaza galerie_animata.css initial (sa nu fie 404 la primul request)
    pregatesteGalerieAnimata().catch(() => {});
});