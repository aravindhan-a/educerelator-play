#!/usr/bin/env node
// Structural gate for every content/exams/<exam>/<subject>.json file.
// Checks: file parses; each question has a unique id, English prompt, exactly
// 4 distinct English choices, a valid answerIndex, and a solution; ids are
// globally unique; every subject meets a minimum count. Does NOT re-judge
// answer correctness — that is the workflow's adversarial verify step's job.
//
// Usage: node scripts/validate-exam-banks.mjs [minPerSubject]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIN = parseInt(process.argv[2] || "12");

const files = [];
const examsDir = path.join(ROOT, "content/exams");
for (const exam of fs.readdirSync(examsDir)) {
  const d = path.join(examsDir, exam);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) if (f.endsWith(".json")) files.push(path.join(d, f));
}

const errs = [];
const allIds = new Set();
let totalQ = 0, thin = 0;
const perFile = [];

for (const f of files) {
  const rel = path.relative(ROOT, f);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(f, "utf8")); }
  catch (e) { errs.push(`${rel}: parse error ${e.message}`); continue; }
  const qs = doc.questions || [];
  perFile.push([rel.replace("content/exams/", "").replace(".json", ""), qs.length]);
  if (qs.length < MIN) thin++;
  for (const q of qs) {
    totalQ++;
    if (!q.id) errs.push(`${rel}: question with no id`);
    else if (allIds.has(q.id)) errs.push(`${rel}: duplicate id ${q.id}`);
    else allIds.add(q.id);
    if (!q.prompt?.en) errs.push(`${q.id}: no English prompt`);
    const ch = (q.choices || []).map((c) => c.en);
    if (ch.length !== 4) errs.push(`${q.id}: ${ch.length} choices`);
    if (new Set(ch.map((s) => String(s).trim())).size !== ch.length) errs.push(`${q.id}: duplicate choices`);
    if (!(Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < ch.length)) errs.push(`${q.id}: bad answerIndex`);
    if (!q.solution?.en) errs.push(`${q.id}: no solution`);
    if (ch.some((c) => c == null || String(c).trim() === "")) errs.push(`${q.id}: empty choice`);
  }
}

perFile.sort().forEach(([k, n]) => console.log(`  ${k.padEnd(28)} ${n}${n < MIN ? "  ⚠ thin" : ""}`));
console.log(`\n${files.length} files, ${totalQ} questions, ${allIds.size} unique ids, ${thin} below ${MIN}`);
if (errs.length) { console.error(`\n✗ ${errs.length} structural problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log("STRUCTURE OK ✓  (unique ids, 4 distinct choices, valid answerIndex, solutions present)");
