const pool = require('../config/db');

/**
 * Profil du client connecté (CLI-01 à CLI-13, hors mot_de_passe).
 * Utilisé par l'écran Profil pour afficher les informations à jour, plutôt
 * que de se fier à la copie potentiellement obsolète reçue à la connexion.
 */
async function obtenirMoi(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id_client, nom, prenom, telephone, email, ville, quartier, statut_compte
       FROM client WHERE id_client = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Client introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

/**
 * Met à jour un sous-ensemble de champs du profil (action 3 du wireframe
 * Client : « Modifier son profil »). Le téléphone et le mot de passe ne
 * sont volontairement pas modifiables ici — le téléphone sert d'identifiant
 * de connexion, un changement de mot de passe mérite un flux dédié
 * (vérification de l'ancien mot de passe), non implémenté en V1.
 */
async function mettreAJour(req, res, next) {
  try {
    const champsAutorises = ['nom', 'prenom', 'email', 'ville', 'quartier'];
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
    await pool.query(`UPDATE client SET ${updates.join(', ')} WHERE id_client = ?`, values);
    res.json({ message: 'Profil mis à jour.' });
  } catch (err) { next(err); }
}

module.exports = { obtenirMoi, mettreAJour };
