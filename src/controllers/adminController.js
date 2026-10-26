const pool = require('../config/db');

async function listEtablissementsEnAttente(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM etablissement WHERE statut_validation = 'en_attente' ORDER BY date_inscription ASC"
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function validerEtablissement(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE etablissement SET statut_validation = 'valide', id_admin_validation = ? WHERE id_etablissement = ?",
      [req.user.id, id]
    );
    res.json({ statut_validation: 'valide' });
  } catch (err) { next(err); }
}

async function rejeterEtablissement(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE etablissement SET statut_validation = 'rejete', id_admin_validation = ? WHERE id_etablissement = ?",
      [req.user.id, id]
    );
    res.json({ statut_validation: 'rejete' });
  } catch (err) { next(err); }
}

async function listLivreursEnAttente(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM livreur WHERE statut_validation = 'en_attente' ORDER BY date_inscription ASC"
    );
    res.json(rows);
  } catch (err) { next(err); }
}

async function validerLivreur(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE livreur SET statut_validation = 'valide', id_admin_validation = ? WHERE id_livreur = ?",
      [req.user.id, id]
    );
    res.json({ statut_validation: 'valide' });
  } catch (err) { next(err); }
}

async function rejeterLivreur(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE livreur SET statut_validation = 'rejete', id_admin_validation = ? WHERE id_livreur = ?",
      [req.user.id, id]
    );
    res.json({ statut_validation: 'rejete' });
  } catch (err) { next(err); }
}

// Suspension / réactivation de comptes (action 8 du wireframe admin)
const TABLES_COMPTE = {
  client: { table: 'client', idField: 'id_client', champStatut: 'statut_compte', valeurs: { actif: 'actif', suspendu: 'suspendu' } },
  etablissement: { table: 'etablissement', idField: 'id_etablissement', champStatut: 'statut_validation', valeurs: { actif: 'valide', suspendu: 'rejete' } },
  livreur: { table: 'livreur', idField: 'id_livreur', champStatut: 'statut_validation', valeurs: { actif: 'valide', suspendu: 'rejete' } },
};

async function suspendreCompte(req, res, next) {
  try {
    const { type, id } = req.params;
    const config = TABLES_COMPTE[type];
    if (!config) return res.status(400).json({ error: 'Type de compte invalide (client, etablissement, livreur).' });
    await pool.query(`UPDATE ${config.table} SET ${config.champStatut} = ? WHERE ${config.idField} = ?`, [config.valeurs.suspendu, id]);
    res.json({ message: 'Compte suspendu.' });
  } catch (err) { next(err); }
}

async function reactiverCompte(req, res, next) {
  try {
    const { type, id } = req.params;
    const config = TABLES_COMPTE[type];
    if (!config) return res.status(400).json({ error: 'Type de compte invalide (client, etablissement, livreur).' });
    await pool.query(`UPDATE ${config.table} SET ${config.champStatut} = ? WHERE ${config.idField} = ?`, [config.valeurs.actif, id]);
    res.json({ message: 'Compte réactivé.' });
  } catch (err) { next(err); }
}

// Tableau de bord global (action 2)
async function tableauDeBord(req, res, next) {
  try {
    const [[commandesJour]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(montant_total), 0) AS chiffre_affaires FROM commande WHERE DATE(date_commande) = CURDATE()"
    );
    const [[commissionsJour]] = await pool.query(
      "SELECT COALESCE(SUM(montant_commission), 0) AS total FROM commission WHERE DATE(date_calcul) = CURDATE()"
    );
    const [[enAttente]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM etablissement WHERE statut_validation = 'en_attente') +
        (SELECT COUNT(*) FROM livreur WHERE statut_validation = 'en_attente') AS total`
    );
    const [[litiges]] = await pool.query('SELECT COUNT(*) AS total FROM commande WHERE en_litige = 1');
    res.json({
      commandes_aujourdhui: commandesJour.total,
      chiffre_affaires_jour: commandesJour.chiffre_affaires,
      commissions_jour: commissionsJour.total,
      comptes_en_attente: enAttente.total,
      litiges_ouverts: litiges.total,
    });
  } catch (err) { next(err); }
}

module.exports = {
  listEtablissementsEnAttente, validerEtablissement, rejeterEtablissement,
  listLivreursEnAttente, validerLivreur, rejeterLivreur,
  suspendreCompte, reactiverCompte, tableauDeBord,
};
