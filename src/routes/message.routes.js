const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const message = require('../controllers/messageController');

router.post('/', authenticate([]), message.send);
router.get('/commande/:id_commande', authenticate([]), message.listByCommande);

module.exports = router;
