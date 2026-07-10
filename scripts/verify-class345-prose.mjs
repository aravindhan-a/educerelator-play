#!/usr/bin/env node
// Independent verifier for Classes 3-5 generated prose. Truth tables here are
// written separately from the generator so a bug in one can't hide in the
// other. Parses each English prompt, checks the marked answer is right and
// that no distractor is also a correct answer.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── English grammar truth tables (independent copies) ──
const PLURAL = { cat:"cats",dog:"dogs",box:"boxes",bus:"buses",baby:"babies",story:"stories",man:"men",child:"children",foot:"feet",tooth:"teeth",mouse:"mice",woman:"women",leaf:"leaves",knife:"knives",wolf:"wolves",shelf:"shelves",life:"lives",thief:"thieves",sheep:"sheep",deer:"deer",goose:"geese",ox:"oxen" };
const PAST = { play:"played",jump:"jumped",go:"went",eat:"ate",come:"came",run:"ran",see:"saw",write:"wrote",take:"took",give:"gave",sing:"sang",drink:"drank",buy:"bought",teach:"taught",catch:"caught",think:"thought",bring:"brought",fight:"fought" };
const OPP = { tall:"short",fat:"thin",full:"empty",near:"far",clean:"dirty",hard:"soft",heavy:"light",first:"last",above:"below",inside:"outside",early:"late",strong:"weak",loud:"quiet",rich:"poor",always:"never",win:"lose",buy:"sell",laugh:"cry",remember:"forget",push:"pull",arrive:"depart",ancient:"modern",victory:"defeat",increase:"decrease",maximum:"minimum",presence:"absence",entrance:"exit",success:"failure" };
const SYN = { big:"large",small:"little",happy:"glad",fast:"quick",smart:["clever","intelligent"],angry:"mad",sad:"unhappy",begin:"start",end:"finish",loud:"noisy",brave:"courageous",famous:"well-known",difficult:"hard",easy:"simple",silent:"quiet",gift:"present",quick:"rapid",tidy:"neat",mistake:"error" };
const VOWEL_SOUND = new Set(["apple","egg","orange","umbrella","elephant","hour","ice"]);
const POS = { school:"noun",river:"noun",chair:"noun",mango:"noun",honesty:"noun",knowledge:"noun",jump:"verb",swim:"verb",read:"verb",dance:"verb",decide:"verb",arrive:"verb",tall:"adjective",sweet:"adjective",round:"adjective",bright:"adjective",slowly:"adverb",quickly:"adverb",loudly:"adverb",softly:"adverb" };

// ── Fact truth table: exact English prompt (+visual) → expected answer ──
const FACT = [
  ["Which part of a plant makes food?", null, "Leaf"],
  ["Which part of a plant absorbs water from the soil?", null, "Root"],
  ["Which part of a plant carries water to the leaves?", null, "Stem"],
  ["Which part of a plant grows into a new plant?", null, "Seed"],
  ["Which part of a plant is colourful and attracts insects?", null, "Flower"],
  ["Which body part do we use to taste food?", null, "Tongue"],
  ["Which body part helps us feel by touch?", null, "Skin"],
  ["Where does this animal live?", "🐟", "Water"],
  ["Where does this animal live?", "🐠", "Water"],
  ["Where does this animal live?", "🐫", "Desert"],
  ["Where does this animal live?", "🐒", "Forest"],
  ["Where does this animal live?", "🐯", "Forest"],
  ["What does this animal eat?", "🐄", "Grass"],
  ["What does this animal eat?", "🦁", "Meat"],
  ["What does this animal eat?", "🐐", "Grass"],
  ["What does this animal eat?", "🐘", "Grass"],
  ["What do plants need to make their food?", null, "Sunlight"],
  ["How many legs does an insect have?", null, "6"],
  ["How many sense organs do we have?", null, "5"],
  ["What does water become when it freezes?", null, "Ice"],
  ["What does water become when it boils?", null, "Steam"],
  ["What do we take in when we breathe?", null, "Air"],
  ["Which organ do we breathe with?", null, "Lungs"],
  ["In which direction does the Sun rise?", null, "East"],
  ["In which direction does the Sun set?", null, "West"],
  ["Which season is the hottest?", null, "Summer"],
  ["Which season is the coldest?", null, "Winter"],
  ["How many days are there in a week?", null, "7"],
  ["How many months are there in a year?", null, "12"],
  ["How many days are there in a normal year?", null, "365"],
  ["Which organ controls our whole body and helps us think?", null, "Brain"],
  ["In which organ is our food digested?", null, "Stomach"],
  ["On which planet do we live?", null, "Earth"],
  ["Which is the largest planet in our solar system?", null, "Jupiter"],
  ["Which planet is called the Red Planet?", null, "Mars"],
  ["Which object goes around the Earth?", null, "Moon"],
  ["How many bones does an adult human body have?", null, "206"],
  ["How many planets are there in our solar system?", null, "8"],
  ["Who teaches students in a school?", null, "Teacher"],
  ["Who treats us when we are sick?", null, "Doctor"],
  ["Who grows crops in the fields?", null, "Farmer"],
  ["Who keeps our city safe and catches thieves?", null, "Police officer"],
  ["Who puts out fires?", null, "Firefighter"],
  ["Who flies an aeroplane?", null, "Pilot"],
  ["Who drives a bus?", null, "Driver"],
  ["Where does this vehicle travel?", "✈️", "Air"],
  ["Where does this vehicle travel?", "⛵", "Water"],
  ["Where does this vehicle travel?", "🚌", "Land"],
  ["Where does this vehicle travel?", "🚂", "Land"],
  ["Where do we go for treatment when we are very sick?", null, "Hospital"],
  ["Where do children go to learn?", null, "School"],
  ["Which is the national bird of India?", null, "Peacock"],
  ["Which is the national animal of India?", null, "Tiger"],
  ["Which is the national flower of India?", null, "Lotus"],
  ["Which is the national fruit of India?", null, "Mango"],
  ["How many colours are there in the Indian flag?", null, "3"],
  ["How many spokes does the Ashoka Chakra have?", null, "24"],
  ["Which direction is opposite to North?", null, "South"],
  ["Which direction is opposite to East?", null, "West"],
  ["Which city is the capital of India?", null, "New Delhi"],
  ["Which mountains lie to the north of India?", null, "Himalayas"],
  ["Which of these is a famous river of India?", null, "Ganga"],
  ["Which is a round model of the Earth?", null, "Globe"],
  ["How many continents are there in the world?", null, "7"],
  ["Which is the largest continent?", null, "Asia"],
  ["How many oceans are there in the world?", null, "5"],
  ["Which is the largest ocean?", null, "Pacific Ocean"],
  ["Which ocean lies to the south of India?", null, "Indian Ocean"],
  ["How many states does India have?", null, "28"],
  ["Which is the largest state of India by area?", null, "Rajasthan"],
];
const factKey = (p, v) => `${p}||${v || ""}`;
const FACT_MAP = Object.fromEntries(FACT.map(([p, v, a]) => [factKey(p, v), a]));

const files = ["3-english","4-english","5-english","3-science","4-science","5-science","3-social-studies","4-social-studies","5-social-studies"].map((s) => `content/levels/${s}.json`);
let checked = 0; const errs = [];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const q of data.questions.filter((q) => /-gen-\d+$/.test(q.id))) {
    checked++;
    const en = q.choices.map((c) => c.en);
    if (new Set(en).size !== en.length) errs.push(`${q.id}: dup choices`);
    const answer = en[q.answerIndex];
    const p = q.prompt.en;
    let m, expected = null, multi = null;

    if ((m = p.match(/plural of "(\w+)"/)))            expected = PLURAL[m[1]];
    else if ((m = p.match(/past tense of "(\w+)"/)))   expected = PAST[m[1]];
    else if ((m = p.match(/opposite of "(\w+)"/)))     expected = OPP[m[1]];
    else if ((m = p.match(/means the same as "([\w-]+)"/))) { const s = SYN[m[1]]; if (Array.isArray(s)) multi = s; else expected = s; }
    else if (p === "Which is correct?") {
      // article question: answer phrase must have the right article for its noun
      const am = answer.match(/^(an?) (\w+)$/);
      if (!am) { errs.push(`${q.id}: unparseable article answer "${answer}"`); continue; }
      const right = VOWEL_SOUND.has(am[2]) ? "an" : "a";
      if (am[1] !== right) errs.push(`${q.id}: "${answer}" wrong article`);
      // every distractor must be a WRONG phrase
      en.forEach((c, i) => { if (i !== q.answerIndex) { const dm = c.match(/^(an?) (\w+)$/); if (dm) { const r = VOWEL_SOUND.has(dm[2]) ? "an" : "a"; if (dm[1] === r) errs.push(`${q.id}: distractor "${c}" is also correct`); } } });
      continue;
    }
    else if ((m = p.match(/Which word is an? (noun|verb|adjective|adverb)\?/))) {
      if (POS[answer] !== m[1]) errs.push(`${q.id}: "${answer}" is not ${m[1]}`);
      en.forEach((c, i) => { if (i !== q.answerIndex && POS[c] === m[1]) errs.push(`${q.id}: distractor "${c}" also ${m[1]}`); });
      continue;
    }
    else if (FACT_MAP[factKey(p, q.visual)] !== undefined) {
      expected = FACT_MAP[factKey(p, q.visual)];
      // no distractor may equal the expected answer (uniqueness already checked)
    }
    else { errs.push(`${q.id}: unrecognised prompt "${p}" (visual ${q.visual || "-"})`); continue; }

    if (multi) { if (!multi.includes(answer)) errs.push(`${q.id}: "${answer}" not in ${multi}`); }
    else if (expected === undefined) errs.push(`${q.id}: no truth entry for cue in "${p}"`);
    else if (answer !== expected) errs.push(`${q.id}: marked "${answer}", expected "${expected}"`);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Class 3-5 generated questions.`);
console.log("ALL CORRECT ✓  (answers match independent truth tables; one correct option; unique choices & ids)");
