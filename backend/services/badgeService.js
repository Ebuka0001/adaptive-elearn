// services/badgeService.js
const Badge = require('../models/Badge');

/**
 * Check badges for a user and award them when appropriate.
 * Defensive: validates badge payloads before creating/saving.
 */

async function createBadgeIfNotExists(badgeData) {
  if (!badgeData || typeof badgeData !== 'object') {
    throw new Error('Invalid badgeData');
  }
  const { name, description = '', icon = '', criteria = {} } = badgeData;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Badge validation failed: name is required.');
  }

  // Try to find an existing badge with same name
  let badge = await Badge.findOne({ name: name.trim() });
  if (!badge) {
    badge = new Badge({
      name: name.trim(),
      description: description || '',
      icon: icon || '',
      criteria
    });
    await badge.save();
  }
  return badge;
}

/**
 * Check user state for badge awarding.
 * user is a mongoose doc instance (or plain object with badges array)
 */
async function checkBadges(user) {
  try {
    // example rules (expand as needed)
    const awarded = [];

    // Guard: ensure user object exists
    if (!user) return awarded;

    // Example badge: 'First Attempt' -> awarded if user has at least 1 attempt
    // (This function should be called after the user has been updated)
    // NOTE: adapt names/criteria as needed for your app logic

    // Simple rule: if user.points >= 10 => award "Rising Star"
    if ((user.points || 0) >= 10 && !(user.badges || []).some(b => b.name === 'Rising Star')) {
      const b = await createBadgeIfNotExists({
        name: 'Rising Star',
        description: 'Earned 10 points',
        icon: 'star',
        criteria: { points: 10 }
      });
      // add badge id to user.badges if not present (user may be a doc)
      if (user.badges && !user.badges.includes(b._id)) {
        user.badges.push(b._id);
      }
      awarded.push(b);
    }

    // Another example badge: Master of Arithmetic (if mastery.arithmetic >= 80)
    const masteryMap = user.mastery || (user.toObject ? user.toObject().mastery : {});
    const arithmeticMastery = masteryMap && (masteryMap.arithmetic || masteryMap.get && masteryMap.get('arithmetic'));
    if (arithmeticMastery >= 80 && !(user.badges || []).some(b => b.name === 'Master of Arithmetic')) {
      const b = await createBadgeIfNotExists({
        name: 'Master of Arithmetic',
        description: 'High mastery of arithmetic',
        icon: 'calculator',
        criteria: { concept: 'arithmetic', mastery: 80 }
      });
      if (user.badges && !user.badges.includes(b._id)) user.badges.push(b._id);
      awarded.push(b);
    }

    return awarded;
  } catch (err) {
    console.error('badgeService.checkBadges error:', err && err.message ? err.message : err);
    // don't throw: calling code should continue (we log the issue)
    return [];
  }
}

module.exports = {
  checkBadges,
  createBadgeIfNotExists
};