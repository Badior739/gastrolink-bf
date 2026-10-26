const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notification = require('../controllers/notificationController');

router.use(authenticate([]));

router.get('/', notification.listerMiennes);
router.patch('/:id/lue', notification.marquerLue);

module.exports = router;
