#!/usr/bin/env node
// Adds the PREVIEW languages (content/i18n/class1-preview.json: Sinhala,
// Arabic, Malay, Chinese, Spanish) to Class 1 content.
//
// Only translated text changes per language. Text that is the same in every
// language (numbers, maths notation, English-subject answer options that stay
// in English) is left alone: the app falls back to English for it, which is
// exactly what it would show anyway.
//
// Idempotent. Re-run after any Class 1 generator, then regenerate starters:
//   node scripts/apply-preview-languages.mjs && node scripts/generate-starter-chunks.mjs
// Checked in CI by scripts/verify-preview-languages.mjs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = JSON.parse(fs.readFileSync(path.join(ROOT, "content/i18n/class1-preview.json"), "utf8"));
export const PREVIEW_LANGS = Object.keys(TABLE.languages);
export const CLASS1_FILES = ["1-english", "1-evs", "1-math"].map((f) => `content/levels/${f}.json`);
const BASE = ["en", "hi", "ta"];

// A translated-text object: { en, hi, ta, ... } of strings whose values differ.
export function isTranslated(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return false;
  if (!BASE.every((k) => typeof o[k] === "string")) return false;
  const base = Object.entries(o).filter(([k]) => !PREVIEW_LANGS.includes(k)).map(([, v]) => v);
  return base.every((v) => typeof v === "string") && new Set(base).size > 1;
}

export function eachTranslated(node, fn) {
  if (Array.isArray(node)) node.forEach((n) => eachTranslated(n, fn));
  else if (node && typeof node === "object") {
    if (isTranslated(node)) fn(node);
    else Object.values(node).forEach((n) => eachTranslated(n, fn));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const missing = new Set();
  let filled = 0;
  for (const rel of CLASS1_FILES) {
    const file = path.join(ROOT, rel);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    eachTranslated(data, (o) => {
      const row = TABLE.strings[o.en];
      if (!row) { missing.add(o.en); return; }
      for (const l of PREVIEW_LANGS) { o[l] = row[l]; filled++; }
    });
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  }
  if (missing.size) {
    console.error(`✗ ${missing.size} English strings have no preview translation yet; add them to content/i18n/class1-preview.json:`);
    for (const s of missing) console.error(`   ${JSON.stringify(s)}`);
    process.exit(1);
  }
  console.log(`✓ preview languages ${PREVIEW_LANGS.join(", ")}: ${filled} translations written across ${CLASS1_FILES.length} Class 1 files`);
}
