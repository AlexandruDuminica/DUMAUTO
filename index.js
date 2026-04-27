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