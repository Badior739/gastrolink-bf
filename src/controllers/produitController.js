const pool = require('../config/db');

// Liste publique des produits disponibles d'un établissement (vue client)
async function listByEtablissement(req, res, next) {
  try {
    const { id_etablissement } = req.params;
    const [rows] = await pool.query(
      `SELECT id_produit, nom_produit, categorie, description, prix, photo,
              temps_preparation_estime, disponible
       FROM produit WHERE id_etablissement = ? ORDER BY categorie, nom_produit`,
      [id_etablissement]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// Vue vendeur : y compris les produits indisponibles (rupture de stock)
async function listMine(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM produit WHERE id_etablissement = ? ORDER BY categorie, nom_produit',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { nom_produit, categorie, description, prix, photo, temps_preparation_estime, disponible } = req.body;
    if (!nom_produit || prix === undefined || prix === null) {
      return res.status(400).json({ error: 'nom_produit et prix sont obligatoires.' });
    }
    if (Number(prix) < 0) {
      return res.status(400).json({ error: 'Le prix ne peut pas être négatif.' });
    }
    const [result] = await pool.query(
      `INSERT INTO produit (id_etablissement, nom_produit, categorie, description, prix, photo, temps_preparation_estime, disponible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, nom_produit, categorie || null, description || null, prix, photo || null,
        temps_preparation_estime || null, disponible === undefined ? true : !!disponible]
    );
    res.status(201).json({ id_produit: result.insertId });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id_etablissement FROM produit WHERE id_produit = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Produit introuvable.' });
    if (existing[0].id_etablissement !== req.user.id) {
      return res.status(403).json({ error: "Ce produit n'appartient pas à votre établissement." });
    }
    const fields = ['nom_produit', 'categorie', 'description', 'prix', 'photo', 'temps_preparation_estime', 'disponible'];
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ à mettre à jour.' });
    values.push(id);
    await pool.query(`UPDATE produit SET ${updates.join(', ')} WHERE id_produit = ?`, values);
    res.json({ message: 'Produit mis à jour.' });
  } catch (err) { next(err); }
}

// Bascule rapide de disponibilité (action 8 du wireframe établissement)
async function toggleDisponibilite(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id_etablissement, disponible FROM produit WHERE id_produit = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Produit introuvable.' });
    if (rows[0].id_etablissement !== req.user.id) {
      return res.status(403).json({ error: "Ce produit n'appartient pas à votre établissement." });
    }
    const nouvelleValeur = !rows[0].disponible;
    await pool.query('UPDATE produit SET disponible = ? WHERE id_produit = ?', [nouvelleValeur, id]);
    res.json({ disponible: nouvelleValeur });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id_etablissement FROM produit WHERE id_produit = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Produit introuvable.' });
    if (existing[0].id_etablissement !== req.user.id) {
      return res.status(403).json({ error: "Ce produit n'appartient pas à votre établissement." });
    }
    await pool.query('DELETE FROM produit WHERE id_produit = ?', [id]);
    res.status(204).send();
  } catch (err) { next(err); }
}

module.exports = { listByEtablissement, listMine, create, update, toggleDisponibilite, remove };
