#!/usr/bin/env node
// Classes 6-10 prose generator (English, Science, Social Studies) — no API key.
//
// English: grammar + vocabulary MCQs (plurals, tenses, opposites, synonyms,
// parts of speech, figures of speech). Choices stay English (the subject IS
// the words); prompt templates carry 13-language text (reused from the 3-5
// generator, extended here).
//
// Science / Social Studies: curated fact bank. The safest answers at this
// level are LANGUAGE-NEUTRAL — chemical symbols (Fe, Na), formulas (H2O),
// numbers (atomic numbers, years, units), SI-unit proper nouns (Newton,
// Joule). Where the answer is a term/name we use the curated 13-language
// tables (i18n-6to10.mjs); person/dynasty names carry hi/ta/te/bn and fall
// back to English elsewhere.
//
// Usage: node scripts/generate-class6to10-prose.mjs [--dry]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { P_PLURAL, P_PAST, P_OPP, P_SYN, P_POS } from "./generate-class345-prose.mjs";
import { WORDS610 } from "./i18n-6to10.mjs";
import { trObj } from "./generate-primary-prose.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.slice(2).includes("--dry");

const T = (k) => { if (!WORDS610[k]) throw new Error(`unknown 610 word key ${k}`); return trObj(WORDS610[k]); };
const NUM = (n) => ({ en: String(n) });
const EN = (s) => ({ en: s });

function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, a) => [...a].sort(() => r() - 0.5);

function mcq(id, prompt, correctObj, distractorObjs, slot, visual) {
  const choices = []; let di = 0;
  for (let i = 0; i < 4; i++) choices.push(i === slot ? correctObj : distractorObjs[di++]);
  const q = { id, type: "mcq", prompt, choices, answerIndex: slot };
  if (visual) q.visual = visual;
  return q;
}

// ── extra English prompt templates ──
const tpl = (mk) => (w) => { const t = {}; for (const [l, f] of Object.entries(mk)) t[l] = f(w); return t; };
const P_TENSE = tpl({ en:w=>`What is the "-ing" (present participle) form of "${w}"?`, hi:w=>`"${w}" का "-ing" रूप क्या है?`, ta:w=>`"${w}" இன் "-ing" வடிவம் என்ன?`, te:w=>`"${w}" యొక్క "-ing" రూపం ఏమిటి?`, bn:w=>`"${w}" এর "-ing" রূপ কী?`, mr:w=>`"${w}" चे "-ing" रूप काय आहे?`, gu:w=>`"${w}" નું "-ing" રૂપ શું છે?`, kn:w=>`"${w}" ದ "-ing" ರೂಪ ಯಾವುದು?`, ml:w=>`"${w}" ന്റെ "-ing" രൂപം ഏത്?`, pa:w=>`"${w}" ਦਾ "-ing" ਰੂਪ ਕੀ ਹੈ?`, ur:w=>`"${w}" کی "-ing" شکل کیا ہے؟`, or:w=>`"${w}" ର "-ing" ରୂପ କ'ଣ?`, ne:w=>`"${w}" को "-ing" रूप के हो?` });
const P_FOS = { en:"Which figure of speech is used: a direct comparison using 'like' or 'as'?", hi:"'like' या 'as' का उपयोग करते हुए सीधी तुलना कौन सा अलंकार है?", ta:"'like' அல்லது 'as' பயன்படுத்தி நேரடி ஒப்பீடு எந்த அணி?", te:"'like' లేదా 'as' ఉపయోగించి నేరుగా పోల్చడం ఏ అలంకారం?", bn:"'like' বা 'as' ব্যবহার করে সরাসরি তুলনা কোন অলঙ্কার?", mr:"'like' किंवा 'as' वापरून थेट तुलना कोणता अलंकार आहे?", gu:"'like' અથવા 'as' વાપરીને સીધી સરખામણી કયો અલંકાર છે?", kn:"'like' ಅಥವಾ 'as' ಬಳಸಿ ನೇರ ಹೋಲಿಕೆ ಯಾವ ಅಲಂಕಾರ?", ml:"'like' അല്ലെങ്കിൽ 'as' ഉപയോഗിച്ചുള്ള നേരിട്ടുള്ള താരതമ്യം ഏത് അലങ്കാരം?", pa:"'like' ਜਾਂ 'as' ਵਰਤ ਕੇ ਸਿੱਧੀ ਤੁਲਨਾ ਕਿਹੜਾ ਅਲੰਕਾਰ ਹੈ?", ur:"'like' یا 'as' استعمال کر کے براہ راست تشبیہ کون سا صنعت ہے؟", or:"'like' କିମ୍ବା 'as' ବ୍ୟବହାର କରି ସିଧା ତୁଳନା କେଉଁ ଅଳଙ୍କାର?", ne:"'like' वा 'as' प्रयोग गरी सीधा तुलना कुन अलंकार हो?" };

// ── English word tables per class ──
const PLU = {
  6: [["hero","heroes",["heros","heroies","heros'"]],["potato","potatoes",["potatos","potatoies","potatoo"]],["city","cities",["citys","cityes","citis"]],["lady","ladies",["ladys","ladyes","laddies"]],["boy","boys",["boies","boyes","boy's"]],["key","keys",["kies","keyes","key's"]]],
  7: [["cactus","cacti",["cactuses","cactii","cactus'"]],["fungus","fungi",["funguses","fungies","fungus'"]],["radius","radii",["radiuses","radiusi","radius'"]],["nucleus","nuclei",["nucleuses","nucleii","nucleus'"]]],
  8: [["crisis","crises",["crisises","crisi","crisez"]],["analysis","analyses",["analysises","analysis'","analysi"]],["phenomenon","phenomena",["phenomenons","phenomenona","phenomenoi"]],["criterion","criteria",["criterions","criterias","criterioi"]]],
};
const PAST = {
  6: [["begin","began",["beginned","begun","begins"]],["swim","swam",["swimmed","swum","swims"]],["fly","flew",["flied","flown","flies"]],["speak","spoke",["speaked","spoken","speaks"]],["break","broke",["breaked","broken","breaks"]],["choose","chose",["choosed","chosen","chooses"]],["ride","rode",["rided","ridden","rides"]],["grow","grew",["growed","grown","grows"]]],
  7: [["freeze","froze",["freezed","frozen","freezes"]],["steal","stole",["stealed","stolen","steals"]],["wear","wore",["weared","worn","wears"]],["throw","threw",["throwed","thrown","throws"]],["draw","drew",["drawed","drawn","draws"]],["bite","bit",["bited","bitten","bites"]]],
  9: [["seek","sought",["seeked","saught","seeks"]],["weep","wept",["weeped","wipt","weeps"]],["sweep","swept",["sweeped","swopt","sweeps"]],["bind","bound",["binded","bounded","binds"]],["grind","ground",["grinded","grounded","grinds"]],["arise","arose",["arised","arisen","arises"]]],
  10: [["bear","bore",["beared","borne","bears"]],["tear","tore",["teared","torn","tears"]],["weave","wove",["weaved","woven","weaves"]],["tread","trod",["treaded","trodden","treads"]],["forbid","forbade",["forbidded","forbidden","forbids"]],["slay","slew",["slayed","slain","slays"]]],
};
const OPP = {
  6: [["accept","reject"],["ascend","descend"],["expand","shrink"],["import","export"],["major","minor"],["private","public"],["temporary","permanent"],["artificial","natural"],["ancient","modern"],["shallow","deep"]],
  7: [["generous","selfish"],["humble","proud"],["transparent","opaque"],["vertical","horizontal"],["fertile","barren"],["liquid","solid"],["urban","rural"],["import","export"],["profit","loss"],["demand","supply"]],
  8: [["optimist","pessimist"],["expand","contract"],["include","exclude"],["ascent","descent"],["visible","invisible"],["mortal","immortal"],["literate","illiterate"],["rational","irrational"],["voluntary","compulsory"],["superior","inferior"]],
  9: [["benevolent","malevolent"],["conceal","reveal"],["frequent","rare"],["genuine","fake"],["harmony","discord"],["scarce","abundant"],["triumph","defeat"],["unite","divide"],["flexible","rigid"],["praise","criticise"]],
  10: [["candid","evasive"],["diligent","lazy"],["humane","cruel"],["lucid","obscure"],["prosperity","adversity"],["virtue","vice"],["optimism","pessimism"],["expand","compress"],["accept","decline"],["ally","enemy"]],
};
const SYN = {
  6: [["huge","enormous"],["tiny","minuscule"],["angry","furious"],["scared","terrified"],["happy","delighted"],["clever","intelligent"],["quiet","silent"],["begin","commence"],["end","conclude"],["rich","wealthy"]],
  7: [["brave","valiant"],["honest","truthful"],["ancient","antique"],["famous","renowned"],["difficult","challenging"],["strange","peculiar"],["important","significant"],["strong","powerful"],["fast","swift"],["kind","compassionate"]],
  8: [["abundant","plentiful"],["reluctant","unwilling"],["diligent","hardworking"],["fragile","delicate"],["genuine","authentic"],["vast","immense"],["obvious","evident"],["essential","vital"],["courteous","polite"],["accurate","precise"]],
  9: [["annual","yearly"],["assist","help"],["courage","bravery"],["enormous","gigantic"],["mend","repair"],["sorrow","grief"],["wealthy","affluent"],["weary","tired"],["rapid","swift"],["reveal","disclose"]],
  10: [["adversary","opponent"],["candid","frank"],["frugal","thrifty"],["meticulous","careful"],["novice","beginner"],["obstinate","stubborn"],["prudent","wise"],["resilient","tough"],["lucid","clear"],["abundant","ample"]],
};
const TEN = {
  9: [["run","running",["runing","runned","runnning"]],["make","making",["makeing","makking","makin"]],["sit","sitting",["siting","sitted","sittting"]],["write","writing",["writeing","writting","writin"]],["begin","beginning",["begining","beginnning","begined"]],["swim","swimming",["swiming","swimmming","swimmin"]],["stop","stopping",["stoping","stoppping","stopin"]],["come","coming",["comeing","comming","comin"]]],
};
// figures of speech: correct = Simile (only one with like/as by definition)
const FOS_OPTIONS = ["Simile", "Metaphor", "Personification", "Hyperbole", "Alliteration", "Onomatopoeia"];

function buildEnglish(cls) {
  const r = rng(600 + cls); const out = []; let n = 1;
  const id = () => `${cls}-english-gen-${String(n++).padStart(3, "0")}`;
  const push = (prompt, ans, ds) => out.push(mcq(id(), prompt, EN(ans), ds.map(EN), out.length % 4));
  for (const [b, a, ds] of PLU[cls] || []) push(P_PLURAL(b), a, ds);
  for (const [b, a, ds] of PAST[cls] || []) push(P_PAST(b), a, ds);
  for (const [b, a, ds] of TEN[cls] || []) push(P_TENSE(b), a, ds);
  for (const [cue, ans] of OPP[cls] || []) {
    const others = (OPP[cls]).flat().filter((w) => w !== cue && w !== ans);
    push(P_OPP(cue), ans, shuffle(r, others).slice(0, 3));
  }
  for (const [cue, ans] of SYN[cls] || []) {
    const others = SYN[cls].map(([c]) => c).filter((w) => w !== cue && w !== ans);
    push(P_SYN(cue), ans, shuffle(r, others).slice(0, 3));
  }
  // figure of speech (classes 8-10): 4 phrasings, answer always Simile
  if (cls >= 8) {
    for (let k = 0; k < 4; k++) {
      const ds = shuffle(r, FOS_OPTIONS.filter((f) => f !== "Simile")).slice(0, 3);
      push(P_FOS, "Simile", ds);
    }
  }
  return out;
}

// ── Fact bank ──
const F = (p, ans, ds, visual) => ({ p, ans, ds, visual });
const FN = (p, ans, ds) => ({ p, ans: String(ans), ds: ds.map(String), numeric: true });
const FE = (p, ans, ds, visual) => ({ p, ans, ds, visual, english: true }); // English-only symbol/formula answers

// science/SST prompts (full 13-language)
const P = {
  photo: { en:"What is the process by which green plants make their own food?", hi:"वह प्रक्रिया क्या है जिससे हरे पौधे अपना भोजन बनाते हैं?", ta:"பச்சை தாவரங்கள் தமது உணவை உற்பத்தி செய்யும் செயல்முறை எது?", te:"పచ్చని మొక్కలు తమ ఆహారాన్ని తయారు చేసుకునే ప్రక్రియ ఏది?", bn:"যে প্রক্রিয়ায় সবুজ উদ্ভিদ নিজের খাদ্য তৈরি করে তা কী?", mr:"हिरव्या वनस्पती स्वतःचे अन्न तयार करतात ती प्रक्रिया कोणती?", gu:"લીલા છોડ પોતાનો ખોરાક બનાવે તે પ્રક્રિયા કઈ છે?", kn:"ಹಸಿರು ಸಸ್ಯಗಳು ತಮ್ಮ ಆಹಾರವನ್ನು ತಯಾರಿಸುವ ಪ್ರಕ್ರಿಯೆ ಯಾವುದು?", ml:"പച്ച സസ്യങ്ങൾ സ്വന്തം ഭക്ഷണം ഉണ്ടാക്കുന്ന പ്രക്രിയ ഏത്?", pa:"ਹਰੇ ਪੌਦੇ ਆਪਣਾ ਭੋਜਨ ਬਣਾਉਣ ਦੀ ਪ੍ਰਕਿਰਿਆ ਕਿਹੜੀ ਹੈ?", ur:"وہ عمل کیا ہے جس سے سبز پودے اپنی خوراک بناتے ہیں؟", or:"ସବୁଜ ଉଦ୍ଭିଦ ନିଜ ଖାଦ୍ୟ ତିଆରି କରୁଥିବା ପ୍ରକ୍ରିୟା କ'ଣ?", ne:"हरिया बिरुवाले आफ्नो खाना बनाउने प्रक्रिया के हो?" },
  gasIn: { en:"Which gas do plants absorb during photosynthesis?", hi:"प्रकाश संश्लेषण के दौरान पौधे कौन सी गैस अवशोषित करते हैं?", ta:"ஒளிச்சேர்க்கையின் போது தாவரங்கள் எந்த வாயுவை உறிஞ்சுகின்றன?", te:"కిరణజన్య సంయోగక్రియలో మొక్కలు ఏ వాయువును గ్రహిస్తాయి?", bn:"সালোকসংশ্লেষণের সময় গাছ কোন গ্যাস শোষণ করে?", mr:"प्रकाशसंश्लेषणादरम्यान वनस्पती कोणता वायू शोषतात?", gu:"પ્રકાશસંશ્લેષણ દરમિયાન છોડ કયો વાયુ શોષે છે?", kn:"ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಯಲ್ಲಿ ಸಸ್ಯಗಳು ಯಾವ ಅನಿಲವನ್ನು ಹೀರುತ್ತವೆ?", ml:"പ്രകാശസംശ്ലേഷണത്തിൽ സസ്യങ്ങൾ ഏത് വാതകം വലിച്ചെടുക്കുന്നു?", pa:"ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਦੌਰਾਨ ਪੌਦੇ ਕਿਹੜੀ ਗੈਸ ਸੋਖਦੇ ਹਨ?", ur:"ضیائی تالیف کے دوران پودے کون سی گیس جذب کرتے ہیں؟", or:"ଆଲୋକ ସଂଶ୍ଳେଷଣ ସମୟରେ ଉଦ୍ଭିଦ କେଉଁ ଗ୍ୟାସ ଶୋଷେ?", ne:"प्रकाश संश्लेषणको समयमा बिरुवाले कुन ग्यास सोस्छ?" },
  gasOut: { en:"Which gas do plants release during photosynthesis?", hi:"प्रकाश संश्लेषण के दौरान पौधे कौन सी गैस छोड़ते हैं?", ta:"ஒளிச்சேர்க்கையின் போது தாவரங்கள் எந்த வாயுவை வெளியிடுகின்றன?", te:"కిరణజన్య సంయోగక్రియలో మొక్కలు ఏ వాయువును విడుదల చేస్తాయి?", bn:"সালোকসংশ্লেষণের সময় গাছ কোন গ্যাস নির্গত করে?", mr:"प्रकाशसंश्लेषणादरम्यान वनस्पती कोणता वायू सोडतात?", gu:"પ્રકાશસંશ્લેષણ દરમિયાન છોડ કયો વાયુ છોડે છે?", kn:"ದ್ಯುತಿಸಂಶ್ಲೇಷಣೆಯಲ್ಲಿ ಸಸ್ಯಗಳು ಯಾವ ಅನಿಲವನ್ನು ಬಿಡುಗಡೆ ಮಾಡುತ್ತವೆ?", ml:"പ്രകാശസംശ്ലേഷണത്തിൽ സസ്യങ്ങൾ ഏത് വാതകം പുറത്തുവിടുന്നു?", pa:"ਪ੍ਰਕਾਸ਼ ਸੰਸ਼ਲੇਸ਼ਣ ਦੌਰਾਨ ਪੌਦੇ ਕਿਹੜੀ ਗੈਸ ਛੱਡਦੇ ਹਨ?", ur:"ضیائی تالیف کے دوران پودے کون سی گیس خارج کرتے ہیں؟", or:"ଆଲୋକ ସଂଶ୍ଳେଷଣ ସମୟରେ ଉଦ୍ଭିଦ କେଉଁ ଗ୍ୟାସ ଛାଡ଼େ?", ne:"प्रकाश संश्लेषणको समयमा बिरुवाले कुन ग्यास छोड्छ?" },
  eatPlantsOnly: { en:"An animal that eats only plants is called:", hi:"केवल पौधे खाने वाला जानवर कहलाता है:", ta:"தாவரங்களை மட்டும் உண்ணும் விலங்கு எவ்வாறு அழைக்கப்படுகிறது:", te:"కేవలం మొక్కలను తినే జంతువును ఏమంటారు:", bn:"যে প্রাণী শুধু উদ্ভিদ খায় তাকে বলে:", mr:"फक्त वनस्पती खाणाऱ्या प्राण्याला म्हणतात:", gu:"માત્ર છોડ ખાનાર પ્રાણી કહેવાય:", kn:"ಸಸ್ಯಗಳನ್ನು ಮಾತ್ರ ತಿನ್ನುವ ಪ್ರಾಣಿಯನ್ನು ಕರೆಯುತ್ತಾರೆ:", ml:"സസ്യങ്ങൾ മാത്രം കഴിക്കുന്ന മൃഗത്തെ വിളിക്കുന്നത്:", pa:"ਸਿਰਫ਼ ਪੌਦੇ ਖਾਣ ਵਾਲਾ ਜਾਨਵਰ ਕਹਾਉਂਦਾ ਹੈ:", ur:"صرف پودے کھانے والا جانور کہلاتا ہے:", or:"କେବଳ ଉଦ୍ଭିଦ ଖାଉଥିବା ପ୍ରାଣୀକୁ କୁହାଯାଏ:", ne:"बिरुवा मात्र खाने जनावरलाई भनिन्छ:" },
  eatMeatOnly: { en:"An animal that eats only other animals is called:", hi:"केवल दूसरे जानवरों को खाने वाला जानवर कहलाता है:", ta:"மற்ற விலங்குகளை மட்டும் உண்ணும் விலங்கு அழைக்கப்படுகிறது:", te:"కేవలం ఇతర జంతువులను తినే జంతువును ఏమంటారు:", bn:"যে প্রাণী শুধু অন্য প্রাণী খায় তাকে বলে:", mr:"फक्त इतर प्राणी खाणाऱ्या प्राण्याला म्हणतात:", gu:"માત્ર બીજા પ્રાણી ખાનાર પ્રાણી કહેવાય:", kn:"ಇತರ ಪ್ರಾಣಿಗಳನ್ನು ಮಾತ್ರ ತಿನ್ನುವ ಪ್ರಾಣಿಯನ್ನು ಕರೆಯುತ್ತಾರೆ:", ml:"മറ്റ് മൃഗങ്ങളെ മാത്രം കഴിക്കുന്ന മൃഗത്തെ വിളിക്കുന്നത്:", pa:"ਸਿਰਫ਼ ਹੋਰ ਜਾਨਵਰ ਖਾਣ ਵਾਲਾ ਜਾਨਵਰ ਕਹਾਉਂਦਾ ਹੈ:", ur:"صرف دوسرے جانور کھانے والا جانور کہلاتا ہے:", or:"କେବଳ ଅନ୍ୟ ପ୍ରାଣୀ ଖାଉଥିବା ପ୍ରାଣୀକୁ କୁହାଯାଏ:", ne:"अन्य जनावर मात्र खाने जनावरलाई भनिन्छ:" },
  vaporise: { en:"The change of a liquid into vapour on heating is called:", hi:"गर्म करने पर द्रव का वाष्प में बदलना कहलाता है:", ta:"வெப்பப்படுத்தும்போது திரவம் நீராவியாக மாறுவது அழைக்கப்படுகிறது:", te:"వేడి చేసినప్పుడు ద్రవం ఆవిరిగా మారడాన్ని అంటారు:", bn:"গরম করলে তরল বাষ্পে পরিণত হওয়াকে বলে:", mr:"गरम केल्यावर द्रवाचे वाफेत रूपांतर होणे म्हणतात:", gu:"ગરમ કરવાથી પ્રવાહી વરાળમાં ફેરવાય તેને કહેવાય:", kn:"ಬಿಸಿ ಮಾಡಿದಾಗ ದ್ರವ ಆವಿಯಾಗಿ ಬದಲಾಗುವುದನ್ನು ಕರೆಯುತ್ತಾರೆ:", ml:"ചൂടാക്കുമ്പോൾ ദ്രാവകം നീരാവിയായി മാറുന്നതിനെ വിളിക്കുന്നത്:", pa:"ਗਰਮ ਕਰਨ 'ਤੇ ਤਰਲ ਦਾ ਭਾਫ਼ ਵਿੱਚ ਬਦਲਣਾ ਕਹਾਉਂਦਾ ਹੈ:", ur:"گرم کرنے پر مائع کا بخارات میں تبدیل ہونا کہلاتا ہے:", or:"ଗରମ କଲେ ତରଳ ବାଷ୍ପରେ ପରିଣତ ହେବାକୁ କୁହାଯାଏ:", ne:"तताउँदा तरल वाष्पमा परिणत हुनुलाई भनिन्छ:" },
  acidTaste: { en:"Acids usually taste:", hi:"अम्ल आमतौर पर किस स्वाद के होते हैं:", ta:"அமிலங்கள் பொதுவாக எந்த சுவை கொண்டவை:", te:"ఆమ్లాలు సాధారణంగా ఎలా ఉంటాయి (రుచి):", bn:"অ্যাসিড সাধারণত কেমন স্বাদের হয়:", mr:"आम्ल सहसा कोणत्या चवीचे असतात:", gu:"એસિડ સામાન્ય રીતે કેવા સ્વાદના હોય છે:", kn:"ಆಮ್ಲಗಳು ಸಾಮಾನ್ಯವಾಗಿ ಯಾವ ರುಚಿ:", ml:"ആസിഡുകൾ സാധാരണയായി എന്ത് രുചിയാണ്:", pa:"ਤੇਜ਼ਾਬ ਆਮ ਤੌਰ 'ਤੇ ਕਿਸ ਸੁਆਦ ਦੇ ਹੁੰਦੇ ਹਨ:", ur:"تیزاب عام طور پر کس ذائقے کے ہوتے ہیں:", or:"ଅମ୍ଳ ସାଧାରଣତଃ କେଉଁ ସ୍ୱାଦର ହୋଇଥାଏ:", ne:"अम्ल सामान्यतया कस्तो स्वादको हुन्छ:" },
  natureLemon: { en:"Lemon juice is an example of a substance that is:", hi:"नींबू का रस किस प्रकार के पदार्थ का उदाहरण है:", ta:"எலுமிச்சை சாறு எந்த வகைப் பொருளுக்கு உதாரணம்:", te:"నిమ్మరసం ఏ రకమైన పదార్థానికి ఉదాహరణ:", bn:"লেবুর রস কোন ধরনের পদার্থের উদাহরণ:", mr:"लिंबाचा रस कोणत्या प्रकारच्या पदार्थाचे उदाहरण आहे:", gu:"લીંબુનો રસ કયા પ્રકારના પદાર્થનું ઉદાહરણ છે:", kn:"ನಿಂಬೆ ರಸ ಯಾವ ರೀತಿಯ ಪದಾರ್ಥಕ್ಕೆ ಉದಾಹರಣೆ:", ml:"നാരങ്ങാനീര് ഏത് തരം പദാർത്ഥത്തിന്റെ ഉദാഹരണമാണ്:", pa:"ਨਿੰਬੂ ਦਾ ਰਸ ਕਿਸ ਕਿਸਮ ਦੇ ਪਦਾਰਥ ਦੀ ਉਦਾਹਰਨ ਹੈ:", ur:"لیموں کا رس کس قسم کے مادے کی مثال ہے:", or:"ଲେମ୍ବୁ ରସ କେଉଁ ପ୍ରକାର ପଦାର୍ଥର ଉଦାହରଣ:", ne:"कागतीको रस कुन प्रकारको पदार्थको उदाहरण हो:" },
  chemQ: { en:"What is the chemical symbol of this element?", hi:"इस तत्व का रासायनिक प्रतीक क्या है?", ta:"இந்த தனிமத்தின் வேதியியல் குறியீடு என்ன?", te:"ఈ మూలకం యొక్క రసాయన సంకేతం ఏమిటి?", bn:"এই মৌলের রাসায়নিক প্রতীক কী?", mr:"या मूलद्रव्याचे रासायनिक चिन्ह काय आहे?", gu:"આ તત્ત્વનું રાસાયણિક પ્રતીક શું છે?", kn:"ಈ ಧಾತುವಿನ ರಾಸಾಯನಿಕ ಸಂಕೇತ ಯಾವುದು?", ml:"ഈ മൂലകത്തിന്റെ രാസ ചിഹ്നം എന്ത്?", pa:"ਇਸ ਤੱਤ ਦਾ ਰਸਾਇਣਕ ਚਿੰਨ੍ਹ ਕੀ ਹੈ?", ur:"اس عنصر کی کیمیائی علامت کیا ہے؟", or:"ଏହି ମୌଳିକର ରାସାୟନିକ ପ୍ରତୀକ କ'ଣ?", ne:"यो तत्त्वको रासायनिक प्रतीक के हो?" },
  formulaWater: { en:"What is the chemical formula of water?", hi:"पानी का रासायनिक सूत्र क्या है?", ta:"நீரின் வேதியியல் வாய்ப்பாடு என்ன?", te:"నీటి రసాయన సూత్రం ఏమిటి?", bn:"জলের রাসায়নিক সংকেত কী?", mr:"पाण्याचे रासायनिक सूत्र काय आहे?", gu:"પાણીનું રાસાયણિક સૂત્ર શું છે?", kn:"ನೀರಿನ ರಾಸಾಯನಿಕ ಸೂತ್ರ ಯಾವುದು?", ml:"വെള്ളത്തിന്റെ രാസസൂത്രം എന്ത്?", pa:"ਪਾਣੀ ਦਾ ਰਸਾਇਣਕ ਫਾਰਮੂਲਾ ਕੀ ਹੈ?", ur:"پانی کا کیمیائی فارمولا کیا ہے؟", or:"ପାଣିର ରାସାୟନିକ ସୂତ୍ର କ'ଣ?", ne:"पानीको रासायनिक सूत्र के हो?" },
  formulaCO2: { en:"What is the chemical formula of carbon dioxide?", hi:"कार्बन डाइऑक्साइड का रासायनिक सूत्र क्या है?", ta:"கார்பன் டை ஆக்சைடின் வேதியியல் வாய்ப்பாடு என்ன?", te:"కార్బన్ డయాక్సైడ్ రసాయన సూత్రం ఏమిటి?", bn:"কার্বন ডাই-অক্সাইডের রাসায়নিক সংকেত কী?", mr:"कार्बन डायऑक्साइडचे रासायनिक सूत्र काय आहे?", gu:"કાર્બન ડાયોક્સાઇડનું રાસાયણિક સૂત્ર શું છે?", kn:"ಇಂಗಾಲದ ಡೈಆಕ್ಸೈಡ್‌ನ ರಾಸಾಯನಿಕ ಸೂತ್ರ ಯಾವುದು?", ml:"കാർബൺ ഡൈ ഓക്സൈഡിന്റെ രാസസൂത്രം എന്ത്?", pa:"ਕਾਰਬਨ ਡਾਈਆਕਸਾਈਡ ਦਾ ਰਸਾਇਣਕ ਫਾਰਮੂਲਾ ਕੀ ਹੈ?", ur:"کاربن ڈائی آکسائیڈ کا کیمیائی فارمولا کیا ہے؟", or:"କାର୍ବନ ଡାଇଅକ୍ସାଇଡର ରାସାୟନିକ ସୂତ୍ର କ'ଣ?", ne:"कार्बन डाइअक्साइडको रासायनिक सूत्र के हो?" },
  forceUnit: { en:"What is the SI unit of force?", hi:"बल की SI इकाई क्या है?", ta:"விசையின் SI அலகு என்ன?", te:"బలం యొక్క SI ప్రమాణం ఏమిటి?", bn:"বলের SI একক কী?", mr:"बलाचे SI एकक काय आहे?", gu:"બળનું SI એકમ શું છે?", kn:"ಬಲದ SI ಏಕಮಾನ ಯಾವುದು?", ml:"ബലത്തിന്റെ SI യൂണിറ്റ് എന്ത്?", pa:"ਬਲ ਦੀ SI ਇਕਾਈ ਕੀ ਹੈ?", ur:"قوت کی SI اکائی کیا ہے؟", or:"ବଳର SI ଏକକ କ'ଣ?", ne:"बलको SI एकाइ के हो?" },
  energyUnit: { en:"What is the SI unit of energy?", hi:"ऊर्जा की SI इकाई क्या है?", ta:"ஆற்றலின் SI அலகு என்ன?", te:"శక్తి యొక్క SI ప్రమాణం ఏమిటి?", bn:"শক্তির SI একক কী?", mr:"ऊर्जेचे SI एकक काय आहे?", gu:"ઊર્જાનું SI એકમ શું છે?", kn:"ಶಕ್ತಿಯ SI ಏಕಮಾನ ಯಾವುದು?", ml:"ഊർജ്ജത്തിന്റെ SI യൂണിറ്റ് എന്ത്?", pa:"ਊਰਜਾ ਦੀ SI ਇਕਾਈ ਕੀ ਹੈ?", ur:"توانائی کی SI اکائی کیا ہے؟", or:"ଶକ୍ତିର SI ଏକକ କ'ଣ?", ne:"ऊर्जाको SI एकाइ के हो?" },
  powerUnit: { en:"What is the SI unit of power?", hi:"शक्ति की SI इकाई क्या है?", ta:"திறனின் SI அலகு என்ன?", te:"సామర్థ్యం యొక్క SI ప్రమాణం ఏమిటి?", bn:"ক্ষমতার SI একক কী?", mr:"शक्तीचे SI एकक काय आहे?", gu:"પાવરનું SI એકમ શું છે?", kn:"ಶಕ್ತಿಯ (power) SI ಏಕಮಾನ ಯಾವುದು?", ml:"പവറിന്റെ SI യൂണിറ്റ് എന്ത്?", pa:"ਪਾਵਰ ਦੀ SI ਇਕਾਈ ਕੀ ਹੈ?", ur:"طاقت کی SI اکائی کیا ہے؟", or:"ପାୱାରର SI ଏକକ କ'ଣ?", ne:"शक्तिको SI एकाइ के हो?" },
  currentUnit: { en:"What is the SI unit of electric current?", hi:"विद्युत धारा की SI इकाई क्या है?", ta:"மின்னோட்டத்தின் SI அலகு என்ன?", te:"విద్యుత్ ప్రవాహం యొక్క SI ప్రమాణం ఏమిటి?", bn:"তড়িৎ প্রবাহের SI একক কী?", mr:"विद्युत प्रवाहाचे SI एकक काय आहे?", gu:"વિદ્યુત પ્રવાહનું SI એકમ શું છે?", kn:"ವಿದ್ಯುತ್ ಪ್ರವಾಹದ SI ಏಕಮಾನ ಯಾವುದು?", ml:"വൈദ്യുത പ്രവാഹത്തിന്റെ SI യൂണിറ്റ് എന്ത്?", pa:"ਬਿਜਲਈ ਕਰੰਟ ਦੀ SI ਇਕਾਈ ਕੀ ਹੈ?", ur:"برقی رو کی SI اکائی کیا ہے؟", or:"ବିଦ୍ୟୁତ୍ ପ୍ରବାହର SI ଏକକ କ'ଣ?", ne:"विद्युत् धाराको SI एकाइ के हो?" },
  heredity: { en:"Who is known as the Father of Genetics?", hi:"आनुवंशिकी का जनक किसे कहा जाता है?", ta:"மரபியலின் தந்தை என அழைக்கப்படுபவர் யார்?", te:"జన్యుశాస్త్ర పితామహుడు ఎవరు?", bn:"বংশগতিবিদ্যার জনক কে?", mr:"आनुवंशिकीचे जनक कोणाला म्हणतात?", gu:"જનીનશાસ્ત્રના પિતા કોણ ગણાય છે?", kn:"ತಳಿಶಾಸ್ತ್ರದ ಪಿತಾಮಹ ಯಾರು?", ml:"ജനിതകശാസ്ത്രത്തിന്റെ പിതാവ് ആര്?", pa:"ਜੈਨੇਟਿਕਸ ਦਾ ਪਿਤਾਮਾ ਕਿਸਨੂੰ ਕਿਹਾ ਜਾਂਦਾ ਹੈ?", ur:"جینیات کا باپ کسے کہا جاتا ہے؟", or:"ବଂଶାନୁକ୍ରମ ବିଜ୍ଞାନର ପିତା କିଏ?", ne:"आनुवंशिकीका पिता कसलाई भनिन्छ?" },
  powerhouse: { en:"Which organelle is called the powerhouse of the cell?", hi:"कोशिका का पावरहाउस किस अंगक को कहा जाता है?", ta:"செல்லின் மின்சக்தி நிலையம் என அழைக்கப்படும் நுண்ணுறுப்பு எது?", te:"కణం యొక్క శక్తి కేంద్రం అని ఏ అంగకాన్ని అంటారు?", bn:"কোষের শক্তিঘর কোন অঙ্গাণুকে বলা হয়?", mr:"पेशीचे पॉवरहाऊस कोणत्या अंगकाला म्हणतात?", gu:"કોષનું પાવરહાઉસ કયા અંગિકાને કહેવાય છે?", kn:"ಜೀವಕೋಶದ ಶಕ್ತಿ ಕೇಂದ್ರ ಎಂದು ಯಾವ ಅಂಗಕವನ್ನು ಕರೆಯುತ್ತಾರೆ?", ml:"കോശത്തിന്റെ ഊർജ്ജകേന്ദ്രം എന്ന് ഏത് അവയവാംശത്തെ വിളിക്കുന്നു?", pa:"ਸੈੱਲ ਦਾ ਪਾਵਰਹਾਊਸ ਕਿਸ ਅੰਗਕ ਨੂੰ ਕਿਹਾ ਜਾਂਦਾ ਹੈ?", ur:"خلیے کا پاور ہاؤس کس عضویہ کو کہا جاتا ہے؟", or:"କୋଷର ପାୱାରହାଉସ କେଉଁ ଅଙ୍ଗାଣୁକୁ କୁହାଯାଏ?", ne:"कोषको पावरहाउस कुन अंगकलाई भनिन्छ?" },
  // Social Studies
  founderMughal: { en:"Who founded the Mughal Empire in India?", hi:"भारत में मुग़ल साम्राज्य की स्थापना किसने की?", ta:"இந்தியாவில் முகலாயப் பேரரசை நிறுவியவர் யார்?", te:"భారతదేశంలో మొఘల్ సామ్రాజ్యాన్ని ఎవరు స్థాపించారు?", bn:"ভারতে মুঘল সাম্রাজ্য কে প্রতিষ্ঠা করেন?", mr:"भारतात मुघल साम्राज्याची स्थापना कोणी केली?", gu:"ભારતમાં મુઘલ સામ્રાજ્યની સ્થાપના કોણે કરી?", kn:"ಭಾರತದಲ್ಲಿ ಮೊಘಲ್ ಸಾಮ್ರಾಜ್ಯವನ್ನು ಸ್ಥಾಪಿಸಿದವರು ಯಾರು?", ml:"ഇന്ത്യയിൽ മുഗൾ സാമ്രാജ്യം സ്ഥാപിച്ചത് ആര്?", pa:"ਭਾਰਤ ਵਿੱਚ ਮੁਗਲ ਸਾਮਰਾਜ ਦੀ ਸਥਾਪਨਾ ਕਿਸਨੇ ਕੀਤੀ?", ur:"بھارت میں مغل سلطنت کی بنیاد کس نے رکھی؟", or:"ଭାରତରେ ମୋଗଲ ସାମ୍ରାଜ୍ୟ କିଏ ପ୍ରତିଷ୍ଠା କଲେ?", ne:"भारतमा मुगल साम्राज्यको स्थापना कसले गर्‍यो?" },
  builtTaj: { en:"Which Mughal emperor built the Taj Mahal?", hi:"ताजमहल किस मुग़ल सम्राट ने बनवाया?", ta:"தாஜ்மஹாலைக் கட்டிய முகலாய பேரரசர் யார்?", te:"తాజ్ మహల్‌ను నిర్మించిన మొఘల్ చక్రవర్తి ఎవరు?", bn:"কোন মুঘল সম্রাট তাজমহল নির্মাণ করেন?", mr:"ताजमहाल कोणत्या मुघल सम्राटाने बांधला?", gu:"તાજમહેલ કયા મુઘલ સમ્રાટે બંધાવ્યો?", kn:"ತಾಜ್ ಮಹಲ್ ಕಟ್ಟಿಸಿದ ಮೊಘಲ್ ಚಕ್ರವರ್ತಿ ಯಾರು?", ml:"താജ്മഹൽ പണിത മുഗൾ ചക്രവർത്തി ആര്?", pa:"ਤਾਜ ਮਹਿਲ ਕਿਸ ਮੁਗਲ ਬਾਦਸ਼ਾਹ ਨੇ ਬਣਵਾਇਆ?", ur:"تاج محل کس مغل بادشاہ نے بنوایا؟", or:"ତାଜମହଲ କେଉଁ ମୋଗଲ ସମ୍ରାଟ ନିର୍ମାଣ କଲେ?", ne:"ताजमहल कुन मुगल सम्राटले बनाए?" },
  fatherNation: { en:"Who is called the Father of the Nation in India?", hi:"भारत में राष्ट्रपिता किसे कहा जाता है?", ta:"இந்தியாவில் தேசப் பிதா என அழைக்கப்படுபவர் யார்?", te:"భారతదేశంలో జాతిపిత అని ఎవరిని అంటారు?", bn:"ভারতে জাতির জনক কাকে বলা হয়?", mr:"भारतात राष्ट्रपिता कोणाला म्हणतात?", gu:"ભારતમાં રાષ્ટ્રપિતા કોને કહેવાય છે?", kn:"ಭಾರತದಲ್ಲಿ ರಾಷ್ಟ್ರಪಿತ ಎಂದು ಯಾರನ್ನು ಕರೆಯುತ್ತಾರೆ?", ml:"ഇന്ത്യയിൽ രാഷ്ട്രപിതാവ് എന്ന് വിളിക്കുന്നത് ആരെ?", pa:"ਭਾਰਤ ਵਿੱਚ ਰਾਸ਼ਟਰ ਪਿਤਾ ਕਿਸਨੂੰ ਕਿਹਾ ਜਾਂਦਾ ਹੈ?", ur:"بھارت میں بابائے قوم کسے کہا جاتا ہے؟", or:"ଭାରତରେ ଜାତିର ପିତା କାହାକୁ କୁହାଯାଏ?", ne:"भारतमा राष्ट्रपिता कसलाई भनिन्छ?" },
  firstPM: { en:"Who was the first Prime Minister of India?", hi:"भारत के पहले प्रधानमंत्री कौन थे?", ta:"இந்தியாவின் முதல் பிரதமர் யார்?", te:"భారతదేశ మొదటి ప్రధానమంత్రి ఎవరు?", bn:"ভারতের প্রথম প্রধানমন্ত্রী কে ছিলেন?", mr:"भारताचे पहिले पंतप्रधान कोण होते?", gu:"ભારતના પ્રથમ વડાપ્રધાન કોણ હતા?", kn:"ಭಾರತದ ಮೊದಲ ಪ್ರಧಾನಮಂತ್ರಿ ಯಾರು?", ml:"ഇന്ത്യയുടെ ആദ്യ പ്രധാനമന്ത്രി ആര്?", pa:"ਭਾਰਤ ਦੇ ਪਹਿਲੇ ਪ੍ਰਧਾਨ ਮੰਤਰੀ ਕੌਣ ਸਨ?", ur:"بھارت کے پہلے وزیر اعظم کون تھے؟", or:"ଭାରତର ପ୍ରଥମ ପ୍ରଧାନମନ୍ତ୍ରୀ କିଏ ଥିଲେ?", ne:"भारतका पहिलो प्रधानमन्त्री को थिए?" },
  firstPresident: { en:"Who was the first President of India?", hi:"भारत के पहले राष्ट्रपति कौन थे?", ta:"இந்தியாவின் முதல் குடியரசுத் தலைவர் யார்?", te:"భారతదేశ మొదటి రాష్ట్రపతి ఎవరు?", bn:"ভারতের প্রথম রাষ্ট্রপতি কে ছিলেন?", mr:"भारताचे पहिले राष्ट्रपती कोण होते?", gu:"ભારતના પ્રથમ રાષ્ટ્રપતિ કોણ હતા?", kn:"ಭಾರತದ ಮೊದಲ ರಾಷ್ಟ್ರಪತಿ ಯಾರು?", ml:"ഇന്ത്യയുടെ ആദ്യ രാഷ്ട്രപതി ആര്?", pa:"ਭਾਰਤ ਦੇ ਪਹਿਲੇ ਰਾਸ਼ਟਰਪਤੀ ਕੌਣ ਸਨ?", ur:"بھارت کے پہلے صدر کون تھے؟", or:"ଭାରତର ପ୍ରଥମ ରାଷ୍ଟ୍ରପତି କିଏ ଥିଲେ?", ne:"भारतका पहिलो राष्ट्रपति को थिए?" },
  constitution: { en:"Who is known as the chief architect of the Indian Constitution?", hi:"भारतीय संविधान का मुख्य निर्माता किसे कहा जाता है?", ta:"இந்திய அரசியலமைப்பின் தலைமைச் சிற்பி என அழைக்கப்படுபவர் யார்?", te:"భారత రాజ్యాంగ ప్రధాన రూపశిల్పి ఎవరు?", bn:"ভারতীয় সংবিধানের প্রধান রূপকার কাকে বলা হয়?", mr:"भारतीय संविधानाचे शिल्पकार कोणाला म्हणतात?", gu:"ભારતીય બંધારણના મુખ્ય ઘડવૈયા કોણ ગણાય છે?", kn:"ಭಾರತ ಸಂವಿಧಾನದ ಪ್ರಮುಖ ಶಿಲ್ಪಿ ಎಂದು ಯಾರನ್ನು ಕರೆಯುತ್ತಾರೆ?", ml:"ഇന്ത്യൻ ഭരണഘടനയുടെ മുഖ്യ ശിൽപി ആരാണ്?", pa:"ਭਾਰਤੀ ਸੰਵਿਧਾਨ ਦਾ ਮੁੱਖ ਨਿਰਮਾਤਾ ਕਿਸਨੂੰ ਕਿਹਾ ਜਾਂਦਾ ਹੈ?", ur:"بھارتی آئین کا مرکزی معمار کسے کہا جاتا ہے؟", or:"ଭାରତୀୟ ସମ୍ବିଧାନର ମୁଖ୍ୟ ରୂପକାର କିଏ?", ne:"भारतीय संविधानका मुख्य निर्माता कसलाई भनिन्छ?" },
  highestPeak: { en:"Which is the highest mountain peak in the world?", hi:"विश्व की सबसे ऊँची पर्वत चोटी कौन सी है?", ta:"உலகின் மிக உயரமான மலைச்சிகரம் எது?", te:"ప్రపంచంలో అత్యంత ఎత్తైన పర్వత శిఖరం ఏది?", bn:"পৃথিবীর সর্বোচ্চ পর্বতশৃঙ্গ কোনটি?", mr:"जगातील सर्वात उंच पर्वतशिखर कोणते?", gu:"વિશ્વનું સૌથી ઊંચું પર્વત શિખર કયું છે?", kn:"ಜಗತ್ತಿನ ಅತಿ ಎತ್ತರದ ಪರ್ವತ ಶಿಖರ ಯಾವುದು?", ml:"ലോകത്തിലെ ഏറ്റവും ഉയരമുള്ള പർവതശിഖരം ഏത്?", pa:"ਦੁਨੀਆ ਦੀ ਸਭ ਤੋਂ ਉੱਚੀ ਪਹਾੜੀ ਚੋਟੀ ਕਿਹੜੀ ਹੈ?", ur:"دنیا کی سب سے اونچی چوٹی کون سی ہے؟", or:"ପୃଥିବୀର ସର୍ବୋଚ୍ଚ ପର୍ବତ ଶୃଙ୍ଗ କେଉଁଟି?", ne:"संसारको सबैभन्दा अग्लो पर्वत चुचुरो कुन हो?" },
  apexCourt: { en:"Which is the highest court in India?", hi:"भारत का सर्वोच्च न्यायालय कौन सा है?", ta:"இந்தியாவின் உயர்ந்த நீதிமன்றம் எது?", te:"భారతదేశంలో అత్యున్నత న్యాయస్థానం ఏది?", bn:"ভারতের সর্বোচ্চ আদালত কোনটি?", mr:"भारतातील सर्वोच्च न्यायालय कोणते?", gu:"ભારતની સર્વોચ્ચ અદાલત કઈ છે?", kn:"ಭಾರತದ ಅತ್ಯುನ್ನತ ನ್ಯಾಯಾಲಯ ಯಾವುದು?", ml:"ഇന്ത്യയിലെ പരമോന്നത കോടതി ഏത്?", pa:"ਭਾਰਤ ਦੀ ਸਭ ਤੋਂ ਵੱਡੀ ਅਦਾਲਤ ਕਿਹੜੀ ਹੈ?", ur:"بھارت کی سب سے بڑی عدالت کون سی ہے؟", or:"ଭାରତର ସର୍ବୋଚ୍ଚ ନ୍ୟାୟାଳୟ କେଉଁଟି?", ne:"भारतको सर्वोच्च अदालत कुन हो?" },
  agriSector: { en:"Farming and mining belong to which sector of the economy?", hi:"खेती और खनन अर्थव्यवस्था के किस क्षेत्र में आते हैं?", ta:"விவசாயம் மற்றும் சுரங்கம் பொருளாதாரத்தின் எந்தத் துறையைச் சேர்ந்தவை?", te:"వ్యవసాయం, గనుల తవ్వకం ఆర్థిక వ్యవస్థలో ఏ రంగానికి చెందుతాయి?", bn:"কৃষি ও খনন অর্থনীতির কোন খাতে পড়ে?", mr:"शेती आणि खाणकाम अर्थव्यवस्थेच्या कोणत्या क्षेत्रात येतात?", gu:"ખેતી અને ખાણકામ અર્થતંત્રના કયા ક્ષેત્રમાં આવે છે?", kn:"ಕೃಷಿ ಮತ್ತು ಗಣಿಗಾರಿಕೆ ಆರ್ಥಿಕತೆಯ ಯಾವ ವಲಯಕ್ಕೆ ಸೇರುತ್ತವೆ?", ml:"കൃഷിയും ഖനനവും സമ്പദ്‌വ്യവസ്ഥയുടെ ഏത് മേഖലയിൽ വരും?", pa:"ਖੇਤੀ ਅਤੇ ਖਣਨ ਅਰਥਵਿਵਸਥਾ ਦੇ ਕਿਹੜੇ ਖੇਤਰ ਵਿੱਚ ਆਉਂਦੇ ਹਨ?", ur:"کھیتی اور کان کنی معیشت کے کس شعبے میں آتے ہیں؟", or:"କୃଷି ଏବଂ ଖଣି ଅର୍ଥନୀତିର କେଉଁ କ୍ଷେତ୍ରରେ ଆସେ?", ne:"खेती र खानी अर्थतन्त्रको कुन क्षेत्रमा पर्छन्?" },
  currencyBank: { en:"Which bank issues currency notes in India?", hi:"भारत में मुद्रा नोट कौन सा बैंक जारी करता है?", ta:"இந்தியாவில் நாணய நோட்டுகளை வெளியிடும் வங்கி எது?", te:"భారతదేశంలో కరెన్సీ నోట్లను ఏ బ్యాంకు జారీ చేస్తుంది?", bn:"ভারতে মুদ্রা নোট কোন ব্যাংক জারি করে?", mr:"भारतात चलनी नोटा कोणती बँक जारी करते?", gu:"ભારતમાં ચલણી નોટ કઈ બેંક બહાર પાડે છે?", kn:"ಭಾರತದಲ್ಲಿ ಕರೆನ್ಸಿ ನೋಟುಗಳನ್ನು ಯಾವ ಬ್ಯಾಂಕ್ ಬಿಡುಗಡೆ ಮಾಡುತ್ತದೆ?", ml:"ഇന്ത്യയിൽ കറൻസി നോട്ടുകൾ ഇറക്കുന്ന ബാങ്ക് ഏത്?", pa:"ਭਾਰਤ ਵਿੱਚ ਕਰੰਸੀ ਨੋਟ ਕਿਹੜਾ ਬੈਂਕ ਜਾਰੀ ਕਰਦਾ ਹੈ?", ur:"بھارت میں کرنسی نوٹ کون سا بینک جاری کرتا ہے؟", or:"ଭାରତରେ ମୁଦ୍ରା ନୋଟ୍ କେଉଁ ବ୍ୟାଙ୍କ ଜାରି କରେ?", ne:"भारतमा मुद्रा नोट कुन बैंकले जारी गर्छ?" },
  elections: { en:"Which body conducts elections in India?", hi:"भारत में चुनाव कौन सी संस्था कराती है?", ta:"இந்தியாவில் தேர்தல்களை நடத்தும் அமைப்பு எது?", te:"భారతదేశంలో ఎన్నికలను ఏ సంస్థ నిర్వహిస్తుంది?", bn:"ভারতে নির্বাচন কোন সংস্থা পরিচালনা করে?", mr:"भारतात निवडणुका कोणती संस्था घेते?", gu:"ભારતમાં ચૂંટણી કઈ સંસ્થા યોજે છે?", kn:"ಭಾರತದಲ್ಲಿ ಚುನಾವಣೆಗಳನ್ನು ಯಾವ ಸಂಸ್ಥೆ ನಡೆಸುತ್ತದೆ?", ml:"ഇന്ത്യയിൽ തിരഞ്ഞെടുപ്പ് നടത്തുന്ന സ്ഥാപനം ഏത്?", pa:"ਭਾਰਤ ਵਿੱਚ ਚੋਣਾਂ ਕਿਹੜੀ ਸੰਸਥਾ ਕਰਵਾਉਂਦੀ ਹੈ?", ur:"بھارت میں انتخابات کون سا ادارہ کراتا ہے؟", or:"ଭାରତରେ ନିର୍ବାଚନ କେଉଁ ସଂସ୍ଥା କରାଏ?", ne:"भारतमा निर्वाचन कुन निकायले गराउँछ?" },
  indusRiver: { en:"The Indus Valley Civilisation developed along which river?", hi:"सिंधु घाटी सभ्यता किस नदी के किनारे विकसित हुई?", ta:"சிந்து சமவெளி நாகரிகம் எந்த நதிக்கரையில் வளர்ந்தது?", te:"సింధు లోయ నాగరికత ఏ నది వెంట అభివృద్ధి చెందింది?", bn:"সিন্ধু সভ্যতা কোন নদীর তীরে গড়ে ওঠে?", mr:"सिंधू संस्कृती कोणत्या नदीकाठी विकसित झाली?", gu:"સિંધુ ખીણ સંસ્કૃતિ કઈ નદીના કિનારે વિકસી?", kn:"ಸಿಂಧೂ ಕಣಿವೆ ನಾಗರಿಕತೆ ಯಾವ ನದಿಯ ಉದ್ದಕ್ಕೂ ಬೆಳೆಯಿತು?", ml:"സിന്ധുനദീതട സംസ്കാരം ഏത് നദിക്കരയിൽ വളർന്നു?", pa:"ਸਿੰਧ ਘਾਟੀ ਸੱਭਿਅਤਾ ਕਿਹੜੀ ਨਦੀ ਦੇ ਕੰਢੇ ਵਿਕਸਿਤ ਹੋਈ?", ur:"وادی سندھ کی تہذیب کس دریا کے کنارے پروان چڑھی؟", or:"ସିନ୍ଧୁ ଉପତ୍ୟକା ସଭ୍ୟତା କେଉଁ ନଦୀ କୂଳରେ ବିକଶିତ ହେଲା?", ne:"सिन्धु घाटी सभ्यता कुन नदीको किनारमा विकसित भयो?" },
};

// ── Facts per file (--> answers language-neutral where possible) ──
const FACTS = {
  "6-science": [
    F(P.eatPlantsOnly, "Herbivore", ["Carnivore","Omnivore","Photosynthesis"]),
    F(P.eatMeatOnly, "Carnivore", ["Herbivore","Omnivore","Respiration"]),
    F(P.photo, "Photosynthesis", ["Respiration","Digestion","Evaporation"]),
    F(P.vaporise, "Evaporation", ["Condensation","Respiration","Digestion"]),
    F(P.natureLemon, "Acidic", ["Basic","Neutral","Sweet"]),
    F(P.acidTaste, "Sour", ["Sweet","Salty","Bitter"]),
    FE(P.chemQ, "Fe", ["Ir","In","Fr"], "Iron"),
    FE(P.chemQ, "Au", ["Ag","Gd","Go"], "Gold"),
    FE(P.chemQ, "Ag", ["Au","Si","Sr"], "Silver"),
  ],
  "7-science": [
    F(P.photo, "Photosynthesis", ["Respiration","Condensation","Digestion"]),
    F(P.gasIn, "Carbon dioxide", ["Oxygen","Nitrogen","Hydrogen"]),
    F(P.gasOut, "Oxygen", ["Carbon dioxide","Nitrogen","Hydrogen"]),
    F(P.vaporise, "Evaporation", ["Condensation","Digestion","Respiration"]),
    FE(P.chemQ, "Na", ["So","Sd","Nu"], "Sodium"),
    FE(P.chemQ, "K", ["Po","Pt","Ka"], "Potassium"),
    FE(P.chemQ, "Ca", ["Cl","Cm","Co"], "Calcium"),
    FE(P.chemQ, "Cu", ["Co","Cr","Ce"], "Copper"),
    FE(P.chemQ, "Zn", ["Zi","Zc","Zo"], "Zinc"),
  ],
  "8-science": [
    F(P.natureLemon, "Acidic", ["Basic","Neutral","Salty"]),
    FE(P.formulaWater, "H₂O", ["HO₂","H₂O₂","OH"]),
    FE(P.formulaCO2, "CO₂", ["CO","C₂O","CO₃"]),
    FE(P.chemQ, "O", ["Ox","Og","On"], "Oxygen"),
    FE(P.chemQ, "H", ["Hy","Hg","He"], "Hydrogen"),
    FE(P.chemQ, "N", ["Ni","Na","Ne"], "Nitrogen"),
    FE(P.chemQ, "Al", ["Am","Au","Ag"], "Aluminium"),
    F(P.vaporise, "Evaporation", ["Condensation","Respiration","Digestion"]),
  ],
  "9-science": [
    F(P.powerhouse, "Mitochondria", ["Nucleus","Ribosome","Chloroplast"]),
    FE(P.forceUnit, "Newton", ["Joule","Watt","Pascal"]),
    FE(P.energyUnit, "Joule", ["Newton","Watt","Ampere"]),
    FE(P.powerUnit, "Watt", ["Joule","Newton","Volt"]),
    FE(P.formulaWater, "H₂O", ["H₂O₂","HO","OH"]),
    FE(P.chemQ, "Na", ["Ni","Nb","No"], "Sodium"),
    FN({ en:"How many bones are in the adult human body?", hi:"वयस्क मानव शरीर में कितनी हड्डियाँ होती हैं?", ta:"வயது வந்த மனித உடலில் எத்தனை எலும்புகள்?", te:"పెద్దవారి శరీరంలో ఎన్ని ఎముకలు?", bn:"প্রাপ্তবয়স্ক মানবদেহে কতটি হাড়?", mr:"प्रौढ मानवी शरीरात किती हाडे?", gu:"પુખ્ત માનવ શરીરમાં કેટલાં હાડકાં?", kn:"ವಯಸ್ಕ ಮಾನವ ದೇಹದಲ್ಲಿ ಎಷ್ಟು ಮೂಳೆಗಳು?", ml:"മുതിർന്ന മനുഷ്യശരീരത്തിൽ എത്ര അസ്ഥികൾ?", pa:"ਬਾਲਗ ਮਨੁੱਖੀ ਸਰੀਰ ਵਿੱਚ ਕਿੰਨੀਆਂ ਹੱਡੀਆਂ?", ur:"بالغ انسانی جسم میں کتنی ہڈیاں؟", or:"ବୟସ୍କ ମାନବ ଶରୀରରେ କେତେ ହାଡ଼?", ne:"वयस्क मानव शरीरमा कति हड्डी?" }, 206, [201, 212, 300]),
  ],
  "10-science": [
    F(P.heredity, "Mendel", ["Buddha","Ashoka","Gandhi"]),
    FE(P.formulaWater, "H₂O", ["H₂O₂","HO","H₃O"]),
    FE(P.formulaCO2, "CO₂", ["CO","CO₃","C₂O"]),
    FE(P.chemQ, "Na", ["Ne","Ni","No"], "Sodium (common salt NaCl)"),
    FE(P.currentUnit, "Ampere", ["Volt","Ohm","Watt"]),
    FE(P.energyUnit, "Joule", ["Newton","Watt","Pascal"]),
    FE(P.forceUnit, "Newton", ["Joule","Pascal","Ampere"]),
    F(P.powerhouse, "Mitochondria", ["Nucleus","Ribosome","Vacuole"]),
  ],
  "6-social-studies": [
    F(P.indusRiver, "Indus", ["Ganga","Everest","Chola"]),
    F(P.founderMughal, "Babur", ["Akbar","Ashoka","ShahJahan"]),
    F(P.builtTaj, "ShahJahan", ["Akbar","Babur","Aurangzeb"]),
    F(P.highestPeak, "Everest", ["K2","Kanchenjunga","Himalayas"]),
    F({ en:"Along which river did the earliest Vedic culture compose the Rigveda?", hi:"आरंभिक वैदिक संस्कृति ने ऋग्वेद किस नदी क्षेत्र में रचा?", ta:"ஆரம்பகால வேத பண்பாடு ரிக் வேதத்தை எந்த நதிப் பகுதியில் இயற்றியது?", te:"తొలి వేద సంస్కృతి ఋగ్వేదాన్ని ఏ నదీ ప్రాంతంలో రచించింది?", bn:"আদি বৈদিক সংস্কৃতি কোন নদী অঞ্চলে ঋগ্বেদ রচনা করে?", mr:"आरंभिक वैदिक संस्कृतीने ऋग्वेद कोणत्या नदीक्षेत्रात रचला?", gu:"પ્રારંભિક વૈદિક સંસ્કૃતિએ ઋગ્વેદ કઈ નદી પ્રદેશમાં રચ્યો?", kn:"ಆರಂಭಿಕ ವೈದಿಕ ಸಂಸ್ಕೃತಿ ಋಗ್ವೇದವನ್ನು ಯಾವ ನದೀ ಪ್ರದೇಶದಲ್ಲಿ ರಚಿಸಿತು?", ml:"ആദ്യകാല വേദസംസ്കാരം ഋഗ്വേദം ഏത് നദീതടത്തിൽ രചിച്ചു?", pa:"ਮੁੱਢਲੀ ਵੈਦਿਕ ਸੰਸਕ੍ਰਿਤੀ ਨੇ ਰਿਗਵੇਦ ਕਿਹੜੇ ਨਦੀ ਖੇਤਰ ਵਿੱਚ ਰਚਿਆ?", ur:"ابتدائی ویدک ثقافت نے رگ وید کس دریا کے علاقے میں لکھا؟", or:"ପ୍ରାରମ୍ଭିକ ବୈଦିକ ସଂସ୍କୃତି ଋଗ୍ବେଦ କେଉଁ ନଦୀ ଅଞ୍ଚଳରେ ରଚନା କଲା?", ne:"प्रारम्भिक वैदिक संस्कृतिले ऋग्वेद कुन नदी क्षेत्रमा रचना गर्‍यो?" }, "Indus", ["Everest","Chola","Gupta"]),
  ],
  "7-social-studies": [
    F(P.founderMughal, "Babur", ["Akbar","Aurangzeb","Ashoka"]),
    F(P.builtTaj, "ShahJahan", ["Akbar","Babur","Aurangzeb"]),
    F({ en:"Which dynasty ruled the Mauryan Empire under Ashoka?", hi:"अशोक के अधीन किस वंश ने मौर्य साम्राज्य पर शासन किया?", ta:"அசோகரின் கீழ் மௌரியப் பேரரசை ஆண்ட வம்சம் எது?", te:"అశోకుని కాలంలో మౌర్య సామ్రాజ్యాన్ని పాలించిన వంశం ఏది?", bn:"অশোকের অধীনে কোন রাজবংশ মৌর্য সাম্রাজ্য শাসন করত?", mr:"अशोकाच्या काळात मौर्य साम्राज्यावर कोणत्या वंशाने राज्य केले?", gu:"અશોક હેઠળ કયા વંશે મૌર્ય સામ્રાજ્ય પર શાસન કર્યું?", kn:"ಅಶೋಕನ ಅಡಿಯಲ್ಲಿ ಮೌರ್ಯ ಸಾಮ್ರಾಜ್ಯವನ್ನು ಆಳಿದ ವಂಶ ಯಾವುದು?", ml:"അശോകന്റെ കീഴിൽ മൗര്യ സാമ്രാജ്യം ഭരിച്ച രാജവംശം ഏത്?", pa:"ਅਸ਼ੋਕ ਦੇ ਅਧੀਨ ਕਿਸ ਵੰਸ਼ ਨੇ ਮੌਰੀਆ ਸਾਮਰਾਜ 'ਤੇ ਰਾਜ ਕੀਤਾ?", ur:"اشوک کے تحت کس خاندان نے موریہ سلطنت پر حکومت کی؟", or:"ଅଶୋକଙ୍କ ଅଧୀନରେ କେଉଁ ବଂଶ ମୌର୍ଯ୍ୟ ସାମ୍ରାଜ୍ୟ ଶାସନ କଲା?", ne:"अशोकको अधीनमा कुन वंशले मौर्य साम्राज्य शासन गर्‍यो?" }, "Maurya", ["Mughal","Gupta","Chola"]),
    F({ en:"Which dynasty is known as the 'Golden Age' of ancient India?", hi:"प्राचीन भारत का 'स्वर्ण युग' किस वंश को कहा जाता है?", ta:"பண்டைய இந்தியாவின் 'பொற்காலம்' என அழைக்கப்படும் வம்சம் எது?", te:"ప్రాచీన భారత 'స్వర్ణయుగం'గా పిలువబడే వంశం ఏది?", bn:"প্রাচীন ভারতের 'স্বর্ণযুগ' কোন রাজবংশকে বলা হয়?", mr:"प्राचीन भारताचे 'सुवर्णयुग' कोणत्या वंशाला म्हणतात?", gu:"પ્રાચીન ભારતનો 'સુવર્ણ યુગ' કયા વંશને કહેવાય છે?", kn:"ಪ್ರಾಚೀನ ಭಾರತದ 'ಸುವರ್ಣ ಯುಗ' ಎಂದು ಯಾವ ವಂಶವನ್ನು ಕರೆಯುತ್ತಾರೆ?", ml:"പ്രാചീന ഇന്ത്യയുടെ 'സുവർണകാലം' എന്ന് ഏത് രാജവംശത്തെ വിളിക്കുന്നു?", pa:"ਪ੍ਰਾਚੀਨ ਭਾਰਤ ਦਾ 'ਸੁਨਹਿਰੀ ਯੁੱਗ' ਕਿਸ ਵੰਸ਼ ਨੂੰ ਕਿਹਾ ਜਾਂਦਾ ਹੈ?", ur:"قدیم بھارت کا 'سنہری دور' کس خاندان کو کہا جاتا ہے؟", or:"ପ୍ରାଚୀନ ଭାରତର 'ସୁବର୍ଣ୍ଣ ଯୁଗ' କେଉଁ ବଂଶକୁ କୁହାଯାଏ?", ne:"प्राचीन भारतको 'स्वर्ण युग' कुन वंशलाई भनिन्छ?" }, "Gupta", ["Mughal","Maurya","Chola"]),
    F(P.highestPeak, "Everest", ["Kanchenjunga","K2","Himalayas"]),
  ],
  "8-social-studies": [
    F(P.fatherNation, "Gandhi", ["Nehru","Bose","Tagore"]),
    F(P.firstPM, "Nehru", ["Gandhi","Patel","RajendraPrasad"]),
    F(P.firstPresident, "RajendraPrasad", ["Nehru","Gandhi","Ambedkar"]),
    F(P.constitution, "Ambedkar", ["Nehru","Gandhi","Patel"]),
    F({ en:"Who wrote the national anthem of India?", hi:"भारत का राष्ट्रगान किसने लिखा?", ta:"இந்தியாவின் தேசிய கீதத்தை எழுதியவர் யார்?", te:"భారత జాతీయ గీతాన్ని రాసినది ఎవరు?", bn:"ভারতের জাতীয় সংগীত কে রচনা করেন?", mr:"भारताचे राष्ट्रगीत कोणी लिहिले?", gu:"ભારતનું રાષ્ટ્રગીત કોણે લખ્યું?", kn:"ಭಾರತದ ರಾಷ್ಟ್ರಗೀತೆಯನ್ನು ಬರೆದವರು ಯಾರು?", ml:"ഇന്ത്യയുടെ ദേശീയഗാനം എഴുതിയത് ആര്?", pa:"ਭਾਰਤ ਦਾ ਰਾਸ਼ਟਰੀ ਗੀਤ ਕਿਸਨੇ ਲਿਖਿਆ?", ur:"بھارت کا قومی ترانہ کس نے لکھا؟", or:"ଭାରତର ଜାତୀୟ ସଙ୍ଗୀତ କିଏ ଲେଖିଲେ?", ne:"भारतको राष्ट्रिय गान कसले लेखे?" }, "Tagore", ["Gandhi","Nehru","Bose"]),
    F(P.apexCourt, "SupremeCourt", ["HighCourt","Parliament","RBI"]),
  ],
  "9-social-studies": [
    F(P.apexCourt, "SupremeCourt", ["HighCourt","Parliament","ElectionCommission"]),
    F(P.elections, "ElectionCommission", ["SupremeCourt","Parliament","RBI"]),
    F(P.currencyBank, "RBI", ["SupremeCourt","Parliament","ElectionCommission"]),
    F(P.agriSector, "Primary", ["Secondary","Tertiary","Democracy"]),
    F({ en:"Government by elected representatives of the people is called:", hi:"जनता के निर्वाचित प्रतिनिधियों द्वारा शासन कहलाता है:", ta:"மக்களால் தேர்ந்தெடுக்கப்பட்ட பிரதிநிதிகளின் ஆட்சி அழைக்கப்படுகிறது:", te:"ప్రజలచే ఎన్నుకోబడిన ప్రతినిధుల పాలనను అంటారు:", bn:"জনগণের নির্বাচিত প্রতিনিধিদের শাসনকে বলে:", mr:"जनतेच्या निवडून आलेल्या प्रतिनिधींचे शासन म्हणतात:", gu:"લોકોના ચૂંટાયેલા પ્રતિનિધિઓ દ્વારા શાસન કહેવાય:", kn:"ಜನರಿಂದ ಚುನಾಯಿತ ಪ್ರತಿನಿಧಿಗಳ ಆಡಳಿತವನ್ನು ಕರೆಯುತ್ತಾರೆ:", ml:"ജനങ്ങൾ തിരഞ്ഞെടുത്ത പ്രതിനിധികളുടെ ഭരണത്തെ വിളിക്കുന്നത്:", pa:"ਲੋਕਾਂ ਦੇ ਚੁਣੇ ਹੋਏ ਨੁਮਾਇੰਦਿਆਂ ਦਾ ਰਾਜ ਕਹਾਉਂਦਾ ਹੈ:", ur:"عوام کے منتخب نمائندوں کی حکومت کہلاتی ہے:", or:"ଜନତାଙ୍କ ନିର୍ବାଚିତ ପ୍ରତିନିଧିଙ୍କ ଶାସନକୁ କୁହାଯାଏ:", ne:"जनताका निर्वाचित प्रतिनिधिहरूको शासनलाई भनिन्छ:" }, "Democracy", ["Monarchy","Dictatorship","Village"]),
    F(P.agriSector, "Primary", ["Secondary","Tertiary","Monarchy"]),
  ],
  "10-social-studies": [
    F(P.currencyBank, "RBI", ["SupremeCourt","ElectionCommission","Parliament"]),
    F(P.agriSector, "Primary", ["Secondary","Tertiary","Democracy"]),
    F({ en:"Manufacturing goods in factories belongs to which sector?", hi:"कारखानों में वस्तुओं का निर्माण किस क्षेत्र में आता है?", ta:"தொழிற்சாலைகளில் பொருள் உற்பத்தி எந்தத் துறையைச் சேர்ந்தது?", te:"కర్మాగారాల్లో వస్తువుల తయారీ ఏ రంగానికి చెందుతుంది?", bn:"কারখানায় পণ্য উৎপাদন কোন খাতে পড়ে?", mr:"कारखान्यांत वस्तूंचे उत्पादन कोणत्या क्षेत्रात येते?", gu:"કારખાનામાં માલનું ઉત્પાદન કયા ક્ષેત્રમાં આવે છે?", kn:"ಕಾರ್ಖಾನೆಗಳಲ್ಲಿ ಸರಕುಗಳ ತಯಾರಿಕೆ ಯಾವ ವಲಯಕ್ಕೆ ಸೇರುತ್ತದೆ?", ml:"ഫാക്ടറികളിൽ ഉൽപ്പന്ന നിർമ്മാണം ഏത് മേഖലയിൽ വരും?", pa:"ਕਾਰਖਾਨਿਆਂ ਵਿੱਚ ਵਸਤਾਂ ਦਾ ਨਿਰਮਾਣ ਕਿਹੜੇ ਖੇਤਰ ਵਿੱਚ ਆਉਂਦਾ ਹੈ?", ur:"کارخانوں میں اشیاء کی تیاری کس شعبے میں آتی ہے؟", or:"କାରଖାନାରେ ଦ୍ରବ୍ୟ ଉତ୍ପାଦନ କେଉଁ କ୍ଷେତ୍ରରେ ଆସେ?", ne:"कारखानामा वस्तु उत्पादन कुन क्षेत्रमा पर्छ?" }, "Secondary", ["Primary","Tertiary","Democracy"]),
    F({ en:"Banking and transport services belong to which sector?", hi:"बैंकिंग और परिवहन सेवाएँ किस क्षेत्र में आती हैं?", ta:"வங்கி மற்றும் போக்குவரத்து சேவைகள் எந்தத் துறையைச் சேர்ந்தவை?", te:"బ్యాంకింగ్, రవాణా సేవలు ఏ రంగానికి చెందుతాయి?", bn:"ব্যাংকিং ও পরিবহন সেবা কোন খাতে পড়ে?", mr:"बँकिंग आणि वाहतूक सेवा कोणत्या क्षेत्रात येतात?", gu:"બેંકિંગ અને પરિવહન સેવાઓ કયા ક્ષેત્રમાં આવે છે?", kn:"ಬ್ಯಾಂಕಿಂಗ್ ಮತ್ತು ಸಾರಿಗೆ ಸೇವೆಗಳು ಯಾವ ವಲಯಕ್ಕೆ ಸೇರುತ್ತವೆ?", ml:"ബാങ്കിംഗും ഗതാഗതവും ഏത് മേഖലയിൽ വരും?", pa:"ਬੈਂਕਿੰਗ ਅਤੇ ਟ੍ਰਾਂਸਪੋਰਟ ਸੇਵਾਵਾਂ ਕਿਹੜੇ ਖੇਤਰ ਵਿੱਚ ਆਉਂਦੀਆਂ ਹਨ?", ur:"بینکنگ اور نقل و حمل کی خدمات کس شعبے میں آتی ہیں؟", or:"ବ୍ୟାଙ୍କିଙ୍ଗ ଏବଂ ପରିବହନ ସେବା କେଉଁ କ୍ଷେତ୍ରରେ ଆସେ?", ne:"बैंकिङ र यातायात सेवा कुन क्षेत्रमा पर्छन्?" }, "Tertiary", ["Primary","Secondary","Monarchy"]),
    F(P.elections, "ElectionCommission", ["RBI","SupremeCourt","Parliament"]),
  ],
};

function buildFacts(fileKey) {
  const cls = fileKey.split("-")[0];
  const subj = fileKey.slice(fileKey.indexOf("-") + 1);
  const out = [];
  FACTS[fileKey].forEach((f, i) => {
    if (!f || f.ans === "") return; // skip guard placeholders
    const id = `${cls}-${subj}-gen-${String(i + 1).padStart(3, "0")}`;
    let correct, ds;
    if (f.numeric)      { correct = NUM(f.ans); ds = f.ds.map(NUM); }
    else if (f.english) { correct = EN(f.ans); ds = f.ds.map(EN); }
    else                { correct = WORDS610[f.ans] ? T(f.ans) : EN(f.ans); ds = f.ds.map((k) => (WORDS610[k] ? T(k) : EN(k))); }
    out.push(mcq(id, f.p, correct, ds, i % 4, f.visual || undefined));
  });
  return out;
}

function validate(qs) {
  const errs = []; const ids = new Set();
  for (const q of qs) {
    if (ids.has(q.id)) errs.push(`dup id ${q.id}`); ids.add(q.id);
    const en = q.choices.map((c) => c.en);
    if (en.length !== 4 || new Set(en).size !== 4) errs.push(`${q.id}: bad choices ${en}`);
    if (!(q.answerIndex >= 0 && q.answerIndex < 4)) errs.push(`${q.id}: bad answerIndex`);
    if (!q.prompt.en) errs.push(`${q.id}: no en prompt`);
    for (const [l, s] of Object.entries(q.prompt)) if (!s || /undefined/.test(s)) errs.push(`${q.id}: bad ${l} prompt`);
  }
  return errs;
}

const TASKS = [];
for (const c of [6, 7, 8, 9, 10]) {
  TASKS.push({ file: `content/levels/${c}-english.json`, build: () => buildEnglish(c), prefix: `${c}-english-gen` });
  TASKS.push({ file: `content/levels/${c}-science.json`, build: () => buildFacts(`${c}-science`), prefix: `${c}-science-gen` });
  TASKS.push({ file: `content/levels/${c}-social-studies.json`, build: () => buildFacts(`${c}-social-studies`), prefix: `${c}-social-studies-gen` });
}

let grand = 0;
for (const task of TASKS) {
  const full = path.join(ROOT, task.file);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  const batch = task.build();
  const errs = validate(batch);
  if (errs.length) { console.error(`✗ ${task.file}:`, errs.slice(0, 8)); process.exit(1); }
  const curated = data.questions.filter((q) => !q.id.startsWith(task.prefix));
  if (!DRY) { data.questions = [...curated, ...batch]; fs.writeFileSync(full, JSON.stringify(data, null, 2) + "\n"); }
  console.log(`${DRY ? "[dry] " : ""}${task.file}: ${curated.length} curated + ${batch.length} generated = ${curated.length + batch.length}`);
  grand += batch.length;
}
console.log(`\n${DRY ? "[dry] " : ""}Total generated: ${grand}`);
console.log("Verify: node scripts/verify-class6to10-prose.mjs");
