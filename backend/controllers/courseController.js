const Course = require('../models/Course');

exports.createCourse = async (req, res) => {
  const { title, description } = req.body;
  try {
    const course = new Course({ title, description, lecturer: req.user._id });
    await course.save();
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('lecturer','name email');
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('lessons');
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
