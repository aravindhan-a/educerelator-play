#!/usr/bin/env node
// Bulk question-bank generator — fills EVERY prose class-subject file in
// content/levels/ to a target count (default 100), in all 13 languages, using
// the same Claude pipeline the premium backend uses (urban/backend/lib/anthropic.js).
//
// Math is excluded: it is generated deterministically by generate-math-drills.mjs
// (computed answers, zero translation risk). This script covers everything else.
//
// Safety / quality:
//   • every generated question is structurally validated (13 languages present
//     and non-empty on prompt + all 4 choices, 4 unique choices, valid answerIndex)
//   • duplicates (by normalised English prompt) are dropped
//   • correct-answer positions are rebalanced so the bank has no position bias
//   • files are written after every batch — crash-safe and resumable (re-running
//     simply tops up to the target)
//   • the review gate is git: inspect the diff / spot-check translations before
//     committing. Nothing ships until pushed.
//
// Usage (needs ANTHROPIC_API_KEY — from urban/backend/.env(.local) or the shell):
//   node scripts/generate-full-bank.mjs --dry                 # plan + cost estimate, no API calls
//   node scripts/generate-full-bank.mjs                       # fill everything to 100
//   node scripts/generate-full-bank.mjs --only 5-science      # one class-subject
//   node scripts/generate-full-bank.mjs --target 50 --concurrency 2

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne"];

// ---- args ----
function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? (process.argv[i + 1] ?? true) : fallback;
}
const TARGET      = parseInt(arg("target", "100"), 10);
const ONLY        = arg("only", null);              // e.g. "5-science"
const CONCURRENCY = parseInt(arg("concurrency", "3"), 10);
const DRY         = process.argv.includes("--dry");
const BATCH       = 20;

// ---- load the API key from backend env files if not already in the shell ----
for (const envFile of ["urban/backend/.env.local", "urban/backend/.env"]) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { ALL_CLASSES, getSubjectsForClass } = await import(path.join(ROOT, "content/curriculum.js"));

// ---- work list: every non-math class-subject ----
const jobs = [];
for (const { num } of ALL_CLASSES) {
  for (const subj of getSubjectsForClass(num)) {
    if (subj.id === "math") continue;
    const key = `${num}-${subj.id}`;
    if (ONLY && key !== ONLY) continue;
    jobs.push({ classNum: num, subject: subj.id, emoji: subj.emoji, file: path.join(ROOT, "content", "levels", `${key}.json`) });
  }
}

// ---- helpers ----
const norm = (s) => String(s).toLowerCase().replace(/[\s?.!,'"()-]+/g, "");
function loadFile(job) {
  if (!fs.existsSync(job.file)) {
    return { data: { class: job.classNum, subject: job.subject, questions: [] }, questions: [] };
  }
  const data = JSON.parse(fs.readFileSync(job.file, "utf8"));
  const questions = data.levels ? data.levels.flatMap((l) => l.questions || []) : (data.questions || []);
  return { data, questions };
}
function appendAndSave(job, data, existing, added) {
  if (data.levels) {
    let gen = data.levels.find((l) => l.level === `generated-${job.subject}`);
    if (!gen) { gen = { level: `generated-${job.subject}`, questions: [] }; data.levels.push(gen); }
    gen.questions.push(...added);
  } else {
    data.questions = existing.concat(added);
  }
  fs.writeFileSync(job.file, JSON.stringify(data, null, 2) + "\n");
}
function validate(q) {
  if (!q || typeof q !== "object") return "not an object";
  for (const field of [q.prompt, ...(q.choices || [])]) {
    if (!field || typeof field !== "object") return "missing prompt/choice";
    for (const l of LANGS) {
      if (typeof field[l] !== "string" || !field[l].trim()) return `missing/empty lang ${l}`;
    }
  }
  if (!Array.isArray(q.choices) || q.choices.length !== 4) return "needs exactly 4 choices";
  const en = q.choices.map((c) => c.en.trim().toLowerCase());
  if (new Set(en).size !== 4) return "duplicate choices";
  if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex > 3) return "bad answerIndex";
  return null;
}
// move the correct answer to the least-used position (kills position bias)
function rebalance(q, posCounter) {
  let pos = 0, min = Infinity;
  for (let p = 0; p < 4; p++) if (posCounter[p] < min) { min = posCounter[p]; pos = p; }
  const correct = q.choices[q.answerIndex];
  const rest = q.choices.filter((_, i) => i !== q.answerIndex);
  const choices = [];
  let ri = 0;
  for (let p = 0; p < 4; p++) choices.push(p === pos ? correct : rest[ri++]);
  q.choices = choices;
  q.answerIndex = pos;
  posCounter[pos]++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString().slice(11, 19);

// ---- plan ----
let totalNeed = 0;
const plan = [];
for (const job of jobs) {
  const { questions } = loadFile(job);
  const need = Math.max(0, TARGET - questions.length);
  if (need > 0) plan.push({ ...job, have: questions.length, need });
  totalNeed += need;
}
const batches = plan.reduce((a, p) => a + Math.ceil(p.need / BATCH), 0);
console.log(`Plan: ${plan.length} class-subject files need topping up · ${totalNeed} questions · ~${batches} API batches`);
console.log(`Rough cost at Sonnet pricing: ~$${Math.round(batches * 0.20)}–$${Math.round(batches * 0.35)}`);
if (DRY) { plan.forEach((p) => console.log(`  ${p.classNum}-${p.subject}: ${p.have} -> ${TARGET} (+${p.need})`)); process.exit(0); }

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("\nANTHROPIC_API_KEY not found. Either:");
  console.error("  cd urban/backend && npx vercel env pull .env.local   (pulls your own key, gitignored)");
  console.error("  or export ANTHROPIC_API_KEY=... in the shell.");
  process.exit(1);
}

const { generateQuestionBatch } = await import(path.join(ROOT, "urban/backend/lib/anthropic.js"));
const DIFFS = [2, 4, 6]; // cycle difficulties so the adaptive engine has spread

async function fillJob(job) {
  const { data, questions: existing } = loadFile(job);
  const seen = new Set(existing.map((q) => norm(q.prompt.en)));
  let maxId = 0;
  for (const q of existing) { const m = /(\d+)$/.exec(q.id || ""); if (m) maxId = Math.max(maxId, parseInt(m[1], 10)); }
  const posCounter = [0, 0, 0, 0];
  for (const q of existing) if (Number.isInteger(q.answerIndex) && q.answerIndex < 4) posCounter[q.answerIndex]++;

  let added = 0, rejected = 0, batchNo = 0;
  while (existing.length + added < TARGET) {
    const need = Math.min(BATCH, TARGET - existing.length - added);
    const difficulty = DIFFS[batchNo % DIFFS.length];
    batchNo++;
    let batch = null;
    for (let attempt = 1; attempt <= 3 && !batch; attempt++) {
      try {
        batch = await generateQuestionBatch({
          classNum: job.classNum, subject: job.subject, curriculum: "cbse", difficulty, count: need,
        });
      } catch (err) {
        console.log(`[${ts()}] ${job.classNum}-${job.subject} batch ${batchNo} attempt ${attempt} failed: ${String(err).slice(0, 120)}`);
        await sleep(attempt * 8000);
      }
    }
    if (!batch) { console.log(`[${ts()}] ${job.classNum}-${job.subject}: giving up on batch ${batchNo}, moving on`); break; }

    const accepted = [];
    for (const q of (Array.isArray(batch) ? batch : [])) {
      const problem = validate(q);
      if (problem) { rejected++; continue; }
      const key = norm(q.prompt.en);
      if (seen.has(key)) { rejected++; continue; }
      seen.add(key);
      rebalance(q, posCounter);
      maxId++;
      q.id = `${job.classNum}-${job.subject}-${String(maxId).padStart(3, "0")}`;
      q.type = q.type || "mcq";
      q.visual = q.visual || job.emoji || "📘";
      accepted.push(q);
    }
    if (accepted.length) { appendAndSave(job, data, loadFile(job).questions, accepted); added += accepted.length; }
    console.log(`[${ts()}] ${job.classNum}-${job.subject}: +${accepted.length} (total ${existing.length + added}/${TARGET}, rejected ${rejected})`);
    await sleep(1000);
  }
  return { job: `${job.classNum}-${job.subject}`, added, rejected };
}

// simple worker pool over the plan
const queue = plan.slice();
const results = [];
async function worker(id) {
  while (queue.length) {
    const job = queue.shift();
    try { results.push(await fillJob(job)); }
    catch (err) { console.log(`[${ts()}] worker ${id} error on ${job.classNum}-${job.subject}: ${String(err).slice(0, 150)}`); }
  }
}
console.log(`[${ts()}] starting ${Math.min(CONCURRENCY, plan.length)} workers over ${plan.length} files…`);
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, plan.length) }, (_, i) => worker(i + 1)));

const totalAdded = results.reduce((a, r) => a + r.added, 0);
console.log(`\nDONE. Added ${totalAdded} questions across ${results.length} files.`);
console.log(`Next: node scripts/validate-bank.mjs (structure) · review git diff · spot-check translations · commit.`);
