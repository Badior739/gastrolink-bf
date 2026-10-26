const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');

router.post('/inscription/client', auth.signupClient);
router.post('/inscription/etablissement', auth.signupEtablissement);
router.post('/inscription/livreur', auth.signupLivreur);
router.post('/connexion', auth.login);

module.exports = router;
