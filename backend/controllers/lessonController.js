const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

exports.createLesson = async (req, res) => {
  const { title, content, courseId, concepts, order } = req.body;
  try {
    const lesson = new Lesson({ title, content, course: courseId, concepts, order });
    await lesson.save();
    await Course.findByIdAndUpdate(courseId, { $push: { lessons: lesson._id } });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLessonsByCourse = async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId }).populate('questions');
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
