const jwt = require('../utils/jwt');

/**
 * Middleware d'authentification. Vérifie le header "Authorization: Bearer <token>".
 * @param {string[]} requiredRoles - rôles autorisés (ex. ['etablissement']).
 *   Tableau vide = toute personne authentifiée, quel que soit son rôle.
 */
function authenticate(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Accès refusé pour ce rôle.' });
      }
      req.user = payload; // { id, role, iat, exp }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
  };
}

module.exports = { authenticate };
