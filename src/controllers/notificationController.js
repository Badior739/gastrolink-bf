const pool = require('../config/db');

/**
 * Liste les notifications de l'utilisateur connecté (NOT-01 à NOT-07),
 * tous rôles confondus (le champ destinataire_type/destinataire_id est la
 * clé polymorphe documentée dans le dossier de conception, section 4.2).
 */
async function listerMiennes(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notification WHERE destinataire_type = ? AND destinataire_id = ?
       ORDER BY date_envoi DESC LIMIT 50`,
      [req.user.role, req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function marquerLue(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE notification SET lu = 1 WHERE id_notification = ? AND destinataire_type = ? AND destinataire_id = ?',
      [id, req.user.role, req.user.id]
    );
    res.json({ lu: true });
  } catch (err) { next(err); }
}

/**
 * Fonction utilitaire interne (pas une route), à appeler depuis d'autres
 * contrôleurs pour créer une notification — par exemple depuis un futur
 * job qui détecte l'ouverture d'un nouvel établissement à proximité d'un
 * client (règle de gestion 2.1.2), ou depuis commandeController lors des
 * changements de statut. Pas encore branchée automatiquement en V1.
 */
async function creer({ destinataireType, destinataireId, typeNotification, contenu }) {
  await pool.query(
    `INSERT INTO notification (destinataire_type, destinataire_id, type_notification, contenu)
     VALUES (?, ?, ?, ?)`,
    [destinataireType, destinataireId, typeNotification, contenu]
  );
}

module.exports = { listerMiennes, marquerLue, creer };
