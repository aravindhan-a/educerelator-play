const STATS_KEY = "ecplay_analytics";

const defaultStats = () => ({
  totalAnswered: 0,
  totalCorrect: 0,
  screenTimeMs: 0,
  dayStreak: 0,
  longestDayStreak: 0,
  lastPlayDate: null,
  subjectStats: {},
  dailyActivity: {},
});

export function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || "null");
    return raw ? { ...defaultStats(), ...raw } : defaultStats();
  } catch {
    return defaultStats();
  }
}

function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function recordAnswer({ correct, subject }) {
  const s     = loadStats();
  const today = todayStr();

  s.totalAnswered++;
  if (correct) s.totalCorrect++;

  if (!s.subjectStats[subject]) s.subjectStats[subject] = { answered: 0, correct: 0 };
  s.subjectStats[subject].answered++;
  if (correct) s.subjectStats[subject].correct++;

  if (!s.dailyActivity[today]) s.dailyActivity[today] = { answered: 0, correct: 0 };
  s.dailyActivity[today].answered++;
  if (correct) s.dailyActivity[today].correct++;

  // Day streak
  const last = s.lastPlayDate;
  if (!last) {
    s.dayStreak = 1;
  } else if (last !== today) {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().slice(0, 10);
    s.dayStreak = last === yestStr ? (s.dayStreak || 0) + 1 : 1;
  }
  s.longestDayStreak = Math.max(s.longestDayStreak || 0, s.dayStreak || 0);
  s.lastPlayDate = today;

  // Prune daily data older than 60 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  Object.keys(s.dailyActivity).forEach(d => { if (d < cutoffStr) delete s.dailyActivity[d]; });

  saveStats(s);
  return s;
}

export function recordScreenTime(ms) {
  if (ms > 0) {
    const s = loadStats();
    s.screenTimeMs = (s.screenTimeMs || 0) + ms;
    saveStats(s);
  }
}

export function getLast7Days() {
  const s = loadStats();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str     = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString("en", { weekday: "short" });
    days.push({ date: str, dayName, ...(s.dailyActivity[str] || { answered: 0, correct: 0 }) });
  }
  return days;
}

export function formatDuration(ms) {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
