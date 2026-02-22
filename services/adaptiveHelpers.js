// services/adaptiveHelpers.js
// Small Elo-like ability update + deterministic pick function (for future integration)

function updateAbility(ability, questionDifficulty, correct, k = 20) {
  // Using Elo-like scale (0..1000-ish). Adjust k for sensitivity.
  const expected = 1 / (1 + Math.pow(10, (questionDifficulty - ability) / 400));
  const score = correct ? 1 : 0;
  return ability + k * (score - expected);
}

function pickClosestQuestionToAbility(ability, pool) {
  // pool: array of questions with .difficulty numeric
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const ordered = pool.slice().sort((a, b) => Math.abs(a.difficulty - ability) - Math.abs(b.difficulty - ability));
  // prefer unseen / low-attempts questions (if you track attempts per question for user)
  return ordered[0];
}

module.exports = { updateAbility, pickClosestQuestionToAbility };