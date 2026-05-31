const AccesBD = require('../utils/AccesBD');
const Drepturi = require('../utils/drepturi');
const { RolFactory } = require('../utils/roluri');

/**
 * Clasa Utilizator — reprezintă un utilizator al aplicației.
 * Conține proprietăți corespunzătoare câmpurilor din tabelul `utilizatori`
 * și metode de validare, persistență și interacțiune cu baza de date.
 */
class Utilizator {
    /**
     * Creează o instanță Utilizator.
     * @param {Object} [obj={}] - Obiect cu proprietățile utilizatorului.
     * @param {number|null} [obj.id] - ID-ul utilizatorului.
     * @param {string} [obj.username] - Username-ul.
     * @param {string} [obj.nume] - Numele complet.
     * @param {string} [obj.email] - Adresa de e-mail.
     * @param {string} [obj.parola] - Parola (hash).
     * @param {string} [obj.rol] - Rolul ('client', 'admin', 'moderator').
     */
    constructor(obj = {}) {
        this.id = obj.id || null;
        this.username = obj.username || '';
        this.nume = obj.nume || '';
        this.email = obj.email || '';
        this.parola = obj.parola || '';
        this.rol = obj.rol || 'client';
    }

    /**
     * Verifică dacă numele utilizatorului respectă formatul cerut (minim 3 caractere).
     * @returns {boolean}
     */
    verificaNume() { return typeof this.nume === 'string' && this.nume.length >= 3; }

    /**
     * Verifică dacă username-ul respectă formatul cerut (minim 3 caractere, doar litere mici, cifre, _ sau -).
     * @returns {boolean}
     */
    verificaUsername() { return typeof this.username === 'string' && /^[a-z0-9_\-]{3,}$/.test(this.username); }

    /**
     * Înregistrează utilizatorul în baza de date.
     * Aruncă eroare dacă username-ul există deja.
     * @returns {Promise<Object>} Înregistrarea inserată.
     * @throws {Error} Dacă username-ul este deja existent.
     */
    async salvareUtilizator() {
        const db = AccesBD.getInstanta().getClient();
        if (!db) throw new Error('Conexiunea la baza de date nu este inițializată');
        const res = await db.query('SELECT id FROM utilizatori WHERE username=$1', [this.username]);
        if (res.rows.length) throw new Error(`Username-ul "${this.username}" este deja utilizat. Alegeți alt username.`);
        const insert = await db.query(
            'INSERT INTO utilizatori (username,nume,email,parola,rol) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [this.username, this.nume, this.email, this.parola, this.rol]
        );
        return insert.rows[0];
    }

    /**
     * Modifică datele utilizatorului curent în baza de date.
     * @param {Object} ob - Obiect cu câmpurile de modificat și valorile lor.
     * @returns {Promise<Object>} Înregistrarea actualizată.
     * @throws {Error} Dacă utilizatorul nu are id setat (nu există).
     */
    async modifica(ob) {
        const db = AccesBD.getInstanta().getClient();
        if (!db) throw new Error('Conexiunea la baza de date nu este inițializată');
        if (!this.id) throw new Error('Utilizatorul nu există (id lipsă)');
        const fields = Object.keys(ob);
        const vals = Object.values(ob);
        const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(',');
        const res = await db.query(`UPDATE utilizatori SET ${sets} WHERE id=${this.id} RETURNING *`, vals);
        return res.rows[0];
    }

    /**
     * Șterge utilizatorul curent din baza de date.
     * @returns {Promise<boolean>}
     * @throws {Error} Dacă utilizatorul nu are id setat.
     */
    async sterge() {
        const db = AccesBD.getInstanta().getClient();
        if (!db) throw new Error('Conexiunea la baza de date nu este inițializată');
        if (!this.id) throw new Error('Utilizatorul nu există (id lipsă)');
        await db.query('DELETE FROM utilizatori WHERE id=$1', [this.id]);
        return true;
    }

    /**
     * Verifică dacă utilizatorul are un anumit drept, în funcție de rol.
     * @param {Symbol} drept - Un simbol din obiectul Drepturi.
     * @returns {boolean}
     */
    areDreptul(drept) {
        const rolObj = RolFactory.creeazaRol(this.rol);
        return rolObj.areDreptul(drept);
    }

    /**
     * Caută sincron un utilizator după username și apelează callback-ul cu utilizatorul găsit și obiectul auxiliar `ob`.
     * @param {string} username - Username-ul de căutat.
     * @param {Object} ob - Obiect auxiliar (ex: { parola: '...' }) transmis callback-ului pentru verificări suplimentare.
     * @param {(err: any, utilizator: Object|null, ob: Object) => void} callback - Funcție apelată cu eroare, utilizator și ob.
     */
    static getUtilizDupaUsername(username, ob, callback) {
        const db = AccesBD.getInstanta().getClient();
        db.query('SELECT * FROM utilizatori WHERE username=$1', [username], (err, res) => {
            if (err) return callback(err, null, ob);
            const row = res.rows[0] || null;
            callback(null, row, ob);
        });
    }

    /**
     * Caută asincron un utilizator după username.
     * @param {string} username - Username-ul de căutat.
     * @returns {Promise<Utilizator|null>} Obiect Utilizator sau null dacă nu a fost găsit.
     */
    static async getUtilizDupaUsernameAsync(username) {
        const db = AccesBD.getInstanta().getClient();
        if (!db) return null;
        const res = await db.query('SELECT * FROM utilizatori WHERE username=$1', [username]);
        return res.rows[0] ? new Utilizator(res.rows[0]) : null;
    }

    /**
     * Caută sincron utilizatori după un set de criterii (proprietăți nedefinite sunt ignorate).
     * @param {Object} obParam - Obiect cu proprietăți de filtrat (undefined/null sunt ignorate).
     * @param {(err: any, listaUtiliz: Utilizator[]) => void} callback - Funcție apelată cu eroare și lista de utilizatori.
     */
    static cauta(obParam, callback) {
        const db = AccesBD.getInstanta().getClient();
        const filteredKeys = Object.keys(obParam).filter(k => obParam[k] !== undefined && obParam[k] !== null);
        if (filteredKeys.length === 0) {
            db.query('SELECT * FROM utilizatori', [], (err, res) => {
                if (err) return callback(err, null);
                callback(null, res.rows.map(r => new Utilizator(r)));
            });
            return;
        }
        const conds = filteredKeys.map((k, i) => `${k}=$${i + 1}`);
        const vals = filteredKeys.map(k => obParam[k]);
        db.query(`SELECT * FROM utilizatori WHERE ${conds.join(' AND ')}`, vals, (err, res) => {
            if (err) return callback(err, null);
            callback(null, res.rows.map(r => new Utilizator(r)));
        });
    }

    /**
     * Caută asincron utilizatori după un set de criterii (proprietăți nedefinite sunt ignorate).
     * @param {Object} obParam - Obiect cu proprietăți de filtrat (undefined/null sunt ignorate).
     * @returns {Promise<Utilizator[]>} Lista de utilizatori corespunzători criteriilor.
     */
    static async cautaAsync(obParam) {
        const db = AccesBD.getInstanta().getClient();
        if (!db) return [];
        const filteredKeys = Object.keys(obParam).filter(k => obParam[k] !== undefined && obParam[k] !== null);
        if (filteredKeys.length === 0) {
            const res = await db.query('SELECT * FROM utilizatori', []);
            return res.rows.map(r => new Utilizator(r));
        }
        const conds = filteredKeys.map((k, i) => `${k}=$${i + 1}`);
        const vals = filteredKeys.map(k => obParam[k]);
        const res = await db.query(`SELECT * FROM utilizatori WHERE ${conds.join(' AND ')}`, vals);
        return res.rows.map(r => new Utilizator(r));
    }

    /**
     * Trimite un e-mail utilizatorului curent.
     * @param {string} subiect - Subiectul e-mailului.
     * @param {string} mesajText - Conținutul plain-text al e-mailului.
     * @param {string} mesajHtml - Conținutul HTML al e-mailului.
     * @param {Array} [atasamente=[]] - Lista de atașamente.
     * @returns {Promise<boolean>}
     */
    async trimiteMail(subiect, mesajText, mesajHtml, atasamente = []) {
        // Integrare cu nodemailer sau alt serviciu de e-mail
        return true;
    }
}

module.exports = Utilizator;
