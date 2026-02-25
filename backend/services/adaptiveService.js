// services/adaptiveService.js
// Adaptive utilities: selection + mastery updating

const debug = false;

/**
 * Choose the next question for a user from an array of question objects.
 * (unchanged/robust version)
 */
function selectNextQuestionForUser(user, questions = []) {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    // defensive: user's mastery map (concept -> number)
    // user.mastery might be a Mongoose Map or plain object
    const rawMastery = (user && user.mastery) ? user.mastery : {};
    const masteryObj = (rawMastery && typeof rawMastery.get === 'function')
      ? Object.fromEntries(Array.from(rawMastery.entries()))
      : (typeof rawMastery === 'object' ? rawMastery : {});

    if (debug) {
      console.log('adaptiveService.selectNextQuestionForUser: user mastery keys=', Object.keys(masteryObj));
    }

    // Score each question: lower score -> higher priority (user needs it)
    const scored = questions.map(q => {
      const concepts = Array.isArray(q.concepts) && q.concepts.length ? q.concepts : [];
      let avgMastery = 0;
      if (concepts.length > 0) {
        const sum = concepts.reduce((s, c) => s + (Number(masteryObj[c]) || 0), 0);
        avgMastery = sum / concepts.length;
      } else {
        // no concepts -> treat as medium mastery (50)
        avgMastery = 50;
      }

      const difficulty = (typeof q.difficulty === 'number') ? q.difficulty : 1;

      return {
        question: q,
        score: avgMastery,
        difficulty
      };
    });

    // sort ascending by score (lowest mastery first), then by difficulty (lower first), random tie-breaker
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      return Math.random() > 0.5 ? 1 : -1;
    });

    const chosen = scored[0] && scored[0].question ? scored[0].question : (questions[Math.floor(Math.random() * questions.length)]);
    return chosen;
  } catch (err) {
    console.error('adaptiveService.selectNextQuestionForUser error:', err && err.message ? err.message : err);
    return null;
  }
}


/**
 * updateMastery(user, concepts[], correct, difficulty)
 *
 * - Mutates the user.mastery in memory (does NOT save user document).
 * - Works whether user.mastery is a Mongoose Map or plain object.
 * - Simple rule (explainable for FYP):
 *     - If correct: delta = baseGain * (1 + 1/difficulty)
 *     - If incorrect: delta = - basePenalty
 *   where baseGain = 10, basePenalty = 5.
 * - Clamps mastery between 0 and 100.
 */
async function updateMastery(user, concepts = [], correct = false, difficulty = 1) {
  try {
    if (!user) return;

    // normalize concepts
    const conceptList = Array.isArray(concepts) ? concepts : (concepts ? [concepts] : []);
    if (conceptList.length === 0) return;

    const baseGain = 10;
    const basePenalty = 5;

    // get/set helpers for Map or object
    const isMap = !!(user.mastery && typeof user.mastery.get === 'function');

    const getVal = (key) => {
      if (isMap) {
        const v = user.mastery.get(key);
        return (typeof v === 'number') ? v : 0;
      } else {
        return (user.mastery && typeof user.mastery[key] === 'number') ? user.mastery[key] : 0;
      }
    };

    const setVal = (key, val) => {
      const clamped = Math.max(0, Math.min(100, Math.round(val)));
      if (isMap) {
        user.mastery.set(key, clamped);
      } else {
        user.mastery = user.mastery || {};
        user.mastery[key] = clamped;
      }
    };

    for (const concept of conceptList) {
      const prev = getVal(concept);
      let delta = 0;
      if (correct) {
        // easier questions give slightly less gain; difficulty = 1 (easy) => factor 1 + 1/1 = 2 -> gain*2
        const factor = 1 + (1 / Math.max(1, Number(difficulty)));
        delta = baseGain * factor;
      } else {
        delta = -basePenalty;
      }
      const nextVal = prev + delta;
      setVal(concept, nextVal);
    }

    if (debug) {
      console.log('updateMastery result for user:', user._id || user.id, isMap ? Object.fromEntries(user.mastery.entries()) : user.mastery);
    }
  } catch (err) {
    console.error('adaptiveService.updateMastery error:', err && err.message ? err.message : err);
  }
}


module.exports = {
  selectNextQuestionForUser,
  updateMastery
};