const crypto = require('crypto');

function base64url(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlJSON(obj) {
  return base64url(Buffer.from(JSON.stringify(obj)));
}

function base64urlDecodeToString(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Signe un payload en JWT HS256.
 * @param {object} payload - données à encoder (ex. { id, role })
 * @param {string} secret - clé secrète (JWT_SECRET)
 * @param {number} expiresInSeconds - durée de validité, 7 jours par défaut
 */
function sign(payload, secret, expiresInSeconds = 7 * 24 * 3600) {
  if (!secret) throw new Error('JWT_SECRET manquant.');
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerEncoded = base64urlJSON(header);
  const payloadEncoded = base64urlJSON(fullPayload);
  const data = `${headerEncoded}.${payloadEncoded}`;

  const signature = base64url(crypto.createHmac('sha256', secret).update(data).digest());
  return `${data}.${signature}`;
}

/**
 * Vérifie et décode un JWT HS256. Lève une erreur si invalide ou expiré.
 */
function verify(token, secret) {
  if (!secret) throw new Error('JWT_SECRET manquant.');
  if (typeof token !== 'string') throw new Error('Token manquant.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token malformé.');

  const [headerEncoded, payloadEncoded, signature] = parts;
  const data = `${headerEncoded}.${payloadEncoded}`;
  const expectedSignature = base64url(crypto.createHmac('sha256', secret).update(data).digest());

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new Error('Signature invalide.');
  }

  const payload = JSON.parse(base64urlDecodeToString(payloadEncoded));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expiré.');
  }
  return payload;
}

module.exports = { sign, verify };
