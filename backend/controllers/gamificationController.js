// controllers/gamificationController.js
const User = require('../models/User');

exports.leaderboard = async (req, res) => {
  try {
    // top 10
    const top = await User.find().sort({ points: -1 }).limit(10).select('name points level badges').lean();

    // user's rank (1-based). If req.user not populated, return top only.
    let myRank = null;
    if (req.user && typeof req.user.points !== 'undefined') {
      // count docs with points greater than user
      const higher = await User.countDocuments({ points: { $gt: req.user.points } });
      myRank = higher + 1;
    }

    return res.json({ top, myRank });
  } catch (err) {
    console.error('leaderboard error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ message: 'Server error' });
  }
};