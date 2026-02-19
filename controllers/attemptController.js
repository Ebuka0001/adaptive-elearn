// controllers/attemptController.js
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const User = require('../models/User');
const adaptiveService = require('../services/adaptiveService');
const badgeService = require('../services/badgeService');

/**
 * Submit an attempt (student)
 * body: { questionId, givenAnswer }
 */
exports.submitAttempt = async (req, res) => {
  const { questionId, givenAnswer } = req.body;
  try {
    if (!questionId) return res.status(400).json({ message: 'questionId is required' });

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Determine correctness
    let correct = false;
    if (question.type === 'mcq') {
      // mcq: givenAnswer should be the choice text (string) or index - handle string case
      const correctChoice = Array.isArray(question.choices) ? question.choices.find(c => c.correct) : null;
      correct = correctChoice && String(correctChoice.text).trim() === String(givenAnswer).trim();
    } else {
      correct = String(question.answer || '').trim().toLowerCase() === String(givenAnswer || '').trim().toLowerCase();
    }

    const pointsEarned = correct ? (Number(question.points) || 0) : 0;

    // Create attempt
    const attempt = new Attempt({
      student: (req.user && (req.user._id || req.user.id)) || null,
      question: question._id,
      correct,
      givenAnswer,
      pointsEarned,
      createdAt: new Date()
    });
    await attempt.save();

    // Update user
    const userId = (req.user && (req.user._id || req.user.id));
    if (!userId) {
      // should never happen if auth middleware is correct
      return res.status(401).json({ message: 'Unauthenticated' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ensure fields exist
    user.points = Number(user.points || 0);
    user.level = Number(user.level || 1);
    user.mastery = user.mastery || {};

    if (pointsEarned) {
      user.points += pointsEarned;
      // example simple leveling rule: every 100 points -> level up
      user.level = Math.floor(user.points / 100) + 1;
    }

    // Update mastery via service (service should mutate user.mastery or return updated mastery)
    try {
      await adaptiveService.updateMastery(user, Array.isArray(question.concepts) ? question.concepts : [], correct, question.difficulty || 1);
    } catch (err) {
      console.error('adaptiveService.updateMastery error:', err && err.message ? err.message : err);
      // not fatal — continue
    }

    // Check badges (may push badge ids onto user.badges)
    try {
      await badgeService.checkBadges(user);
    } catch (err) {
      console.error('badgeService.checkBadges error:', err && err.message ? err.message : err);
    }

    await user.save();

    // Return attempt + user summary (do not return password hash)
    return res.json({
      attempt,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        points: user.points,
        level: user.level,
        mastery: user.mastery,
        badges: user.badges
      }
    });
  } catch (err) {
    console.error('submitAttempt error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getAttemptsForStudent = async (req, res) => {
  try {
    // If no studentId provided, and requester is student, return their attempts
    const studentId = req.params.studentId || (req.user && (req.user._id || req.user.id));
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const attempts = await Attempt.find({ student: studentId }).populate('question').lean();
    return res.json(attempts);
  } catch (err) {
    console.error('getAttemptsForStudent error:', err && err.message ? err.message : err);
    return res.status(500).json({ message: 'Server error' });
  }
};
