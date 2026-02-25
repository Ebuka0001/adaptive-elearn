// controllers/attemptController.js
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const User = require('../models/User');
const adaptiveService = require('../services/adaptiveService');
const badgeService = require('../services/badgeService');
const { calculateReward } = require('../services/rewardService');

exports.submitAttempt = async (req, res) => {
  const { questionId, givenAnswer, timeSeconds = 0 } = req.body;

  try {
    if (!questionId) return res.status(400).json({ message: 'questionId is required' });
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'questionId is not a valid id' });
    }

    // Start a session for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    // Fetch question inside transaction context
    const question = await Question.findById(questionId).session(session);
    if (!question) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Question not found' });
    }

    // Evaluate correctness (same logic as before, but defensive)
    let correct = false;
    if (question.type === 'mcq') {
      const correctChoice = (question.choices || []).find(c => c.correct);
      correct = !!(correctChoice && String(correctChoice.text).trim() === String(givenAnswer || '').trim());
    } else {
      correct = String(question.answer || '').trim().toLowerCase() === String(givenAnswer || '').trim().toLowerCase();
    }

    // Load fresh user doc inside session
    const user = await User.findById(req.user._id).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ message: 'User not found (during attempt)' });
    }

    // calculate points using centralized service
    const pointsToAward = calculateReward({
      correct,
      difficulty: question.difficulty || 1,
      timeSeconds,
      base: question.points || 10,
      streak: user.currentStreak || 0
    });

    // Create attempt (audit)
    const attemptDoc = await Attempt.create([{
      student: user._id,
      question: question._id,
      correct,
      givenAnswer,
      pointsEarned: pointsToAward,
      timeSeconds
    }], { session });

    // Update user points/level
    if (pointsToAward && pointsToAward > 0) {
      user.points = (user.points || 0) + pointsToAward;
      user.level = Math.floor((user.points) / 100) + 1;
      // update streak if you track it simply
      user.currentStreak = correct ? ((user.currentStreak || 0) + 1) : 0;
    } else {
      // reset streak on wrong answer
      user.currentStreak = 0;
    }

    // Update mastery (defensive - external service)
    try {
      await adaptiveService.updateMastery(user, question.concepts || [], correct, question.difficulty || 1, { session });
    } catch (mErr) {
      // Non-fatal: log and continue
      console.error('adaptiveService.updateMastery error (non-fatal):', mErr && mErr.message ? mErr.message : mErr);
    }

    // Badge checks (defensive)
    let awardedBadges = [];
    try {
      awardedBadges = (await badgeService.checkBadges(user)) || [];
    } catch (bErr) {
      console.error('badgeService.checkBadges error (non-fatal):', bErr && bErr.message ? bErr.message : bErr);
    }

    // Persist user changes within session
    await user.save({ session });

    // commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return freshly created attempt (attemptDoc is array)
    return res.json({
      attempt: attemptDoc[0],
      user: { id: user._id, name: user.name, points: user.points, level: user.level, mastery: user.mastery, badges: user.badges },
      awardedBadges
    });
  } catch (err) {
    console.error('submitAttempt error:', err && err.stack ? err.stack : err);
    try {
      // ensure session aborted if still alive
      if (err && err.session) {
        await err.session.abortTransaction();
        err.session.endSession();
      }
    } catch (e) { /* ignore */ }
    return res.status(500).json({ message: 'Server error' });
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