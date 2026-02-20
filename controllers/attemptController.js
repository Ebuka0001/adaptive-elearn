// controllers/attemptController.js
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const User = require('../models/User');
const adaptiveService = require('../services/adaptiveService');
const badgeService = require('../services/badgeService');

exports.submitAttempt = async (req, res) => {
  const { questionId, givenAnswer } = req.body;

  try {
    // Basic validation
    if (!questionId) return res.status(400).json({ message: 'questionId is required' });

    // Validate ObjectId format to avoid uncaught CastError
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'questionId is not a valid id' });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Evaluate correctness
    let correct = false;
    if (question.type === 'mcq') {
      const correctChoice = (question.choices || []).find(c => c.correct);
      correct = !!(correctChoice && correctChoice.text === givenAnswer);
    } else {
      correct = String(question.answer || '').trim().toLowerCase() === String(givenAnswer || '').trim().toLowerCase();
    }

    const pointsEarned = correct ? (question.points || 0) : 0;

    // Create attempt doc
    const attempt = new Attempt({
      student: req.user._id,
      question: question._id,
      correct,
      givenAnswer,
      pointsEarned
    });
    await attempt.save();

    // Update user (retrieve fresh doc)
    const user = await User.findById(req.user._id);
    if (!user) {
      // very unlikely, but handle gracefully
      return res.status(500).json({ message: 'User not found when updating after attempt' });
    }

    if (pointsEarned) {
      user.points = (user.points || 0) + pointsEarned;
      user.level = Math.floor(user.points / 100) + 1;
    }

    // Update mastery per concept (adaptive service should be defensive)
    try {
      await adaptiveService.updateMastery(user, question.concepts || [], correct, question.difficulty || 1);
    } catch (mErr) {
      console.error('updateMastery error (non-fatal):', mErr && mErr.message ? mErr.message : mErr);
    }

    // Check badges (defensive; function returns awarded badges or empty array)
    try {
      const awarded = await badgeService.checkBadges(user);
      // awarded badges already pushed by checkBadges if implemented that way
    } catch (bErr) {
      console.error('badgeService.checkBadges error (non-fatal):', bErr && bErr.message ? bErr.message : bErr);
    }

    await user.save();

    res.json({ attempt, user: { id: user._id, name: user.name, points: user.points, level: user.level, mastery: user.mastery, badges: user.badges } });
  } catch (err) {
    console.error('submitAttempt error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAttemptsForStudent = async (req, res) => {
  try {
    const attempts = await Attempt.find({ student: req.params.studentId }).populate('question');
    res.json(attempts);
  } catch (err) {
    console.error('getAttemptsForStudent error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
};