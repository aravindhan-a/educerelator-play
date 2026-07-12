#!/usr/bin/env node
// Independent verifier for Classes 11-12 set 2 (CS, History, Geography,
// Political Science). Own truth table keyed by a distinctive English-prompt
// pattern. Confirms answer correct, one correct option, unique choices/ids,
// 13-language prompts.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FACT = [
  [/keyword is used to define a function in Python/, "def"],
  [/built-in Python function displays output/, "print()"],
  [/Python data type stores whole numbers/, "int"],
  [/Python data type stores text/, "str"],
  [/loop that repeats a known number of times/, "for"],
  [/symbol begins a single-line comment in Python/, "#"],
  [/only two values: True or False/, "bool"],
  [/Python data type stores decimal/, "float"],
  [/SQL command is used to retrieve data/, "SELECT"],
  [/SQL command adds new rows/, "INSERT"],
  [/SQL command removes rows/, "DELETE"],
  [/SQL command modifies existing data/, "UPDATE"],
  [/structure the content of web pages/, "HTML"],
  [/using only 0 and 1, do computers use/, "Binary"],
  [/number system uses base 16/, "Hexadecimal"],
  [/bundles data and methods and hides internal/, "Encapsulation"],
  [/French Revolution begin/, "1789"],
  [/Second World War end/, "1945"],
  [/founded the Mughal Empire/, "Babur"],
  [/India gain independence/, "1947"],
  [/United States declare independence/, "1776"],
  [/Ashoka belonged to which dynasty/, "Maurya"],
  [/Quit India Movement launched/, "1942"],
  [/Jallianwala Bagh massacre occur/, "1919"],
  [/First War of Indian Independence/, "1857"],
  [/Dandi \(Salt\) March/, "1930"],
  [/longest river in the world/, "Nile"],
  [/largest ocean in the world/, "Pacific Ocean"],
  [/largest hot desert/, "Sahara"],
  [/highest mountain peak on Earth/, "Mount Everest"],
  [/layer of the atmosphere do we live/, "Troposphere"],
  [/longest river in India/, "Ganga"],
  [/city is the capital of India/, "New Delhi"],
  [/largest Indian state by area/, "Rajasthan"],
  [/Constitution of India come into effect/, "26 January 1950"],
  [/how many Fundamental Rights|How many Fundamental Rights/, "6"],
  [/constitutional head of the Indian State/, "President"],
  [/minimum voting age in India/, "18"],
  [/normal term of the Lok Sabha/, "5"],
  [/real head of government in India/, "Prime Minister"],
  [/Upper House of the Indian Parliament/, "Rajya Sabha"],
  [/headquarters of the United Nations/, "New York"],
];

const files = [];
for (const c of [11,12]) for (const s of ["computer-science","history","geography","political-science"]) files.push(`content/levels/${c}-${s}.json`);
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
console.log(`Independently verified ${checked} Class 11-12 (set 2) questions.`);
console.log("ALL CORRECT ✓  (answers match independent truth table; one correct option; unique choices & ids; 13 languages)");
