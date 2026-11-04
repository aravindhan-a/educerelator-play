#!/usr/bin/env node
// verify-starter-chunks.mjs — independent parity gate for content/levels/starter.
//
// Accuracy is existential: starter chunks must introduce ZERO content of their
// own. This script proves it generator-independently by recomputing every
// starter's expected bytes FROM THE PARENT BANK ALONE (house serialization:
// JSON.stringify(..., null, 2) + "\n", raw UTF-8) and comparing whole files.
// A byte match simultaneously proves: pure subset, parent's first-N order,
// N == 30, exact top-level key set, key order, and generator determinism.
//
// Also enforced:
//  - coverage both ways: every parent with >= 100 questions has a starter;
//    no starter exists without a qualifying parent (stale/orphan detection);
//  - no draft flag anywhere (js/question-bank.js fetchJsonQuestions nulls any
//    file with a truthy draft, which would silently kill the starter path);
//  - unique question ids within each starter;
//  - filename <-> class/subject field agreement (the frontend builds the
//    fetch URL as starter/<class>-<subject>.json).
//
// Runs in CI (deploy.yml) before every deploy; exits nonzero on any failure.
// Deliberately imports nothing from generate-starter-chunks.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEVELS = path.join(ROOT, "content", "levels");
const STARTER = path.join(LEVELS, "starter");
const STARTER_COUNT = 30;
const QUALIFY_MIN = 100; // must match scripts/generate-starter-chunks.mjs

const errs = [];
const flatten = (d) => d.questions ?? (d.levels || []).flatMap((l) => l.questions);

const parentNames = fs
  .readdirSync(LEVELS, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith(".json"))
  .map((e) => e.name)
  .sort();

const starterNames = fs.existsSync(STARTER)
  ? fs.readdirSync(STARTER).filter((n) => n.endsWith(".json")).sort()
  : [];

const qualifying = new Set();
let checked = 0;

for (const name of parentNames) {
  const m = /^(\d+)-(.+)\.json$/.exec(name);
  if (!m) continue; // pre-K skill files
  const parent = JSON.parse(fs.readFileSync(path.join(LEVELS, name), "utf8"));
  if (String(parent.class) !== m[1] || parent.subject !== m[2]) {
    errs.push(`${name}: class/subject fields (${parent.class}, ${parent.subject}) do not match filename`);
  }
  const questions = flatten(parent);
  const starterPath = path.join(STARTER, name);

  if (questions.length < QUALIFY_MIN) {
    if (fs.existsSync(starterPath)) {
      errs.push(`starter/${name}: stale — parent has only ${questions.length} questions (< ${QUALIFY_MIN})`);
    }
    continue;
  }

  qualifying.add(name);
  if (!fs.existsSync(starterPath)) {
    errs.push(`starter/${name}: MISSING — parent has ${questions.length} questions; run scripts/generate-starter-chunks.mjs`);
    continue;
  }

  // Primary assertion: whole-file byte reconstruction from the parent alone.
  const expected =
    JSON.stringify(
      { class: parent.class, subject: parent.subject, starter: true, questions: questions.slice(0, STARTER_COUNT) },
      null,
      2
    ) + "\n";
  const actual = fs.readFileSync(starterPath, "utf8");
  checked++;
  if (actual === expected) continue;

  // Bytes diverged — run itemized diagnostics so the failure says WHAT.
  errs.push(`starter/${name}: bytes do not match reconstruction from parent`);
  let s;
  try {
    s = JSON.parse(actual);
  } catch (e) {
    errs.push(`starter/${name}: unparseable JSON (${e.message})`);
    continue;
  }
  const keys = Object.keys(s).join(",");
  if (keys !== "class,subject,starter,questions") {
    errs.push(`starter/${name}: top-level keys [${keys}] != [class,subject,starter,questions]`);
  }
  if (s.starter !== true) errs.push(`starter/${name}: starter flag is ${JSON.stringify(s.starter)}, not true`);
  if ("draft" in s) errs.push(`starter/${name}: has a draft key — the app would silently drop it`);
  const sq = s.questions || [];
  if (sq.length !== Math.min(STARTER_COUNT, questions.length)) {
    errs.push(`starter/${name}: ${sq.length} questions, expected ${Math.min(STARTER_COUNT, questions.length)}`);
  }
  const ids = new Set(sq.map((q) => q.id));
  if (ids.size !== sq.length) errs.push(`starter/${name}: duplicate question ids`);
  sq.forEach((q, i) => {
    const p = questions[i];
    if (!p || JSON.stringify(q) !== JSON.stringify(p)) {
      errs.push(`starter/${name}: question[${i}] (${q && q.id}) differs from parent's question[${i}] (${p && p.id})`);
    }
  });
}

// Reverse coverage: nothing in starter/ without a qualifying parent.
for (const name of starterNames) {
  if (!/^\d+-.+\.json$/.test(name)) {
    errs.push(`starter/${name}: filename does not match <class>-<subject>.json`);
  } else if (!qualifying.has(name)) {
    errs.push(`starter/${name}: orphan — no qualifying parent bank`);
  }
}

// Non-vacuous: qualifying parents exist, so an empty/missing starter dir must fail.
if (qualifying.size > 0 && starterNames.length === 0) {
  errs.push(`content/levels/starter is missing/empty but ${qualifying.size} parents qualify`);
}

if (errs.length) {
  console.error(`✗ starter-chunk verification FAILED (${errs.length} error${errs.length === 1 ? "" : "s"}):`);
  for (const e of errs.slice(0, 30)) console.error(`  - ${e}`);
  if (errs.length > 30) console.error(`  ... and ${errs.length - 30} more`);
  process.exit(1);
}
console.log(
  `✓ starter chunks verified: ${checked}/${qualifying.size} byte-identical reconstructions from parents (${parentNames.length} parent files scanned)`
);
