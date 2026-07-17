#!/usr/bin/env node
// Merges workflow-confirmed exam questions into content/exams/<exam>/<subject>.json.
// Input: a JSON file (arg) shaped { subjects:[{exam, subject, questions:[{prompt,choices,answerIndex,topic,difficulty,solution}]}] }.
// Keeps existing questions, appends new ones with proper ids/schema, dedupes by
// normalized prompt, and re-validates every file. Idempotent per unique prompt.
//
// Usage: node scripts/assemble-exam-banks.mjs <confirmed.json> [--dry]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const inFile = args.find((a) => !a.startsWith("--"));
if (!inFile) { console.error("need input json path"); process.exit(1); }

const SRC_LABEL = { neet: "NEET pattern", jee: "JEE pattern", upsc: "UPSC pattern",
  olympiad: "Olympiad", "cbse-10": "CBSE Class 10", "cbse-12": "CBSE Class 12" };
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const data = JSON.parse(fs.readFileSync(inFile, "utf8"));
const subjects = data.subjects || data;
let added = 0, skippedDup = 0, rejected = 0;
const report = [];

for (const grp of subjects) {
  const { exam, subject } = grp;
  const incoming = grp.questions || grp.confirmed || [];
  const file = path.join(ROOT, `content/exams/${exam}/${subject}.json`);
  if (!fs.existsSync(file)) { console.error(`✗ no file ${exam}/${subject}`); continue; }
  const doc = JSON.parse(fs.readFileSync(file, "utf8"));
  const seen = new Set(doc.questions.map((q) => norm(q.prompt.en)));
  // highest existing numeric suffix
  let maxN = 0;
  for (const q of doc.questions) { const m = /(\d+)$/.exec(q.id); if (m) maxN = Math.max(maxN, parseInt(m[1])); }

  let localAdded = 0;
  for (const q of incoming) {
    // structural gate
    const choices = (q.choices || []).map((c) => (typeof c === "string" ? c : c.en));
    if (choices.length !== 4) { rejected++; continue; }
    // trim-exact (case/punctuation sensitive): "going?" vs "going." are distinct
    if (new Set(choices.map((c) => String(c).trim())).size !== 4) { rejected++; continue; }
    if (!(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < 4)) { rejected++; continue; }
    if (!q.prompt || !q.solution) { rejected++; continue; }
    const key = norm(q.prompt);
    if (seen.has(key)) { skippedDup++; continue; }
    seen.add(key);
    maxN += 1;
    doc.questions.push({
      id: `${exam}-${subject}-sample-${String(maxN).padStart(3, "0")}`,
      type: "mcq", exam, subject, year: null,
      topic: q.topic || "general", difficulty: q.difficulty || 2,
      source: `Sample (${SRC_LABEL[exam] || exam})`,
      prompt: { en: q.prompt },
      choices: choices.map((c) => ({ en: c })),
      answerIndex: q.answerIndex,
      solution: { en: q.solution },
    });
    localAdded++; added++;
  }
  if (!DRY && localAdded) fs.writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
  report.push(`${exam}/${subject}: +${localAdded} -> ${doc.questions.length}`);
}

report.forEach((r) => console.log(`${DRY ? "[dry] " : ""}${r}`));
console.log(`\n${DRY ? "[dry] " : ""}added ${added}, skipped ${skippedDup} dup, rejected ${rejected} malformed`);
console.log("Validate next: node scripts/validate-exam-banks.mjs");
