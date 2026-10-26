const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('../src/utils/jwt');

const SECRET = 'secret_de_test_tres_long_et_aleatoire';

test('sign puis verify redonne le payload original', () => {
  const token = jwt.sign({ id: 42, role: 'client' }, SECRET);
  const payload = jwt.verify(token, SECRET);
  assert.equal(payload.id, 42);
  assert.equal(payload.role, 'client');
  assert.ok(payload.iat);
  assert.ok(payload.exp);
});

test('verify rejette un token signé avec un autre secret', () => {
  const token = jwt.sign({ id: 1, role: 'admin' }, 'autre_secret');
  assert.throws(() => jwt.verify(token, SECRET), /Signature invalide/);
});

test('verify rejette un token altéré', () => {
  const token = jwt.sign({ id: 1, role: 'admin' }, SECRET);
  const altered = token.slice(0, -2) + 'xx';
  assert.throws(() => jwt.verify(altered, SECRET));
});

test('verify rejette un token expiré', () => {
  const token = jwt.sign({ id: 1, role: 'client' }, SECRET, -10); // déjà expiré
  assert.throws(() => jwt.verify(token, SECRET), /expiré/);
});

test('verify rejette un format de token invalide', () => {
  assert.throws(() => jwt.verify('pas.un.jwt.valide', SECRET), /malformé/);
  assert.throws(() => jwt.verify('ntn', SECRET), /malformé/);
});

test('sign lève une erreur sans secret', () => {
  assert.throws(() => jwt.sign({ id: 1 }, ''), /JWT_SECRET manquant/);
});
