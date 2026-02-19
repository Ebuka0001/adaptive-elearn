//routes/attempts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const attemptController = require('../controllers/attemptController');

router.post('/', auth, attemptController.submitAttempt);
router.get('/student/:studentId', auth, attemptController.getAttemptsForStudent);

module.exports = router;
