const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAvisCible, validateNote } = require('../src/services/avisService');

test('accepte un avis ciblant uniquement un établissement', () => {
  assert.equal(validateAvisCible({ id_etablissement: 5, id_livreur: null }), true);
});

test('accepte un avis ciblant uniquement un livreur', () => {
  assert.equal(validateAvisCible({ id_etablissement: null, id_livreur: 12 }), true);
});

test('rejette un avis sans aucune cible', () => {
  assert.throws(
    () => validateAvisCible({ id_etablissement: null, id_livreur: null }),
    /soit un établissement, soit un livreur/
  );
});

test('rejette un avis ciblant les deux à la fois', () => {
  assert.throws(
    () => validateAvisCible({ id_etablissement: 5, id_livreur: 12 }),
    /soit un établissement, soit un livreur/
  );
});

test('validateNote accepte les entiers de 1 à 5', () => {
  for (let i = 1; i <= 5; i++) {
    assert.equal(validateNote(i), i);
  }
});

test('validateNote rejette les valeurs hors bornes ou non entières', () => {
  assert.throws(() => validateNote(0));
  assert.throws(() => validateNote(6));
  assert.throws(() => validateNote(3.5));
  assert.throws(() => validateNote('abc'));
});
