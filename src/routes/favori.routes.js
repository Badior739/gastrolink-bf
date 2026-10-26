const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const favori = require('../controllers/favoriController');

router.use(authenticate(['client']));

router.get('/', favori.listerMiens);
router.get('/detail', favori.listerMiensDetail);
router.post('/', favori.ajouter);
router.delete('/:id_etablissement', favori.retirer);

module.exports = router;
