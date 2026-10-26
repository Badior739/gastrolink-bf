const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, isRoleAllowed, nextStatuses, isFinal } = require('../src/services/commandeStatus');

test('transitions valides du cycle nominal', () => {
  assert.equal(canTransition('en_attente', 'confirmee'), true);
  assert.equal(canTransition('confirmee', 'en_preparation'), true);
  assert.equal(canTransition('en_preparation', 'prete'), true);
  assert.equal(canTransition('prete', 'recuperee'), true);
  assert.equal(canTransition('recuperee', 'en_livraison'), true);
  assert.equal(canTransition('en_livraison', 'livree'), true);
});

test('transitions invalides refusées (on ne saute pas d\'étape)', () => {
  assert.equal(canTransition('en_attente', 'prete'), false);
  assert.equal(canTransition('confirmee', 'livree'), false);
  assert.equal(canTransition('prete', 'en_livraison'), false); // doit passer par recuperee
});

test('les statuts finaux n\'ont pas de transition sortante', () => {
  assert.equal(isFinal('livree'), true);
  assert.equal(isFinal('annulee'), true);
  assert.equal(isFinal('en_attente'), false);
});

test('annulation possible depuis plusieurs statuts intermédiaires', () => {
  assert.equal(canTransition('en_attente', 'annulee'), true);
  assert.equal(canTransition('confirmee', 'annulee'), true);
  assert.equal(canTransition('en_preparation', 'annulee'), true);
  assert.equal(canTransition('prete', 'annulee'), true);
  // Une fois récupérée par le livreur, on ne peut plus annuler (correction R1/R2)
  assert.equal(canTransition('recuperee', 'annulee'), false);
});

test('seul le rôle autorisé peut déclencher une transition donnée', () => {
  assert.equal(isRoleAllowed('en_attente', 'confirmee', 'etablissement'), true);
  assert.equal(isRoleAllowed('en_attente', 'confirmee', 'client'), false);
  assert.equal(isRoleAllowed('prete', 'recuperee', 'livreur'), true);
  assert.equal(isRoleAllowed('prete', 'recuperee', 'etablissement'), false);
  assert.equal(isRoleAllowed('en_livraison', 'livree', 'livreur'), true);
  assert.equal(isRoleAllowed('en_livraison', 'livree', 'client'), false);
});

test('nextStatuses renvoie un tableau vide pour un statut inconnu', () => {
  assert.deepEqual(nextStatuses('statut_inexistant'), []);
});
