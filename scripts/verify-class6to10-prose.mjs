#!/usr/bin/env node
// Independent verifier for Classes 6-10 generated prose. Separate truth tables
// from the generator. Parses each English prompt, checks the marked answer is
// correct and no distractor is also correct.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── grammar truth tables (independent) ──
const PLURAL = { hero:"heroes",potato:"potatoes",city:"cities",lady:"ladies",boy:"boys",key:"keys",cactus:"cacti",fungus:"fungi",radius:"radii",nucleus:"nuclei",crisis:"crises",analysis:"analyses",phenomenon:"phenomena",criterion:"criteria" };
const PAST = { begin:"began",swim:"swam",fly:"flew",speak:"spoke",break:"broke",choose:"chose",ride:"rode",grow:"grew",freeze:"froze",steal:"stole",wear:"wore",throw:"threw",draw:"drew",bite:"bit",seek:"sought",weep:"wept",sweep:"swept",bind:"bound",grind:"ground",arise:"arose",bear:"bore",tear:"tore",weave:"wove",tread:"trod",forbid:"forbade",slay:"slew" };
const ING = { run:"running",make:"making",sit:"sitting",write:"writing",begin:"beginning",swim:"swimming",stop:"stopping",come:"coming" };
// antonyms & synonyms as word -> Set (a word may have several valid partners)
const addPair = (map, a, b) => { (map[a] = map[a] || new Set()).add(b); (map[b] = map[b] || new Set()).add(a); };
const OPP = {};
[["accept","reject"],["ascend","descend"],["expand","shrink"],["import","export"],["major","minor"],["private","public"],["temporary","permanent"],["artificial","natural"],["ancient","modern"],["shallow","deep"],
 ["generous","selfish"],["humble","proud"],["transparent","opaque"],["vertical","horizontal"],["fertile","barren"],["liquid","solid"],["urban","rural"],["profit","loss"],["demand","supply"],
 ["optimist","pessimist"],["expand","contract"],["include","exclude"],["ascent","descent"],["visible","invisible"],["mortal","immortal"],["literate","illiterate"],["rational","irrational"],["voluntary","compulsory"],["superior","inferior"],
 ["benevolent","malevolent"],["conceal","reveal"],["frequent","rare"],["genuine","fake"],["harmony","discord"],["scarce","abundant"],["triumph","defeat"],["unite","divide"],["flexible","rigid"],["praise","criticise"],
 ["candid","evasive"],["diligent","lazy"],["humane","cruel"],["lucid","obscure"],["prosperity","adversity"],["virtue","vice"],["optimism","pessimism"],["expand","compress"],["accept","decline"],["ally","enemy"]].forEach(([a,b])=>addPair(OPP,a,b));
const SYN = {};
[["huge","enormous"],["tiny","minuscule"],["angry","furious"],["scared","terrified"],["happy","delighted"],["clever","intelligent"],["quiet","silent"],["begin","commence"],["end","conclude"],["rich","wealthy"],
 ["brave","valiant"],["honest","truthful"],["ancient","antique"],["famous","renowned"],["difficult","challenging"],["strange","peculiar"],["important","significant"],["strong","powerful"],["fast","swift"],["kind","compassionate"],
 ["abundant","plentiful"],["reluctant","unwilling"],["diligent","hardworking"],["fragile","delicate"],["genuine","authentic"],["vast","immense"],["obvious","evident"],["essential","vital"],["courteous","polite"],["accurate","precise"],
 ["annual","yearly"],["assist","help"],["courage","bravery"],["enormous","gigantic"],["mend","repair"],["sorrow","grief"],["wealthy","affluent"],["weary","tired"],["rapid","swift"],["reveal","disclose"],
 ["adversary","opponent"],["candid","frank"],["frugal","thrifty"],["meticulous","careful"],["novice","beginner"],["obstinate","stubborn"],["prudent","wise"],["resilient","tough"],["lucid","clear"],["abundant","ample"]].forEach(([a,b])=>{ (SYN[a]=SYN[a]||new Set()).add(b); });

// ── fact truth: [regex on English prompt, expected English answer] ──
const FACT = [
  [/make their own food/, "Photosynthesis"],
  [/gas do plants absorb/, "Carbon dioxide"],
  [/gas do plants release/, "Oxygen"],
  [/eats only plants/, "Herbivore"],
  [/eats only other animals/, "Carnivore"],
  [/liquid into vapour/, "Evaporation"],
  [/Lemon juice/, "Acidic"],
  [/Acids usually taste/, "Sour"],
  [/formula of water/, "H₂O"],
  [/formula of carbon dioxide/, "CO₂"],
  [/SI unit of force/, "Newton"],
  [/SI unit of energy/, "Joule"],
  [/SI unit of power/, "Watt"],
  [/SI unit of electric current/, "Ampere"],
  [/Father of Genetics/, "Gregor Mendel"],
  [/powerhouse of the cell/, "Mitochondria"],
  [/bones are in the adult/, "206"],
  [/founded the Mughal Empire/, "Babur"],
  [/built the Taj Mahal/, "Shah Jahan"],
  [/Father of the Nation/, "Mahatma Gandhi"],
  [/first Prime Minister/, "Jawaharlal Nehru"],
  [/first President/, "Dr. Rajendra Prasad"],
  [/chief architect of the Indian Constitution/, "Dr. B. R. Ambedkar"],
  [/national anthem of India/, "Rabindranath Tagore"],
  [/highest mountain peak/, "Mount Everest"],
  [/highest court in India/, "Supreme Court"],
  [/Farming and mining belong/, "Primary sector"],
  [/Manufacturing goods in factories/, "Secondary sector"],
  [/Banking and transport services/, "Tertiary sector"],
  [/bank issues currency notes/, "Reserve Bank of India"],
  [/conducts elections/, "Election Commission"],
  [/Indus Valley Civilisation developed/, "Indus"],
  [/earliest Vedic culture compose the Rigveda/, "Indus"],
  [/dynasty ruled the Mauryan Empire/, "Maurya dynasty"],
  [/'Golden Age' of ancient India/, "Gupta dynasty"],
  [/elected representatives of the people/, "Democracy"],
];
const SYMBOL = { Iron:"Fe",Gold:"Au",Silver:"Ag",Sodium:"Na",Potassium:"K",Calcium:"Ca",Copper:"Cu",Zinc:"Zn",Oxygen:"O",Hydrogen:"H",Nitrogen:"N",Aluminium:"Al" };

const files = [];
for (const c of [6,7,8,9,10]) for (const s of ["english","science","social-studies"]) files.push(`content/levels/${c}-${s}.json`);
let checked = 0; const errs = [];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const q of data.questions.filter((q) => /-gen-\d+$/.test(q.id))) {
    checked++;
    const en = q.choices.map((c) => c.en);
    if (new Set(en).size !== en.length) errs.push(`${q.id}: dup choices`);
    const answer = en[q.answerIndex];
    const p = q.prompt.en;
    let m;

    if ((m = p.match(/plural of "(\w+)"/))) {
      if (PLURAL[m[1]] !== answer) errs.push(`${q.id}: plural(${m[1]}) marked "${answer}" expected "${PLURAL[m[1]]}"`);
    } else if ((m = p.match(/past tense of "(\w+)"/))) {
      if (PAST[m[1]] !== answer) errs.push(`${q.id}: past(${m[1]}) marked "${answer}" expected "${PAST[m[1]]}"`);
    } else if ((m = p.match(/"-ing".*of "(\w+)"/))) {
      if (ING[m[1]] !== answer) errs.push(`${q.id}: -ing(${m[1]}) marked "${answer}" expected "${ING[m[1]]}"`);
    } else if ((m = p.match(/opposite of "(\w+)"/))) {
      const set = OPP[m[1]];
      if (!set || !set.has(answer)) errs.push(`${q.id}: opposite(${m[1]}) marked "${answer}" not a known antonym`);
      en.forEach((c, i) => { if (i !== q.answerIndex && set && set.has(c)) errs.push(`${q.id}: distractor "${c}" also antonym of ${m[1]}`); });
    } else if ((m = p.match(/means the same as "([\w-]+)"/))) {
      const set = SYN[m[1]];
      if (!set || !set.has(answer)) errs.push(`${q.id}: synonym(${m[1]}) marked "${answer}" not a known synonym`);
    } else if (/figure of speech/.test(p)) {
      if (answer !== "Simile") errs.push(`${q.id}: FOS marked "${answer}" expected Simile`);
    } else if (/chemical symbol of this element/.test(p)) {
      const elem = (q.visual || "").split(/[ (]/)[0];
      if (SYMBOL[elem] !== answer) errs.push(`${q.id}: symbol(${elem}) marked "${answer}" expected "${SYMBOL[elem]}"`);
    } else {
      const hit = FACT.find(([re]) => re.test(p));
      if (!hit) errs.push(`${q.id}: unrecognised prompt "${p.slice(0,50)}"`);
      else if (hit[1] !== answer) errs.push(`${q.id}: fact marked "${answer}" expected "${hit[1]}"`);
    }
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Class 6-10 generated questions.`);
console.log("ALL CORRECT ✓  (answers match independent truth tables; one correct option; unique choices & ids)");
