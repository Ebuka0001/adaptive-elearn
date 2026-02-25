// controllers/questionController.js
const Question = require('../models/Question');
const Lesson = require('../models/Lesson');
const adaptiveService = require('../services/adaptiveService');

exports.createQuestion = async (req, res) => {
  const { text, type, choices, answer, difficulty, concepts, lessonId, points } = req.body;
  try {
    const question = new Question({ text, type, choices, answer, difficulty, concepts, points });
    await question.save();

    if (lessonId) {
      await Lesson.findByIdAndUpdate(lessonId, { $push: { questions: question._id } });
    }

    return res.json(question);
  } catch (err) {
    console.error('createQuestion error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getQuestion = async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (!q) return res.status(404).json({ message: 'Question not found' });
    return res.json(q);
  } catch (err) {
    console.error('getQuestion error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getNextQuestion = async (req, res) => {
  try {
    const { lessonId } = req.query;
    let questionsQuery = Question.find();

    if (lessonId) {
      const lesson = await Lesson.findById(lessonId).lean();
      if (lesson && Array.isArray(lesson.questions) && lesson.questions.length > 0) {
        questionsQuery = Question.find({ _id: { $in: lesson.questions } });
      } else {
        questionsQuery = Question.find({ _id: null }); // will be empty
      }
    }

    const questions = await questionsQuery.lean().limit(500);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: 'No questions available' });
    }

    // Let adaptive service choose. If adaptiveService returns null/undefined, use fallback.
    let next = null;
    try {
      if (adaptiveService && typeof adaptiveService.selectNextQuestionForUser === 'function') {
        next = await adaptiveService.selectNextQuestionForUser(req.user, questions);
      }
    } catch (ae) {
      console.error('adaptiveService.selectNextQuestionForUser error (non-fatal):', ae && ae.message ? ae.message : ae);
      next = null;
    }

    const chosen = next || questions[Math.floor(Math.random() * questions.length)];

    // Build safe question: remove answer + remove choice.correct flags
    const safeQuestion = {
      _id: chosen._id,
      text: chosen.text,
      type: chosen.type,
      difficulty: chosen.difficulty,
      concepts: chosen.concepts || [],
      points: chosen.points || 0,
      choices: Array.isArray(chosen.choices)
        ? chosen.choices.map(c => (typeof c === 'string' ? { text: c } : { text: c.text }))
        : []
    };

    return res.json(safeQuestion);
  } catch (err) {
    console.error('getNextQuestion error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};