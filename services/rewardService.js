// services/rewardService.js
// Deterministic reward calc: always use this function when awarding points.

function calculateReward({ correct, difficulty = 2, timeSeconds = 0, base = 10, streak = 0 }) {
  if (!correct) return 0;
  // difficulty scaling (soft)
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.25; // 1 => 1.0, 3 => 1.5
  // small bonus for quick answers (per 15s bucket)
  const timeBonus = Math.max(0, Math.floor((Math.max(0, 60 - timeSeconds)) / 15));
  // small streak bonus (every 5 streak => +1)
  const streakBonus = Math.floor(streak / 5);
  const points = Math.round(base * difficultyMultiplier + timeBonus + streakBonus);
  return points;
}

module.exports = { calculateReward };