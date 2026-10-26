const pool = require('../config/db');

/**
 * Profil complet du livreur connecté (LIV-01 à LIV-15, hors mot_de_passe et
 * piece_identite), incluant statut_validation — absent de la vue publique
 * getById. Ajouté en construisant le tableau de bord livreur, sur le même
 * modèle que etablissementController.obtenirMoi.
 */
async function obtenirMoi(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id_livreur, nom, prenom, telephone, email, type_vehicule,
              numero_immatriculation, latitude_actuelle, longitude_actuelle,
              statut_disponibilite, note_moyenne, statut_validation
       FROM livreur WHERE id_livreur = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Livreur introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

/**
 * Met à jour le profil du livreur connecté : bascule disponible/hors_ligne
 * (action 4) et mise à jour de la position en temps réel (LIV-10, LIV-11) —
 * cette dernière est aussi transmise via Socket.io pendant une livraison
 * active (voir sockets/index.js), mais persister ici la dernière position
 * connue permet de la retrouver même après une reconnexion.
 */
async function mettreAJourMoi(req, res, next) {
  try {
    const champsAutorises = ['statut_disponibilite', 'latitude_actuelle', 'longitude_actuelle'];
    const updates = [];
    const values = [];
    for (const champ of champsAutorises) {
      if (req.body[champ] !== undefined) {
        updates.push(`${champ} = ?`);
        values.push(req.body[champ]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucun champ valide à mettre à jour.' });
    }
    values.push(req.user.id);
    await pool.query(`UPDATE livreur SET ${updates.join(', ')} WHERE id_livreur = ?`, values);
    res.json({ message: 'Profil mis à jour.' });
  } catch (err) { next(err); }
}

/**
 * Profil public d'un livreur (LIV-01 à LIV-13, hors champs sensibles comme
 * mot_de_passe et piece_identite). Utilisé par l'écran client de suivi de
 * commande pour afficher nom, véhicule et note du livreur assigné.
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id_livreur, nom, prenom, telephone, type_vehicule,
              latitude_actuelle, longitude_actuelle, statut_disponibilite, note_moyenne
       FROM livreur WHERE id_livreur = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Livreur introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { obtenirMoi, mettreAJourMoi, getById };
