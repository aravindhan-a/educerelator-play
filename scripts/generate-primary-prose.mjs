#!/usr/bin/env node
// Hand-curated primary-class prose generator (no API key needed).
//
// Class 1 vocabulary is a finite set of basic nouns — the safest possible
// place for 13-language content, because these words are unambiguous and
// high-frequency. We curate every translation ONCE in VOCAB below, then the
// generator assembles match-the-picture and category questions with correct
// answer keys, balanced answer positions, unique ids, and validation. Any
// language we leave blank for a word falls back to English in the app
// (exT = obj[lang] || obj.en), so a gap is graceful, never garbled.
//
// Usage: node scripts/generate-primary-prose.mjs [--target N] [--dry]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const TARGET = (() => { const i = args.indexOf("--target"); return i >= 0 ? parseInt(args[i + 1]) : 55; })();

const LANGS = ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "ur", "or", "ne"];

// ── Curated vocabulary: en + emoji + category + 12-language translations ──
const V = (en, emoji, cat, tr) => ({ en, emoji, cat, tr });
const VOCAB = [
  // animals
  V("Dog", "🐶", "animal", { hi:"कुत्ता", ta:"நாய்", te:"కుక్క", bn:"কুকুর", mr:"कुत्रा", gu:"કૂતરો", kn:"ನಾಯಿ", ml:"നായ", pa:"ਕੁੱਤਾ", ur:"کتا", or:"କୁକୁର", ne:"कुकुर" }),
  V("Cat", "🐱", "animal", { hi:"बिल्ली", ta:"பூனை", te:"పిల్లి", bn:"বিড়াল", mr:"मांजर", gu:"બિલાડી", kn:"ಬೆಕ್ಕು", ml:"പൂച്ച", pa:"ਬਿੱਲੀ", ur:"بلی", or:"ବିଲେଇ", ne:"बिरालो" }),
  V("Cow", "🐄", "animal", { hi:"गाय", ta:"பசு", te:"ఆవు", bn:"গরু", mr:"गाय", gu:"ગાય", kn:"ಹಸು", ml:"പശു", pa:"ਗਾਂ", ur:"گائے", or:"ଗାଈ", ne:"गाई" }),
  V("Lion", "🦁", "animal", { hi:"शेर", ta:"சிங்கம்", te:"సింహం", bn:"সিংহ", mr:"सिंह", gu:"સિંહ", kn:"ಸಿಂಹ", ml:"സിംഹം", pa:"ਸ਼ੇਰ", ur:"شیر", or:"ସିଂହ", ne:"सिंह" }),
  V("Elephant", "🐘", "animal", { hi:"हाथी", ta:"யானை", te:"ఏనుగు", bn:"হাতি", mr:"हत्ती", gu:"હાથી", kn:"ಆನೆ", ml:"ആന", pa:"ਹਾਥੀ", ur:"ہاتھی", or:"ହାତୀ", ne:"हात्ती" }),
  V("Monkey", "🐒", "animal", { hi:"बंदर", ta:"குரங்கு", te:"కోతి", bn:"বানর", mr:"माकड", gu:"વાંદરો", kn:"ಮಂಗ", ml:"കുരങ്ങ്", pa:"ਬਾਂਦਰ", ur:"بندر", or:"ମାଙ୍କଡ଼", ne:"बाँदर" }),
  V("Fish", "🐟", "animal", { hi:"मछली", ta:"மீன்", te:"చేప", bn:"মাছ", mr:"मासा", gu:"માછલી", kn:"ಮೀನು", ml:"മീൻ", pa:"ਮੱਛੀ", ur:"مچھلی", or:"ମାଛ", ne:"माछा" }),
  V("Bird", "🐦", "animal", { hi:"पक्षी", ta:"பறவை", te:"పక్షి", bn:"পাখি", mr:"पक्षी", gu:"પક્ષી", kn:"ಹಕ್ಕಿ", ml:"പക്ഷി", pa:"ਪੰਛੀ", ur:"پرندہ", or:"ପକ୍ଷୀ", ne:"चरा" }),
  V("Horse", "🐴", "animal", { hi:"घोड़ा", ta:"குதிரை", te:"గుర్రం", bn:"ঘোড়া", mr:"घोडा", gu:"ઘોડો", kn:"ಕುದುರೆ", ml:"കുതിര", pa:"ਘੋੜਾ", ur:"گھوڑا", or:"ଘୋଡ଼ା", ne:"घोडा" }),
  V("Goat", "🐐", "animal", { hi:"बकरी", ta:"ஆடு", te:"మేక", bn:"ছাগল", mr:"बकरी", gu:"બકરી", kn:"ಮೇಕೆ", ml:"ആട്", pa:"ਬੱਕਰੀ", ur:"بکری", or:"ଛେଳି", ne:"बाख्रा" }),
  // fruits
  V("Apple", "🍎", "fruit", { hi:"सेब", ta:"ஆப்பிள்", te:"ఆపిల్", bn:"আপেল", mr:"सफरचंद", gu:"સફરજન", kn:"ಸೇಬು", ml:"ആപ്പിൾ", pa:"ਸੇਬ", ur:"سیب", or:"ସେଓ", ne:"स्याउ" }),
  V("Mango", "🥭", "fruit", { hi:"आम", ta:"மாம்பழம்", te:"మామిడి", bn:"আম", mr:"आंबा", gu:"કેરી", kn:"ಮಾವು", ml:"മാങ്ങ", pa:"ਅੰਬ", ur:"آم", or:"ଆମ୍ବ", ne:"आँप" }),
  V("Banana", "🍌", "fruit", { hi:"केला", ta:"வாழைப்பழம்", te:"అరటి", bn:"কলা", mr:"केळं", gu:"કેળું", kn:"ಬಾಳೆಹಣ್ಣು", ml:"വാഴപ്പഴം", pa:"ਕੇਲਾ", ur:"کیلا", or:"କଦଳୀ", ne:"केरा" }),
  V("Grape", "🍇", "fruit", { hi:"अंगूर", ta:"திராட்சை", te:"ద్రాక్ష", bn:"আঙ্গুর", mr:"द्राक्ष", gu:"દ્રાક્ષ", kn:"ದ್ರಾಕ್ಷಿ", ml:"മുന്തിരി", pa:"ਅੰਗੂਰ", ur:"انگور", or:"ଅଙ୍ଗୁର", ne:"अंगूर" }),
  V("Orange", "🍊", "fruit", { hi:"संतरा", ta:"ஆரஞ்சு", te:"నారింజ", bn:"কমলা", mr:"संत्रं", gu:"નારંગી", kn:"ಕಿತ್ತಳೆ", ml:"ഓറഞ്ച്", pa:"ਸੰਤਰਾ", ur:"نارنگی", or:"କମଳା", ne:"सुन्तला" }),
  // vehicles
  V("Car", "🚗", "vehicle", { hi:"कार", ta:"கார்", te:"కారు", bn:"গাড়ি", mr:"कार", gu:"કાર", kn:"ಕಾರು", ml:"കാർ", pa:"ਕਾਰ", ur:"کار", or:"କାର", ne:"कार" }),
  V("Bus", "🚌", "vehicle", { hi:"बस", ta:"பேருந்து", te:"బస్సు", bn:"বাস", mr:"बस", gu:"બસ", kn:"ಬಸ್", ml:"ബസ്", pa:"ਬੱਸ", ur:"بس", or:"ବସ୍", ne:"बस" }),
  V("Train", "🚂", "vehicle", { hi:"रेलगाड़ी", ta:"ரயில்", te:"రైలు", bn:"ট্রেন", mr:"रेल्वे", gu:"ટ્રેન", kn:"ರೈಲು", ml:"തീവണ്ടി", pa:"ਰੇਲ", ur:"ٹرین", or:"ଟ୍ରେନ୍", ne:"रेल" }),
  V("Boat", "⛵", "vehicle", { hi:"नाव", ta:"படகு", te:"పడవ", bn:"নৌকা", mr:"नाव", gu:"હોડી", kn:"ದೋಣಿ", ml:"വള്ളം", pa:"ਕਿਸ਼ਤੀ", ur:"کشتی", or:"ଡଙ୍ଗା", ne:"डुङ्गा" }),
  V("Aeroplane", "✈️", "vehicle", { hi:"हवाई जहाज़", ta:"விமானம்", te:"విమానం", bn:"উড়োজাহাজ", mr:"विमान", gu:"વિમાન", kn:"ವಿಮಾನ", ml:"വിമാനം", pa:"ਹਵਾਈ ਜਹਾਜ਼", ur:"ہوائی جہاز", or:"ବିମାନ", ne:"हवाईजहाज" }),
  // nature
  V("Sun", "☀️", "nature", { hi:"सूरज", ta:"சூரியன்", te:"సూర్యుడు", bn:"সূর্য", mr:"सूर्य", gu:"સૂર્ય", kn:"ಸೂರ್ಯ", ml:"സൂര്യൻ", pa:"ਸੂਰਜ", ur:"سورج", or:"ସୂର୍ଯ୍ୟ", ne:"सूर्य" }),
  V("Moon", "🌙", "nature", { hi:"चाँद", ta:"நிலா", te:"చంద్రుడు", bn:"চাঁদ", mr:"चंद्र", gu:"ચંદ્ર", kn:"ಚಂದ್ರ", ml:"ചന്ദ്രൻ", pa:"ਚੰਦ", ur:"چاند", or:"ଚନ୍ଦ୍ର", ne:"चन्द्रमा" }),
  V("Star", "⭐", "nature", { hi:"तारा", ta:"நட்சத்திரம்", te:"నక్షత్రం", bn:"তারা", mr:"तारा", gu:"તારો", kn:"ನಕ್ಷತ್ರ", ml:"നക്ഷത്രം", pa:"ਤਾਰਾ", ur:"ستارہ", or:"ତାରା", ne:"तारा" }),
  V("Tree", "🌳", "nature", { hi:"पेड़", ta:"மரம்", te:"చెట్టు", bn:"গাছ", mr:"झाड", gu:"ઝાડ", kn:"ಮರ", ml:"മരം", pa:"ਰੁੱਖ", ur:"درخت", or:"ଗଛ", ne:"रुख" }),
  V("Flower", "🌸", "nature", { hi:"फूल", ta:"மலர்", te:"పువ్వు", bn:"ফুল", mr:"फूल", gu:"ફૂલ", kn:"ಹೂವು", ml:"പൂവ്", pa:"ਫੁੱਲ", ur:"پھول", or:"ଫୁଲ", ne:"फूल" }),
  // body
  V("Eye", "👁️", "body", { hi:"आँख", ta:"கண்", te:"కన్ను", bn:"চোখ", mr:"डोळा", gu:"આંખ", kn:"ಕಣ್ಣು", ml:"കണ്ണ്", pa:"ਅੱਖ", ur:"آنکھ", or:"ଆଖି", ne:"आँखा" }),
  V("Ear", "👂", "body", { hi:"कान", ta:"காது", te:"చెవి", bn:"কান", mr:"कान", gu:"કાન", kn:"ಕಿವಿ", ml:"ചെവി", pa:"ਕੰਨ", ur:"کان", or:"କାନ", ne:"कान" }),
  V("Nose", "👃", "body", { hi:"नाक", ta:"மூக்கு", te:"ముక్కు", bn:"নাক", mr:"नाक", gu:"નાક", kn:"ಮೂಗು", ml:"മൂക്ക്", pa:"ਨੱਕ", ur:"ناک", or:"ନାକ", ne:"नाक" }),
  V("Hand", "✋", "body", { hi:"हाथ", ta:"கை", te:"చెయ్యి", bn:"হাত", mr:"हात", gu:"હાથ", kn:"ಕೈ", ml:"കൈ", pa:"ਹੱਥ", ur:"ہاتھ", or:"ହାତ", ne:"हात" }),
  // objects
  V("House", "🏠", "object", { hi:"घर", ta:"வீடு", te:"ఇల్లు", bn:"বাড়ি", mr:"घर", gu:"ઘર", kn:"ಮನೆ", ml:"വീട്", pa:"ਘਰ", ur:"گھر", or:"ଘର", ne:"घर" }),
  V("Ball", "⚽", "object", { hi:"गेंद", ta:"பந்து", te:"బంతి", bn:"বল", mr:"चेंडू", gu:"દડો", kn:"ಚೆಂಡು", ml:"പന്ത്", pa:"ਗੇਂਦ", ur:"گیند", or:"ବଲ୍", ne:"बल" }),
  V("Book", "📖", "object", { hi:"किताब", ta:"புத்தகம்", te:"పుస్తకం", bn:"বই", mr:"पुस्तक", gu:"પુસ્તક", kn:"ಪುಸ್ತಕ", ml:"പുസ്തകം", pa:"ਕਿਤਾਬ", ur:"کتاب", or:"ବହି", ne:"किताब" }),
  // colours
  V("Red", "🔴", "colour", { hi:"लाल", ta:"சிவப்பு", te:"ఎరుపు", bn:"লাল", mr:"लाल", gu:"લાલ", kn:"ಕೆಂಪು", ml:"ചുവപ്പ്", pa:"ਲਾਲ", ur:"سرخ", or:"ଲାଲ", ne:"रातो" }),
  V("Blue", "🔵", "colour", { hi:"नीला", ta:"நீலம்", te:"నీలం", bn:"নীল", mr:"निळा", gu:"વાદળી", kn:"ನೀಲಿ", ml:"നീല", pa:"ਨੀਲਾ", ur:"نیلا", or:"ନୀଳ", ne:"निलो" }),
  V("Green", "🟢", "colour", { hi:"हरा", ta:"பச்சை", te:"ఆకుపచ్చ", bn:"সবুজ", mr:"हिरवा", gu:"લીલો", kn:"ಹಸಿರು", ml:"പച്ച", pa:"ਹਰਾ", ur:"سبز", or:"ସବୁଜ", ne:"हरियो" }),
  V("Yellow", "🟡", "colour", { hi:"पीला", ta:"மஞ்சள்", te:"పసుపు", bn:"হলুদ", mr:"पिवळा", gu:"પીળો", kn:"ಹಳದಿ", ml:"മഞ്ഞ", pa:"ਪੀਲਾ", ur:"پیلا", or:"ହଳଦିଆ", ne:"पहेंलो" }),
];

// Category labels (for "Which of these is a/an ___?" questions)
const CAT_LABEL = {
  animal:  { en:"an animal",  hi:"एक जानवर", ta:"ஒரு விலங்கு", te:"ఒక జంతువు", bn:"একটি প্রাণী", mr:"एक प्राणी", gu:"એક પ્રાણી", kn:"ಒಂದು ಪ್ರಾಣಿ", ml:"ഒരു മൃഗം", pa:"ਇੱਕ ਜਾਨਵਰ", ur:"ایک جانور", or:"ଏକ ପ୍ରାଣୀ", ne:"एउटा जनावर" },
  fruit:   { en:"a fruit",    hi:"एक फल", ta:"ஒரு பழம்", te:"ఒక పండు", bn:"একটি ফল", mr:"एक फळ", gu:"એક ફળ", kn:"ಒಂದು ಹಣ್ಣು", ml:"ഒരു പഴം", pa:"ਇੱਕ ਫਲ", ur:"ایک پھل", or:"ଏକ ଫଳ", ne:"एउटा फलफूल" },
  vehicle: { en:"a vehicle",  hi:"एक वाहन", ta:"ஒரு வாகனம்", te:"ఒక వాహనం", bn:"একটি যানবাহন", mr:"एक वाहन", gu:"એક વાહન", kn:"ಒಂದು ವಾಹನ", ml:"ഒരു വാഹനം", pa:"ਇੱਕ ਵਾਹਨ", ur:"ایک گاڑی", or:"ଏକ ଯାନ", ne:"एउटा सवारी" },
};

// Prompt templates (13 languages)
const P_MATCH = { en:"Which word matches the picture?", hi:"कौन सा शब्द चित्र से मेल खाता है?", ta:"எந்த சொல் படத்துடன் பொருந்துகிறது?", te:"ఏ పదం చిత్రంతో సరిపోతుంది?", bn:"ছবির সাথে কোন শব্দ মিলে?", mr:"चित्राशी कोणता शब्द जुळतो?", gu:"કયો શબ્દ ચિત્ર સાથે મેળ ખાય છે?", kn:"ಯಾವ ಪದವು ಚಿತ್ರಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ?", ml:"ചിത്രവുമായി പൊരുത്തപ്പെടുന്ന വാക്ക് ഏതാണ്?", pa:"ਕਿਹੜਾ ਸ਼ਬਦ ਤਸਵੀਰ ਨਾਲ ਮੇਲ ਖਾਂਦਾ ਹੈ?", ur:"تصویر سے کون سا لفظ ملتا ہے؟", or:"କେଉଁ ଶବ୍ଦ ଚିତ୍ର ସହିତ ମେଳ ଖାଉଛି?", ne:"चित्रसँग कुन शब्द मेल खान्छ?" };
const catPrompt = (cat) => {
  const L = CAT_LABEL[cat];
  const t = {
    en:`Which of these is ${L.en}?`, hi:`इनमें से ${L.hi} कौन सा है?`, ta:`இவற்றில் ${L.ta} எது?`,
    te:`వీటిలో ${L.te} ఏది?`, bn:`এদের মধ্যে ${L.bn} কোনটি?`, mr:`यांपैकी ${L.mr} कोणता आहे?`,
    gu:`આમાંથી ${L.gu} કયું છે?`, kn:`ಇವುಗಳಲ್ಲಿ ${L.kn} ಯಾವುದು?`, ml:`ഇവയിൽ ${L.ml} ഏതാണ്?`,
    pa:`ਇਹਨਾਂ ਵਿੱਚੋਂ ${L.pa} ਕਿਹੜਾ ਹੈ?`, ur:`ان میں سے ${L.ur} کون سا ہے؟`, or:`ଏଥିମଧ୍ୟରୁ ${L.or} କେଉଁଟି?`,
    ne:`यीमध्ये ${L.ne} कुन हो?`,
  };
  return t;
};

// ── Deterministic RNG (mulberry32) ──
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

function trObj(word) { const o = { en: word.en }; for (const l of LANGS) if (l !== "en" && word.tr[l]) o[l] = word.tr[l]; return o; }

// place the answer at a rotating index and fill other slots with distractors
function assemble(correct, distractors, slot) {
  const choices = [];
  let di = 0;
  for (let i = 0; i < 3; i++) choices.push(i === slot ? trObj(correct) : trObj(distractors[di++]));
  return { choices, answerIndex: slot };
}

function genMatch(word, distractors, slot, id) {
  const { choices, answerIndex } = assemble(word, distractors, slot);
  return { id, type: "match-image", prompt: P_MATCH, visual: word.emoji, choices, answerIndex };
}
function genCategory(word, distractors, slot, id) {
  const { choices, answerIndex } = assemble(word, distractors, slot);
  return { id, type: "identify", prompt: catPrompt(word.cat), choices, answerIndex };
}

function build(subjectCats, includeCategory, prefix, target) {
  const r = rng(prefix.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const pool = VOCAB.filter((w) => subjectCats.includes(w.cat));
  const out = [];
  let n = 1;
  // one match-image per word
  for (const w of pool) {
    const others = VOCAB.filter((x) => x.cat !== w.cat);
    const d = [...others].sort(() => r() - 0.5).slice(0, 2);
    out.push(genMatch(w, d, n % 3, `${prefix}-${String(n).padStart(3, "0")}`)); n++;
  }
  // category questions (EVS): "which of these is an animal/fruit/vehicle?"
  if (includeCategory) {
    for (const cat of Object.keys(CAT_LABEL)) {
      const inCat = VOCAB.filter((w) => w.cat === cat);
      const outCat = VOCAB.filter((w) => w.cat !== cat);
      for (let k = 0; k < 5 && out.length < target; k++) {
        const w = pick(r, inCat);
        const d = [...outCat].sort(() => r() - 0.5).slice(0, 2);
        out.push(genCategory(w, d, n % 3, `${prefix}-${String(n).padStart(3, "0")}`)); n++;
      }
    }
  }
  return out.slice(0, target);
}

// validate a generated batch
function validate(qs) {
  const ids = new Set(); const errs = [];
  for (const q of qs) {
    if (ids.has(q.id)) errs.push(`dup id ${q.id}`); ids.add(q.id);
    if (!q.prompt.en) errs.push(`${q.id}: no en prompt`);
    const en = q.choices.map((c) => c.en);
    if (en.length !== 3) errs.push(`${q.id}: ${en.length} choices`);
    if (new Set(en).size !== en.length) errs.push(`${q.id}: dup choices ${en}`);
    if (q.answerIndex < 0 || q.answerIndex > 2) errs.push(`${q.id}: bad answerIndex`);
  }
  return errs;
}

const TASKS = [
  { file: "content/levels/1-english.json", cats: ["animal","fruit","vehicle","nature","body","object","colour"], category: false, prefix: "1-eng-gen" },
  { file: "content/levels/1-evs.json",     cats: ["animal","fruit","body","nature","object"],                    category: true,  prefix: "1-evs-gen" },
];

let grand = 0;
for (const task of TASKS) {
  const full = path.join(ROOT, task.file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  const batch = build(task.cats, task.category, task.prefix, TARGET);
  const errs = validate(batch);
  if (errs.length) { console.error(`✗ ${task.file}:`, errs.slice(0, 5)); process.exit(1); }
  const before = (data.levels || []).reduce((a, l) => a + l.questions.length, 0);
  if (!DRY) {
    let gen = data.levels.find((l) => l.id === `${task.prefix}-level`);
    if (!gen) { gen = { id: `${task.prefix}-level`, difficulty: 1, questions: [] }; data.levels.push(gen); }
    gen.questions = batch; // idempotent: regenerate cleanly on re-run
    fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n");
  }
  const after = before + batch.length - ((data.levels.find((l) => l.id === `${task.prefix}-level`)?.questions.length === batch.length && !DRY) ? 0 : 0);
  console.log(`${DRY ? "[dry] " : ""}${task.file}: ${before} curated + ${batch.length} generated`);
  grand += batch.length;
}
console.log(`\n${DRY ? "[dry] " : ""}Total generated this run: ${grand}`);
console.log("Verify: node scripts/verify-primary-prose.mjs");
