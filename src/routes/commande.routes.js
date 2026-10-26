const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const commande = require('../controllers/commandeController');

router.post('/', authenticate(['client']), commande.create);
router.get('/', authenticate([]), commande.listMine);

// IMPORTANT : /disponibles doit être déclaré AVANT /:id, sinon Express
// interpréterait "disponibles" comme la valeur du paramètre :id.
router.get('/disponibles', authenticate(['livreur']), commande.listerDisponibles);

router.get('/:id', authenticate([]), commande.getById);

router.post('/:id/accepter-etablissement', authenticate(['etablissement']), commande.accepterParEtablissement);
router.post('/:id/refuser-etablissement', authenticate(['etablissement']), commande.refuserParEtablissement);

router.post('/:id/accepter-livreur', authenticate(['livreur']), commande.accepterParLivreur);

router.post('/:id/valider', authenticate(['client']), commande.validerParClient);

router.patch('/:id/statut', authenticate([]), commande.avancerStatut);

router.post('/:id/litige', authenticate([]), commande.signalerLitige);
router.patch('/:id/litige/resoudre', authenticate(['admin']), commande.resoudreLitige);

module.exports = router;
