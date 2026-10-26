const pool = require('../config/db');

async function send(req, res, next) {
  try {
    const { id_commande, destinataire_type, destinataire_id, contenu } = req.body;
    if (!destinataire_type || !destinataire_id || !contenu) {
      return res.status(400).json({ error: 'destinataire_type, destinataire_id et contenu sont obligatoires.' });
    }
    if (!['client', 'livreur', 'etablissement'].includes(destinataire_type)) {
      return res.status(400).json({ error: 'destinataire_type invalide.' });
    }
    const [result] = await pool.query(
      `INSERT INTO message (id_commande, expediteur_type, expediteur_id, destinataire_type, destinataire_id, contenu)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_commande || null, req.user.role, req.user.id, destinataire_type, destinataire_id, contenu]
    );
    const message = {
      id_message: result.insertId,
      id_commande: id_commande || null,
      expediteur_type: req.user.role,
      expediteur_id: req.user.id,
      destinataire_type,
      destinataire_id,
      contenu,
      date_envoi: new Date().toISOString(),
    };
    // Diffusion temps réel si Socket.io est initialisé (voir src/sockets/index.js)
    if (req.app.get('io')) {
      req.app.get('io').to(`commande:${id_commande}`).emit('nouveau_message', message);
    }
    res.status(201).json(message);
  } catch (err) { next(err); }
}

async function listByCommande(req, res, next) {
  try {
    const { id_commande } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM message WHERE id_commande = ? ORDER BY date_envoi ASC',
      [id_commande]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { send, listByCommande };
