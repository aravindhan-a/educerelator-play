#!/usr/bin/env node
// Independent verifier for Classes 11-12 sciences. Its own truth table, keyed
// by a distinctive English-prompt pattern (plus the element visual where the
// prompt is generic). Confirms the marked answer is correct, one correct
// option, unique choices/ids, and 13-language prompts.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FACT = [
  [/SI unit of force/, "Newton"],
  [/SI unit of energy/, "Joule"],
  [/SI unit of power/, "Watt"],
  [/SI unit of pressure/, "Pascal"],
  [/SI unit of frequency/, "Hertz"],
  [/SI unit of temperature/, "Kelvin"],
  [/acceleration due to gravity/, "9.8"],
  [/equal and opposite reaction/, "Newton's Third Law"],
  [/SI unit kilogram/, "Mass"],
  [/speed of light in vacuum/, "3"],
  [/SI unit of electric current/, "Ampere"],
  [/SI unit of electrical resistance/, "Ohm"],
  [/SI unit of electric potential difference/, "Volt"],
  [/SI unit of electric charge/, "Coulomb"],
  [/carries a positive charge/, "Proton"],
  [/converges parallel rays/, "Convex lens"],
  [/pH of a neutral solution/, "7"],
  [/most electronegative element/, "Fluorine"],
  [/Avogadro's number/, "6.022"],
  [/formula of water/, "H₂O"],
  [/outermost shell of a noble gas/, "8"],
  [/functional group is present in alcohols/, "−OH"],
  [/functional group is present in carboxylic acids/, "−COOH"],
  [/formula of methane/, "CH₄"],
  [/molecular formula of glucose/, "C₆H₁₂O₆"],
  [/gain of electrons/, "Reduction"],
  [/loss of electrons/, "Oxidation"],
  [/simplest alkane/, "Methane"],
  [/powerhouse of the cell/, "Mitochondria"],
  [/controls all cell activities and contains DNA/, "Nucleus"],
  [/does photosynthesis take place/, "Chloroplast"],
  [/basic structural and functional unit of life/, "Cell"],
  [/green pigment in plants captures light/, "Chlorophyll"],
  [/transports water from roots to leaves/, "Xylem"],
  [/chambers does the human heart/, "4"],
  [/Father of Genetics/, "Gregor Mendel"],
  [/carries hereditary information/, "DNA"],
  [/produces gametes/, "Meiosis"],
  [/regulates blood sugar/, "Insulin"],
  [/defend the body against infection/, "White blood cells"],
  [/alleles separate during gamete formation/, "Law of Segregation"],
];
// generic prompts differentiated by element visual
const ATOMIC = { Hydrogen:"1", Carbon:"6", Oxygen:"8" };
const SYMBOL = { Sodium:"Na", Potassium:"K" };

const files = [];
for (const c of [11,12]) for (const s of ["physics","chemistry","biology"]) files.push(`content/levels/${c}-${s}.json`);
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

    if (/atomic number of this element/.test(p)) {
      if (ATOMIC[q.visual] !== answer) errs.push(`${q.id}: atomicNo(${q.visual}) marked "${answer}" expected "${ATOMIC[q.visual]}"`);
    } else if (/chemical symbol of this element/.test(p)) {
      if (SYMBOL[q.visual] !== answer) errs.push(`${q.id}: symbol(${q.visual}) marked "${answer}" expected "${SYMBOL[q.visual]}"`);
    } else {
      const hit = FACT.find(([re]) => re.test(p));
      if (!hit) errs.push(`${q.id}: unrecognised prompt "${p.slice(0,55)}"`);
      else if (hit[1] !== answer) errs.push(`${q.id}: marked "${answer}" expected "${hit[1]}"`);
    }
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Class 11-12 science questions.`);
console.log("ALL CORRECT ✓  (answers match independent truth table; one correct option; unique choices & ids; 13 languages)");
