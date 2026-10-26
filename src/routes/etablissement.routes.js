const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const etablissement = require('../controllers/etablissementController');

// IMPORTANT : /me doit être déclaré AVANT /:id, sinon Express interpréterait
// "me" comme une valeur du paramètre :id de la route publique getById.
router.get('/me', authenticate(['etablissement']), etablissement.obtenirMoi);
router.patch('/me', authenticate(['etablissement']), etablissement.mettreAJourMoi);

router.get('/', etablissement.list);
router.get('/:id', etablissement.getById);

module.exports = router;
