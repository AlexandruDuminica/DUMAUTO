const Drepturi = require('./drepturi');

/**
 * Clasa de bază pentru un rol de utilizator.
 * Fiecare rol are un cod string și o listă de drepturi asociate.
 */
class Rol {
    /**
     * @param {string} cod - Codul rolului (ex: 'client', 'admin', 'moderator').
     */
    constructor(cod) { this.cod = cod; }

    /**
     * Returnează lista de drepturi asociate rolului.
     * @returns {Symbol[]}
     */
    getDrepturi() { return []; }

    /**
     * Verifică dacă rolul are un anumit drept.
     * @param {Symbol} drept - Simbol din obiectul Drepturi.
     * @returns {boolean}
     */
    areDreptul(drept) { return this.getDrepturi().includes(drept); }
}

/**
 * Rolul de administrator — are toate drepturile disponibile.
 * @extends Rol
 */
class RolAdmin extends Rol {
    constructor() { super('admin'); }
    /** @returns {Symbol[]} */
    getDrepturi() { return Object.values(Drepturi); }
}

/**
 * Rolul de moderator — poate gestiona utilizatori, dar nu produse.
 * @extends Rol
 */
class RolModerator extends Rol {
    constructor() { super('moderator'); }
    /** @returns {Symbol[]} */
    getDrepturi() {
        return [Drepturi.VEZI_UTILIZATORI, Drepturi.MODIFICA_UTILIZATOR, Drepturi.STERGE_UTILIZATOR];
    }
}

/**
 * Rolul de client logat — poate vizualiza produse.
 * @extends Rol
 */
class RolClient extends Rol {
    constructor() { super('client'); }
    /** @returns {Symbol[]} */
    getDrepturi() { return [Drepturi.VEZI_PRODUSE]; }
}

/**
 * Factory pentru crearea obiectelor de tip Rol.
 * Implementează design pattern-ul Factory.
 */
class RolFactory {
    /**
     * Creează și returnează un obiect Rol corespunzător codului dat.
     * @param {string} tip - Codul rolului ('admin', 'moderator', sau orice altceva pentru client).
     * @returns {Rol}
     */
    static creeazaRol(tip) {
        switch ((tip || '').toLowerCase()) {
            case 'admin':     return new RolAdmin();
            case 'moderator': return new RolModerator();
            default:          return new RolClient();
        }
    }
}

module.exports = { Rol, RolAdmin, RolModerator, RolClient, RolFactory };
