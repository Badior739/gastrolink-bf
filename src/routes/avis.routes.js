const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const avis = require('../controllers/avisController');

router.post('/', authenticate(['client']), avis.create);
router.get('/etablissement/:id_etablissement', avis.listByEtablissement);
router.get('/livreur/:id_livreur', avis.listByLivreur);

module.exports = router;
