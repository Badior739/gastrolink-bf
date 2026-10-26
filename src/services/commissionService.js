/**
 * Calcule le montant de commission prélevé par la plateforme sur une commande livrée.
 * @param {number} montantTotal - montant total de la commande (F CFA)
 * @param {number} pourcentage - taux de commission applicable (ex. 10 pour 10%)
 * @returns {number} montant de la commission, arrondi au franc CFA le plus proche
 */
function computeCommission(montantTotal, pourcentage) {
  if (typeof montantTotal !== 'number' || montantTotal < 0) {
    throw new Error('montant_total doit être un nombre positif ou nul.');
  }
  if (typeof pourcentage !== 'number' || pourcentage < 0 || pourcentage > 100) {
    throw new Error('pourcentage doit être compris entre 0 et 100.');
  }
  return Math.round((montantTotal * pourcentage) / 100);
}

/**
 * Détermine le taux de commission applicable à un établissement :
 * priorité au taux spécifique de l'établissement, sinon le taux global par défaut.
 */
function resolveTauxCommission(tauxSpecifiqueEtablissement, tauxGlobalDefaut) {
  if (typeof tauxSpecifiqueEtablissement === 'number' && tauxSpecifiqueEtablissement >= 0) {
    return tauxSpecifiqueEtablissement;
  }
  return tauxGlobalDefaut;
}

module.exports = { computeCommission, resolveTauxCommission };
