const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const courseController = require('../controllers/courseController');

router.post('/', auth, role(['lecturer']), courseController.createCourse);
router.get('/', auth, courseController.listCourses);
router.get('/:id', auth, courseController.getCourse);

module.exports = router;
