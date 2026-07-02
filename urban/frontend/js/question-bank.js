const API_BASE       = "https://educerelator-backend.vercel.app";
const LOW_WATER_MARK = 5;

function bankKey(classNum, subject, curriculum, difficulty) {
  return `bank:${classNum}:${subject}:${curriculum}:${difficulty}`;
}

function loadBank(classNum, subject, curriculum, difficulty) {
  const raw = localStorage.getItem(bankKey(classNum, subject, curriculum, difficulty));
  if (!raw) return { questions: [], usedIds: [] };
  try { return JSON.parse(raw); } catch { return { questions: [], usedIds: [] }; }
}

function saveBank(classNum, subject, curriculum, difficulty, bank) {
  localStorage.setItem(bankKey(classNum, subject, curriculum, difficulty), JSON.stringify(bank));
}

async function fetchFromBackend(classNum, subject, curriculum, difficulty, getToken) {
  const token = getToken ? await getToken() : null;
  if (!token) throw new Error("no token");
  const url = `${API_BASE}/api/generate-questions` +
    `?class=${classNum}&subject=${encodeURIComponent(subject)}` +
    `&curriculum=${curriculum}&difficulty=${difficulty}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const data = await res.json();
  return data.questions;
}

async function fetchLocalFallback(classNum, subject) {
  const url = `../../content/levels/${classNum}-${subject}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data.levels)     return data.levels.flatMap((l) => l.questions);
  if (data.questions)  return data.questions;
  return null;
}

async function topUp(classNum, subject, curriculum, difficulty, bank, getToken) {
  let fresh = null;
  try {
    fresh = await fetchFromBackend(classNum, subject, curriculum, difficulty, getToken);
  } catch {
    fresh = await fetchLocalFallback(classNum, subject);
  }
  if (!fresh || fresh.length === 0) return;
  const existingIds = new Set(bank.questions.map((q) => q.id));
  bank.questions.push(...fresh.filter((q) => !existingIds.has(q.id)));
  saveBank(classNum, subject, curriculum, difficulty, bank);
}

export async function getNextQuestion(
  classNum, subject, curriculum, difficulty,
  sessionSeenIds = new Set(), getToken = null
) {
  const bank   = loadBank(classNum, subject, curriculum, difficulty);
  const unused = bank.questions.filter((q) => !bank.usedIds.includes(q.id));

  if (unused.length <= LOW_WATER_MARK) {
    await topUp(classNum, subject, curriculum, difficulty, bank, getToken);
  }

  let pool = bank.questions.filter(
    (q) => !sessionSeenIds.has(q.id) && !bank.usedIds.includes(q.id)
  );

  if (pool.length === 0) {
    pool = bank.questions.filter((q) => !sessionSeenIds.has(q.id));
  }

  if (pool.length === 0) {
    bank.usedIds = [];
    saveBank(classNum, subject, curriculum, difficulty, bank);
    pool = bank.questions.filter((q) => !sessionSeenIds.has(q.id));
  }

  if (pool.length === 0) {
    throw new Error(`No questions available for Class ${classNum} ${subject}`);
  }

  const question = pool[Math.floor(Math.random() * pool.length)];
  bank.usedIds.push(question.id);
  saveBank(classNum, subject, curriculum, difficulty, bank);
  return question;
}
