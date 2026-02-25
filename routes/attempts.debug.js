// routes/attempts.debug.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

// controller implemented in controllers/attemptController.noservices.js
const debugController = require('../controllers/attemptController.noservices');

router.post('/debug', auth, debugController.submitAttemptNoServices);

module.exports = router;