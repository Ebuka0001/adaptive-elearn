// services/badgeService.js
const Badge = require('../models/Badge');
const User = require('../models/User');

async function checkBadges(user, opts = {}) {
  try {
    if (!user) return [];
    const badges = await Badge.find().lean();
    const awarded = [];

    for (const b of badges) {
      const cond = b.condition || '';
      if (cond.startsWith('points')) {
        const m = cond.match(/points\s*>=\s*(\d+)/);
        if (m) {
          const threshold = Number(m[1]);
          if ((user.points || 0) >= threshold) {
            if (!Array.isArray(user.badges)) user.badges = user.badges || [];
            if (!user.badges.includes(String(b._id))) {
              user.badges.push(b._id);
              awarded.push(b);
            }
          }
        }
      }
    }

    // persist minimal change (use session if provided)
    if (awarded.length > 0) {
      if (opts && opts.session) {
        try { await user.save({ session: opts.session }); } catch(e) { console.error('badge save session failed:', e && e.message ? e.message : e); }
      } else {
        try { await User.findByIdAndUpdate(user._id, { $set: { badges: user.badges } }); } catch(e) { console.error('badge save failed:', e && e.message ? e.message : e); }
      }
    }
    return awarded;
  } catch (err) {
    console.error('badgeService.checkBadges error:', err && err.message ? err.message : err);
    return [];
  }
}

module.exports = { checkBadges };