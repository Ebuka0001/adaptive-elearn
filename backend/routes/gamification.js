// routes/gamification.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const gamificationController = require('../controllers/gamificationController');

router.get('/leaderboard', auth, gamificationController.leaderboard);

module.exports = router;
