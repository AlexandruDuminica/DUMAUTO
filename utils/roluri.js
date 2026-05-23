const Drepturi = require('./drepturi');

class Rol {
  constructor(cod) { this.cod = cod; }
  /** @returns {Symbol[]} */
  getDrepturi() { return []; }
  areDreptul(drept) { return this.getDrepturi().includes(drept); }
}

class RolAdmin extends Rol {
  constructor(){ super('admin'); }
  getDrepturi(){ return Object.values(Drepturi); }
}

class RolModerator extends Rol {
  constructor(){ super('moderator'); }
  getDrepturi(){
    // moderator can manage users but not products
    return [Drepturi.VEZI_UTILIZATORI, Drepturi.MODIFICA_UTILIZATOR, Drepturi.STERGE_UTILIZATOR];
  }
}

class RolClient extends Rol {
  constructor(){ super('client'); }
  getDrepturi(){ return [Drepturi.VEZI_PRODUSE]; }
}

class RolFactory {
  static creeazaRol(tip){
    switch((tip||'').toLowerCase()){
      case 'admin': return new RolAdmin();
      case 'moderator': return new RolModerator();
      default: return new RolClient();
    }
  }
}

module.exports = { Rol, RolAdmin, RolModerator, RolClient, RolFactory };
