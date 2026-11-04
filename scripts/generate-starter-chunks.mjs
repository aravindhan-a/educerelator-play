#!/usr/bin/env node
// generate-starter-chunks.mjs — A6: carve a small "starter" chunk off each
// large question bank so the first question loads fast on 2G/3G.
//
// content/levels/starter/<class>-<subject>.json = the parent bank's first 30
// questions (question objects byte-identical to the parent's), written only
// for parents with >= 100 questions. Smaller banks already gzip to a few KB,
// so a starter would roughly double their total transfer (starter + full)
// to save 1-3 KB on the first question — measured, not worth it. Today the
// threshold selects exactly the 12 math banks (~70-80 KB gzipped each; their
// starters are ~4-12 KB gzipped).
//
// Idempotent: re-runs are byte-identical; stale starters (parent shrunk below
// the threshold or was removed) are deleted. Independently verified by
// scripts/verify-starter-chunks.mjs, which recomputes every starter's
// expected bytes from the parent alone — starters can introduce no content
// of their own.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEVELS = path.join(ROOT, "content", "levels");
const STARTER = path.join(LEVELS, "starter");
const STARTER_COUNT = 30;
const QUALIFY_MIN = 100; // mirrored in scripts/verify-starter-chunks.mjs

// Strict array order — exactly how the frontend flattens leveled files
// (js/question-bank.js fetchJsonQuestions). 1-math's levels carry no usable
// id/difficulty metadata and interleave id ranges, so any "smarter" order
// would diverge from what students actually see first.
const flatten = (d) => d.questions ?? d.levels.flatMap((l) => l.questions);

fs.mkdirSync(STARTER, { recursive: true });

// Non-recursive on purpose: a recursive walk would re-ingest starter/ itself.
const parents = fs
  .readdirSync(LEVELS, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".json"))
  .map((e) => e.name)
  .sort();

const wanted = new Set();
let written = 0;
let unchanged = 0;

for (const name of parents) {
  // Subjects contain hyphens (computer-science, social-studies) — never split("-").
  const m = /^(\d+)-(.+)\.json$/.exec(name);
  if (!m) continue; // pre-K skill files (letters.json, numbers.json, ...) have no class-subject shape
  const data = JSON.parse(fs.readFileSync(path.join(LEVELS, name), "utf8"));
  const questions = flatten(data);
  if (questions.length < QUALIFY_MIN) continue;

  const starter = {
    class: data.class,
    subject: data.subject,
    starter: true,
    questions: questions.slice(0, STARTER_COUNT),
  };
  const bytes = JSON.stringify(starter, null, 2) + "\n";
  const out = path.join(STARTER, name);
  wanted.add(name);
  if (fs.existsSync(out) && fs.readFileSync(out, "utf8") === bytes) {
    unchanged++;
    continue;
  }
  fs.writeFileSync(out, bytes, "utf8");
  written++;
}

// Delete-sync: a starter whose parent no longer qualifies must not linger.
let deleted = 0;
for (const name of fs.readdirSync(STARTER).filter((n) => n.endsWith(".json"))) {
  if (!wanted.has(name)) {
    fs.unlinkSync(path.join(STARTER, name));
    deleted++;
  }
}

console.log(
  `starter chunks: ${written} written, ${unchanged} unchanged, ${deleted} deleted (${wanted.size} total)`
);
