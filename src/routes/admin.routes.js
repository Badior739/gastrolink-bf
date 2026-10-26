const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const admin = require('../controllers/adminController');

router.use(authenticate(['admin']));

router.get('/tableau-de-bord', admin.tableauDeBord);

router.get('/etablissements/en-attente', admin.listEtablissementsEnAttente);
router.post('/etablissements/:id/valider', admin.validerEtablissement);
router.post('/etablissements/:id/rejeter', admin.rejeterEtablissement);

router.get('/livreurs/en-attente', admin.listLivreursEnAttente);
router.post('/livreurs/:id/valider', admin.validerLivreur);
router.post('/livreurs/:id/rejeter', admin.rejeterLivreur);

router.post('/comptes/:type/:id/suspendre', admin.suspendreCompte);
router.post('/comptes/:type/:id/reactiver', admin.reactiverCompte);

module.exports = router;
