// services/adaptiveService.js
// Defensive adaptive selection logic.
// Exports: selectNextQuestionForUser(user, questions)

const debug = false;

/**
 * Choose the next question for a user from an array of question objects.
 * Strategy (simple, robust):
 *  - Use user's mastery map (object mapping concept -> mastery score 0-100). If missing, treat as empty.
 *  - For each question, compute average mastery across its concepts (if any).
 *  - Prefer questions with the *lowest* average mastery (areas of need).
 *  - Break ties by choosing lower difficulty first (or random).
 *  - If no questions match, return a random question as fallback.
 *
 * Question schema assumed:
 *  {
 *    _id, text, concepts: ['variables','loops'], difficulty: 1, points: 10, ...
 *  }
 */
function selectNextQuestionForUser(user, questions = []) {
  try {
    if (!Array.isArray(questions) || questions.length === 0) {
      return null;
    }

    // defensive: user's mastery map (concept -> number)
    const mastery = (user && typeof user.mastery === 'object' && user.mastery) ? user.mastery : {};

    if (debug) {
      console.log('adaptiveService.selectNextQuestionForUser: user mastery keys=', Object.keys(mastery));
    }

    // Score each question: lower score -> higher priority (user needs it)
    const scored = questions.map(q => {
      const concepts = Array.isArray(q.concepts) && q.concepts.length ? q.concepts : [];
      let avgMastery = 0;
      if (concepts.length > 0) {
        const sum = concepts.reduce((s, c) => s + (Number(mastery[c]) || 0), 0);
        avgMastery = sum / concepts.length;
      } else {
        // no concepts -> treat as medium mastery (50) so it isn't always picked
        avgMastery = 50;
      }

      // fallback difficulty handling
      const difficulty = (typeof q.difficulty === 'number') ? q.difficulty : 1;

      return {
        question: q,
        score: avgMastery,
        difficulty
      };
    });

    // sort ascending by score (lowest mastery first), then by difficulty (lower first), then random tie-breaker
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
      // final tie-breaker: random
      return Math.random() > 0.5 ? 1 : -1;
    });

    // pick the first valid question
    const chosen = scored[0] && scored[0].question ? scored[0].question : (questions[Math.floor(Math.random() * questions.length)]);

    // return the question (you may want to strip the correct answer depending on frontend needs)
    return chosen;
  } catch (err) {
    console.error('adaptiveService.selectNextQuestionForUser error:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = {
  selectNextQuestionForUser
};
