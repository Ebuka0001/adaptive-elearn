const mongoose = require('mongoose');

const choiceSchema = new mongoose.Schema({
  text: String,
  correct: Boolean
}, { _id: false });

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq','short','code'], default: 'mcq' },
  choices: [choiceSchema], // for mcq
  answer: String, // canonical answer for short/code
  difficulty: { type: Number, min: 1, max: 5, default: 2 },
  concepts: [String],
  points: { type: Number, default: 10 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
