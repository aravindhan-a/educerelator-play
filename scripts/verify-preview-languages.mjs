#!/usr/bin/env node
// CI check for the PREVIEW languages in Class 1 (see content/i18n/class1-preview.json).
// Fails the deploy if any of these is true:
//   1. a translated Class 1 string lacks a preview language, or differs from the table
//   2. two answer options in one question read the same in a preview language
//   3. a preview-language prompt gives away its right answer (the answer's word
//      appears in the prompt) when the English prompt does not
//   4. text is in the wrong script (e.g. Latin letters in Sinhala/Arabic/Chinese words)
// It also prints a per-language count so the review effort is visible.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREVIEW_LANGS, CLASS1_FILES, eachTranslated, isTranslated } from "./apply-preview-languages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TABLE = JSON.parse(fs.readFileSync(path.join(ROOT, "content/i18n/class1-preview.json"), "utf8"));
const SCRIPT = { si: /\p{Script=Sinhala}/u, ar: /\p{Script=Arabic}/u, zh: /\p{Script=Han}/u, ms: /[A-Za-z]/, es: /[A-Za-z]/ };
const LATIN_OK = /\b(meow|miau)\b/i; // sound words quoted on purpose
const word = (s) => s.replace(/^[^\p{L}]+/u, "").trim();
const errors = [];
let checked = 0;

for (const rel of CLASS1_FILES) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  eachTranslated(data, (o) => {
    for (const l of PREVIEW_LANGS) {
      checked++;
      if (typeof o[l] !== "string" || !o[l].trim()) { errors.push(`${rel}: "${o.en}" has no ${l}`); continue; }
      if (TABLE.strings[o.en]?.[l] !== o[l]) errors.push(`${rel}: "${o.en}" ${l} differs from the table`);
      if (/^\d+$/.test(o.en)) continue;
      if (!SCRIPT[l].test(o[l])) errors.push(`${rel}: "${o.en}" ${l} "${o[l]}" is not in ${l} script`);
      if (["si", "ar", "zh"].includes(l) && /[A-Za-z]/.test(o[l].replace(LATIN_OK, ""))) errors.push(`${rel}: "${o.en}" ${l} "${o[l]}" has Latin letters`);
    }
  });
  const qs = (data.questions || data.levels.flatMap((x) => x.questions));
  for (const q of qs) {
    for (const l of PREVIEW_LANGS) {
      const opts = q.choices.map((c) => c[l] || c.en);
      if (new Set(opts).size !== opts.length) errors.push(`${rel} ${q.id}: duplicate options in ${l}: ${opts.join(" / ")}`);
      const ans = q.choices[q.answer ?? q.answerIndex ?? q.correct];
      if (!ans || !isTranslated(ans) || !isTranslated(q.prompt)) continue;
      const w = word(ans[l]), we = word(ans.en).toLowerCase();
      if (w.length >= 1 && q.prompt[l].includes(w) && !q.prompt.en.toLowerCase().includes(we))
        errors.push(`${rel} ${q.id}: ${l} prompt "${q.prompt[l]}" contains the answer "${w}"`);
    }
  }
}

if (errors.length) {
  console.error(`✗ preview languages: ${errors.length} problem(s)`);
  errors.slice(0, 40).forEach((e) => console.error("  " + e));
  process.exit(1);
}
const status = Object.entries(TABLE.languages).map(([l, m]) => `${l} ${m.status}`).join(", ");
console.log(`✓ preview languages verified: ${checked} translations in Class 1 (${Object.keys(TABLE.strings).length} distinct strings x ${PREVIEW_LANGS.length}); ${status}`);
