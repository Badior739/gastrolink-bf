const pool = require('../config/db');
const { validateAvisCible, validateNote } = require('../services/avisService');

/**
 * Crée un avis. Le client envoie éventuellement deux appels distincts
 * (un pour l'établissement, un pour le livreur) — voir correction R6.
 */
async function create(req, res, next) {
  try {
    const { id_commande, id_etablissement, id_livreur, note, commentaire } = req.body;
    if (!id_commande) return res.status(400).json({ error: 'id_commande est obligatoire.' });

    validateAvisCible({ id_etablissement, id_livreur });
    const noteValidee = validateNote(note);

    const [commandeRows] = await pool.query('SELECT * FROM commande WHERE id_commande = ?', [id_commande]);
    if (commandeRows.length === 0) return res.status(404).json({ error: 'Commande introuvable.' });
    const commande = commandeRows[0];
    if (commande.id_client !== req.user.id) {
      return res.status(403).json({ error: "Cette commande ne vous appartient pas." });
    }
    if (commande.statut !== 'livree') {
      return res.status(409).json({ error: "Un avis ne peut être déposé qu'après la livraison effective de la commande." });
    }

    const [result] = await pool.query(
      `INSERT INTO avis (id_client, id_etablissement, id_livreur, id_commande, note, commentaire)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, id_etablissement || null, id_livreur || null, id_commande, noteValidee, commentaire || null]
    );
    res.status(201).json({ id_avis: result.insertId });
  } catch (err) { next(err); }
}

async function listByEtablissement(req, res, next) {
  try {
    const { id_etablissement } = req.params;
    const [rows] = await pool.query(
      `SELECT a.*, c.nom, c.prenom FROM avis a
       JOIN client c ON c.id_client = a.id_client
       WHERE a.id_etablissement = ? ORDER BY a.date_avis DESC`,
      [id_etablissement]
    );
    const [[{ moyenne }]] = await pool.query(
      'SELECT AVG(note) AS moyenne FROM avis WHERE id_etablissement = ?',
      [id_etablissement]
    );
    res.json({ avis: rows, note_moyenne: moyenne ? Number(moyenne).toFixed(1) : null });
  } catch (err) { next(err); }
}

async function listByLivreur(req, res, next) {
  try {
    const { id_livreur } = req.params;
    const [rows] = await pool.query(
      `SELECT a.*, c.nom, c.prenom FROM avis a
       JOIN client c ON c.id_client = a.id_client
       WHERE a.id_livreur = ? ORDER BY a.date_avis DESC`,
      [id_livreur]
    );
    const [[{ moyenne }]] = await pool.query(
      'SELECT AVG(note) AS moyenne FROM avis WHERE id_livreur = ?',
      [id_livreur]
    );
    res.json({ avis: rows, note_moyenne: moyenne ? Number(moyenne).toFixed(1) : null });
  } catch (err) { next(err); }
}

module.exports = { create, listByEtablissement, listByLivreur };
