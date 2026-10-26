const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const livreur = require('../controllers/livreurController');

// IMPORTANT : /me doit être déclaré AVANT /:id, sinon Express interpréterait
// "me" comme une valeur du paramètre :id.
router.get('/me', authenticate(['livreur']), livreur.obtenirMoi);
router.patch('/me', authenticate(['livreur']), livreur.mettreAJourMoi);

// Authentification requise (contrairement à établissement) : la position
// d'un livreur est une donnée plus sensible, on évite de l'exposer publiquement.
router.get('/:id', authenticate([]), livreur.getById);

module.exports = router;
