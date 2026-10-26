/**
 * Un avis cible soit un établissement, soit un livreur — jamais les deux, jamais aucun
 * (correction R6 de la revue de cohérence ; reflété par la contrainte SQL
 * chk_avis_cible_unique). Lorsqu'un client évalue les deux après une livraison,
 * l'application doit appeler cette validation deux fois, pour créer deux lignes AVIS.
 */
function validateAvisCible({ id_etablissement, id_livreur }) {
  const hasEtab = id_etablissement !== null && id_etablissement !== undefined;
  const hasLivreur = id_livreur !== null && id_livreur !== undefined;
  if (hasEtab === hasLivreur) {
    const err = new Error(
      "Un avis doit cibler soit un établissement, soit un livreur, jamais les deux ni aucun."
    );
    err.status = 400;
    throw err;
  }
  return true;
}

function validateNote(note) {
  const n = Number(note);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    const err = new Error('La note doit être un entier compris entre 1 et 5.');
    err.status = 400;
    throw err;
  }
  return n;
}

module.exports = { validateAvisCible, validateNote };
