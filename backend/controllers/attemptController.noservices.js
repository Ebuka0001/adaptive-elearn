// controllers/attemptController.noservices.js
// Temporary debug-only attempt handler: creates Attempt and updates user,
// but DOES NOT call adaptiveService or badgeService. Use only for debugging.

const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const User = require('../models/User');
const { calculateReward } = require('../services/rewardService');

exports.submitAttemptNoServices = async (req, res) => {
  try {
    const { questionId, givenAnswer, timeSeconds = 0 } = req.body || {};
    if (!questionId) return res.status(400).json({ message: 'questionId required' });
    if (!mongoose.Types.ObjectId.isValid(questionId)) return res.status(400).json({ message: 'invalid questionId' });

    const question = await Question.findById(questionId).lean();
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // determine correctness (same logic as production)
    let correct = false;
    if (question.type === 'mcq') {
      const correctChoice = (question.choices || []).find(c => c.correct);
      correct = !!(correctChoice && String(correctChoice.text).trim() === String(givenAnswer || '').trim());
    } else {
      correct = String(question.answer || '').trim().toLowerCase() === String(givenAnswer || '').trim().toLowerCase();
    }

    // create Attempt (audit)
    const points = calculateReward({
      correct,
      difficulty: question.difficulty || 1,
      timeSeconds,
      base: question.points || 10,
      streak: 0
    });

    const attempt = await Attempt.create({
      student: req.user._id,
      question: question._id,
      correct,
      givenAnswer,
      pointsEarned: points,
      timeSeconds
    });

    // atomic-ish update of user using findByIdAndUpdate with $inc to avoid full save blocking
    const update = {};
    if (points > 0) {
      update.$inc = { points: points };
      update.$set = { level: Math.floor(((req.user.points || 0) + points) / 100) + 1 };
    } else {
      update.$set = { level: Math.floor((req.user.points || 0) / 100) + 1 };
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

    return res.json({ debug: true, attempt, user });
  } catch (err) {
    console.error('submitAttemptNoServices error:', err && (err.stack || err.message) ? (err.stack || err.message) : err);
    res.status(500).json({ message: 'Server error (noservices)' });
  }
};