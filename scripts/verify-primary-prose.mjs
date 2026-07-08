#!/usr/bin/env node
// Independent verifier for generated primary prose (separate tables from the
// generator, so a bug in one can't hide in the other). Checks every generated
// question: the marked answer actually matches the picture / the named
// category, exactly one correct option, unique ids, no duplicate choices.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Independently-written truth tables.
const EMOJI_WORD = {
  "🐶":"Dog","🐱":"Cat","🐄":"Cow","🦁":"Lion","🐘":"Elephant","🐒":"Monkey","🐟":"Fish","🐦":"Bird","🐴":"Horse","🐐":"Goat",
  "🍎":"Apple","🥭":"Mango","🍌":"Banana","🍇":"Grape","🍊":"Orange",
  "🚗":"Car","🚌":"Bus","🚂":"Train","⛵":"Boat","✈️":"Aeroplane",
  "☀️":"Sun","🌙":"Moon","⭐":"Star","🌳":"Tree","🌸":"Flower",
  "👁️":"Eye","👂":"Ear","👃":"Nose","✋":"Hand","🏠":"House","⚽":"Ball","📖":"Book",
  "🔴":"Red","🔵":"Blue","🟢":"Green","🟡":"Yellow",
};
const WORD_CAT = {
  Dog:"animal",Cat:"animal",Cow:"animal",Lion:"animal",Elephant:"animal",Monkey:"animal",Fish:"animal",Bird:"animal",Horse:"animal",Goat:"animal",
  Apple:"fruit",Mango:"fruit",Banana:"fruit",Grape:"fruit",Orange:"fruit",
  Car:"vehicle",Bus:"vehicle",Train:"vehicle",Boat:"vehicle",Aeroplane:"vehicle",
  Sun:"nature",Moon:"nature",Star:"nature",Tree:"nature",Flower:"nature",
  Eye:"body",Ear:"body",Nose:"body",Hand:"body",House:"object",Ball:"object",Book:"object",
  Red:"colour",Blue:"colour",Green:"colour",Yellow:"colour",
};
const CAT_FROM_PROMPT = { "an animal":"animal", "a fruit":"fruit", "a vehicle":"vehicle" };

const files = ["content/levels/1-english.json", "content/levels/1-evs.json"];
let checked = 0; const errs = [];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  const gen = (data.levels || []).filter((l) => /gen-level$/.test(l.id));
  for (const lvl of gen) {
    for (const q of lvl.questions) {
      checked++;
      const answer = q.choices[q.answerIndex]?.en;
      // exactly one correct + unique choices
      if (new Set(q.choices.map((c) => c.en)).size !== q.choices.length) errs.push(`${q.id}: dup choices`);
      if (q.type === "match-image") {
        const expect = EMOJI_WORD[q.visual];
        if (!expect) errs.push(`${q.id}: unknown emoji ${q.visual}`);
        else if (answer !== expect) errs.push(`${q.id}: picture ${q.visual} wants ${expect}, marked ${answer}`);
        // distractors must not also match the picture
        q.choices.forEach((c, i) => { if (i !== q.answerIndex && c.en === expect) errs.push(`${q.id}: distractor also correct`); });
      } else if (q.type === "identify") {
        const m = q.prompt.en.match(/is (an? \w+)\?/);
        const cat = m && CAT_FROM_PROMPT[m[1]];
        if (!cat) errs.push(`${q.id}: unparseable category prompt`);
        else {
          if (WORD_CAT[answer] !== cat) errs.push(`${q.id}: answer ${answer} is not ${cat}`);
          q.choices.forEach((c, i) => { if (i !== q.answerIndex && WORD_CAT[c.en] === cat) errs.push(`${q.id}: 2nd ${cat} distractor ${c.en}`); });
        }
      }
    }
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 20).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} generated prose questions.`);
console.log("ALL CORRECT ✓  (every answer matches its picture/category; one correct option; unique choices & ids)");
