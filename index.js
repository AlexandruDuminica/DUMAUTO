const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

console.log("Filename:", __filename);
console.log("Dirname:", __dirname);
console.log("CWD:", process.cwd());

const obGlobal = { obErori: null };
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];

// Task: Creare foldere automate
vect_foldere.forEach(f => {
    let c = path.join(__dirname, f);
    if (!fs.existsSync(c)) fs.mkdirSync(c);
});

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
        o.titlu = titlu || g.titlu;
        o.text = text || g.text;
        o.imagine = img || g.imagine;
        if(g.status) res.status(id);
    } else {
        let d = obGlobal.obErori.eroare_default;
        o.titlu = titlu || d.titlu;
        o.text = text || d.text;
        o.imagine = img || d.imagine;
    }
    res.render('pagini/eroare', { err: o });
}

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse/imagini/favicon/favicon.ico'));
});

// Rute speciale folosind RegEx (Standard sigur pentru Express 5)
app.get(/^\/resurse(\/[a-zA-Z0-9_-]+)*\/?$/, (req, res) => { afisareEroare(res, 403); });
app.get(/\.ejs$/, (req, res) => { afisareEroare(res, 400); });

// Rutele principale
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index', { userIP: req.ip });
});

/**
 * SOLUȚIA PENTRU EXPRESS 5:
 * Folosim o expresie regulată care prinde orice (.*)
 * req.params[0] va conține restul căii.
 */
app.get(/(.*)/, (req, res) => {
    // Preluăm calea și eliminăm slash-ul inițial
    let p = req.params[0] ? req.params[0].replace(/^\//, '') : 'index';
    if (p === "") p = "index";

    res.render('pagini/' + p, { userIP: req.ip }, (err, html) => {
        if (err) {
            if (err.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500, "Ereare Server", err.message, null);
            }
        } else {
            res.send(html);
        }
    });
});

app.listen(port, () => console.log(`Server la: http://localhost:${port}`));