// Tracks recent accuracy/speed per skill and picks the next difficulty level.
// State is small and serializable -- urban persists it to localStorage.

const WINDOW_SIZE = 5; // only look at the last N attempts per skill
const FAST_MS = 4000; // answering under this is "fast"
const SLOW_MS = 12000; // answering over this is "slow"

export function createAdaptiveState() {
  return {}; // { [skill]: { difficulty: number, recent: [{ correct, ms }] } }
}

export function recordAttempt(state, skill, { correct, ms, startingDifficulty }) {
  if (!state[skill]) {
    state[skill] = { difficulty: startingDifficulty || 1, recent: [] };
  }
  const entry = state[skill];
  entry.recent.push({ correct, ms });
  if (entry.recent.length > WINDOW_SIZE) entry.recent.shift();

  entry.difficulty = nextDifficulty(entry.difficulty, entry.recent);
  return entry.difficulty;
}

function nextDifficulty(current, recent) {
  if (recent.length < WINDOW_SIZE) return current;

  const accuracy = recent.filter((a) => a.correct).length / recent.length;
  const avgMs = recent.reduce((sum, a) => sum + a.ms, 0) / recent.length;

  if (accuracy >= 0.8 && avgMs <= FAST_MS) return current + 1;
  if (accuracy <= 0.4 || avgMs >= SLOW_MS) return Math.max(1, current - 1);
  return current;
}

export function getDifficulty(state, skill, startingDifficulty) {
  return state[skill]?.difficulty || startingDifficulty || 1;
}
