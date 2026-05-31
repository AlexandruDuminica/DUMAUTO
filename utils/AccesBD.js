const { Pool } = require('pg');

/**
 * AccesBD singleton class for DB access
 */
class AccesBD {
  /** @type {AccesBD|null} */
  static instanta = null;

  constructor() {
    if (AccesBD.instanta) throw new Error('AccesBD deja instantiata');
    this.client = null; // will hold Pool instance
  }

  /**
   * Initialize pool connection
   * @param {{connectionString:string}} opts
   */
  init(opts) {
    this.client = new Pool(opts);
  }

  /**
   * Get client (pool)
   */
  getClient() {
    return this.client;
  }

  /**
   * Get or create instance
   */
  static getInstanta() {
    if (!AccesBD.instanta) {
      AccesBD.instanta = new AccesBD();
      // initialize with DATABASE_URL if present
      const cs = process.env.DATABASE_URL || null;
      if (cs) AccesBD.instanta.init({ connectionString: cs });
    }
    return AccesBD.instanta;
  }

  /**
   * select with callback
   * @param {{table:string, fields:string[], where:string[]}} obiect
   * @param {(err:any, rez:any)=>void} callback
   */
  select(obiect, callback) {
    const pool = this.client;
    if (!pool) return callback(new Error('DB not initialized'));
    const fields = obiect.fields && obiect.fields.length ? obiect.fields.join(',') : '*';
    const where = obiect.where && obiect.where.length ? ' WHERE ' + buildWhereClause(obiect.where) : '';
    const q = `SELECT ${fields} FROM ${obiect.table}${where}`;
    pool.query(q, (err, res) => { if (err) return callback(err); callback(null, res.rows); });
  }

  /**
   * select async
   * @param {{table:string, fields:string[], where:string[]}} obiect
   */
  async selectAsync(obiect) {
    const pool = this.client;
    if (!pool) throw new Error('DB not initialized');
    const fields = obiect.fields && obiect.fields.length ? obiect.fields.join(',') : '*';
    const where = obiect.where && obiect.where.length ? ' WHERE ' + buildWhereClause(obiect.where) : '';
    const q = `SELECT ${fields} FROM ${obiect.table}${where}`;
    const res = await pool.query(q);
    return res.rows;
  }

  /**
   * Actualizează rânduri dintr-un tabel.
   * @param {{table:string, fields:string[], values:any[], where:string[]}} obiect
   * @param {(err:any, rowCount:number)=>void} callback
   */
  update(obiect, callback) {
    const pool = this.client; if (!pool) return callback(new Error('DB not initialized'));
    const sets = obiect.fields.map((f,i)=>`${f}=$${i+1}`).join(',');
    const whereClause = obiect.where && obiect.where.length ? buildWhereClause(obiect.where) : '1=1';
    const q = `UPDATE ${obiect.table} SET ${sets} WHERE ${whereClause}`;
    pool.query(q, obiect.values, (err,res)=>{ if (err) return callback(err); callback(null,res.rowCount); });
  }

  /**
   * Inserează o înregistrare nouă în tabel.
   * @param {{table:string, fields:string[], values:any[]}} obiect
   * @param {(err:any, row:Object)=>void} callback
   */
  insert(obiect, callback) {
    const pool = this.client; if (!pool) return callback(new Error('DB not initialized'));
    const fields = obiect.fields.join(',');
    const vals = obiect.values;
    const placeholders = vals.map((_,i)=>`$${i+1}`).join(',');
    const q = `INSERT INTO ${obiect.table} (${fields}) VALUES (${placeholders}) RETURNING *`;
    pool.query(q, vals, (err,res)=>{ if (err) return callback(err); callback(null,res.rows[0]); });
  }

  /**
   * Șterge rânduri dintr-un tabel conform condițiilor date.
   * @param {{table:string, where:string[]}} obiect
   * @param {(err:any, rowCount:number)=>void} callback
   */
  delete(obiect, callback) {
    const pool = this.client; if (!pool) return callback(new Error('DB not initialized'));
    const whereClause = obiect.where && obiect.where.length ? buildWhereClause(obiect.where) : '1=1';
    const q = `DELETE FROM ${obiect.table} WHERE ${whereClause}`;
    pool.query(q, (err,res)=>{ if (err) return callback(err); callback(null,res.rowCount); });
  }
}

/**
 * Build where clause from either array of strings or array of array of strings.
 * Outer array is OR of groups; inner arrays are AND of conditions.
 * Example: [ ["a=10","b=20"], ["c=30"] ] => "(a=10 AND b=20) OR (c=30)"
 * If input is flat array of strings: ["a=10","b=20"] => "a=10 AND b=20"
 * @param {Array} where
 */
function buildWhereClause(where) {
  if (!where) return '1=1';
  // If outer array contains arrays, treat as OR of AND groups
  const isNested = where.some(el => Array.isArray(el));
  if (!isNested) {
    return where.join(' AND ');
  }
  const groups = where.map(group => {
    if (!Array.isArray(group)) return String(group);
    const inner = group.join(' AND ');
    return '(' + inner + ')';
  });
  return groups.join(' OR ');
}

module.exports = AccesBD;
