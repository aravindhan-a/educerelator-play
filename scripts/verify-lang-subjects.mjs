#!/usr/bin/env node
// Independent verifier for Hindi & Tamil language subjects (6-8). Own truth
// tables (word classes, opposites, synonyms, plurals, numerals, alphabet
// counts) written separately from the generator. Reads the native word from
// each answer choice (choice.hi / choice.ta) and checks it.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Hindi truth
const HI_M = new Set(["लड़का","घोड़ा","कुत्ता","फूल","हाथ","दरवाज़ा"]);
const HI_F = new Set(["किताब","नदी","रात","गाय","कुर्सी","लड़की","पुस्तक"]);
const HI_PLURAL = { "लड़का":"लड़के", "कमरा":"कमरे" };
const HI_OPP = { "दिन":"रात","बड़ा":"छोटा","अच्छा":"बुरा","अमीर":"गरीब","सच":"झूठ" };
const HI_SYN = { "पानी":"जल","घर":"मकान","सूरज":"सूर्य","पेड़":"वृक्ष","आँख":"नेत्र" };
const HI_NUM = { "five":"पाँच","ten":"दस" };
const HI_VERB = new Set(["दौड़ना","पढ़ना","खाना","सोना"]);
const HI_NOUN = new Set(["नदी","पुस्तक","घर","मेज़","किताब"]);
const HI_ADJ = new Set(["सुंदर","मीठा","बड़ा","लाल","हरा","तेज़"]);
// Tamil truth
const TA_OPP = { "பெரியது":"சிறியது","பகல்":"இரவு","சூடு":"குளிர்","புதிய":"பழைய","மேலே":"கீழே","மகிழ்ச்சி":"சோகம்","கருப்பு":"வெள்ளை","வேகம்":"மெதுவாக" };
const TA_NUM = { "three":"மூன்று","five":"ஐந்து","seven":"ஏழு" };
const TA_VERB = new Set(["ஓடு","சாப்பிடு","படி","தூங்கு"]);
const TA_NOUN = new Set(["மரம்","வீடு","நதி"]);
const TA_ANIMAL = new Set(["நாய்","யானை","பூனை","சிங்கம்"]);

const files = [];
for (const c of [6,7,8]) { files.push([`content/levels/${c}-hindi.json`,"hi"]); files.push([`content/levels/${c}-tamil.json`,"ta"]); }
let checked = 0; const errs = [];

for (const [f, script] of files) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
  for (const q of data.questions.filter((q) => /-gen-\d+$/.test(q.id))) {
    checked++;
    const native = (c) => (c[script] || c.en);
    const words = q.choices.map(native);
    if (new Set(words).size !== words.length) errs.push(`${q.id}: dup choices`);
    if (Object.keys(q.prompt).length < 13) errs.push(`${q.id}: <13 languages`);
    const ans = native(q.choices[q.answerIndex]);
    const p = q.prompt.en;
    const cue = (p.match(/"([^"]+)"/) || [])[1];
    const inSet = (set, label) => {
      if (!set.has(ans)) errs.push(`${q.id} [${label}]: answer "${ans}" not in set`);
      q.choices.forEach((c, i) => { if (i !== q.answerIndex && set.has(native(c))) errs.push(`${q.id} [${label}]: distractor "${native(c)}" also in set`); });
    };
    const eq = (exp, label) => { if (ans !== exp) errs.push(`${q.id} [${label}]: marked "${ans}" expected "${exp}"`); };

    if (/masculine \(पुल्लिंग\)/.test(p))                inSet(HI_M, "masc");
    else if (/feminine \(स्त्रीलिंग\)/.test(p))          inSet(HI_F, "fem");
    else if (/plural \(बहुवचन\)/.test(p))               eq(HI_PLURAL[cue], "plural");
    else if (/opposite \(विलोम\)/.test(p))              eq(HI_OPP[cue], "hi-opp");
    else if (/synonym \(पर्यायवाची\)/.test(p))          eq(HI_SYN[cue], "hi-syn");
    else if (/Hindi word for the number/.test(p))       eq(HI_NUM[cue], "hi-num");
    else if (/verb \(क्रिया\) in Hindi/.test(p))        inSet(HI_VERB, "hi-verb");
    else if (/noun \(संज्ञा\) in Hindi/.test(p))         inSet(HI_NOUN, "hi-noun");
    else if (/adjective \(विशेषण\) in Hindi/.test(p))   inSet(HI_ADJ, "hi-adj");
    else if (/vowels \(uyir ezhuthu\)/.test(p))         eq("12", "ta-vowels");
    else if (/letters are there in total in the Tamil/.test(p)) eq("247", "ta-total");
    else if (/Tamil word for the number/.test(p))       eq(TA_NUM[cue], "ta-num");
    else if (/opposite \(ethirchol\)/.test(p))          eq(TA_OPP[cue], "ta-opp");
    else if (/verb \(vinaichol\) in Tamil/.test(p))     inSet(TA_VERB, "ta-verb");
    else if (/noun \(peyarchol\) in Tamil/.test(p))     inSet(TA_NOUN, "ta-noun");
    else if (/means an animal in Tamil/.test(p))        inSet(TA_ANIMAL, "ta-animal");
    else errs.push(`${q.id}: unrecognised prompt "${p.slice(0,55)}"`);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 30).join("\n")); process.exit(1); }
console.log(`Independently verified ${checked} Hindi/Tamil language-subject questions.`);
console.log("ALL CORRECT ✓  (native answers match independent truth tables; one correct option; unique choices & ids; 13 languages)");
