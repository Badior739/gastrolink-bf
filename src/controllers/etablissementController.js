const pool = require('../config/db');

/**
 * Profil de l'établissement connecté (ETB-01 à ETB-18, hors mot_de_passe et
 * documents_legaux). Ajouté en construisant le tableau de bord établissement :
 * aucune route ne permettait jusqu'ici à un établissement de lire son
 * propre profil complet (statut_validation compris, utile pour savoir si
 * le compte est toujours en attente).
 */
async function obtenirMoi(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id_etablissement, nom_etablissement, type_etablissement, proprietaire_nom,
              telephone, email, ville, quartier, latitude, longitude, description,
              horaires_ouverture, statut_ouverture, note_moyenne, statut_validation
       FROM etablissement WHERE id_etablissement = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Établissement introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

/**
 * Met à jour le profil de l'établissement connecté (action 4 : « Modifier
 * son profil », et action 5 : « Basculer son statut ouvert/fermé »).
 * Champs volontairement exclus : nom_etablissement, type_etablissement,
 * telephone, documents_legaux et statut_validation — leur modification
 * nécessiterait une revalidation par un administrateur, non gérée en V1.
 */
async function mettreAJourMoi(req, res, next) {
  try {
    const champsAutorises = ['description', 'horaires_ouverture', 'statut_ouverture', 'ville', 'quartier'];
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
    await pool.query(`UPDATE etablissement SET ${updates.join(', ')} WHERE id_etablissement = ?`, values);
    res.json({ message: 'Profil mis à jour.' });
  } catch (err) { next(err); }
}

/**
 * Liste publique des établissements, pour l'écran d'accueil du client
 * (découverte géolocalisée, action 4/5 du wireframe Client). Filtrage
 * optionnel par ville, type et recherche textuelle sur le nom. Le tri par
 * distance réelle est fait côté application (Flutter), qui reçoit
 * latitude/longitude et calcule lui-même la distance à la position de
 * l'utilisateur — on évite ainsi une fonction géospatiale MySQL spécifique
 * pour rester simple en V1.
 */
async function list(req, res, next) {
  try {
    const { ville, type, q } = req.query;
    const conditions = ["statut_validation = 'valide'"];
    const params = [];

    if (ville) {
      conditions.push('ville = ?');
      params.push(ville);
    }
    if (type) {
      conditions.push('type_etablissement = ?');
      params.push(type);
    }
    if (q) {
      conditions.push('nom_etablissement LIKE ?');
      params.push(`%${q}%`);
    }

    const [rows] = await pool.query(
      `SELECT id_etablissement, nom_etablissement, type_etablissement, telephone,
              ville, quartier, latitude, longitude, statut_ouverture, note_moyenne
       FROM etablissement WHERE ${conditions.join(' AND ')}
       ORDER BY nom_etablissement`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
}

/**
 * Profil public d'un établissement (ETB-01 à ETB-15, hors champs sensibles
 * comme mot_de_passe et documents_legaux). Utilisé par les écrans client
 * (fiche établissement, suivi de commande) et livreur (détail de la
 * proposition de livraison).
 */
async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT id_etablissement, nom_etablissement, type_etablissement, telephone,
              ville, quartier, latitude, longitude, description, horaires_ouverture,
              statut_ouverture, note_moyenne
       FROM etablissement WHERE id_etablissement = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Établissement introuvable.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

module.exports = { obtenirMoi, mettreAJourMoi, list, getById };
