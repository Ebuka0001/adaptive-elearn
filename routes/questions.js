//routes/questions.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const questionController = require('../controllers/questionController');

router.post('/', auth, role(['lecturer']), questionController.createQuestion);
router.get('/next', auth, questionController.getNextQuestion);
router.get('/:id', auth, questionController.getQuestion);

module.exports = router;
