/**
 * Obiect cu toate drepturile posibile ale utilizatorilor în aplicație.
 * Fiecare proprietate este un Symbol unic ce identifică un drept specific.
 * Se folosesc în clasa Rol și Utilizator pentru verificarea accesului.
 * @type {Object.<string, Symbol>}
 */
const Drepturi = {
  VEZI_PRODUSE: Symbol('VEZI_PRODUSE'),
  ADAUGA_PRODUS: Symbol('ADAUGA_PRODUS'),
  MODIFICA_PRODUS: Symbol('MODIFICA_PRODUS'),
  STERGE_PRODUS: Symbol('STERGE_PRODUS'),
  VEZI_UTILIZATORI: Symbol('VEZI_UTILIZATORI'),
  MODIFICA_UTILIZATOR: Symbol('MODIFICA_UTILIZATOR'),
  STERGE_UTILIZATOR: Symbol('STERGE_UTILIZATOR'),
  // add more as needed
  EXPORT_DATE: Symbol('EXPORT_DATE')
};

module.exports = Drepturi;
