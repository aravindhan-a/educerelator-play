// On-device progress only -- no accounts, no server round-trip.

const PROGRESS_KEY = "progress";

function loadProgress() {
  const raw = localStorage.getItem(PROGRESS_KEY);
  if (!raw) return { skills: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { skills: {} };
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function recordResult(skill, correct) {
  const progress = loadProgress();
  if (!progress.skills[skill]) {
    progress.skills[skill] = { attempts: 0, correct: 0, streak: 0, bestStreak: 0 };
  }
  const s = progress.skills[skill];
  s.attempts += 1;
  if (correct) {
    s.correct += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  saveProgress(progress);
  return s;
}

export function getSkillProgress(skill) {
  const progress = loadProgress();
  return progress.skills[skill] || { attempts: 0, correct: 0, streak: 0, bestStreak: 0 };
}
