const AccesBD = require('../utils/AccesBD');
const Drepturi = require('../utils/drepturi');
const { RolFactory } = require('../utils/roluri');

/**
 * Model Utilizator
 */
class Utilizator {
  /**
   * @param {Object} obj
   */
  constructor(obj = {}) {
    this.id = obj.id || null;
    this.username = obj.username || '';
    this.nume = obj.nume || '';
    this.email = obj.email || '';
    this.parola = obj.parola || '';
    this.rol = obj.rol || 'client';
  }

  verificaNume() { return typeof this.nume === 'string' && this.nume.length >= 3; }
  verificaUsername() { return typeof this.username === 'string' && /^[a-z0-9_\-]{3,}$/.test(this.username); }

  /**
   * Save user
   * @returns {Promise<Object>}
   */
  async salvareUtilizator() {
    const db = AccesBD.getInstanta().getClient();
    if (!db) throw new Error('DB missing');
    // check existing
    const res = await db.query('SELECT id FROM utilizatori WHERE username=$1', [this.username]);
    if (res.rows.length) throw new Error('Username existent');
    const insert = await db.query('INSERT INTO utilizatori (username,nume,email,parola,rol) VALUES ($1,$2,$3,$4,$5) RETURNING *', [this.username,this.nume,this.email,this.parola,this.rol]);
    return insert.rows[0];
  }

  async modifica(ob) {
    const db = AccesBD.getInstanta().getClient(); if (!db) throw new Error('DB missing');
    if (!this.id) throw new Error('Utilizator necunoscut');
    const fields = Object.keys(ob);
    const vals = Object.values(ob);
    const sets = fields.map((f,i)=>`${f}=$${i+1}`).join(',');
    const q = `UPDATE utilizatori SET ${sets} WHERE id=${this.id} RETURNING *`;
    const res = await db.query(q, vals);
    return res.rows[0];
  }

  async sterge() {
    const db = AccesBD.getInstanta().getClient(); if (!db) throw new Error('DB missing');
    if (!this.id) throw new Error('Utilizator necunoscut');
    await db.query('DELETE FROM utilizatori WHERE id=$1', [this.id]);
    return true;
  }

  areDreptul(drept) {
    const rolObj = RolFactory.creeazaRol(this.rol);
    return rolObj.areDreptul(drept);
  }

  static getUtilizDupaUsername(username, ob, callback) {
    const db = AccesBD.getInstanta().getClient();
    db.query('SELECT * FROM utilizatori WHERE username=$1', [username], (err,res)=>{
      if (err) return callback(err);
      const row = res.rows[0] || null; callback(null, row);
    });
  }

  static async getUtilizDupaUsernameAsync(username) {
    const db = AccesBD.getInstanta().getClient(); if (!db) return null;
    const res = await db.query('SELECT * FROM utilizatori WHERE username=$1', [username]);
    return res.rows[0] || null;
  }

  static cauta(obParam, callback) {
    const db = AccesBD.getInstanta().getClient();
    const keys = Object.keys(obParam);
    const conds = keys.map((k,i)=>`${k}=$${i+1}`);
    const vals = keys.map(k=>obParam[k]);
    db.query(`SELECT * FROM utilizatori WHERE ${conds.join(' AND ')}`, vals, (err,res)=>{ if (err) return callback(err); callback(null,res.rows); });
  }

  static async cautaAsync(obParam) {
    const db = AccesBD.getInstanta().getClient(); if (!db) return [];
    const keys = Object.keys(obParam);
    const conds = keys.map((k,i)=>`${k}=$${i+1}`);
    const vals = keys.map(k=>obParam[k]);
    const res = await db.query(`SELECT * FROM utilizatori WHERE ${conds.join(' AND ')}`, vals);
    return res.rows;
  }

  async trimiteMail(subiect, mesajText, mesajHtml, atasamente = []) {
    // stub: integrate with nodemailer if required
    return true;
  }
}

module.exports = Utilizator;
