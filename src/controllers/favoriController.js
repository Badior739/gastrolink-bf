const pool = require('../config/db');

/**
 * Ajoute un établissement aux favoris du client connecté (FAV-01 à FAV-04).
 * La contrainte uq_favori (id_client, id_etablissement) empêche les doublons
 * — on traite l'erreur MySQL 1062 comme un cas normal (idempotence) plutôt
 * qu'une erreur serveur.
 */
async function ajouter(req, res, next) {
  try {
    const { id_etablissement } = req.body;
    if (!id_etablissement) return res.status(400).json({ error: 'id_etablissement est obligatoire.' });
    try {
      const [result] = await pool.query(
        'INSERT INTO favori (id_client, id_etablissement) VALUES (?, ?)',
        [req.user.id, id_etablissement]
      );
      res.status(201).json({ id_favori: result.insertId });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(200).json({ message: 'Déjà en favoris.' });
      }
      throw err;
    }
  } catch (err) { next(err); }
}

async function retirer(req, res, next) {
  try {
    const { id_etablissement } = req.params;
    await pool.query(
      'DELETE FROM favori WHERE id_client = ? AND id_etablissement = ?',
      [req.user.id, id_etablissement]
    );
    res.status(204).send();
  } catch (err) { next(err); }
}

/** Liste des id_etablissement favoris du client connecté (pour cocher les cœurs à l'affichage). */
async function listerMiens(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT id_etablissement FROM favori WHERE id_client = ?',
      [req.user.id]
    );
    res.json(rows.map((r) => r.id_etablissement));
  } catch (err) { next(err); }
}

/**
 * Détail complet des établissements favoris (pas seulement leurs id),
 * ajouté en construisant l'écran Profil : afficher une liste de favoris
 * nécessite leur nom/quartier/statut, pas uniquement leur identifiant.
 */
async function listerMiensDetail(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT e.id_etablissement, e.nom_etablissement, e.type_etablissement, e.telephone,
              e.ville, e.quartier, e.latitude, e.longitude, e.statut_ouverture, e.note_moyenne
       FROM favori f
       JOIN etablissement e ON e.id_etablissement = f.id_etablissement
       WHERE f.id_client = ?
       ORDER BY f.date_ajout DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

module.exports = { ajouter, retirer, listerMiens, listerMiensDetail };
