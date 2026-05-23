const { Sequelize } = require('sequelize');

class SequelizeClient {
  static instance = null;
  constructor() {
    if (SequelizeClient.instance) throw new Error('SequelizeClient already instantiated');
    this.sequelize = null;
  }

  init(connectionString) {
    if (!connectionString) throw new Error('Connection string required');
    this.sequelize = new Sequelize(connectionString, { logging: false });
  }

  getClient() { return this.sequelize; }

  static getInstanta() {
    if (!SequelizeClient.instance) {
      SequelizeClient.instance = new SequelizeClient();
      const cs = process.env.DATABASE_URL || null;
      if (cs) SequelizeClient.instance.init(cs);
    }
    return SequelizeClient.instance;
  }
}

module.exports = SequelizeClient;
