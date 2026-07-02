import { generateQuestionBatch } from "../lib/anthropic.js";
import { getCachedBatch, setCachedBatch } from "../lib/cache.js";
import { verifyAndGetUid, isPremiumUser, checkAndIncrementAiUsage } from "../lib/firebase-admin.js";
import { REGION_LABELS } from "../lib/regions.js";

// Fair-use cap: max fresh AI batches a premium user can trigger per day.
// Each batch = 20 questions. Cached batches are free and do NOT count, so a
// real student never reaches this — it only bounds cost/abuse.
const AI_DAILY_LIMIT = 50;

const VALID_SUBJECTS = [
  "math", "english", "evs", "science", "social-studies",
  "hindi", "tamil", "computer-science", "physics", "chemistry",
  "biology", "economics", "business-studies", "history",
  "geography", "political-science", "psychology", "sociology",
];
const VALID_CURRICULA = ["cbse", "state", "international"];
const MAX_CLASS      = 12;
const MAX_DIFFICULTY = 10;

const ALLOWED_ORIGINS = new Set([
  "https://educerelator.com",
  "https://www.educerelator.com",
]);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET")    return res.status(405).json({ error: "Method not allowed" });

  // Premium check — only paying users get AI-generated questions
  let uid;
  try {
    uid = await verifyAndGetUid(req.headers.authorization);
  } catch {
    return res.status(401).json({ error: "Sign in required" });
  }

  const premium = await isPremiumUser(uid);
  if (!premium) return res.status(403).json({ error: "Premium required", upgrade: true });

  const classNum   = parseInt(req.query.class, 10);
  const subject    = req.query.subject;
  const curriculum = req.query.curriculum || "cbse";
  const difficulty = parseInt(req.query.difficulty, 10);
  const region     = req.query.region || "all";

  if (
    !Number.isInteger(classNum)  || classNum < 1  || classNum > MAX_CLASS ||
    !VALID_SUBJECTS.includes(subject) ||
    !VALID_CURRICULA.includes(curriculum) ||
    !Number.isInteger(difficulty) || difficulty < 1 || difficulty > MAX_DIFFICULTY ||
    (region !== "all" && !REGION_LABELS[region])
  ) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  try {
    let batch = await getCachedBatch(classNum, subject, curriculum, difficulty, region);
    if (!batch) {
      // Only fresh generations (cache misses) count against the fair-use cap.
      const usage = await checkAndIncrementAiUsage(uid, AI_DAILY_LIMIT);
      if (!usage.allowed) {
        return res.status(429).json({
          error: "Daily fresh-question limit reached. Your saved practice questions are still available — new AI questions unlock again tomorrow.",
          fairUse: true,
          limit: usage.limit,
        });
      }
      batch = await generateQuestionBatch({ classNum, subject, curriculum, difficulty, region });
      await setCachedBatch(classNum, subject, curriculum, difficulty, region, batch);
    }
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.status(200).json({ classNum, subject, curriculum, difficulty, region, questions: batch });
  } catch (err) {
    console.error("generate-questions failed:", err);
    return res.status(502).json({ error: "Question generation failed" });
  }
}
