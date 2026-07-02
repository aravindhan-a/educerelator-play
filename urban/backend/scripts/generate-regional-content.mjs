#!/usr/bin/env node
// Content factory for contextual question packs.
//
// Generates region-grounded seed questions (13 languages) for any of India's
// 36 regions, validates them, and writes them to content/regions/ marked as
// DRAFT. A human reviews en/known-language text and local facts, then removes
// the draft flag before the pack ships.
//
// Usage (from urban/backend/, needs ANTHROPIC_API_KEY):
//   node scripts/generate-regional-content.mjs --region tamil-nadu --class 4 --subject social-studies --count 10
//   node scripts/generate-regional-content.mjs --region kerala --class 5 --subject science --count 10
//
// Review workflow: see the printed checklist at the end of each run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateQuestionBatch } from "../lib/anthropic.js";
import { REGION_LABELS } from "../lib/regions.js";

const LANGS = ["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne"];
const ROOT  = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const region   = arg("region");
const classNum = parseInt(arg("class"), 10);
const subject  = arg("subject");
const count    = parseInt(arg("count", "10"), 10);

if (!REGION_LABELS[region] || !Number.isInteger(classNum) || !subject) {
  console.error("Usage: node scripts/generate-regional-content.mjs --region <id> --class <1-12> --subject <id> [--count 10]");
  console.error("Region ids:", Object.keys(REGION_LABELS).join(", "));
  process.exit(1);
}

// ---- validation (same rules as the site-wide content audit) ----
function validate(questions) {
  const problems = [];
  const seenIds = new Set();
  for (const q of questions) {
    const tag = q.id || "?";
    if (!q.id || seenIds.has(q.id)) problems.push(`${tag}: missing/duplicate id`);
    seenIds.add(q.id);
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= (q.choices || []).length)
      problems.push(`${tag}: bad answerIndex`);
    const langs = Object.keys(q.prompt || {});
    if (langs.length !== LANGS.length || LANGS.some((l) => !q.prompt[l]?.trim()))
      problems.push(`${tag}: prompt missing languages`);
    for (const c of q.choices || []) {
      if (LANGS.some((l) => !c[l]?.trim())) problems.push(`${tag}: choice missing languages`);
    }
    const ens = (q.choices || []).map((c) => (c.en || "").trim().toLowerCase());
    if (new Set(ens).size !== ens.length) problems.push(`${tag}: duplicate choices`);
  }
  return problems;
}

// deterministic per-question shuffle so answer positions are unbiased
function shuffleAnswers(questions) {
  for (const q of questions) {
    const correct = q.choices[q.answerIndex];
    let seed = [...q.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let i = q.choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [q.choices[i], q.choices[j]] = [q.choices[j], q.choices[i]];
    }
    q.answerIndex = q.choices.indexOf(correct);
  }
}

console.log(`Generating ${count} ${REGION_LABELS[region]}-contextual questions: Class ${classNum} ${subject}…`);
const batch = await generateQuestionBatch({ classNum, subject, curriculum: "cbse", difficulty: 3, region, count });

// namespaced, stable ids
batch.forEach((q, i) => {
  q.id = `${region}-${classNum}-${subject}-${String(i + 1).padStart(3, "0")}`;
});

const problems = validate(batch);
if (problems.length) {
  console.error(`✗ ${problems.length} validation problems — nothing written:`);
  problems.forEach((p) => console.error("  ", p));
  process.exit(1);
}
shuffleAnswers(batch);

const outDir  = path.join(ROOT, "content/regions", region);
const outFile = path.join(outDir, `${classNum}-${subject}.json`);
fs.mkdirSync(outDir, { recursive: true });

// merge with any existing pack, never overwriting reviewed questions
let existing = [];
if (fs.existsSync(outFile)) {
  const prev = JSON.parse(fs.readFileSync(outFile, "utf8"));
  existing = prev.questions || [];
  const ids = new Set(existing.map((q) => q.id));
  for (const q of batch) if (ids.has(q.id)) q.id = `${q.id}-b${Date.now() % 1000}`;
}

fs.writeFileSync(outFile, JSON.stringify({
  region, class: classNum, subject,
  draft: true,   // remove after human review
  questions: [...existing, ...batch],
}, null, 2) + "\n");

console.log(`✓ Wrote ${batch.length} questions to ${path.relative(ROOT, outFile)} (draft)`);
console.log(`
REVIEW CHECKLIST before removing "draft": true —
  1. Every marked answer is factually correct (verify local facts: rivers,
     festivals, crops, landmarks — reject anything you cannot verify)
  2. English + every language you read are natural and age-appropriate
  3. No question assumes money, caste, religion or gender stereotypes
  4. Concept tested matches the Class ${classNum} syllabus
Note: the app serves draft packs too — remove untrusted files or keep them
out of git until reviewed.`);
