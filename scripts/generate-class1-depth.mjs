#!/usr/bin/env node
// Class 1 depth pack: brings Class 1 English and EVS close to the depth of
// Class 1 Maths, following the NCERT foundational-stage goals (letters and
// sounds, early words; my body, animals, food, cleanliness, transport).
//
// Design rules
// • ENGLISH: the skill is English, so every answer option is the same English
//   text in all 13 UI languages; only the instruction is translated.
// • EVS: options are translated and carry a small picture, so pre-readers can
//   play by looking. Translations reuse the curated VOCAB where it exists.
// • Instructions are whole sentences translated per language (no gluing
//   words together), so grammar holds in every language.
// • Deterministic (seeded RNG) and idempotent: re-running rewrites the same
//   "-depth-level" blocks and the same curated fixes, never duplicating.
// • Answers are checked independently by scripts/verify-class1-depth.mjs,
//   which uses its own truth tables.
//
// Usage: node scripts/generate-class1-depth.mjs [--dry]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VOCAB, LANGS, trObj, enOnly, P_MATCH_EN } from "./generate-primary-prose.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry");

// ── Deterministic helpers ────────────────────────────────────────────────────
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(20261123);
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const takeDistinct = (pool, n, avoid = []) => shuffle(pool.filter((x) => !avoid.includes(x))).slice(0, n);
let slotCounter = 0;
// Place the answer at a rotating position (0,1,2) so it is never predictable.
function place(answer, distractors) {
  const slot = slotCounter++ % 3;
  const out = [...distractors];
  out.splice(slot, 0, answer);
  return { options: out, answerIndex: slot };
}

// ── English instructions (13 languages) ──────────────────────────────────────
const E = {
  letter: { en:"Which English letter is this?", hi:"यह अंग्रेज़ी का कौन सा अक्षर है?", ta:"இது எந்த ஆங்கில எழுத்து?", te:"ఇది ఏ ఆంగ్ల అక్షరం?", bn:"এটি ইংরেজির কোন অক্ষর?", mr:"हे इंग्रजीतील कोणते अक्षर आहे?", gu:"આ અંગ્રેજીનો કયો અક્ષર છે?", kn:"ಇದು ಯಾವ ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರ?", ml:"ഇത് ഏത് ഇംഗ്ലീഷ് അക്ഷരമാണ്?", pa:"ਇਹ ਅੰਗਰੇਜ਼ੀ ਦਾ ਕਿਹੜਾ ਅੱਖਰ ਹੈ?", ur:"یہ انگریزی کا کون سا حرف ہے؟", or:"ଏହା ଇଂରାଜୀର କେଉଁ ଅକ୍ଷର?", ne:"यो अङ्ग्रेजीको कुन अक्षर हो?" },
  capital: { en:"Which capital letter goes with this small letter?", hi:"इस छोटे अक्षर का बड़ा अक्षर कौन सा है?", ta:"இந்தச் சிறிய எழுத்துக்கான பெரிய எழுத்து எது?", te:"ఈ చిన్న అక్షరానికి పెద్ద అక్షరం ఏది?", bn:"এই ছোট হাতের অক্ষরের বড় হাতের অক্ষর কোনটি?", mr:"या लहान अक्षराचे मोठे अक्षर कोणते?", gu:"આ નાના અક્ષરનો મોટો અક્ષર કયો છે?", kn:"ಈ ಸಣ್ಣ ಅಕ್ಷರದ ದೊಡ್ಡ ಅಕ್ಷರ ಯಾವುದು?", ml:"ഈ ചെറിയ അക്ഷരത്തിന്റെ വലിയ അക്ഷരം ഏതാണ്?", pa:"ਇਸ ਛੋਟੇ ਅੱਖਰ ਦਾ ਵੱਡਾ ਅੱਖਰ ਕਿਹੜਾ ਹੈ?", ur:"اس چھوٹے حرف کا بڑا حرف کون سا ہے؟", or:"ଏହି ଛୋଟ ଅକ୍ଷରର ବଡ଼ ଅକ୍ଷର କେଉଁଟି?", ne:"यो सानो अक्षरको ठूलो अक्षर कुन हो?" },
  small: { en:"Which small letter goes with this capital letter?", hi:"इस बड़े अक्षर का छोटा अक्षर कौन सा है?", ta:"இந்தப் பெரிய எழுத்துக்கான சிறிய எழுத்து எது?", te:"ఈ పెద్ద అక్షరానికి చిన్న అక్షరం ఏది?", bn:"এই বড় হাতের অক্ষরের ছোট হাতের অক্ষর কোনটি?", mr:"या मोठ्या अक्षराचे लहान अक्षर कोणते?", gu:"આ મોટા અક્ષરનો નાનો અક્ષર કયો છે?", kn:"ಈ ದೊಡ್ಡ ಅಕ್ಷರದ ಸಣ್ಣ ಅಕ್ಷರ ಯಾವುದು?", ml:"ഈ വലിയ അക്ഷരത്തിന്റെ ചെറിയ അക്ഷരം ഏതാണ്?", pa:"ਇਸ ਵੱਡੇ ਅੱਖਰ ਦਾ ਛੋਟਾ ਅੱਖਰ ਕਿਹੜਾ ਹੈ?", ur:"اس بڑے حرف کا چھوٹا حرف کون سا ہے؟", or:"ଏହି ବଡ଼ ଅକ୍ଷରର ଛୋଟ ଅକ୍ଷର କେଉଁଟି?", ne:"यो ठूलो अक्षरको सानो अक्षर कुन हो?" },
  first: { en:"The English word for this picture starts with which letter?", hi:"इस चित्र का अंग्रेज़ी शब्द किस अक्षर से शुरू होता है?", ta:"இந்தப் படத்தின் ஆங்கிலச் சொல் எந்த எழுத்தில் தொடங்குகிறது?", te:"ఈ చిత్రం యొక్క ఆంగ్ల పదం ఏ అక్షరంతో మొదలవుతుంది?", bn:"এই ছবির ইংরেজি শব্দটি কোন অক্ষর দিয়ে শুরু হয়?", mr:"या चित्राचा इंग्रजी शब्द कोणत्या अक्षराने सुरू होतो?", gu:"આ ચિત્રનો અંગ્રેજી શબ્દ કયા અક્ષરથી શરૂ થાય છે?", kn:"ಈ ಚಿತ್ರದ ಇಂಗ್ಲಿಷ್ ಪದ ಯಾವ ಅಕ್ಷರದಿಂದ ಆರಂಭವಾಗುತ್ತದೆ?", ml:"ഈ ചിത്രത്തിന്റെ ഇംഗ്ലീഷ് വാക്ക് ഏത് അക്ഷരത്തിൽ തുടങ്ങുന്നു?", pa:"ਇਸ ਤਸਵੀਰ ਦਾ ਅੰਗਰੇਜ਼ੀ ਸ਼ਬਦ ਕਿਸ ਅੱਖਰ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?", ur:"اس تصویر کا انگریزی لفظ کس حرف سے شروع ہوتا ہے؟", or:"ଏହି ଚିତ୍ରର ଇଂରାଜୀ ଶବ୍ଦ କେଉଁ ଅକ୍ଷରରେ ଆରମ୍ଭ ହୁଏ?", ne:"यो चित्रको अङ्ग्रेजी शब्द कुन अक्षरबाट सुरु हुन्छ?" },
  missing: { en:"Which letter is missing?", hi:"कौन सा अक्षर छूट गया है?", ta:"விடுபட்ட எழுத்து எது?", te:"తప్పిపోయిన అక్షరం ఏది?", bn:"কোন অক্ষরটি বাদ পড়েছে?", mr:"कोणते अक्षर गाळले आहे?", gu:"કયો અક્ષર ખૂટે છે?", kn:"ಬಿಟ್ಟುಹೋದ ಅಕ್ಷರ ಯಾವುದು?", ml:"വിട്ടുപോയ അക്ഷരം ഏതാണ്?", pa:"ਕਿਹੜਾ ਅੱਖਰ ਛੁੱਟ ਗਿਆ ਹੈ?", ur:"کون سا حرف چھوٹ گیا ہے؟", or:"କେଉଁ ଅକ୍ଷର ଛାଡ଼ି ଯାଇଛି?", ne:"कुन अक्षर छुटेको छ?" },
  rhyme: { en:"Which word ends with the same sound as this word?", hi:"कौन सा शब्द इस शब्द जैसी ही ध्वनि पर खत्म होता है?", ta:"இந்தச் சொல்லின் அதே ஓசையில் முடியும் சொல் எது?", te:"ఈ పదం లాగే అదే శబ్దంతో ముగిసే పదం ఏది?", bn:"কোন শব্দটি এই শব্দের মতো একই ধ্বনিতে শেষ হয়?", mr:"कोणता शब्द या शब्दासारख्याच आवाजाने संपतो?", gu:"કયો શબ્દ આ શબ્દ જેવા જ અવાજથી પૂરો થાય છે?", kn:"ಈ ಪದದಂತೆಯೇ ಒಂದೇ ಧ್ವನಿಯಲ್ಲಿ ಕೊನೆಗೊಳ್ಳುವ ಪದ ಯಾವುದು?", ml:"ഈ വാക്കിന്റെ അതേ ശബ്ദത്തിൽ അവസാനിക്കുന്ന വാക്ക് ഏതാണ്?", pa:"ਕਿਹੜਾ ਸ਼ਬਦ ਇਸ ਸ਼ਬਦ ਵਰਗੀ ਹੀ ਆਵਾਜ਼ ਨਾਲ ਖ਼ਤਮ ਹੁੰਦਾ ਹੈ?", ur:"کون سا لفظ اس لفظ جیسی آواز پر ختم ہوتا ہے؟", or:"କେଉଁ ଶବ୍ଦ ଏହି ଶବ୍ଦ ପରି ସମାନ ଧ୍ୱନିରେ ଶେଷ ହୁଏ?", ne:"कुन शब्द यो शब्दजस्तै आवाजमा टुङ्गिन्छ?" },
  sameStart: { en:"Which word starts with the same sound as this word?", hi:"कौन सा शब्द इस शब्द जैसी ही ध्वनि से शुरू होता है?", ta:"இந்தச் சொல்லின் அதே ஒலியில் தொடங்கும் சொல் எது?", te:"ఈ పదం లాగే అదే శబ్దంతో మొదలయ్యే పదం ఏది?", bn:"কোন শব্দটি এই শব্দের মতো একই ধ্বনি দিয়ে শুরু হয়?", mr:"कोणता शब्द या शब्दासारख्याच आवाजाने सुरू होतो?", gu:"કયો શબ્દ આ શબ્દ જેવા જ અવાજથી શરૂ થાય છે?", kn:"ಈ ಪದದಂತೆಯೇ ಒಂದೇ ಧ್ವನಿಯಿಂದ ಆರಂಭವಾಗುವ ಪದ ಯಾವುದು?", ml:"ഈ വാക്കിന്റെ അതേ ശബ്ദത്തിൽ തുടങ്ങുന്ന വാക്ക് ഏതാണ്?", pa:"ਕਿਹੜਾ ਸ਼ਬਦ ਇਸ ਸ਼ਬਦ ਵਰਗੀ ਹੀ ਆਵਾਜ਼ ਨਾਲ ਸ਼ੁਰੂ ਹੁੰਦਾ ਹੈ?", ur:"کون سا لفظ اس لفظ جیسی آواز سے شروع ہوتا ہے؟", or:"କେଉଁ ଶବ୍ଦ ଏହି ଶବ୍ଦ ପରି ସମାନ ଧ୍ୱନିରେ ଆରମ୍ଭ ହୁଏ?", ne:"कुन शब्द यो शब्दजस्तै आवाजबाट सुरु हुन्छ?" },
  next: { en:"Which letter comes next?", hi:"आगे कौन सा अक्षर आता है?", ta:"அடுத்து வரும் எழுத்து எது?", te:"తర్వాత వచ్చే అక్షరం ఏది?", bn:"এরপর কোন অক্ষর আসে?", mr:"पुढे कोणते अक्षर येते?", gu:"પછી કયો અક્ષર આવે છે?", kn:"ಮುಂದೆ ಬರುವ ಅಕ್ಷರ ಯಾವುದು?", ml:"അടുത്തതായി വരുന്ന അക്ഷരം ഏതാണ്?", pa:"ਅੱਗੇ ਕਿਹੜਾ ਅੱਖਰ ਆਉਂਦਾ ਹੈ?", ur:"اس کے بعد کون سا حرف آتا ہے؟", or:"ପରେ କେଉଁ ଅକ୍ଷର ଆସେ?", ne:"त्यसपछि कुन अक्षर आउँछ?" },
  opposite: { en:"What is the opposite of this word?", hi:"इस शब्द का उल्टा क्या है?", ta:"இந்தச் சொல்லின் எதிர்ச்சொல் எது?", te:"ఈ పదానికి వ్యతిరేక పదం ఏది?", bn:"এই শব্দের বিপরীত শব্দ কোনটি?", mr:"या शब्दाचा विरुद्धार्थी शब्द कोणता?", gu:"આ શબ્દનો વિરોધી શબ્દ કયો છે?", kn:"ಈ ಪದದ ವಿರುದ್ಧ ಪದ ಯಾವುದು?", ml:"ഈ വാക്കിന്റെ വിപരീതപദം ഏതാണ്?", pa:"ਇਸ ਸ਼ਬਦ ਦਾ ਉਲਟ ਸ਼ਬਦ ਕਿਹੜਾ ਹੈ?", ur:"اس لفظ کا الٹ کیا ہے؟", or:"ଏହି ଶବ୍ଦର ବିପରୀତ ଶବ୍ଦ କେଉଁଟି?", ne:"यो शब्दको उल्टो शब्द कुन हो?" },
};

// ── English content tables ───────────────────────────────────────────────────
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
// Letters children commonly confuse, preferred as distractors.
const LOOKALIKE = { B:"DPR", C:"GOQ", D:"BOP", E:"FB", F:"EP", G:"CO", H:"NK", I:"LT", J:"IL", K:"XH", L:"IT", M:"NW", N:"MH", O:"QCD", P:"BRF", Q:"OG", R:"PB", S:"Z", T:"IL", U:"VN", V:"UY", W:"MV", X:"KY", Y:"VX", Z:"SN", A:"HV" };
const LOOKALIKE_LOWER = { a:"oe", b:"dp", c:"oe", d:"bq", e:"ca", f:"tl", g:"qy", h:"nb", i:"jl", j:"ig", k:"hx", l:"it", m:"nw", n:"mh", o:"ca", p:"qb", q:"pg", r:"nv", s:"zc", t:"fl", u:"vn", v:"uy", w:"mv", x:"kz", y:"vg", z:"sx" };

// Picture → English word, plus letters a child could fairly answer from a
// different but correct name (e.g. 🐶 "puppy"), never used as distractors.
const FIRST = [
  ["🍎","Apple",""], ["⚽","Ball","F"], ["🐱","Cat","K"], ["🐶","Dog","P"], ["🥚","Egg",""],
  ["🐟","Fish",""], ["🐐","Goat",""], ["🎩","Hat","C"], ["🍦","Ice cream","C"], ["🧃","Juice","D"],
  ["🪁","Kite",""], ["🦁","Lion",""], ["🌙","Moon",""], ["👃","Nose",""], ["🍊","Orange","F"],
  ["🐇","Rabbit","B"], ["☀️","Sun",""], ["🌳","Tree",""], ["☂️","Umbrella",""], ["🦓","Zebra",""],
  ["⌚","Watch","C"], ["🚌","Bus",""], ["🥭","Mango","F"], ["🍌","Banana","F"], ["✋","Hand",""],
  ["🐦","Bird",""], ["🐴","Horse",""], ["📖","Book",""],
];
// Three-letter words with one missing vowel.
const MISSING = [
  ["🐱","cat",1], ["🐶","dog",1], ["☀️","sun",1], ["🚌","bus",1], ["🎩","hat",1], ["🖊️","pen",1],
  ["🛏️","bed",1], ["📦","box",1], ["🦊","fox",1], ["🐷","pig",1], ["🦇","bat",1], ["🕸️","web",1],
  ["🐀","rat",1], ["🚐","van",1], ["🧢","cap",1], ["🔟","ten",1], ["🐜","ant",0], ["🗺️","map",1],
];
const VOWELS = "aeiou".split("");
// Rhymes: [word, emoji, answer, distractors].
const RHYMES = [
  ["cat","🐱","hat",["dog","sun"]], ["sun","☀️","run",["cat","bed"]], ["dog","🐶","log",["cup","hen"]],
  ["bee","🐝","tree",["cat","box"]], ["car","🚗","star",["pen","dog"]], ["ten","🔟","hen",["cat","sun"]],
  ["bed","🛏️","red",["pig","box"]], ["cake","🎂","snake",["dog","sun"]], ["mouse","🐭","house",["cat","tree"]],
  ["goat","🐐","boat",["bed","pig"]], ["bug","🐛","rug",["hat","ten"]], ["fish","🐟","dish",["cat","sun"]],
  ["pig","🐷","wig",["bed","car"]], ["fan","🪭","van",["dog","bee"]], ["king","🤴","ring",["sun","cake"]],
  ["moon","🌙","spoon",["hat","box"]], ["bear","🐻","pear",["dog","ten"]], ["fox","🦊","box",["cat","bee"]],
  ["ball","⚽","wall",["pen","fish"]], ["hat","🎩","bat",["sun","cake"]],
];
// Same starting sound: [word, emoji, answer, distractors] (hard consonants only).
const SAME_START = [
  ["Cat","🐱","Car",["Dog","Sun"]], ["Ball","⚽","Bus",["Cat","Sun"]], ["Dog","🐶","Duck",["Cat","Sun"]],
  ["Sun","☀️","Star",["Moon","Cat"]], ["Moon","🌙","Mango",["Sun","Dog"]], ["Fish","🐟","Fan",["Dog","Cat"]],
  ["Hat","🎩","Hen",["Cat","Sun"]], ["Pen","🖊️","Pig",["Dog","Sun"]], ["Tree","🌳","Ten",["Cat","Moon"]],
  ["Goat","🐐","Girl",["Ball","Moon"]],
];
const OPPOSITES = [
  ["big","small"], ["hot","cold"], ["up","down"], ["in","out"], ["day","night"], ["happy","sad"],
  ["fast","slow"], ["open","close"], ["tall","short"], ["wet","dry"], ["full","empty"], ["old","new"],
  ["good","bad"], ["yes","no"], ["push","pull"], ["come","go"], ["top","bottom"], ["black","white"],
];

function englishQuestions() {
  const qs = [];
  let n = 1;
  const id = () => `1-eng-dp-${String(n++).padStart(3, "0")}`;
  const q = (type, prompt, visual, answer, distractors) => {
    const { options, answerIndex } = place(answer, distractors);
    qs.push({ id: id(), type, prompt, visual, choices: options.map(enOnly), answerIndex });
  };
  // 1. Small → capital letter (showing a letter and asking for the same
  //    glyph would only test shape-matching), lookalike capitals first.
  for (const L of ABC) {
    const look = (LOOKALIKE[L] || "").split("").filter((x) => x !== L);
    const d = [...look, ...takeDistinct(ABC, 4, [L, ...look])].slice(0, 2);
    q("match", E.capital, L.toLowerCase(), L, d);
  }
  // 2. Capital → small letter.
  for (const L of ABC) {
    const l = L.toLowerCase();
    const look = (LOOKALIKE_LOWER[l] || "").split("").filter((x) => x !== l);
    const d = [...look, ...takeDistinct(ABC.map((x) => x.toLowerCase()), 4, [l, ...look])].slice(0, 2);
    q("match", E.small, L, l, d);
  }
  // 3. First letter of the picture's English word.
  for (const [emoji, word, alts] of FIRST) {
    const ans = word[0];
    const d = takeDistinct(ABC, 2, [ans, ...alts.split("")]);
    q("match-sound", E.first, emoji, ans, d);
  }
  // 4. Missing letter in a three-letter word (shown with its picture).
  for (const [emoji, word, gap] of MISSING) {
    const ans = word[gap];
    const shown = word.split("").map((c, i) => (i === gap ? "_" : c)).join(" ");
    const d = takeDistinct(VOWELS, 2, [ans]);
    q("missing", E.missing, `${emoji}  ${shown}`, ans, d);
  }
  // 5. Rhymes.
  for (const [word, emoji, ans, d] of RHYMES) q("rhyme", E.rhyme, `${emoji}  ${word}`, ans, d);
  // 6. Same starting sound.
  for (const [word, emoji, ans, d] of SAME_START) q("match-sound", E.sameStart, `${emoji}  ${word}`, ans, d);
  // 7. Alphabet order: three letters in a row, which comes next?
  for (let s = 0; s + 3 < ABC.length; s += 1) {
    if (s % 1 !== 0) continue;
    const seq = ABC.slice(s, s + 3), ans = ABC[s + 3];
    const d = takeDistinct(ABC, 2, [ans, ...seq]);
    q("sequence", E.next, `${seq.join(" ")} _`, ans, d);
  }
  // 8. Opposites (both directions).
  const words = OPPOSITES.flat();
  for (const [a, b] of OPPOSITES) {
    for (const [w, ans] of [[a, b], [b, a]]) {
      if (R() < 0.5) continue; // keep one direction most of the time, at random
      const d = takeDistinct(words, 2, [w, ans]);
      q("opposite", E.opposite, w, ans, d);
    }
  }
  return qs;
}

// ── EVS: extra vocabulary (13 languages) ─────────────────────────────────────
const NV = (en, emoji, tr) => ({ en, emoji, tr });
const NEW_VOCAB = [
  NV("Water","💧",{ hi:"पानी", ta:"தண்ணீர்", te:"నీరు", bn:"জল", mr:"पाणी", gu:"પાણી", kn:"ನೀರು", ml:"വെള്ളം", pa:"ਪਾਣੀ", ur:"پانی", or:"ପାଣି", ne:"पानी" }),
  NV("Milk","🥛",{ hi:"दूध", ta:"பால்", te:"పాలు", bn:"দুধ", mr:"दूध", gu:"દૂધ", kn:"ಹಾಲು", ml:"പാൽ", pa:"ਦੁੱਧ", ur:"دودھ", or:"କ୍ଷୀର", ne:"दूध" }),
  NV("Toothbrush","🪥",{ hi:"टूथब्रश", ta:"பல் துலக்கி", te:"టూత్‌బ్రష్", bn:"টুথব্রাশ", mr:"टूथब्रश", gu:"ટૂથબ્રશ", kn:"ಹಲ್ಲುಜ್ಜುವ ಬ್ರಷ್", ml:"ടൂത്ത് ബ്രഷ്", pa:"ਟੁੱਥਬਰੱਸ਼", ur:"ٹوتھ برش", or:"ଟୁଥବ୍ରଶ୍", ne:"टुथब्रस" }),
  NV("Soap","🧼",{ hi:"साबुन", ta:"சோப்பு", te:"సబ్బు", bn:"সাবান", mr:"साबण", gu:"સાબુ", kn:"ಸಾಬೂನು", ml:"സോപ്പ്", pa:"ਸਾਬਣ", ur:"صابن", or:"ସାବୁନ", ne:"साबुन" }),
  NV("Umbrella","☂️",{ hi:"छाता", ta:"குடை", te:"గొడుగు", bn:"ছাতা", mr:"छत्री", gu:"છત્રી", kn:"ಛತ್ರಿ", ml:"കുട", pa:"ਛਤਰੀ", ur:"چھتری", or:"ଛତା", ne:"छाता" }),
  NV("Bed","🛏️",{ hi:"बिस्तर", ta:"படுக்கை", te:"మంచం", bn:"বিছানা", mr:"पलंग", gu:"પલંગ", kn:"ಹಾಸಿಗೆ", ml:"കിടക്ക", pa:"ਬਿਸਤਰਾ", ur:"بستر", or:"ଖଟ", ne:"ओछ्यान" }),
  NV("Spoon","🥄",{ hi:"चम्मच", ta:"கரண்டி", te:"చెంచా", bn:"চামচ", mr:"चमचा", gu:"ચમચી", kn:"ಚಮಚ", ml:"സ്പൂൺ", pa:"ਚਮਚਾ", ur:"چمچ", or:"ଚାମଚ", ne:"चम्चा" }),
  NV("Shirt","👕",{ hi:"कमीज़", ta:"சட்டை", te:"చొక్కా", bn:"জামা", mr:"शर्ट", gu:"શર્ટ", kn:"ಅಂಗಿ", ml:"ഷർട്ട്", pa:"ਕਮੀਜ਼", ur:"قمیص", or:"ସାର୍ଟ", ne:"कमिज" }),
  NV("Shoe","👟",{ hi:"जूता", ta:"காலணி", te:"బూటు", bn:"জুতো", mr:"बूट", gu:"જૂતું", kn:"ಶೂ", ml:"ഷൂ", pa:"ਜੁੱਤੀ", ur:"جوتا", or:"ଜୋତା", ne:"जुत्ता" }),
  NV("Hen","🐔",{ hi:"मुर्गी", ta:"கோழி", te:"కోడి", bn:"মুরগি", mr:"कोंबडी", gu:"મરઘી", kn:"ಕೋಳಿ", ml:"കോഴി", pa:"ਮੁਰਗੀ", ur:"مرغی", or:"କୁକୁଡ଼ା", ne:"कुखुरा" }),
  NV("Duck","🦆",{ hi:"बत्तख", ta:"வாத்து", te:"బాతు", bn:"হাঁস", mr:"बदक", gu:"બતક", kn:"ಬಾತುಕೋಳಿ", ml:"താറാവ്", pa:"ਬੱਤਖ਼", ur:"بطخ", or:"ହଂସ", ne:"हाँस" }),
  NV("Butterfly","🦋",{ hi:"तितली", ta:"பட்டாம்பூச்சி", te:"సీతాకోకచిలుక", bn:"প্রজাপতি", mr:"फुलपाखरू", gu:"પતંગિયું", kn:"ಚಿಟ್ಟೆ", ml:"പൂമ്പാറ്റ", pa:"ਤਿਤਲੀ", ur:"تتلی", or:"ପ୍ରଜାପତି", ne:"पुतली" }),
  NV("Bee","🐝",{ hi:"मधुमक्खी", ta:"தேனீ", te:"తేనెటీగ", bn:"মৌমাছি", mr:"मधमाशी", gu:"મધમાખી", kn:"ಜೇನುನೊಣ", ml:"തേനീച്ച", pa:"ਮਧੂ-ਮੱਖੀ", ur:"شہد کی مکھی", or:"ମହୁମାଛି", ne:"मौरी" }),
  NV("Ant","🐜",{ hi:"चींटी", ta:"எறும்பு", te:"చీమ", bn:"পিঁপড়ে", mr:"मुंगी", gu:"કીડી", kn:"ಇರುವೆ", ml:"ഉറുമ്പ്", pa:"ਕੀੜੀ", ur:"چیونٹی", or:"ପିମ୍ପୁଡ଼ି", ne:"कमिला" }),
  NV("Spider","🕷️",{ hi:"मकड़ी", ta:"சிலந்தி", te:"సాలీడు", bn:"মাকড়সা", mr:"कोळी", gu:"કરોળિયો", kn:"ಜೇಡ", ml:"ചിലന്തി", pa:"ਮੱਕੜੀ", ur:"مکڑی", or:"ବୁଢ଼ିଆଣୀ", ne:"माकुरो" }),
  NV("Crab","🦀",{ hi:"केकड़ा", ta:"நண்டு", te:"పీత", bn:"কাঁকড়া", mr:"खेकडा", gu:"કરચલો", kn:"ಏಡಿ", ml:"ഞണ്ട്", pa:"ਕੇਕੜਾ", ur:"کیکڑا", or:"କଙ୍କଡ଼ା", ne:"गंगटा" }),
  NV("Whale","🐳",{ hi:"व्हेल", ta:"திமிங்கலம்", te:"తిమింగలం", bn:"তিমি", mr:"देवमासा", gu:"વ્હેલ", kn:"ತಿಮಿಂಗಿಲ", ml:"തിമിംഗലം", pa:"ਵ੍ਹੇਲ", ur:"وہیل", or:"ତିମି", ne:"ह्वेल" }),
  NV("Tiger","🐅",{ hi:"बाघ", ta:"புலி", te:"పులి", bn:"বাঘ", mr:"वाघ", gu:"વાઘ", kn:"ಹುಲಿ", ml:"കടുവ", pa:"ਬਾਘ", ur:"باگھ", or:"ବାଘ", ne:"बाघ" }),
  NV("Snake","🐍",{ hi:"साँप", ta:"பாம்பு", te:"పాము", bn:"সাপ", mr:"साप", gu:"સાપ", kn:"ಹಾವು", ml:"പാമ്പ്", pa:"ਸੱਪ", ur:"سانپ", or:"ସାପ", ne:"सर्प" }),
  NV("Carrot","🥕",{ hi:"गाजर", ta:"கேரட்", te:"క్యారెట్", bn:"গাজর", mr:"गाजर", gu:"ગાજર", kn:"ಕ್ಯಾರೆಟ್", ml:"കാരറ്റ്", pa:"ਗਾਜਰ", ur:"گاجر", or:"ଗାଜର", ne:"गाजर" }),
  NV("Rice","🍚",{ hi:"चावल", ta:"சோறு", te:"అన్నం", bn:"ভাত", mr:"भात", gu:"ભાત", kn:"ಅನ್ನ", ml:"ചോറ്", pa:"ਚੌਲ", ur:"چاول", or:"ଭାତ", ne:"भात" }),
  NV("Bread","🍞",{ hi:"ब्रेड", ta:"ரொட்டி", te:"బ్రెడ్", bn:"পাউরুটি", mr:"पाव", gu:"બ્રેડ", kn:"ಬ್ರೆಡ್", ml:"റൊട്ടി", pa:"ਬ੍ਰੈੱਡ", ur:"ڈبل روٹی", or:"ପାଉଁରୁଟି", ne:"पाउरोटी" }),
  NV("Cycle","🚲",{ hi:"साइकिल", ta:"மிதிவண்டி", te:"సైకిల్", bn:"সাইকেল", mr:"सायकल", gu:"સાયકલ", kn:"ಸೈಕಲ್", ml:"സൈക്കിൾ", pa:"ਸਾਈਕਲ", ur:"سائیکل", or:"ସାଇକେଲ", ne:"साइकल" }),
  NV("Ship","🚢",{ hi:"जहाज़", ta:"கப்பல்", te:"ఓడ", bn:"জাহাজ", mr:"जहाज", gu:"જહાજ", kn:"ಹಡಗು", ml:"കപ്പൽ", pa:"ਜਹਾਜ਼", ur:"بحری جہاز", or:"ଜାହାଜ", ne:"पानीजहाज" }),
  NV("Chair","🪑",{ hi:"कुर्सी", ta:"நாற்காலி", te:"కుర్చీ", bn:"চেয়ার", mr:"खुर्ची", gu:"ખુરશી", kn:"ಕುರ್ಚಿ", ml:"കസേര", pa:"ਕੁਰਸੀ", ur:"کرسی", or:"ଚୌକି", ne:"कुर्सी" }),
  NV("Bulb","💡",{ hi:"बल्ब", ta:"மின்விளக்கு", te:"బల్బు", bn:"বাল্ব", mr:"बल्ब", gu:"બલ્બ", kn:"ಬಲ್ಬ್", ml:"ബൾബ്", pa:"ਬੱਲਬ", ur:"بلب", or:"ବଲ୍ବ", ne:"बल्ब" }),
  NV("Leg","🦵",{ hi:"पैर", ta:"கால்", te:"కాలు", bn:"পা", mr:"पाय", gu:"પગ", kn:"ಕಾಲು", ml:"കാൽ", pa:"ਲੱਤ", ur:"ٹانگ", or:"ଗୋଡ଼", ne:"खुट्टा" }),
  NV("Tongue","👅",{ hi:"जीभ", ta:"நாக்கு", te:"నాలుక", bn:"জিভ", mr:"जीभ", gu:"જીભ", kn:"ನಾಲಿಗೆ", ml:"നാവ്", pa:"ਜੀਭ", ur:"زبان", or:"ଜିଭ", ne:"जिब्रो" }),
];
const WORDS = new Map([...VOCAB, ...NEW_VOCAB].map((w) => [w.en, w]));
const W = (en) => { const w = WORDS.get(en); if (!w) throw new Error(`no vocab: ${en}`); return w; };
// EVS option label: picture + word, translated.
const pictureLabel = (en) => { const w = W(en); const o = trObj(w); for (const k of Object.keys(o)) o[k] = `${w.emoji} ${o[k]}`; return o; };

// ── EVS instructions (whole sentences, 13 languages) ────────────────────────
const S = (en, hi, ta, te, bn, mr, gu, kn, ml, pa, ur, or, ne) => ({ en, hi, ta, te, bn, mr, gu, kn, ml, pa, ur, or, ne });
const PREDICATES = [
  { key:"fly", yes:["Bird","Aeroplane","Butterfly","Bee"], no:["Dog","Cow","Car","Fish","Elephant","Goat","Bus","Cat","Horse"],
    p:S("Which of these can fly?","इनमें से कौन उड़ सकता है?","இவற்றில் எது பறக்கும்?","వీటిలో ఏది ఎగరగలదు?","এদের মধ্যে কোনটি উড়তে পারে?","यांपैकी कोण उडू शकतो?","આમાંથી કોણ ઊડી શકે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಹಾರಬಲ್ಲದು?","ഇവയിൽ ഏതിന് പറക്കാൻ കഴിയും?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੌਣ ਉੱਡ ਸਕਦਾ ਹੈ?","ان میں سے کون اڑ سکتا ہے؟","ଏଥିମଧ୍ୟରୁ କିଏ ଉଡ଼ିପାରେ?","यीमध्ये कुन उड्न सक्छ?") },
  { key:"water", yes:["Fish","Crab","Whale"], no:["Dog","Cat","Cow","Lion","Goat","Horse","Monkey","Hen"],
    p:S("Which of these lives in water?","इनमें से कौन पानी में रहता है?","இவற்றில் எது நீரில் வாழ்கிறது?","వీటిలో ఏది నీటిలో నివసిస్తుంది?","এদের মধ্যে কোনটি জলে থাকে?","यांपैकी कोण पाण्यात राहतो?","આમાંથી કોણ પાણીમાં રહે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನೀರಿನಲ್ಲಿ ವಾಸಿಸುತ್ತದೆ?","ഇവയിൽ ഏതാണ് വെള്ളത്തിൽ ജീവിക്കുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੌਣ ਪਾਣੀ ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ?","ان میں سے کون پانی میں رہتا ہے؟","ଏଥିମଧ୍ୟରୁ କିଏ ପାଣିରେ ରହେ?","यीमध्ये कुन पानीमा बस्छ?") },
  { key:"eat", yes:["Apple","Mango","Banana","Grape","Orange","Carrot","Rice","Bread"], no:["Ball","Book","Car","Shoe","Chair","Soap","Bus"],
    p:S("Which of these do we eat?","इनमें से हम क्या खाते हैं?","இவற்றில் நாம் எதைச் சாப்பிடுகிறோம்?","వీటిలో మనం దేనిని తింటాం?","এদের মধ্যে আমরা কোনটি খাই?","यांपैकी आपण काय खातो?","આમાંથી આપણે શું ખાઈએ છીએ?","ಇವುಗಳಲ್ಲಿ ನಾವು ಯಾವುದನ್ನು ತಿನ್ನುತ್ತೇವೆ?","ഇവയിൽ നമ്മൾ ഏതാണ് കഴിക്കുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਅਸੀਂ ਕੀ ਖਾਂਦੇ ਹਾਂ?","ان میں سے ہم کیا کھاتے ہیں؟","ଏଥିମଧ୍ୟରୁ ଆମେ କ'ଣ ଖାଉ?","यीमध्ये हामी के खान्छौं?") },
  { key:"teeth", yes:["Toothbrush"], no:["Spoon","Ball","Book","Shoe","Chair"],
    p:S("Which of these do we use to brush our teeth?","दाँत साफ़ करने के लिए हम इनमें से किसका उपयोग करते हैं?","பல் துலக்க இவற்றில் எதைப் பயன்படுத்துகிறோம்?","పళ్ళు తోముకోవడానికి వీటిలో దేనిని వాడతాం?","দাঁত মাজতে আমরা এদের মধ্যে কোনটি ব্যবহার করি?","दात घासण्यासाठी आपण यांपैकी काय वापरतो?","દાંત સાફ કરવા માટે આપણે આમાંથી શું વાપરીએ છીએ?","ಹಲ್ಲುಜ್ಜಲು ನಾವು ಇವುಗಳಲ್ಲಿ ಯಾವುದನ್ನು ಬಳಸುತ್ತೇವೆ?","പല്ല് തേക്കാൻ നമ്മൾ ഇവയിൽ ഏതാണ് ഉപയോഗിക്കുന്നത്?","ਦੰਦ ਸਾਫ਼ ਕਰਨ ਲਈ ਅਸੀਂ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਵਰਤਦੇ ਹਾਂ?","دانت صاف کرنے کے لیے ہم ان میں سے کیا استعمال کرتے ہیں؟","ଦାନ୍ତ ଘଷିବା ପାଇଁ ଆମେ ଏଥିମଧ୍ୟରୁ କ'ଣ ବ୍ୟବହାର କରୁ?","दाँत माझ्न हामी यीमध्ये के प्रयोग गर्छौं?") },
  { key:"night", yes:["Moon","Star"], no:["Sun","Tree","Car","Flower","Umbrella","Ball"],
    p:S("Which of these do we see in the night sky?","रात के आसमान में हम इनमें से क्या देखते हैं?","இரவு வானத்தில் இவற்றில் எதைப் பார்க்கிறோம்?","రాత్రి ఆకాశంలో వీటిలో దేనిని చూస్తాం?","রাতের আকাশে আমরা এদের মধ্যে কোনটি দেখি?","रात्रीच्या आकाशात आपण यांपैकी काय पाहतो?","રાત્રે આકાશમાં આપણે આમાંથી શું જોઈએ છીએ?","ರಾತ್ರಿಯ ಆಕಾಶದಲ್ಲಿ ನಾವು ಇವುಗಳಲ್ಲಿ ಯಾವುದನ್ನು ನೋಡುತ್ತೇವೆ?","രാത്രി ആകാശത്ത് നമ്മൾ ഇവയിൽ ഏതാണ് കാണുന്നത്?","ਰਾਤ ਦੇ ਅਸਮਾਨ ਵਿੱਚ ਅਸੀਂ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਦੇਖਦੇ ਹਾਂ?","رات کے آسمان میں ہم ان میں سے کیا دیکھتے ہیں؟","ରାତି ଆକାଶରେ ଆମେ ଏଥିମଧ୍ୟରୁ କ'ଣ ଦେଖୁ?","रातको आकाशमा हामी यीमध्ये के देख्छौं?") },
  { key:"milk", yes:["Cow","Goat"], no:["Dog","Cat","Hen","Fish","Lion","Bird"],
    p:S("Which of these gives us milk?","इनमें से कौन हमें दूध देता है?","இவற்றில் எது நமக்குப் பால் தருகிறது?","వీటిలో ఏది మనకు పాలు ఇస్తుంది?","এদের মধ্যে কোনটি আমাদের দুধ দেয়?","यांपैकी कोण आपल्याला दूध देतो?","આમાંથી કોણ આપણને દૂધ આપે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನಮಗೆ ಹಾಲು ಕೊಡುತ್ತದೆ?","ഇവയിൽ ഏതാണ് നമുക്ക് പാൽ തരുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੌਣ ਸਾਨੂੰ ਦੁੱਧ ਦਿੰਦਾ ਹੈ?","ان میں سے کون ہمیں دودھ دیتا ہے؟","ଏଥିମଧ୍ୟରୁ କିଏ ଆମକୁ କ୍ଷୀର ଦିଏ?","यीमध्ये कसले हामीलाई दूध दिन्छ?") },
  { key:"eggs", yes:["Hen","Duck"], no:["Cow","Goat","Dog","Cat","Horse","Elephant","Lion","Monkey"],
    p:S("Which of these gives us eggs?","इनमें से कौन हमें अंडे देता है?","இவற்றில் எது நமக்கு முட்டை தருகிறது?","వీటిలో ఏది మనకు గుడ్లు ఇస్తుంది?","এদের মধ্যে কোনটি আমাদের ডিম দেয়?","यांपैकी कोण आपल्याला अंडी देतो?","આમાંથી કોણ આપણને ઈંડાં આપે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನಮಗೆ ಮೊಟ್ಟೆ ಕೊಡುತ್ತದೆ?","ഇവയിൽ ഏതാണ് നമുക്ക് മുട്ട തരുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੌਣ ਸਾਨੂੰ ਆਂਡੇ ਦਿੰਦਾ ਹੈ?","ان میں سے کون ہمیں انڈے دیتا ہے؟","ଏଥିମଧ୍ୟରୁ କିଏ ଆମକୁ ଅଣ୍ଡା ଦିଏ?","यीमध्ये कसले हामीलाई अण्डा दिन्छ?") },
  { key:"clean", yes:["Soap","Toothbrush","Water"], no:["Ball","Car","Lion","Mango","Book","Chair"],
    p:S("Which of these helps us keep clean?","इनमें से कौन हमें साफ़ रहने में मदद करता है?","இவற்றில் எது நாம் சுத்தமாக இருக்க உதவுகிறது?","వీటిలో ఏది మనం శుభ్రంగా ఉండటానికి సహాయపడుతుంది?","এদের মধ্যে কোনটি আমাদের পরিষ্কার থাকতে সাহায্য করে?","यांपैकी काय आपल्याला स्वच्छ राहण्यास मदत करते?","આમાંથી શું આપણને સ્વચ્છ રહેવામાં મદદ કરે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನಾವು ಸ್ವಚ್ಛವಾಗಿರಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ?","ഇവയിൽ ഏതാണ് നമ്മളെ വൃത്തിയായിരിക്കാൻ സഹായിക്കുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਸਾਨੂੰ ਸਾਫ਼ ਰਹਿਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ?","ان میں سے کون سی چیز ہمیں صاف رہنے میں مدد دیتی ہے؟","ଏଥିମଧ୍ୟରୁ କେଉଁଟି ଆମକୁ ପରିଷ୍କାର ରହିବାରେ ସାହାଯ୍ୟ କରେ?","यीमध्ये कुनले हामीलाई सफा रहन मद्दत गर्छ?") },
  { key:"rain", yes:["Umbrella"], no:["Ball","Book","Spoon","Bed","Chair","Mango"],
    p:S("Which of these do we use when it rains?","बारिश होने पर हम इनमें से किसका उपयोग करते हैं?","மழை பெய்யும்போது இவற்றில் எதைப் பயன்படுத்துகிறோம்?","వర్షం పడినప్పుడు వీటిలో దేనిని వాడతాం?","বৃষ্টি হলে আমরা এদের মধ্যে কোনটি ব্যবহার করি?","पाऊस पडतो तेव्हा आपण यांपैकी काय वापरतो?","વરસાદ પડે ત્યારે આપણે આમાંથી શું વાપરીએ છીએ?","ಮಳೆ ಬಂದಾಗ ನಾವು ಇವುಗಳಲ್ಲಿ ಯಾವುದನ್ನು ಬಳಸುತ್ತೇವೆ?","മഴ പെയ്യുമ്പോൾ നമ്മൾ ഇവയിൽ ഏതാണ് ഉപയോഗിക്കുന്നത്?","ਮੀਂਹ ਪੈਣ ਵੇਲੇ ਅਸੀਂ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਵਰਤਦੇ ਹਾਂ?","بارش ہونے پر ہم ان میں سے کیا استعمال کرتے ہیں؟","ବର୍ଷା ହେଲେ ଆମେ ଏଥିମଧ୍ୟରୁ କ'ଣ ବ୍ୟବହାର କରୁ?","पानी पर्दा हामी यीमध्ये के प्रयोग गर्छौं?") },
  { key:"wild", yes:["Lion","Tiger"], no:["Cow","Goat","Dog","Cat","Hen"],
    p:S("Which of these is a wild animal?","इनमें से कौन सा जंगली जानवर है?","இவற்றில் எது காட்டு விலங்கு?","వీటిలో ఏది అడవి జంతువు?","এদের মধ্যে কোনটি বন্য প্রাণী?","यांपैकी कोणता जंगली प्राणी आहे?","આમાંથી કયું જંગલી પ્રાણી છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಕಾಡು ಪ್ರಾಣಿ?","ഇവയിൽ ഏതാണ് കാട്ടുമൃഗം?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜੰਗਲੀ ਜਾਨਵਰ ਹੈ?","ان میں سے کون سا جنگلی جانور ہے؟","ଏଥିମଧ୍ୟରୁ କେଉଁଟି ବଣୁଆ ପ୍ରାଣୀ?","यीमध्ये कुन जङ्गली जनावर हो?") },
  { key:"pet", yes:["Dog","Cat"], no:["Lion","Tiger","Snake","Whale"],
    p:S("Which of these is a pet animal?","इनमें से कौन सा पालतू जानवर है?","இவற்றில் எது வீட்டு வளர்ப்பு விலங்கு?","వీటిలో ఏది పెంపుడు జంతువు?","এদের মধ্যে কোনটি পোষা প্রাণী?","यांपैकी कोणता पाळीव प्राणी आहे?","આમાંથી કયું પાળેલું પ્રાણી છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಸಾಕು ಪ್ರಾಣಿ?","ഇവയിൽ ഏതാണ് വളർത്തുമൃഗം?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਪਾਲਤੂ ਜਾਨਵਰ ਹੈ?","ان میں سے کون سا پالتو جانور ہے؟","ଏଥିମଧ୍ୟରୁ କେଉଁଟି ପୋଷା ପ୍ରାଣୀ?","यीमध्ये कुन घरपालुवा जनावर हो?") },
  { key:"onWater", yes:["Boat","Ship"], no:["Car","Bus","Cycle","Train","Aeroplane"],
    p:S("Which of these moves on water?","इनमें से कौन पानी पर चलता है?","இவற்றில் எது நீரில் செல்கிறது?","వీటిలో ఏది నీటిపై వెళ్తుంది?","এদের মধ্যে কোনটি জলে চলে?","यांपैकी काय पाण्यावर चालते?","આમાંથી શું પાણી પર ચાલે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನೀರಿನ ಮೇಲೆ ಚಲಿಸುತ್ತದೆ?","ഇവയിൽ ഏതാണ് വെള്ളത്തിലൂടെ പോകുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਪਾਣੀ ਉੱਤੇ ਚੱਲਦਾ ਹੈ?","ان میں سے کیا پانی پر چلتا ہے؟","ଏଥିମଧ୍ୟରୁ କ'ଣ ପାଣିରେ ଚାଲେ?","यीमध्ये के पानीमा चल्छ?") },
  { key:"road", yes:["Car","Bus","Cycle"], no:["Boat","Ship","Aeroplane"],
    p:S("Which of these moves on the road?","इनमें से कौन सड़क पर चलता है?","இவற்றில் எது சாலையில் செல்கிறது?","వీటిలో ఏది రోడ్డుపై వెళ్తుంది?","এদের মধ্যে কোনটি রাস্তায় চলে?","यांपैकी काय रस्त्यावर चालते?","આમાંથી શું રસ્તા પર ચાલે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ರಸ್ತೆಯ ಮೇಲೆ ಚಲಿಸುತ್ತದೆ?","ഇവയിൽ ഏതാണ് റോഡിലൂടെ പോകുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਸੜਕ ਉੱਤੇ ਚੱਲਦਾ ਹੈ?","ان میں سے کیا سڑک پر چلتا ہے؟","ଏଥିମଧ୍ୟରୁ କ'ଣ ରାସ୍ତାରେ ଚାଲେ?","यीमध्ये के सडकमा चल्छ?") },
  { key:"wear", yes:["Shirt","Shoe"], no:["Spoon","Ball","Apple","Bed","Chair","Book"],
    p:S("Which of these do we wear?","इनमें से हम क्या पहनते हैं?","இவற்றில் நாம் எதை அணிகிறோம்?","వీటిలో మనం దేనిని ధరిస్తాం?","এদের মধ্যে আমরা কোনটি পরি?","यांपैकी आपण काय घालतो?","આમાંથી આપણે શું પહેરીએ છીએ?","ಇವುಗಳಲ್ಲಿ ನಾವು ಯಾವುದನ್ನು ಧರಿಸುತ್ತೇವೆ?","ഇവയിൽ നമ്മൾ ഏതാണ് ധരിക്കുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਅਸੀਂ ਕੀ ਪਹਿਨਦੇ ਹਾਂ?","ان میں سے ہم کیا پہنتے ہیں؟","ଏଥିମଧ୍ୟରୁ ଆମେ କ'ଣ ପିନ୍ଧୁ?","यीमध्ये हामी के लगाउँछौं?") },
  { key:"sleep", yes:["Bed"], no:["Spoon","Car","Ball","Book","Umbrella"],
    p:S("Which of these do we sleep on?","हम इनमें से किस पर सोते हैं?","இவற்றில் எதில் நாம் தூங்குகிறோம்?","వీటిలో దేనిపై మనం నిద్రపోతాం?","আমরা এদের মধ্যে কোনটিতে ঘুমাই?","आपण यांपैकी कशावर झोपतो?","આપણે આમાંથી શેના પર સૂઈએ છીએ?","ನಾವು ಇವುಗಳಲ್ಲಿ ಯಾವುದರ ಮೇಲೆ ಮಲಗುತ್ತೇವೆ?","ഇവയിൽ ഏതിലാണ് നമ്മൾ ഉറങ്ങുന്നത്?","ਅਸੀਂ ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਸ ਉੱਤੇ ਸੌਂਦੇ ਹਾਂ?","ہم ان میں سے کس پر سوتے ہیں؟","ଆମେ ଏଥିମଧ୍ୟରୁ କେଉଁଥିରେ ଶୋଉ?","हामी यीमध्ये केमा सुत्छौं?") },
  { key:"tree", yes:["Mango","Apple","Orange"], no:["Bread","Milk","Ball","Fish","Car","Carrot"],
    p:S("Which of these grows on a tree?","इनमें से क्या पेड़ पर उगता है?","இவற்றில் எது மரத்தில் காய்க்கிறது?","వీటిలో ఏది చెట్టుకు కాస్తుంది?","এদের মধ্যে কোনটি গাছে ধরে?","यांपैकी काय झाडावर लागते?","આમાંથી શું ઝાડ પર ઊગે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಮರದಲ್ಲಿ ಬೆಳೆಯುತ್ತದೆ?","ഇവയിൽ ഏതാണ് മരത്തിൽ ഉണ്ടാകുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਰੁੱਖ ਉੱਤੇ ਲੱਗਦਾ ਹੈ?","ان میں سے کیا درخت پر لگتا ہے؟","ଏଥିମଧ୍ୟରୁ କ'ଣ ଗଛରେ ଫଳେ?","यीमध्ये के रुखमा फल्छ?") },
  { key:"light", yes:["Sun","Bulb"], no:["Tree","Ball","Book","Apple","Water","Shoe","Chair"],
    p:S("Which of these gives us light?","इनमें से कौन हमें रोशनी देता है?","இவற்றில் எது நமக்கு ஒளி தருகிறது?","వీటిలో ఏది మనకు వెలుగు ఇస్తుంది?","এদের মধ্যে কোনটি আমাদের আলো দেয়?","यांपैकी काय आपल्याला प्रकाश देते?","આમાંથી શું આપણને પ્રકાશ આપે છે?","ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನಮಗೆ ಬೆಳಕು ಕೊಡುತ್ತದೆ?","ഇവയിൽ ഏതാണ് നമുക്ക് വെളിച്ചം തരുന്നത്?","ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੀ ਸਾਨੂੰ ਰੋਸ਼ਨੀ ਦਿੰਦਾ ਹੈ?","ان میں سے کیا ہمیں روشنی دیتا ہے؟","ଏଥିମଧ୍ୟରୁ କ'ଣ ଆମକୁ ଆଲୋକ ଦିଏ?","यीमध्ये कसले हामीलाई उज्यालो दिन्छ?") },
];

// Senses: one template sentence per language with a purpose phrase.
const SENSE_FRAME = {
  en:(x)=>`Which body part do we use to ${x}?`, hi:(x)=>`${x} के लिए हम शरीर के किस अंग का उपयोग करते हैं?`,
  ta:(x)=>`${x} உடலின் எந்தப் பகுதியைப் பயன்படுத்துகிறோம்?`, te:(x)=>`${x} శరీరంలోని ఏ భాగాన్ని వాడతాం?`,
  bn:(x)=>`${x} জন্য আমরা শরীরের কোন অঙ্গ ব্যবহার করি?`, mr:(x)=>`${x} आपण शरीराचा कोणता अवयव वापरतो?`,
  gu:(x)=>`${x} આપણે શરીરનું કયું અંગ વાપરીએ છીએ?`, kn:(x)=>`${x} ನಾವು ದೇಹದ ಯಾವ ಭಾಗವನ್ನು ಬಳಸುತ್ತೇವೆ?`,
  ml:(x)=>`${x} നമ്മൾ ശരീരത്തിന്റെ ഏത് ഭാഗമാണ് ഉപയോഗിക്കുന്നത്?`, pa:(x)=>`${x} ਲਈ ਅਸੀਂ ਸਰੀਰ ਦਾ ਕਿਹੜਾ ਅੰਗ ਵਰਤਦੇ ਹਾਂ?`,
  ur:(x)=>`${x} کے لیے ہم جسم کا کون سا حصہ استعمال کرتے ہیں؟`, or:(x)=>`${x} ପାଇଁ ଆମେ ଶରୀରର କେଉଁ ଅଙ୍ଗ ବ୍ୟବହାର କରୁ?`,
  ne:(x)=>`${x} हामी शरीरको कुन अङ्ग प्रयोग गर्छौं?`,
};
const SENSES = [
  { part:"Eye",    x:{ en:"see", hi:"देखने", ta:"பார்க்க", te:"చూడటానికి", bn:"দেখার", mr:"पाहण्यासाठी", gu:"જોવા માટે", kn:"ನೋಡಲು", ml:"കാണാൻ", pa:"ਦੇਖਣ", ur:"دیکھنے", or:"ଦେଖିବା", ne:"हेर्न" } },
  { part:"Ear",    x:{ en:"hear", hi:"सुनने", ta:"கேட்க", te:"వినడానికి", bn:"শোনার", mr:"ऐकण्यासाठी", gu:"સાંભળવા માટે", kn:"ಕೇಳಲು", ml:"കേൾക്കാൻ", pa:"ਸੁਣਨ", ur:"سننے", or:"ଶୁଣିବା", ne:"सुन्न" } },
  { part:"Nose",   x:{ en:"smell", hi:"सूँघने", ta:"முகர", te:"వాసన చూడటానికి", bn:"গন্ধ নেওয়ার", mr:"वास घेण्यासाठी", gu:"સૂંઘવા માટે", kn:"ವಾಸನೆ ನೋಡಲು", ml:"മണക്കാൻ", pa:"ਸੁੰਘਣ", ur:"سونگھنے", or:"ଶୁଙ୍ଘିବା", ne:"सुँघ्न" } },
  { part:"Tongue", x:{ en:"taste", hi:"स्वाद लेने", ta:"சுவைக்க", te:"రుచి చూడటానికి", bn:"স্বাদ নেওয়ার", mr:"चव घेण्यासाठी", gu:"સ્વાદ લેવા માટે", kn:"ರುಚಿ ನೋಡಲು", ml:"രുചിക്കാൻ", pa:"ਸੁਆਦ ਲੈਣ", ur:"چکھنے", or:"ସ୍ୱାଦ ନେବା", ne:"स्वाद लिन" } },
  { part:"Leg",    x:{ en:"walk", hi:"चलने", ta:"நடக்க", te:"నడవడానికి", bn:"হাঁটার", mr:"चालण्यासाठी", gu:"ચાલવા માટે", kn:"ನಡೆಯಲು", ml:"നടക്കാൻ", pa:"ਤੁਰਨ", ur:"چلنے", or:"ଚାଲିବା", ne:"हिँड्न" } },
  { part:"Hand",   x:{ en:"hold things", hi:"चीज़ें पकड़ने", ta:"பொருட்களைப் பிடிக்க", te:"వస్తువులను పట్టుకోవడానికి", bn:"জিনিস ধরার", mr:"वस्तू पकडण्यासाठी", gu:"વસ્તુઓ પકડવા માટે", kn:"ವಸ್ತುಗಳನ್ನು ಹಿಡಿಯಲು", ml:"സാധനങ്ങൾ പിടിക്കാൻ", pa:"ਚੀਜ਼ਾਂ ਫੜਨ", ur:"چیزیں پکڑنے", or:"ଜିନିଷ ଧରିବା", ne:"सामान समात्न" } },
];

const LEGS_PROMPT = S("How many legs does this animal have?","इस जानवर के कितने पैर होते हैं?","இந்த விலங்குக்கு எத்தனை கால்கள் உள்ளன?","ఈ జంతువుకు ఎన్ని కాళ్ళు ఉన్నాయి?","এই প্রাণীটির কয়টি পা আছে?","या प्राण्याला किती पाय असतात?","આ પ્રાણીને કેટલા પગ હોય છે?","ಈ ಪ್ರಾಣಿಗೆ ಎಷ್ಟು ಕಾಲುಗಳಿವೆ?","ഈ മൃഗത്തിന് എത്ര കാലുകളുണ്ട്?","ਇਸ ਜਾਨਵਰ ਦੀਆਂ ਕਿੰਨੀਆਂ ਲੱਤਾਂ ਹੁੰਦੀਆਂ ਹਨ?","اس جانور کی کتنی ٹانگیں ہوتی ہیں؟","ଏହି ପ୍ରାଣୀର କେତୋଟି ଗୋଡ଼ ଅଛି?","यो जनावरका कति वटा खुट्टा हुन्छन्?");
const LEGS = [["Dog",4],["Cow",4],["Cat",4],["Goat",4],["Horse",4],["Elephant",4],["Lion",4],["Hen",2],["Duck",2],["Bird",2],["Ant",6],["Spider",8]];

function evsQuestions() {
  const qs = [];
  let n = 1;
  const id = () => `1-evs-dp-${String(n++).padStart(3, "0")}`;
  for (const P of PREDICATES) {
    const count = Math.min(Math.max(P.yes.length * 2, 2), 8);
    for (let k = 0; k < count; k++) {
      const ans = P.yes[k % P.yes.length];
      const d = takeDistinct(P.no, 2);
      const { options, answerIndex } = place(ans, d);
      qs.push({ id: id(), type: "identify", topic: P.key, prompt: P.p, choices: options.map(pictureLabel), answerIndex });
    }
  }
  const parts = SENSES.map((s) => s.part);
  for (const s of SENSES) {
    const prompt = Object.fromEntries(LANGS.map((l) => [l, SENSE_FRAME[l](s.x[l])]));
    for (let k = 0; k < 2; k++) {
      const d = takeDistinct(parts, 2, [s.part]);
      const { options, answerIndex } = place(s.part, d);
      qs.push({ id: id(), type: "identify", topic: `sense-${s.part.toLowerCase()}`, prompt, choices: options.map(pictureLabel), answerIndex });
    }
  }
  for (const [animal, legs] of LEGS) {
    const d = takeDistinct(["0", "2", "4", "6", "8"], 2, [String(legs)]);
    const { options, answerIndex } = place(String(legs), d);
    qs.push({ id: id(), type: "count", topic: "legs", prompt: LEGS_PROMPT, visual: W(animal).emoji, choices: options.map(enOnly), answerIndex });
  }
  return qs;
}

// ── Fixes to the original hand-written Class 1 questions ────────────────────
function fixCuratedEnglish(data) {
  for (const lvl of data.levels) {
    if (/-(gen|depth)-level$/.test(lvl.id)) continue;
    for (const q of lvl.questions) {
      // English answers stay English in every language.
      q.choices = q.choices.map((c) => enOnly(c.en));
      if (q.prompt.en === "Which letter is this?" || q.prompt.en === E.letter.en) { q.prompt = E.capital; q.visual = q.visual.toLowerCase(); }
      else if (q.prompt.en === "Which word matches the picture?") q.prompt = P_MATCH_EN;
      else if (q.id === "1-eng-004") { q.prompt = E.sameStart; q.visual = "🐱  Cat"; }
    }
  }
}
// Visuals that gave the answer away, and options left untranslated.
const EVS_VISUAL_FIX = { "1-evs-003": "🥛", "1-evs-008": "🔊", "1-evs-010": "☁️" };
function fixCuratedEvs(data) {
  for (const lvl of data.levels) {
    if (/-(gen|depth)-level$/.test(lvl.id)) continue;
    for (const q of lvl.questions) {
      if (EVS_VISUAL_FIX[q.id]) q.visual = EVS_VISUAL_FIX[q.id];
      q.choices = q.choices.map((c) => {
        const w = WORDS.get(c.en);
        if (!w) return c;
        const tr = trObj(w);
        const out = { ...c };
        for (const l of LANGS) if (!out[l] || out[l] === c.en) out[l] = tr[l] || c.en;
        return out;
      });
    }
  }
}

// ── Validate and write ───────────────────────────────────────────────────────
function validate(qs) {
  const errs = []; const ids = new Set();
  for (const q of qs) {
    if (ids.has(q.id)) errs.push(`dup id ${q.id}`); ids.add(q.id);
    for (const l of LANGS) if (!q.prompt[l]) errs.push(`${q.id}: prompt missing ${l}`);
    if (q.choices.length !== 3) errs.push(`${q.id}: ${q.choices.length} choices`);
    for (const c of q.choices) for (const l of LANGS) if (!c[l]) errs.push(`${q.id}: choice missing ${l}`);
    const en = q.choices.map((c) => c.en);
    if (new Set(en).size !== 3) errs.push(`${q.id}: duplicate options ${en}`);
    if (![0, 1, 2].includes(q.answerIndex)) errs.push(`${q.id}: bad answerIndex`);
  }
  return errs;
}

function writeLevel(file, levelId, qs, fixer) {
  const full = path.join(ROOT, file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  fixer(data);
  data.levels = data.levels.filter((l) => l.id !== levelId);
  data.levels.push({ id: levelId, difficulty: 2, questions: qs.map(({ topic, ...q }) => q) });
  const total = data.levels.reduce((a, l) => a + l.questions.length, 0);
  if (!DRY) fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
  console.log(`${DRY ? "[dry] " : ""}${file}: +${qs.length} depth questions, ${total} in total`);
}

const eng = englishQuestions();
const evs = evsQuestions();
const errs = [...validate(eng), ...validate(evs)];
if (errs.length) { console.error(`✗ ${errs.length} problems:\n` + errs.slice(0, 20).join("\n")); process.exit(1); }
writeLevel("content/levels/1-english.json", "1-eng-depth-level", eng, fixCuratedEnglish);
writeLevel("content/levels/1-evs.json", "1-evs-depth-level", evs, fixCuratedEvs);
console.log("Verify: node scripts/verify-class1-depth.mjs");
