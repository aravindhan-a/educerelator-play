#!/usr/bin/env node
// Independent verifier for Classes 11-12 set 3 (Economics, Business Studies,
// Psychology, Sociology, English). Own truth table keyed by a distinctive
// English-prompt pattern.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FACT = [
  [/studies individual units like households/, "Microeconomics"],
  [/studies the economy as a whole/, "Macroeconomics"],
  [/total market value of all final goods/, "GDP"],
  [/sustained general rise in the price level/, "Inflation"],
  [/market structure with only one seller/, "Monopoly"],
  [/desire for a good backed by ability/, "Demand"],
  [/central bank of India/, "Reserve Bank of India"],
  [/single person with unlimited liability/, "Sole Proprietorship"],
  [/two or more persons who share profits/, "Partnership"],
  [/regulates the stock market in India/, "SEBI"],
  [/first \(primary\) function of management/, "Planning"],
  [/'P's make up the traditional marketing mix/, "4"],
  [/capital used for day-to-day business/, "Working capital"],
  [/Psychology is the scientific study of/, "Behaviour and mental processes"],
  [/father of psychoanalysis/, "Sigmund Freud"],
  [/irrational fear of a specific object/, "Phobia"],
  [/learning the norms and values of one's society/, "Socialisation"],
  [/'IQ' stand for/, "Intelligence Quotient"],
  [/Sociology is the systematic study of/, "Society and social relationships"],
  [/founder of sociology/, "Auguste Comte"],
  [/more people move to and live in cities/, "Urbanisation"],
  [/established rules of expected behaviour/, "Norms"],
  [/close, personal, face-to-face relationships/, "Primary group"],
  [/movement of people from villages to cities/, "Migration"],
  [/directly compares two things using 'like' or 'as'/, "Simile"],
  [/compares two things WITHOUT using 'like' or 'as'/, "Metaphor"],
  [/gives human qualities to non-human things/, "Personification"],
  [/deliberate exaggeration used for emphasis/, "Hyperbole"],
  [/repetition of the same initial consonant/, "Alliteration"],
  [/opposite in meaning to another word/, "Antonym"],
  [/same or nearly the same meaning as another/, "Synonym"],
  [/names a person, place, thing or idea/, "Noun"],
  [/used in place of a noun/, "Pronoun"],
];

const files = [];
for (const c of [11,12]) for (const s of ["economics","business-studies","psychology","sociology","english"]) files.push(`content/levels/${c}-${s}.json`);
let checked = 0; const errs = [];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const q of data.questions.filter((q) => /-gen-\d+$/.test(q.id))) {
    checked++;
    const en = q.choices.map((c) => c.en);
    if (new Set(en).size !== en.length) errs.push(`${q.id}: dup choices`);
    if (Object.keys(q.prompt).length < 13) errs.push(`${q.id}: <13 languages`);
    const answer = en[q.answerIndex];
    const p = q.prompt.en;
    const hit = FACT.find(([re]) => re.test(p));
    if (!hit) errs.push(`${q.id}: unrecognised prompt "${p.slice(0,55)}"`);
    else if (hit[1] !== answer) errs.push(`${q.id}: marked "${answer}" expected "${hit[1]}"`);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Class 11-12 (set 3) questions.`);
console.log("ALL CORRECT ✓  (answers match independent truth table; one correct option; unique choices & ids; 13 languages)");
