const test = require('node:test');
const assert = require('node:assert/strict');
const { computeCommission, resolveTauxCommission } = require('../src/services/commissionService');

test('calcul de commission standard (10%)', () => {
  assert.equal(computeCommission(6000, 10), 600);
});

test('calcul de commission avec arrondi', () => {
  assert.equal(computeCommission(2500, 8), 200);
  assert.equal(computeCommission(999, 10), 100); // 99.9 arrondi à 100
});

test('rejette un montant négatif', () => {
  assert.throws(() => computeCommission(-100, 10), /positif/);
});

test('rejette un pourcentage hors bornes', () => {
  assert.throws(() => computeCommission(1000, 150), /entre 0 et 100/);
  assert.throws(() => computeCommission(1000, -5), /entre 0 et 100/);
});

test('resolveTauxCommission privilégie le taux spécifique', () => {
  assert.equal(resolveTauxCommission(5, 10), 5);
});

test('resolveTauxCommission retombe sur le taux global si absent', () => {
  assert.equal(resolveTauxCommission(null, 10), 10);
  assert.equal(resolveTauxCommission(undefined, 12), 12);
});
