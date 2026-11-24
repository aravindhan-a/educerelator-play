// Privacy-first usage counters (ROADMAP C2).
//
// POST /api/track  { e: "start"|"answer"|"complete", l: lang, c: class, s: subject,
//                    ok?: 0|1, r?: "new"|"d1"|"d7"|"d30"|"older", demo?: 1 }
// GET  /api/track  → aggregate totals (public; counts only)
//
// What is stored: only aggregate counters, e.g. "answers in Tamil today: +1".
// What is NOT stored: no user ids, no cookies, no IP addresses, no device
// fingerprint, no free text. The only location kept is the two-letter
// country code the CDN already attaches, added to a country tally.
// "r" (recency bucket) is computed on the device from its own last-play date,
// so returning-player rates are measurable without identifying anyone.
//
// Needs Vercel KV (KV_REST_API_URL / KV_REST_API_TOKEN). Without it the
// endpoint answers 204 and does nothing, so the app never breaks.

const EVENTS = new Set(["start", "answer", "complete"]);
const LANGS = new Set(["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne","as","sa"]);
const RECENCY = new Set(["new", "d1", "d7", "d30", "older"]);
const SUBJECT_RE = /^[a-z][a-z-]{1,30}$/;
const ALLOWED_ORIGINS = new Set(["https://educerelator.com", "https://www.educerelator.com"]);
const KEEP_DAYS = 400;

function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try { return require("@vercel/kv").kv; } catch { return null; }
}

function cors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.has(origin) ? origin : "https://educerelator.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

const today = () => new Date().toISOString().slice(0, 10);

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") { if (b.length > 512) return null; try { b = JSON.parse(b); } catch { return null; } }
  return b && typeof b === "object" ? b : null;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const kv = getKV();

  if (req.method === "GET") {
    if (!kv) return res.status(200).json({ enabled: false });
    try {
      const days = Math.min(Math.max(parseInt(req.query?.days) || 30, 1), 90);
      const keys = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
        keys.push(d);
      }
      const [total, byLang, byClass, byCountry, byRecency, ...daily] = await Promise.all([
        kv.hgetall("ec:total"), kv.hgetall("ec:lang"), kv.hgetall("ec:class"),
        kv.hgetall("ec:country"), kv.hgetall("ec:recency"),
        ...keys.map((d) => kv.hgetall(`ec:day:${d}`)),
      ]);
      return res.status(200).json({
        enabled: true, since: (await kv.get("ec:since")) || null,
        total: total || {}, byLang: byLang || {}, byClass: byClass || {},
        byCountry: byCountry || {}, byRecency: byRecency || {},
        daily: keys.map((d, i) => ({ date: d, ...(daily[i] || {}) })),
      });
    } catch (err) {
      console.error("stats read failed", err?.message);
      return res.status(500).json({ enabled: true, error: "read failed" });
    }
  }

  if (req.method !== "POST") return res.status(405).end();
  if (!kv) return res.status(204).end();
  // Only count events from the real site; ignore demo-mode pitches.
  if (req.headers.origin && !ALLOWED_ORIGINS.has(req.headers.origin)) return res.status(204).end();

  const b = parseBody(req);
  if (!b || !EVENTS.has(b.e) || b.demo) return res.status(204).end();
  const lang = LANGS.has(b.l) ? b.l : "other";
  const cls = Number.isInteger(b.c) && b.c >= 1 && b.c <= 12 ? String(b.c) : "other";
  const subject = typeof b.s === "string" && SUBJECT_RE.test(b.s) ? b.s : "other";
  const country = /^[A-Z]{2}$/.test(String(req.headers["x-vercel-ip-country"] || "")) ? req.headers["x-vercel-ip-country"] : "XX";
  const day = today();

  try {
    const p = kv.pipeline();
    p.hincrby("ec:total", b.e, 1);
    p.hincrby(`ec:day:${day}`, b.e, 1);
    p.expire(`ec:day:${day}`, KEEP_DAYS * 86400);
    p.hincrby("ec:lang", `${lang}:${b.e}`, 1);
    p.hincrby("ec:class", `${cls}:${subject}:${b.e}`, 1);
    p.hincrby("ec:country", `${country}:${b.e}`, 1);
    if (b.e === "answer" && b.ok === 1) { p.hincrby("ec:total", "correct", 1); p.hincrby(`ec:day:${day}`, "correct", 1); }
    if (b.e === "start" && RECENCY.has(b.r)) { p.hincrby("ec:recency", b.r, 1); p.hincrby(`ec:day:${day}`, `r_${b.r}`, 1); }
    p.setnx("ec:since", day);
    await p.exec();
  } catch (err) {
    console.error("track failed", err?.message);
  }
  return res.status(204).end();
}
