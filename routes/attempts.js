const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
// idempotency temporarily disabled (we can re-enable once middleware is verified)
// const idempotency = require('../middleware/idempotencyMiddleware');
const attemptController = require('../controllers/attemptController');

// list attempts (optional)
router.get('/', auth, attemptController.getAttemptsForStudent);

// submit attempt: protect only with auth for now (idempotency middleware removed)
router.post('/', auth, attemptController.submitAttempt);

module.exports = router;
