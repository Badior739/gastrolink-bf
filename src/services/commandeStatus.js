/**
 * Cycle de vie officiel d'une commande (voir dossier de conception, section 2.2
 * et corrections R1/R2 de la revue de cohérence).
 * Toute transition non listée ici doit être refusée par l'API.
 */
const TRANSITIONS = {
  en_attente: ['confirmee', 'annulee'],
  confirmee: ['en_preparation', 'annulee'],
  en_preparation: ['prete', 'annulee'],
  prete: ['recuperee', 'annulee'],
  recuperee: ['en_livraison'],
  en_livraison: ['livree'],
  livree: [],
  annulee: [],
};

const ROLES_AUTORISES_PAR_TRANSITION = {
  'en_attente->confirmee': ['etablissement'],
  'en_attente->annulee': ['client', 'etablissement', 'admin'],
  'confirmee->en_preparation': ['etablissement'],
  'confirmee->annulee': ['client', 'etablissement', 'admin'],
  'en_preparation->prete': ['etablissement'],
  'en_preparation->annulee': ['etablissement', 'admin'],
  'prete->recuperee': ['livreur'],
  'prete->annulee': ['etablissement', 'admin'],
  'recuperee->en_livraison': ['livreur'],
  'en_livraison->livree': ['livreur'],
};

function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

function isRoleAllowed(from, to, role) {
  const key = `${from}->${to}`;
  const allowed = ROLES_AUTORISES_PAR_TRANSITION[key];
  // Si la transition n'a pas de restriction explicite mais est valide, on l'autorise
  // (cas des annulations gérées au cas par cas plus haut).
  if (!allowed) return canTransition(from, to);
  return allowed.includes(role);
}

function nextStatuses(from) {
  return TRANSITIONS[from] || [];
}

function isFinal(status) {
  return nextStatuses(status).length === 0;
}

module.exports = { TRANSITIONS, canTransition, isRoleAllowed, nextStatuses, isFinal };
