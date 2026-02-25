const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  concepts: [String],
  order: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', lessonSchema);
