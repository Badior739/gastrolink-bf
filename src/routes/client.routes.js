const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const client = require('../controllers/clientController');

router.use(authenticate(['client']));

router.get('/me', client.obtenirMoi);
router.patch('/me', client.mettreAJour);

module.exports = router;
