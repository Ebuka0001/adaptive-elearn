// services/badgeService.js
const Badge = require('../models/Badge');

/**
 * Simple badge rules:
 * - first_correct : awarded when user gets their first correct attempt (no need for immediate creation)
 * - score_100 : awarded when user.points >= 100
 *
 * checkBadges(user) will mutate user.badges (push ObjectId) but does NOT save the user.
 * It ensures badge docs exist in DB, and returns an array of awarded badge ids (newly awarded).
 */
async function checkBadges(user) {
  if (!user) return [];
  const awarded = [];

  // helper: ensure badge exists (by code)
  async function ensureBadge(code, title, description) {
    let badge = await Badge.findOne({ code });
    if (!badge) {
      badge = new Badge({ code, title, description });
      await badge.save();
    }
    return badge;
  }

  try {
    // first_correct: award if user has at least one correct attempt but no badge yet
    // For simplicity: if user.mastery has any value > 0 (meaning they answered something correctly at some point),
    // and user.badges doesn't include 'first_correct', then award it.
    const firstBadge = await ensureBadge('first_correct', 'First Win', 'Awarded for first correct answer');

    // check if user already has it
    const hasFirst = Array.isArray(user.badges) && user.badges.some(b => String(b) === String(firstBadge._id));
    // decide awarding condition: we cannot query attempts here (controller already knows 'correct' at time of attempt),
    // but the attempt controller calls checkBadges after a successful attempt, so we can award when user doesn't have it yet.
    if (!hasFirst) {
      // The controller calls this after an attempt; if the user has any mastery > 0 we assume they had a correct attempt.
      const masteryVals = (user.mastery && typeof user.mastery.get === 'function')
        ? Array.from(user.mastery.values())
        : (user.mastery ? Object.values(user.mastery) : []);
      const anyMastery = masteryVals.some(v => Number(v) > 0);
      if (anyMastery) {
        user.badges = user.badges || [];
        user.badges.push(firstBadge._id);
        awarded.push(firstBadge._id);
      }
    }

    // score_100: award when user.points >= 100
    const scoreBadge = await ensureBadge('score_100', 'Century', 'Reach 100 points');
    const hasScore = Array.isArray(user.badges) && user.badges.some(b => String(b) === String(scoreBadge._id));
    if (!hasScore && Number(user.points || 0) >= 100) {
      user.badges = user.badges || [];
      user.badges.push(scoreBadge._id);
      awarded.push(scoreBadge._id);
    }

    return awarded;
  } catch (err) {
    console.error('badgeService.checkBadges error:', err && err.message ? err.message : err);
    return [];
  }
}

module.exports = {
  checkBadges
};
