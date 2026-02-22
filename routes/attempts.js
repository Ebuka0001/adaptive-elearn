// routes/attempts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const idempotency = require('../middleware/idempotencyMiddleware');
const attemptController = require('../controllers/attemptController');

// list attempts (optional)
router.get('/', auth, attemptController.getAttemptsForStudent);

// submit attempt: protect + idempotency
// client should send header: Idempotency-Key: <unique-value> for each distinct attempt
router.post('/', auth, idempotency, attemptController.submitAttempt);

module.exports = router;