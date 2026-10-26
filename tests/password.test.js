const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../src/utils/password');

test('hashPassword refuse un mot de passe trop court', () => {
  assert.throws(() => hashPassword('123'), /au moins 6 caractères/);
});

test('hashPassword produit un format sel:hash', () => {
  const hashed = hashPassword('motdepasse123');
  assert.match(hashed, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
});

test('verifyPassword accepte le bon mot de passe', () => {
  const hashed = hashPassword('motdepasse123');
  assert.equal(verifyPassword('motdepasse123', hashed), true);
});

test('verifyPassword rejette un mauvais mot de passe', () => {
  const hashed = hashPassword('motdepasse123');
  assert.equal(verifyPassword('mauvais', hashed), false);
});

test('verifyPassword rejette un format stocké invalide sans planter', () => {
  assert.equal(verifyPassword('motdepasse123', 'format_invalide'), false);
});

test('deux hachages du même mot de passe sont différents (sel aléatoire)', () => {
  const h1 = hashPassword('motdepasse123');
  const h2 = hashPassword('motdepasse123');
  assert.notEqual(h1, h2);
  assert.equal(verifyPassword('motdepasse123', h1), true);
  assert.equal(verifyPassword('motdepasse123', h2), true);
});
