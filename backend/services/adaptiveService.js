// services/adaptiveService.js
const mongoose = require('mongoose');

function computeDelta(prev, correct, difficulty) {
  const gain = Math.round((correct ? 6 : -4) * Math.max(1, Number(difficulty || 1)));
  let next = (Number(prev) || 50) + gain;
  next = Math.max(0, Math.min(100, next));
  return next;
}

async function updateMastery(user, concepts = [], correct = false, difficulty = 1, opts = {}) {
  try {
    if (!user) return null;
    const cs = Array.isArray(concepts) ? concepts : (concepts ? [concepts] : []);
    if (cs.length === 0) return null;

    // if user is mongoose doc, mutate and save
    if (user.save && typeof user.save === 'function') {
      user.mastery = user.mastery || {};
      for (const c of cs) {
        const prev = Number(user.mastery[c]) || 50;
        user.mastery[c] = computeDelta(prev, correct, difficulty);
      }
      if (opts && opts.session) {
        await user.save({ session: opts.session });
      } else {
        await user.save();
      }
      return user.mastery;
    }

    // fallback: no-op (avoid heavy DB operations)
    return null;
  } catch (err) {
    console.error('adaptiveService.updateMastery error:', err && err.message ? err.message : err);
    return null;
  }
}

function selectNextQuestionForUser(user, pool = []) {
  try {
    if (!Array.isArray(pool) || pool.length === 0) return null;

    const mastery = user && (user.mastery || {});
    const scoreFor = (q) => {
      const concepts = Array.isArray(q.concepts) ? q.concepts : [];
      if (concepts.length === 0) return 50;
      const sum = concepts.reduce((s, c) => s + (Number(mastery[c]) || 50), 0);
      return sum / concepts.length;
    };

    // pick lowest mastery first
    pool.sort((a, b) => (scoreFor(a) - scoreFor(b)) || ((a.difficulty || 1) - (b.difficulty || 1)));
    return pool[0];
  } catch (err) {
    console.error('selectNextQuestionForUser error:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = { updateMastery, selectNextQuestionForUser };