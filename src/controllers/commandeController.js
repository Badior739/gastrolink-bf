const pool = require('../config/db');
const { canTransition, isRoleAllowed } = require('../services/commandeStatus');
const { computeCommission } = require('../services/commissionService');

// Taux de commission par défaut (V1 : taux global unique, voir README —
// les taux spécifiques par établissement vus dans le wireframe admin
// nécessiteront une colonne supplémentaire, non incluse dans le script SQL V1).
const TAUX_COMMISSION_DEFAUT = Number(process.env.COMMISSION_TAUX_DEFAUT) || 10;

async function getCommandeOr404(id) {
  const [rows] = await pool.query('SELECT * FROM commande WHERE id_commande = ?', [id]);
  return rows[0] || null;
}

function estPartiePrenante(commande, user) {
  if (user.role === 'admin') return true;
  if (user.role === 'client') return commande.id_client === user.id;
  if (user.role === 'etablissement') return commande.id_etablissement === user.id;
  if (user.role === 'livreur') return commande.id_livreur === user.id;
  return false;
}

// -------------------- CRÉATION (Client) --------------------
async function create(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { id_etablissement, adresse_livraison, latitude_livraison, longitude_livraison, lignes } = req.body;
    if (!id_etablissement || !adresse_livraison || latitude_livraison === undefined || longitude_livraison === undefined) {
      return res.status(400).json({ error: 'id_etablissement, adresse_livraison, latitude_livraison, longitude_livraison sont obligatoires.' });
    }
    if (!Array.isArray(lignes) || lignes.length === 0) {
      return res.status(400).json({ error: 'La commande doit contenir au moins une ligne (lignes: [{id_produit, quantite}]).' });
    }

    await conn.beginTransaction();

    // Récupère les prix actuels des produits (jamais faire confiance au prix envoyé par le client)
    const idsProduits = lignes.map((l) => l.id_produit);
    const placeholders = idsProduits.map(() => '?').join(',');
    const [produits] = await conn.query(
      `SELECT id_produit, prix, disponible, id_etablissement FROM produit WHERE id_produit IN (${placeholders})`,
      idsProduits
    );
    if (produits.length !== idsProduits.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Un ou plusieurs produits sont introuvables.' });
    }
    for (const p of produits) {
      if (!p.disponible) {
        await conn.rollback();
        return res.status(409).json({ error: `Le produit ${p.id_produit} n'est plus disponible.` });
      }
      if (p.id_etablissement !== Number(id_etablissement)) {
        await conn.rollback();
        return res.status(400).json({ error: 'Tous les produits doivent appartenir au même établissement.' });
      }
    }

    const prixParProduit = Object.fromEntries(produits.map((p) => [p.id_produit, Number(p.prix)]));
    let montantTotal = 0;
    for (const l of lignes) {
      const qte = Number(l.quantite) || 0;
      if (qte <= 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'La quantité de chaque ligne doit être positive.' });
      }
      montantTotal += prixParProduit[l.id_produit] * qte;
    }

    const [result] = await conn.query(
      `INSERT INTO commande (id_client, id_etablissement, adresse_livraison, latitude_livraison, longitude_livraison, montant_total, statut)
       VALUES (?, ?, ?, ?, ?, ?, 'en_attente')`,
      [req.user.id, id_etablissement, adresse_livraison, latitude_livraison, longitude_livraison, montantTotal]
    );
    const idCommande = result.insertId;

    for (const l of lignes) {
      const qte = Number(l.quantite);
      const prixUnitaire = prixParProduit[l.id_produit];
      await conn.query(
        `INSERT INTO ligne_commande (id_commande, id_produit, quantite, prix_unitaire, sous_total)
         VALUES (?, ?, ?, ?, ?)`,
        [idCommande, l.id_produit, qte, prixUnitaire, prixUnitaire * qte]
      );
    }

    await conn.commit();
    res.status(201).json({ id_commande: idCommande, montant_total: montantTotal, statut: 'en_attente' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

// -------------------- LECTURE --------------------
async function getById(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (!estPartiePrenante(commande, req.user)) {
      return res.status(403).json({ error: "Vous n'avez pas accès à cette commande." });
    }
    const [lignes] = await pool.query(
      `SELECT lc.*, p.nom_produit FROM ligne_commande lc
       JOIN produit p ON p.id_produit = lc.id_produit WHERE lc.id_commande = ?`,
      [commande.id_commande]
    );
    // Ajouté en construisant l'écran « Nouvelle commande » côté établissement :
    // le nom et le téléphone du client (et du livreur, s'il est assigné)
    // manquaient pour donner un contexte utilisable sans appel supplémentaire.
    const [[client]] = await pool.query(
      'SELECT nom, prenom, telephone FROM client WHERE id_client = ?',
      [commande.id_client]
    );
    let livreur = null;
    if (commande.id_livreur) {
      const [[l]] = await pool.query(
        'SELECT nom, prenom, telephone FROM livreur WHERE id_livreur = ?',
        [commande.id_livreur]
      );
      livreur = l;
    }
    res.json({ ...commande, lignes, client, livreur });
  } catch (err) { next(err); }
}

async function listMine(req, res, next) {
  try {
    const { role, id } = req.user;
    const columnByRole = { client: 'c.id_client', etablissement: 'c.id_etablissement', livreur: 'c.id_livreur' };
    // Jointure avec ETABLISSEMENT (nom, pour l'historique client) et CLIENT
    // (nom/prénom, pour le tableau de bord établissement qui doit afficher
    // qui a passé chaque commande) — ajouté au fil de la construction des
    // écrans respectifs, sans impact sur les appelants existants (champs
    // en plus, jamais retirés).
    const baseSelect = `SELECT c.*, e.nom_etablissement, cl.nom AS client_nom, cl.prenom AS client_prenom
                         FROM commande c
                         JOIN etablissement e ON e.id_etablissement = c.id_etablissement
                         JOIN client cl ON cl.id_client = c.id_client`;
    if (role === 'admin') {
      const [rows] = await pool.query(`${baseSelect} ORDER BY c.date_commande DESC LIMIT 200`);
      return res.json(rows);
    }
    const column = columnByRole[role];
    if (!column) return res.status(403).json({ error: 'Rôle non pris en charge.' });
    const [rows] = await pool.query(`${baseSelect} WHERE ${column} = ? ORDER BY c.date_commande DESC`, [id]);
    res.json(rows);
  } catch (err) { next(err); }
}

/**
 * Liste les commandes confirmées mais sans livreur encore assigné —
 * ajouté en construisant l'écran « Nouvelle proposition » côté livreur :
 * accepterParLivreur exigeait déjà de connaître l'id_commande, mais rien
 * ne permettait à un livreur de découvrir quelles commandes existent.
 *
 * Simplification assumée par rapport au wireframe : plutôt qu'une
 * notification poussée à un livreur précis avec un délai de réponse (ce
 * qui nécessiterait un système de correspondance et une table de
 * propositions par livreur, hors périmètre V1), le livreur consulte une
 * liste des commandes disponibles et choisit celle qu'il souhaite
 * prendre en charge (modèle "pull" plutôt que "push"). Le bouton
 * « Refuser » du wireframe devient alors un simple retrait de la liste
 * côté application, sans action serveur nécessaire.
 */
async function listerDisponibles(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, e.nom_etablissement, e.latitude AS etablissement_latitude,
              e.longitude AS etablissement_longitude, e.quartier AS etablissement_quartier
       FROM commande c
       JOIN etablissement e ON e.id_etablissement = c.id_etablissement
       WHERE c.statut = 'confirmee' AND c.id_livreur IS NULL
       ORDER BY c.date_commande ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
}

// -------------------- ÉTABLISSEMENT : accepter / refuser --------------------
async function accepterParEtablissement(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (commande.id_etablissement !== req.user.id) return res.status(403).json({ error: 'Cette commande ne concerne pas votre établissement.' });
    if (!canTransition(commande.statut, 'confirmee') || !isRoleAllowed(commande.statut, 'confirmee', 'etablissement')) {
      return res.status(409).json({ error: `Transition impossible depuis le statut « ${commande.statut} ».` });
    }
    const { temps_preparation_estime } = req.body;
    if (!temps_preparation_estime || temps_preparation_estime <= 0) {
      return res.status(400).json({ error: 'temps_preparation_estime (en minutes) est obligatoire.' });
    }
    await pool.query(
      `UPDATE commande SET statut = 'confirmee', temps_preparation_estime = ? WHERE id_commande = ?`,
      [temps_preparation_estime, commande.id_commande]
    );
    res.json({ statut: 'confirmee', temps_preparation_estime });
  } catch (err) { next(err); }
}

async function refuserParEtablissement(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (commande.id_etablissement !== req.user.id) return res.status(403).json({ error: 'Cette commande ne concerne pas votre établissement.' });
    if (!canTransition(commande.statut, 'annulee')) {
      return res.status(409).json({ error: `Annulation impossible depuis le statut « ${commande.statut} ».` });
    }
    const { motif } = req.body;
    await pool.query(
      `UPDATE commande SET statut = 'annulee', annule_par = 'etablissement', motif_annulation = ? WHERE id_commande = ?`,
      [motif || 'Non précisé', commande.id_commande]
    );
    res.json({ statut: 'annulee' });
  } catch (err) { next(err); }
}

// -------------------- LIVREUR : accepter une proposition --------------------
async function accepterParLivreur(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (commande.id_livreur) return res.status(409).json({ error: 'Un livreur est déjà assigné à cette commande.' });
    if (commande.statut !== 'confirmee') {
      return res.status(409).json({ error: 'Seule une commande confirmée peut être prise en charge par un livreur.' });
    }
    const { temps_livraison_estime } = req.body;
    if (!temps_livraison_estime || temps_livraison_estime <= 0) {
      return res.status(400).json({ error: 'temps_livraison_estime (en minutes) est obligatoire.' });
    }
    const tempsTotal = (commande.temps_preparation_estime || 0) + Number(temps_livraison_estime);
    await pool.query(
      `UPDATE commande SET id_livreur = ?, temps_livraison_estime = ?, temps_total_estime = ? WHERE id_commande = ?`,
      [req.user.id, temps_livraison_estime, tempsTotal, commande.id_commande]
    );
    res.json({ id_livreur: req.user.id, temps_livraison_estime, temps_total_estime: tempsTotal });
  } catch (err) { next(err); }
}

// -------------------- CLIENT : valider le délai proposé --------------------
async function validerParClient(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (commande.id_client !== req.user.id) return res.status(403).json({ error: 'Cette commande ne vous appartient pas.' });
    if (!commande.temps_total_estime) {
      return res.status(409).json({ error: "Le délai total n'a pas encore été calculé (en attente du livreur)." });
    }
    await pool.query('UPDATE commande SET date_validation_client = NOW() WHERE id_commande = ?', [commande.id_commande]);
    res.json({ message: 'Commande validée par le client.', temps_total_estime: commande.temps_total_estime });
  } catch (err) { next(err); }
}

// -------------------- Transition générique de statut (préparation → prête → récupérée → en_livraison → livrée) --------------------
async function avancerStatut(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (!estPartiePrenante(commande, req.user)) {
      return res.status(403).json({ error: "Vous n'avez pas accès à cette commande." });
    }
    const { statut: nouveauStatut } = req.body;
    if (!canTransition(commande.statut, nouveauStatut)) {
      return res.status(409).json({ error: `Transition « ${commande.statut} → ${nouveauStatut} » invalide.` });
    }
    if (!isRoleAllowed(commande.statut, nouveauStatut, req.user.role)) {
      return res.status(403).json({ error: `Votre rôle ne peut pas déclencher cette transition.` });
    }

    await pool.query('UPDATE commande SET statut = ? WHERE id_commande = ?', [nouveauStatut, commande.id_commande]);

    // Génère automatiquement la commission une fois la commande livrée (règle 2.5.1)
    if (nouveauStatut === 'livree') {
      const montant = computeCommission(Number(commande.montant_total), TAUX_COMMISSION_DEFAUT);
      await pool.query(
        `INSERT INTO commission (id_commande, pourcentage, montant_commission) VALUES (?, ?, ?)`,
        [commande.id_commande, TAUX_COMMISSION_DEFAUT, montant]
      );
    }

    res.json({ statut: nouveauStatut });
  } catch (err) { next(err); }
}

// -------------------- Litige --------------------
async function signalerLitige(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    if (!estPartiePrenante(commande, req.user)) {
      return res.status(403).json({ error: "Vous n'avez pas accès à cette commande." });
    }
    const { motif } = req.body;
    if (!motif) return res.status(400).json({ error: 'Un motif est obligatoire pour signaler un litige.' });
    await pool.query('UPDATE commande SET en_litige = 1, motif_litige = ? WHERE id_commande = ?', [motif, commande.id_commande]);
    res.json({ en_litige: true, motif_litige: motif });
  } catch (err) { next(err); }
}

async function resoudreLitige(req, res, next) {
  try {
    const commande = await getCommandeOr404(req.params.id);
    if (!commande) return res.status(404).json({ error: 'Commande introuvable.' });
    await pool.query('UPDATE commande SET en_litige = 0 WHERE id_commande = ?', [commande.id_commande]);
    res.json({ en_litige: false });
  } catch (err) { next(err); }
}

module.exports = {
  create, getById, listMine, listerDisponibles,
  accepterParEtablissement, refuserParEtablissement,
  accepterParLivreur, validerParClient,
  avancerStatut, signalerLitige, resoudreLitige,
};
