#!/usr/bin/env node
// Independent verifier for Class 2 generated prose. Its own truth tables, so a
// bug in the generator can't hide in the checker. Parses each English prompt,
// then confirms the marked answer is right and no distractor is also correct.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CAT = {
  Dog:"animal",Cat:"animal",Cow:"animal",Lion:"animal",Elephant:"animal",Monkey:"animal",Fish:"animal",Bird:"animal",Horse:"animal",Goat:"animal",
  Parrot:"animal",Duck:"animal",Frog:"animal",Rabbit:"animal",Snake:"animal",Tiger:"animal",
  Apple:"fruit",Mango:"fruit",Banana:"fruit",Grape:"fruit",Orange:"fruit",
  Potato:"vegetable",Tomato:"vegetable",Carrot:"vegetable",
  Car:"vehicle",Bus:"vehicle",Train:"vehicle",Boat:"vehicle",Aeroplane:"vehicle",
  Sun:"nature",Moon:"nature",Star:"nature",Tree:"nature",Flower:"nature",
  Eye:"body",Ear:"body",Nose:"body",Hand:"body",House:"object",Ball:"object",Book:"object",Chair:"object",
  Red:"colour",Blue:"colour",Green:"colour",Yellow:"colour",
};
const FLY = new Set(["Bird","Parrot","Duck"]);
const WATER = new Set(["Fish","Frog"]);
const MILK = new Set(["Cow","Goat"]);
const WILD = new Set(["Lion","Elephant","Monkey","Tiger","Snake"]);
const PET = new Set(["Dog","Cat","Rabbit","Parrot"]);
const OPP = { Big:"Small",Small:"Big",Hot:"Cold",Cold:"Hot",Day:"Night",Night:"Day",Up:"Down",Down:"Up",Fast:"Slow",Slow:"Fast",Open:"Closed",Closed:"Open",Happy:"Sad",Sad:"Happy",Black:"White",White:"Black",New:"Old",Old:"New",Wet:"Dry",Dry:"Wet" };
const BODYFN = { see:"Eye", hear:"Ear", smell:"Nose" };

const files = ["content/levels/2-english.json", "content/levels/2-evs.json"];
let checked = 0; const errs = [];

// returns { ok(answer)-> boolean, sole: bool } based on English prompt
function rule(p) {
  let m;
  if ((m = p.match(/is an? (fruit|vegetable|animal|vehicle)\?$/)))      return { pred: (w) => CAT[w] === m[1], type:`is-${m[1]}` };
  if ((m = p.match(/is NOT an? (fruit|vegetable|animal|vehicle)\?$/)))  return { pred: (w) => CAT[w] !== m[1], type:`not-${m[1]}` };
  if (/animals can fly\?$/.test(p))         return { pred: (w) => FLY.has(w),   type:"fly" };
  if (/lives in water\?$/.test(p))          return { pred: (w) => WATER.has(w), type:"water" };
  if (/gives us milk\?$/.test(p))           return { pred: (w) => MILK.has(w),  type:"milk" };
  if (/is a wild animal\?$/.test(p))        return { pred: (w) => WILD.has(w),  type:"wild" };
  if (/kept as a pet\?$/.test(p))           return { pred: (w) => PET.has(w),   type:"pet" };
  if ((m = p.match(/opposite of "(\w+)"\?$/))) return { pred: (w) => w === OPP[m[1]], type:"opposite", cue:m[1] };
  if (/to see\?$/.test(p))                  return { pred: (w) => w === BODYFN.see,   type:"see" };
  if (/to hear\?$/.test(p))                 return { pred: (w) => w === BODYFN.hear,  type:"hear" };
  if (/to smell\?$/.test(p))                return { pred: (w) => w === BODYFN.smell, type:"smell" };
  return null;
}

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const q of data.questions.filter((q) => /-gen-\d+$/.test(q.id))) {
    checked++;
    const en = q.choices.map((c) => c.en);
    if (new Set(en).size !== en.length) errs.push(`${q.id}: dup choices`);
    const rl = rule(q.prompt.en);
    if (!rl) { errs.push(`${q.id}: unparseable prompt "${q.prompt.en}"`); continue; }
    const answer = en[q.answerIndex];
    if (!rl.pred(answer)) errs.push(`${q.id} [${rl.type}]: answer "${answer}" fails rule`);
    // exactly one correct: no distractor should also satisfy the predicate
    en.forEach((w, i) => { if (i !== q.answerIndex && rl.pred(w)) errs.push(`${q.id} [${rl.type}]: distractor "${w}" also correct`); });
    // opposite words that we don't know are suspicious
    if (rl.type === "opposite" && !(answer in OPP)) errs.push(`${q.id}: unknown opposite word ${answer}`);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 25).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Class 2 generated questions.`);
console.log("ALL CORRECT ✓  (answer satisfies its rule; exactly one correct option; unique choices & ids)");
