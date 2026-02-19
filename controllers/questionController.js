// controllers/questionController.js

const Question = require('../models/Question');
const Lesson = require('../models/Lesson');
const adaptiveService = require('../services/adaptiveService');

/**
 * Create a question (lecturer)
 * - body: { text, type, choices, answer, difficulty, concepts, lessonId, points }
 * - If lessonId provided, we push question._id into the lesson.questions array.
 */
exports.createQuestion = async (req, res) => {
  const { text, type, choices, answer, difficulty, concepts, lessonId, points } = req.body;
  try {
    const question = new Question({ text, type, choices, answer, difficulty, concepts, points });
    await question.save();

    if (lessonId) {
      await Lesson.findByIdAndUpdate(lessonId, { $push: { questions: question._id } });
    }

    // Return full question to lecturers (they need correct flags); frontends for students use /questions/next
    return res.json(question);
  } catch (err) {
    console.error('createQuestion error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get one question (raw) - used for editing/review (lecturer)
 */
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

/**
 * Get next adaptive question for the requesting user (student)
 * - Optional query: ?lessonId=xxxxx to restrict to a lesson's questions
 * - Returns a "safe" question object with:
 *     - no `answer` field
 *     - choices array with only `text` (no `correct` flags)
 */
exports.getNextQuestion = async (req, res) => {
  try {
    // Optionally filter by lessonId if frontend wants lesson-specific practice
    const { lessonId } = req.query;

    let questionsQuery = Question.find();

    if (lessonId) {
      // if lessonId is provided, fetch questions that reference that lesson via Lesson model,
      // or assume Question has a lessonId field. Adjust depending on your schema.
      // Here we try a safe approach: if Lesson exists and has questions array, fetch those.
      const LessonModel = require('../models/Lesson');
      const lesson = await LessonModel.findById(lessonId).lean();
      if (lesson && Array.isArray(lesson.questions) && lesson.questions.length > 0) {
        questionsQuery = Question.find({ _id: { $in: lesson.questions } });
      } else {
        // fallback: empty - leads to 404
        questionsQuery = Question.find({ _id: null });
      }
    }

    // fetch candidate questions as plain JS objects
    const questions = await questionsQuery.lean().limit(500);

    if (!questions || questions.length === 0) {
      return res.status(404).json({ message: 'No questions available' });
    }

    // Pass user and questions to adaptive service (service expects user, questions)
    const next = adaptiveService.selectNextQuestionForUser(req.user, questions);

    // fallback: if service returns null, pick a random question
    const chosen = next || questions[Math.floor(Math.random() * questions.length)];

    // Build a safe version to send to students: remove `answer` and `choices.correct`
    const safeQuestion = {
      ...chosen,
      // explicitly remove answer
      answer: undefined,
      // map choices to only include visible fields (text). If choices are plain strings adjust accordingly.
      choices: Array.isArray(chosen.choices)
        ? chosen.choices.map(c => {
            // if choice is string or object with text
            if (typeof c === 'string') return { text: c };
            return { text: c.text };
          })
        : []
    };

    return res.json(safeQuestion);
  } catch (err) {
    console.error('getNextQuestion error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};
