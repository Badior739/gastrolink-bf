const pool = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const jwt = require('../utils/jwt');

const ROLE_CONFIG = {
  client: { table: 'client', idField: 'id_client' },
  etablissement: { table: 'etablissement', idField: 'id_etablissement' },
  livreur: { table: 'livreur', idField: 'id_livreur' },
  admin: { table: 'administrateur', idField: 'id_admin' },
};

// -------------------- INSCRIPTION CLIENT --------------------
async function signupClient(req, res, next) {
  try {
    const { nom, prenom, telephone, email, mot_de_passe, ville, quartier } = req.body;
    if (!nom || !prenom || !telephone || !mot_de_passe || !ville) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants (nom, prenom, telephone, mot_de_passe, ville).',
      });
    }
    const [existing] = await pool.query('SELECT id_client FROM client WHERE telephone = ?', [telephone]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
    }
    const hashed = hashPassword(mot_de_passe);
    const [result] = await pool.query(
      `INSERT INTO client (nom, prenom, telephone, email, mot_de_passe, ville, quartier)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, telephone, email || null, hashed, ville, quartier || null]
    );
    const token = jwt.sign({ id: result.insertId, role: 'client' }, process.env.JWT_SECRET);
    res.status(201).json({ id_client: result.insertId, token });
  } catch (err) {
    next(err);
  }
}

// -------------------- INSCRIPTION ETABLISSEMENT --------------------
async function signupEtablissement(req, res, next) {
  try {
    const {
      nom_etablissement, type_etablissement, proprietaire_nom, telephone, email,
      mot_de_passe, ville, quartier, latitude, longitude, documents_legaux,
    } = req.body;
    const required = { nom_etablissement, type_etablissement, proprietaire_nom, telephone, mot_de_passe, ville, quartier, latitude, longitude };
    const missing = Object.entries(required).filter(([, v]) => v === undefined || v === null || v === '');
    if (missing.length > 0) {
      return res.status(400).json({ error: `Champs obligatoires manquants : ${missing.map(([k]) => k).join(', ')}.` });
    }
    const [existing] = await pool.query('SELECT id_etablissement FROM etablissement WHERE telephone = ?', [telephone]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
    }
    const hashed = hashPassword(mot_de_passe);
    const [result] = await pool.query(
      `INSERT INTO etablissement
        (nom_etablissement, type_etablissement, proprietaire_nom, telephone, email, mot_de_passe,
         ville, quartier, latitude, longitude, documents_legaux, statut_validation, statut_ouverture)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', 'ferme')`,
      [nom_etablissement, type_etablissement, proprietaire_nom, telephone, email || null, hashed,
        ville, quartier, latitude, longitude, documents_legaux || null]
    );
    // Statut « en_attente » : pas de token utile immédiatement (règle 2.4.1), mais on le renvoie
    // pour permettre à l'app de suivre l'état de validation (écran « en attente »).
    const token = jwt.sign({ id: result.insertId, role: 'etablissement' }, process.env.JWT_SECRET);
    res.status(201).json({
      id_etablissement: result.insertId,
      statut_validation: 'en_attente',
      token,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- INSCRIPTION LIVREUR --------------------
async function signupLivreur(req, res, next) {
  try {
    const { nom, prenom, telephone, email, mot_de_passe, type_vehicule, numero_immatriculation, piece_identite } = req.body;
    if (!nom || !prenom || !telephone || !mot_de_passe || !type_vehicule || !piece_identite) {
      return res.status(400).json({
        error: 'Champs obligatoires manquants (nom, prenom, telephone, mot_de_passe, type_vehicule, piece_identite).',
      });
    }
    const [existing] = await pool.query('SELECT id_livreur FROM livreur WHERE telephone = ?', [telephone]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
    }
    const hashed = hashPassword(mot_de_passe);
    const [result] = await pool.query(
      `INSERT INTO livreur
        (nom, prenom, telephone, email, mot_de_passe, type_vehicule, numero_immatriculation,
         piece_identite, statut_validation, statut_disponibilite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', 'hors_ligne')`,
      [nom, prenom, telephone, email || null, hashed, type_vehicule, numero_immatriculation || null, piece_identite]
    );
    const token = jwt.sign({ id: result.insertId, role: 'livreur' }, process.env.JWT_SECRET);
    res.status(201).json({
      id_livreur: result.insertId,
      statut_validation: 'en_attente',
      token,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------- CONNEXION (4 rôles) --------------------
async function login(req, res, next) {
  try {
    const { telephone, email, mot_de_passe, role } = req.body;
    const config = ROLE_CONFIG[role];
    if (!config) {
      return res.status(400).json({ error: 'Rôle invalide (client, etablissement, livreur, admin).' });
    }
    if (!mot_de_passe) {
      return res.status(400).json({ error: 'Mot de passe requis.' });
    }

    const { table, idField } = config;
    let rows;
    if (role === 'admin') {
      if (!email) return res.status(400).json({ error: 'Email requis pour un compte administrateur.' });
      [rows] = await pool.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
    } else {
      const loginValue = telephone || email;
      if (!loginValue) return res.status(400).json({ error: 'Téléphone ou email requis.' });
      const field = telephone ? 'telephone' : 'email';
      [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${field} = ?`, [loginValue]);
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const user = rows[0];
    if (!verifyPassword(mot_de_passe, user.mot_de_passe)) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Établissement et livreur doivent être validés par un administrateur avant de se connecter
    // pleinement (règles 2.3.4 et 2.4.1) — on laisse toutefois la connexion réussir pour que
    // l'app puisse afficher l'écran "en attente de validation" avec le bon statut.
    delete user.mot_de_passe;
    const token = jwt.sign({ id: user[idField], role }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

module.exports = { signupClient, signupEtablissement, signupLivreur, login };
