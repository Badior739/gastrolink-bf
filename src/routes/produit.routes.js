const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const produit = require('../controllers/produitController');

// Public (consultation client)
router.get('/etablissement/:id_etablissement', produit.listByEtablissement);

// Vendeur uniquement
router.get('/moi', authenticate(['etablissement']), produit.listMine);
router.post('/', authenticate(['etablissement']), produit.create);
router.patch('/:id', authenticate(['etablissement']), produit.update);
router.patch('/:id/disponibilite', authenticate(['etablissement']), produit.toggleDisponibilite);
router.delete('/:id', authenticate(['etablissement']), produit.remove);

module.exports = router;
