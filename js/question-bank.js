const API_BASE       = "https://educerelator-backend.vercel.app";
const LOW_WATER_MARK = 5;

function bankKey(classNum, subject, curriculum, difficulty, region) {
  return `bank:${classNum}:${subject}:${curriculum}:${difficulty}:${region}`;
}

function loadBank(classNum, subject, curriculum, difficulty, region) {
  const raw = localStorage.getItem(bankKey(classNum, subject, curriculum, difficulty, region));
  if (!raw) return { questions: [], usedIds: [] };
  try { return JSON.parse(raw); } catch { return { questions: [], usedIds: [] }; }
}

function saveBank(classNum, subject, curriculum, difficulty, region, bank) {
  const key = bankKey(classNum, subject, curriculum, difficulty, region);
  const payload = JSON.stringify(bank);
  try {
    localStorage.setItem(key, payload);
  } catch {
    // Quota full. Banks are refetchable content, so drop the other subjects'
    // copies and retry once; if even that fails, keep playing from memory —
    // a lost save costs repeat questions next visit, never a dead session.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("bank:") && k !== key) localStorage.removeItem(k);
      }
      localStorage.setItem(key, payload);
    } catch { /* in-memory only this session */ }
  }
}

function mergeQuestions(bank, fresh) {
  const existingIds = new Set(bank.questions.map((q) => q.id));
  bank.questions.push(...fresh.filter((q) => !existingIds.has(q.id)));
}

async function fetchFromBackend(classNum, subject, curriculum, difficulty, region, getToken) {
  const token = getToken ? await getToken() : null;
  if (!token) throw new Error("no token");
  const url = `${API_BASE}/api/generate-questions` +
    `?class=${classNum}&subject=${encodeURIComponent(subject)}` +
    `&curriculum=${curriculum}&difficulty=${difficulty}` +
    (region && region !== "all" ? `&region=${encodeURIComponent(region)}` : "");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`backend ${res.status}`);
  const data = await res.json();
  return data.questions;
}

async function fetchJsonQuestions(url) {
  // Never throws: a network rejection must fall through to the next source
  // exactly like a 404 (first visits have no service worker to soften errors).
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.draft) return null; // unreviewed packs never reach students
    if (Array.isArray(data)) return data;
    if (data.levels)     return data.levels.flatMap((l) => l.questions);
    if (data.questions)  return data.questions;
    return null;
  } catch { return null; }
}

// Generic bank plus, when a region is chosen, that region's contextual
// overlay — questions grounded in the student's own state or UT.
async function fetchLocalFallback(classNum, subject, region) {
  const generic = await fetchJsonQuestions(`../../content/levels/${classNum}-${subject}.json`);
  let regional = null;
  if (region && region !== "all") {
    regional = await fetchJsonQuestions(`../../content/regions/${region}/${classNum}-${subject}.json`);
  }
  if (!generic && !regional) return null;
  return [...(regional || []), ...(generic || [])];
}

// ---- Starter-first cold start ----------------------------------------------
// Large banks (the 400-question math files, ~80 KB gzipped) ship a
// content/levels/starter/ chunk: the parent's first 30 questions, ~11 KB
// gzipped. A cold start plays from the starter (bank.partial = true) while
// ensureFullBank() streams the rest; banks without a starter fetch in full,
// exactly as before.

const inflightFills = new Map(); // bankKey -> promise, so a fill never doubles

function ensureFullBank(classNum, subject, curriculum, difficulty, region) {
  const key = bankKey(classNum, subject, curriculum, difficulty, region);
  if (inflightFills.has(key)) return inflightFills.get(key);

  // Always re-load before merging: the student keeps answering (and saving)
  // while these fetches run, and merging into a stale captured object would
  // clobber those picks.
  const absorb = (fresh, complete) => {
    const bank = loadBank(classNum, subject, curriculum, difficulty, region);
    if (fresh && fresh.length) mergeQuestions(bank, fresh);
    if (complete) delete bank.partial;
    saveBank(classNum, subject, curriculum, difficulty, region, bank);
  };

  const jobs = [];
  if (region && region !== "all") {
    // The regional overlay is tiny — merge it the moment it lands so local
    // questions reach the pool long before the big generic bank finishes.
    jobs.push(
      fetchJsonQuestions(`../../content/regions/${region}/${classNum}-${subject}.json`)
        .then((r) => { if (r && r.length) absorb(r, false); })
    );
  }
  jobs.push(
    fetchJsonQuestions(`../../content/levels/${classNum}-${subject}.json`)
      .then((g) => { if (g && g.length) absorb(g, true); })
  );

  const fill = Promise.all(jobs)
    .then(() => {})
    .finally(() => inflightFills.delete(key));
  inflightFills.set(key, fill);
  return fill;
}

async function topUp(classNum, subject, curriculum, difficulty, region, bank, getToken) {
  let fresh = null;
  try {
    fresh = await fetchFromBackend(classNum, subject, curriculum, difficulty, region, getToken);
  } catch {
    if (bank.questions.length === 0) {
      // Cold start: the starter chunk gets the first question on screen fast
      // on 2G/3G. The full download is deferred to getNextQuestion's partial
      // kick (second question onward), so tapping into a subject and straight
      // back out never costs the big fetch.
      const starter = await fetchJsonQuestions(
        `../../content/levels/starter/${classNum}-${subject}.json`
      );
      if (starter && starter.length) {
        mergeQuestions(bank, starter);
        bank.partial = true;
        saveBank(classNum, subject, curriculum, difficulty, region, bank);
        return;
      }
    }
    // No starter for this bank, or a mid-session refill: need the full bank
    // now. ensureFullBank dedupes against a fill already running, so a slow
    // background download is awaited rather than fetched a second time.
    await ensureFullBank(classNum, subject, curriculum, difficulty, region);
    const saved = loadBank(classNum, subject, curriculum, difficulty, region);
    mergeQuestions(bank, saved.questions);
    if (!saved.partial) delete bank.partial;
    return;
  }
  if (!fresh || fresh.length === 0) return;
  mergeQuestions(bank, fresh);
  saveBank(classNum, subject, curriculum, difficulty, region, bank);
}

// Review mode: resolve a set of previously-missed question ids back to their
// full question objects from the local bank (plus regional overlay).
export async function getQuestionsByIds(classNum, subject, ids, region = "all") {
  const all = await fetchLocalFallback(classNum, subject, region);
  if (!all) return [];
  const want = new Set(ids);
  return all.filter((q) => want.has(q.id));
}

export async function getNextQuestion(
  classNum, subject, curriculum, difficulty,
  sessionSeenIds = new Set(), getToken = null, region = "all"
) {
  const bank   = loadBank(classNum, subject, curriculum, difficulty, region);

  // A starter-only bank still owes its full download — kick (or resume, after
  // an interrupted session) the background fill. Deduped inside ensureFullBank.
  if (bank.partial && bank.questions.length > 0) {
    ensureFullBank(classNum, subject, curriculum, difficulty, region);
  }

  const unused = bank.questions.filter((q) => !bank.usedIds.includes(q.id));

  if (unused.length <= LOW_WATER_MARK) {
    await topUp(classNum, subject, curriculum, difficulty, region, bank, getToken);
  }

  // From here to saveBank below must stay synchronous (no awaits): the
  // background fill re-loads from localStorage before merging, so the only
  // way to clobber its write is to hold a stale bank across a suspension.
  let pool = bank.questions.filter(
    (q) => !sessionSeenIds.has(q.id) && !bank.usedIds.includes(q.id)
  );

  if (pool.length === 0) {
    pool = bank.questions.filter((q) => !sessionSeenIds.has(q.id));
  }

  if (pool.length === 0) {
    bank.usedIds = [];
    saveBank(classNum, subject, curriculum, difficulty, region, bank);
    pool = bank.questions.filter((q) => !sessionSeenIds.has(q.id));
  }

  if (pool.length === 0) {
    throw new Error(`No questions available for Class ${classNum} ${subject}`);
  }

  const question = pool[Math.floor(Math.random() * pool.length)];
  bank.usedIds.push(question.id);
  saveBank(classNum, subject, curriculum, difficulty, region, bank);
  return question;
}
