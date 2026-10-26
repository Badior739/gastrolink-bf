const crypto = require('crypto');

const KEYLEN = 64;

/**
 * Hache un mot de passe avec scrypt (natif Node.js, pas de dépendance externe).
 * Format de stockage : "sel_hex:hash_hex"
 */
function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Vérifie un mot de passe en clair contre un hash stocké au format "sel:hash".
 * Utilise timingSafeEqual pour éviter les attaques par mesure de temps.
 */
function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  const [salt, hashHex] = stored.split(':');
  const hashBuffer = Buffer.from(hashHex, 'hex');
  const suppliedBuffer = crypto.scryptSync(password, salt, KEYLEN);
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return crypto.timingSafeEqual(hashBuffer, suppliedBuffer);
}

module.exports = { hashPassword, verifyPassword };
