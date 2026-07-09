#!/usr/bin/env node
// Class 2 prose generator (no API key). Class 2 is conceptual 4-choice MCQs
// (knowledge, opposites, traits) rather than Class 1's picture-matching, so we
// reuse the SHARED curated vocabulary from generate-primary-prose.mjs and build
// higher-order question types on top: category, odd-one-out, animal traits,
// opposites, and body-part functions. All 13-language, balanced answers,
// idempotent, validated. Missing languages fall back to English in-app.
//
// Usage: node scripts/generate-class2-prose.mjs [--dry]

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VOCAB as CORE, LANGS, trObj } from "./generate-primary-prose.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.slice(2).includes("--dry");

const V = (en, emoji, cat, tr) => ({ en, emoji, cat, tr });
// Extra Class-2 vocabulary (kept local so Class 1 output is unaffected).
const EXTRA = [
  V("Parrot", "🦜", "animal", { hi:"तोता", ta:"கிளி", te:"చిలుక", bn:"তোতা", mr:"पोपट", gu:"પોપટ", kn:"ಗಿಳಿ", ml:"തത്ത", pa:"ਤੋਤਾ", ur:"طوطا", or:"ଶୁଆ", ne:"सुगा" }),
  V("Duck", "🦆", "animal", { hi:"बत्तख", ta:"வாத்து", te:"బాతు", bn:"হাঁস", mr:"बदक", gu:"બતક", kn:"ಬಾತುಕೋಳಿ", ml:"താറാവ്", pa:"ਬੱਤਖ", ur:"بطخ", or:"ହଂସ", ne:"हाँस" }),
  V("Frog", "🐸", "animal", { hi:"मेंढक", ta:"தவளை", te:"కప్ప", bn:"ব্যাঙ", mr:"बेडूक", gu:"દેડકો", kn:"ಕಪ್ಪೆ", ml:"തവള", pa:"ਡੱਡੂ", ur:"مینڈک", or:"ବେଙ୍ଗ", ne:"भ्यागुतो" }),
  V("Rabbit", "🐰", "animal", { hi:"खरगोश", ta:"முயல்", te:"కుందేలు", bn:"খরগোশ", mr:"ससा", gu:"સસલું", kn:"ಮೊಲ", ml:"മുയൽ", pa:"ਖਰਗੋਸ਼", ur:"خرگوش", or:"ଠେକୁଆ", ne:"खरायो" }),
  V("Snake", "🐍", "animal", { hi:"साँप", ta:"பாம்பு", te:"పాము", bn:"সাপ", mr:"साप", gu:"સાપ", kn:"ಹಾವು", ml:"പാമ്പ്", pa:"ਸੱਪ", ur:"سانپ", or:"ସାପ", ne:"सर्प" }),
  V("Tiger", "🐯", "animal", { hi:"बाघ", ta:"புலி", te:"పులి", bn:"বাঘ", mr:"वाघ", gu:"વાઘ", kn:"ಹುಲಿ", ml:"കടുവ", pa:"ਬਾਘ", ur:"شیر", or:"ବାଘ", ne:"बाघ" }),
  V("Potato", "🥔", "vegetable", { hi:"आलू", ta:"உருளைக்கிழங்கு", te:"బంగాళాదుంప", bn:"আলু", mr:"बटाटा", gu:"બટાકા", kn:"ಆಲೂಗಡ್ಡೆ", ml:"ഉരുളക്കിഴങ്ങ്", pa:"ਆਲੂ", ur:"آلو", or:"ଆଳୁ", ne:"आलु" }),
  V("Tomato", "🍅", "vegetable", { hi:"टमाटर", ta:"தக்காளி", te:"టమోటా", bn:"টমেটো", mr:"टोमॅटो", gu:"ટામેટા", kn:"ಟೊಮ್ಯಾಟೊ", ml:"തക്കാളി", pa:"ਟਮਾਟਰ", ur:"ٹماٹر", or:"ଟମାଟୋ", ne:"गोलभेडा" }),
  V("Carrot", "🥕", "vegetable", { hi:"गाजर", ta:"கேரட்", te:"కారెట్", bn:"গাজর", mr:"गाजर", gu:"ગાજર", kn:"ಕ್ಯಾರೆಟ್", ml:"കാരറ്റ്", pa:"ਗਾਜਰ", ur:"گاجر", or:"ଗାଜର", ne:"गाजर" }),
  V("Chair", "🪑", "object", { hi:"कुर्सी", ta:"நாற்காலி", te:"కుర్చీ", bn:"চেয়ার", mr:"खुर्ची", gu:"ખુરશી", kn:"ಕುರ್ಚಿ", ml:"കസേര", pa:"ਕੁਰਸੀ", ur:"کرسی", or:"ଚେୟାର", ne:"कुर्सी" }),
];
const ALL = [...CORE, ...EXTRA];
const byEn = Object.fromEntries(ALL.map((w) => [w.en, w]));
const catPool = (cat) => ALL.filter((w) => w.cat === cat);

// Animal traits (keyed by English name)
const TRAIT = {
  canFly:       ["Bird", "Parrot", "Duck"],
  livesInWater: ["Fish", "Frog"],
  givesMilk:    ["Cow", "Goat"],
  wild:         ["Lion", "Elephant", "Monkey", "Tiger", "Snake"],
  pet:          ["Dog", "Cat", "Rabbit", "Parrot"],
};
const ANIMALS = catPool("animal").map((w) => w.en);

// Opposites — each side fully translated.
const OP = (en, tr) => ({ en, tr });
const OPPOSITES = [
  [OP("Big",   { hi:"बड़ा", ta:"பெரியது", te:"పెద్ద", bn:"বড়", mr:"मोठा", gu:"મોટું", kn:"ದೊಡ್ಡ", ml:"വലുത്", pa:"ਵੱਡਾ", ur:"بڑا", or:"ବଡ଼", ne:"ठूलो" }),
   OP("Small", { hi:"छोटा", ta:"சிறியது", te:"చిన్న", bn:"ছোট", mr:"लहान", gu:"નાનું", kn:"ಚಿಕ್ಕ", ml:"ചെറുത്", pa:"ਛੋਟਾ", ur:"چھوٹا", or:"ଛୋଟ", ne:"सानो" })],
  [OP("Hot",  { hi:"गरम", ta:"சூடு", te:"వేడి", bn:"গরম", mr:"गरम", gu:"ગરમ", kn:"ಬಿಸಿ", ml:"ചൂട്", pa:"ਗਰਮ", ur:"گرم", or:"ଗରମ", ne:"तातो" }),
   OP("Cold", { hi:"ठंडा", ta:"குளிர்", te:"చల్లని", bn:"ঠান্ডা", mr:"थंड", gu:"ઠંડું", kn:"ತಂಪು", ml:"തണുപ്പ്", pa:"ਠੰਢਾ", ur:"ٹھنڈا", or:"ଥଣ୍ଡା", ne:"चिसो" })],
  [OP("Day",   { hi:"दिन", ta:"பகல்", te:"పగలు", bn:"দিন", mr:"दिवस", gu:"દિવસ", kn:"ಹಗಲು", ml:"പകൽ", pa:"ਦਿਨ", ur:"دن", or:"ଦିନ", ne:"दिन" }),
   OP("Night", { hi:"रात", ta:"இரவு", te:"రాత్రి", bn:"রাত", mr:"रात्र", gu:"રાત", kn:"ರಾತ್ರಿ", ml:"രാത്രി", pa:"ਰਾਤ", ur:"رات", or:"ରାତି", ne:"रात" })],
  [OP("Up",   { hi:"ऊपर", ta:"மேலே", te:"పైన", bn:"উপরে", mr:"वर", gu:"ઉપર", kn:"ಮೇಲೆ", ml:"മുകളിൽ", pa:"ਉੱਪਰ", ur:"اوپر", or:"ଉପରେ", ne:"माथि" }),
   OP("Down", { hi:"नीचे", ta:"கீழே", te:"కింద", bn:"নিচে", mr:"खाली", gu:"નીચે", kn:"ಕೆಳಗೆ", ml:"താഴെ", pa:"ਹੇਠਾਂ", ur:"نیچے", or:"ତଳେ", ne:"तल" })],
  [OP("Fast", { hi:"तेज़", ta:"வேகம்", te:"వేగం", bn:"দ্রুত", mr:"जलद", gu:"ઝડપી", kn:"ವೇಗ", ml:"വേഗം", pa:"ਤੇਜ਼", ur:"تیز", or:"ଦ୍ରୁତ", ne:"छिटो" }),
   OP("Slow", { hi:"धीमा", ta:"மெதுவாக", te:"నెమ్మది", bn:"ধীর", mr:"हळू", gu:"ધીમું", kn:"ನಿಧಾನ", ml:"പതുക്കെ", pa:"ਹੌਲੀ", ur:"آہستہ", or:"ମନ୍ଥର", ne:"ढिलो" })],
  [OP("Open",   { hi:"खुला", ta:"திறந்த", te:"తెరిచిన", bn:"খোলা", mr:"उघडा", gu:"ખુલ્લું", kn:"ತೆರೆದ", ml:"തുറന്ന", pa:"ਖੁੱਲ੍ਹਾ", ur:"کھلا", or:"ଖୋଲା", ne:"खुला" }),
   OP("Closed", { hi:"बंद", ta:"மூடிய", te:"మూసిన", bn:"বন্ধ", mr:"बंद", gu:"બંધ", kn:"ಮುಚ್ಚಿದ", ml:"അടച്ച", pa:"ਬੰਦ", ur:"بند", or:"ବନ୍ଦ", ne:"बन्द" })],
  [OP("Happy", { hi:"खुश", ta:"மகிழ்ச்சி", te:"సంతోషం", bn:"খুশি", mr:"आनंदी", gu:"ખુશ", kn:"ಸಂತೋಷ", ml:"സന്തോഷം", pa:"ਖੁਸ਼", ur:"خوش", or:"ଖୁସି", ne:"खुसी" }),
   OP("Sad",   { hi:"दुखी", ta:"சோகம்", te:"విచారం", bn:"দুঃখিত", mr:"दुःखी", gu:"ઉદાસ", kn:"ದುಃಖ", ml:"സങ്കടം", pa:"ਉਦਾਸ", ur:"اداس", or:"ଦୁଃଖୀ", ne:"दुःखी" })],
  [OP("Black", { hi:"काला", ta:"கருப்பு", te:"నలుపు", bn:"কালো", mr:"काळा", gu:"કાળો", kn:"ಕಪ್ಪು", ml:"കറുപ്പ്", pa:"ਕਾਲਾ", ur:"کالا", or:"କଳା", ne:"कालो" }),
   OP("White", { hi:"सफ़ेद", ta:"வெள்ளை", te:"తెలుపు", bn:"সাদা", mr:"पांढरा", gu:"સફેદ", kn:"ಬಿಳಿ", ml:"വെളുപ്പ്", pa:"ਚਿੱਟਾ", ur:"سفید", or:"ଧଳା", ne:"सेतो" })],
  [OP("New", { hi:"नया", ta:"புதிய", te:"కొత్త", bn:"নতুন", mr:"नवीन", gu:"નવું", kn:"ಹೊಸ", ml:"പുതിയ", pa:"ਨਵਾਂ", ur:"نیا", or:"ନୂଆ", ne:"नयाँ" }),
   OP("Old", { hi:"पुराना", ta:"பழைய", te:"పాత", bn:"পুরনো", mr:"जुना", gu:"જૂનું", kn:"ಹಳೆಯ", ml:"പഴയ", pa:"ਪੁਰਾਣਾ", ur:"پرانا", or:"ପୁରୁଣା", ne:"पुरानो" })],
  [OP("Wet", { hi:"गीला", ta:"ஈரம்", te:"తడి", bn:"ভেজা", mr:"ओला", gu:"ભીનું", kn:"ಒದ್ದೆ", ml:"നനഞ്ഞ", pa:"ਗਿੱਲਾ", ur:"گیلا", or:"ଓଦା", ne:"भिजेको" }),
   OP("Dry", { hi:"सूखा", ta:"உலர்", te:"పొడి", bn:"শুকনো", mr:"कोरडा", gu:"સૂકું", kn:"ಒಣ", ml:"ഉണങ്ങിയ", pa:"ਸੁੱਕਾ", ur:"خشک", or:"ଶୁଖିଲା", ne:"सुक्खा" })],
];

// ── Full-sentence 13-language prompts ──
const PROMPTS = {
  isFruit:   { en:"Which of these is a fruit?", hi:"इनमें से कौन सा एक फल है?", ta:"இவற்றில் எது ஒரு பழம்?", te:"వీటిలో ఏది పండు?", bn:"এর মধ্যে কোনটি ফল?", mr:"यापैकी कोणते फळ आहे?", gu:"આમાંથી કયું ફળ છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಹಣ್ಣು?", ml:"ഇതിൽ ഏതാണ് പഴം?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਫਲ ਹੈ?", ur:"ان میں سے کون سا پھل ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ଫଳ?", ne:"यी मध्ये कुन फल हो?" },
  isVeg:     { en:"Which of these is a vegetable?", hi:"इनमें से कौन सी एक सब्ज़ी है?", ta:"இவற்றில் எது ஒரு காய்கறி?", te:"వీటిలో ఏది కూరగాయ?", bn:"এর মধ্যে কোনটি সবজি?", mr:"यापैकी कोणती भाजी आहे?", gu:"આમાંથી કયું શાકભાજી છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ತರಕಾರಿ?", ml:"ഇതിൽ ഏതാണ് പച്ചക്കറി?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜੀ ਸਬਜ਼ੀ ਹੈ?", ur:"ان میں سے کون سی سبزی ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ପନିପରିବା?", ne:"यी मध्ये कुन तरकारी हो?" },
  isAnimal:  { en:"Which of these is an animal?", hi:"इनमें से कौन सा एक जानवर है?", ta:"இவற்றில் எது ஒரு விலங்கு?", te:"వీటిలో ఏది జంతువు?", bn:"এর মধ্যে কোনটি প্রাণী?", mr:"यापैकी कोणता प्राणी आहे?", gu:"આમાંથી કયું પ્રાણી છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಪ್ರಾಣಿ?", ml:"ഇതിൽ ഏതാണ് മൃഗം?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਹੈ?", ur:"ان میں سے کون سا جانور ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ପ୍ରାଣୀ?", ne:"यी मध्ये कुन जनावर हो?" },
  isVehicle: { en:"Which of these is a vehicle?", hi:"इनमें से कौन सा एक वाहन है?", ta:"இவற்றில் எது ஒரு வாகனம்?", te:"వీటిలో ఏది వాహనం?", bn:"এর মধ্যে কোনটি যানবাহন?", mr:"यापैकी कोणते वाहन आहे?", gu:"આમાંથી કયું વાહન છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ವಾಹನ?", ml:"ഇതിൽ ഏതാണ് വാഹനം?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਵਾਹਨ ਹੈ?", ur:"ان میں سے کون سی گاڑی ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ଯାନ?", ne:"यी मध्ये कुन सवारी हो?" },
  notFruit:  { en:"Which of these is NOT a fruit?", hi:"इनमें से कौन सा फल नहीं है?", ta:"இவற்றில் எது பழம் அல்ல?", te:"వీటిలో ఏది పండు కాదు?", bn:"এর মধ্যে কোনটি ফল নয়?", mr:"यापैकी कोणते फळ नाही?", gu:"આમાંથી કયું ફળ નથી?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಹಣ್ಣು ಅಲ್ಲ?", ml:"ഇതിൽ ഏതാണ് പഴം അല്ലാത്തത്?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਫਲ ਨਹੀਂ ਹੈ?", ur:"ان میں سے کون سا پھل نہیں ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ଫଳ ନୁହେଁ?", ne:"यी मध्ये कुन फल होइन?" },
  notAnimal: { en:"Which of these is NOT an animal?", hi:"इनमें से कौन सा जानवर नहीं है?", ta:"இவற்றில் எது விலங்கு அல்ல?", te:"వీటిలో ఏది జంతువు కాదు?", bn:"এর মধ্যে কোনটি প্রাণী নয়?", mr:"यापैकी कोणता प्राणी नाही?", gu:"આમાંથી કયું પ્રાણી નથી?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಪ್ರಾಣಿ ಅಲ್ಲ?", ml:"ഇതിൽ ഏതാണ് മൃഗം അല്ലാത്തത്?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਨਹੀਂ ਹੈ?", ur:"ان میں سے کون سا جانور نہیں ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ପ୍ରାଣୀ ନୁହେଁ?", ne:"यी मध्ये कुन जनावर होइन?" },
  canFly:    { en:"Which of these animals can fly?", hi:"इनमें से कौन सा जानवर उड़ सकता है?", ta:"இவற்றில் எந்த விலங்கு பறக்கும்?", te:"వీటిలో ఏ జంతువు ఎగరగలదు?", bn:"এই প্রাণীদের মধ্যে কোনটি উড়তে পারে?", mr:"यापैकी कोणता प्राणी उडू शकतो?", gu:"આમાંથી કયું પ્રાણી ઉડી શકે છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವ ಪ್ರಾಣಿ ಹಾರಬಲ್ಲದು?", ml:"ഈ മൃഗങ്ങളിൽ ഏതിന് പറക്കാൻ കഴിയും?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਉੱਡ ਸਕਦਾ ਹੈ?", ur:"ان میں سے کون سا جانور اڑ سکتا ہے؟", or:"ଏହି ପ୍ରାଣୀମାନଙ୍କ ମଧ୍ୟରୁ କେଉଁଟି ଉଡ଼ିପାରେ?", ne:"यी जनावरमध्ये कुन उड्न सक्छ?" },
  livesInWater: { en:"Which of these animals lives in water?", hi:"इनमें से कौन सा जानवर पानी में रहता है?", ta:"இவற்றில் எந்த விலங்கு தண்ணீரில் வாழ்கிறது?", te:"వీటిలో ఏ జంతువు నీటిలో నివసిస్తుంది?", bn:"এই প্রাণীদের মধ্যে কোনটি জলে বাস করে?", mr:"यापैकी कोणता प्राणी पाण्यात राहतो?", gu:"આમાંથી કયું પ્રાણી પાણીમાં રહે છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವ ಪ್ರಾಣಿ ನೀರಿನಲ್ಲಿ ವಾಸಿಸುತ್ತದೆ?", ml:"ഈ മൃഗങ്ങളിൽ ഏതാണ് വെള്ളത്തിൽ ജീവിക്കുന്നത്?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਪਾਣੀ ਵਿੱਚ ਰਹਿੰਦਾ ਹੈ?", ur:"ان میں سے کون سا جانور پانی میں رہتا ہے؟", or:"ଏହି ପ୍ରାଣୀମାନଙ୍କ ମଧ୍ୟରୁ କେଉଁଟି ପାଣିରେ ରହେ?", ne:"यी जनावरमध्ये कुन पानीमा बस्छ?" },
  givesMilk: { en:"Which of these animals gives us milk?", hi:"इनमें से कौन सा जानवर हमें दूध देता है?", ta:"இவற்றில் எந்த விலங்கு நமக்கு பால் தருகிறது?", te:"వీటిలో ఏ జంతువు మనకు పాలు ఇస్తుంది?", bn:"এই প্রাণীগুলির মধ্যে কোনটি আমাদের দুধ দেয়?", mr:"यापैकी कोणता प्राणी आपल्याला दूध देतो?", gu:"આમાંથી કયું પ્રાણી આપણને દૂધ આપે છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ನಮಗೆ ಹಾಲು ನೀಡುತ್ತದೆ?", ml:"ഈ മൃഗങ്ങളിൽ ഏതാണ് നമുക്ക് പാൽ തരുന്നത്?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਸਾਨੂੰ ਦੁੱਧ ਦਿੰਦਾ ਹੈ?", ur:"ان میں سے کون سا جانور ہمیں دودھ دیتا ہے؟", or:"ଏହି ପଶୁମାନଙ୍କ ମଧ୍ୟରୁ କେଉଁଟି ଆମକୁ କ୍ଷୀର ଦେଇଥାଏ?", ne:"यी मध्ये कुन जनावरले हामीलाई दूध दिन्छ?" },
  wild:      { en:"Which of these is a wild animal?", hi:"इनमें से कौन सा एक जंगली जानवर है?", ta:"இவற்றில் எது ஒரு காட்டு விலங்கு?", te:"వీటిలో ఏది అడవి జంతువు?", bn:"এর মধ্যে কোনটি বন্য প্রাণী?", mr:"यापैकी कोणता जंगली प्राणी आहे?", gu:"આમાંથી કયું જંગલી પ્રાણી છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವುದು ಕಾಡು ಪ್ರಾಣಿ?", ml:"ഇവയിൽ ഏതാണ് വന്യമൃഗം?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜੰਗਲੀ ਜਾਨਵਰ ਹੈ?", ur:"ان میں سے کون سا جنگلی جانور ہے؟", or:"ଏଥି ମଧ୍ୟରୁ କେଉଁଟି ଜଙ୍ଗଲୀ ପ୍ରାଣୀ?", ne:"यी मध्ये कुन जंगली जनावर हो?" },
  pet:       { en:"Which of these animals is kept as a pet?", hi:"इनमें से कौन सा जानवर पालतू के रूप में रखा जाता है?", ta:"இவற்றில் எந்த விலங்கு செல்லப்பிராணியாக வளர்க்கப்படுகிறது?", te:"వీటిలో ఏ జంతువును పెంపుడు జంతువుగా పెంచుతారు?", bn:"এই প্রাণীদের মধ্যে কোনটি পোষা প্রাণী হিসেবে রাখা হয়?", mr:"यापैकी कोणता प्राणी पाळीव म्हणून ठेवला जातो?", gu:"આમાંથી કયું પ્રાણી પાલતુ તરીકે રાખવામાં આવે છે?", kn:"ಇವುಗಳಲ್ಲಿ ಯಾವ ಪ್ರಾಣಿಯನ್ನು ಸಾಕುಪ್ರಾಣಿಯಾಗಿ ಸಾಕುತ್ತಾರೆ?", ml:"ഈ മൃഗങ്ങളിൽ ഏതിനെയാണ് വളർത്തുമൃഗമായി വളർത്തുന്നത്?", pa:"ਇਹਨਾਂ ਵਿੱਚੋਂ ਕਿਹੜਾ ਜਾਨਵਰ ਪਾਲਤੂ ਵਜੋਂ ਰੱਖਿਆ ਜਾਂਦਾ ਹੈ?", ur:"ان میں سے کون سا جانور پالتو کے طور پر رکھا جاتا ہے؟", or:"ଏହି ପ୍ରାଣୀମାନଙ୍କ ମଧ୍ୟରୁ କେଉଁଟି ଘରୋଇ ପ୍ରାଣୀ ଭାବେ ରଖାଯାଏ?", ne:"यी जनावरमध्ये कुन घरपालुवा रूपमा राखिन्छ?" },
  see:  { en:"Which body part do we use to see?", hi:"हम देखने के लिए किस अंग का उपयोग करते हैं?", ta:"பார்க்க நாம் எந்த உறுப்பைப் பயன்படுத்துகிறோம்?", te:"చూడటానికి మనం ఏ శరీర భాగాన్ని ఉపయోగిస్తాం?", bn:"দেখার জন্য আমরা কোন অঙ্গ ব্যবহার করি?", mr:"पाहण्यासाठी आपण कोणता अवयव वापरतो?", gu:"જોવા માટે આપણે કયા અંગનો ઉપયોગ કરીએ છીએ?", kn:"ನೋಡಲು ನಾವು ಯಾವ ಅಂಗವನ್ನು ಬಳಸುತ್ತೇವೆ?", ml:"കാണാൻ നാം ഏത് ശരീരഭാഗം ഉപയോഗിക്കുന്നു?", pa:"ਵੇਖਣ ਲਈ ਅਸੀਂ ਕਿਹੜੇ ਅੰਗ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ?", ur:"دیکھنے کے لیے ہم کون سے عضو کا استعمال کرتے ہیں؟", or:"ଦେଖିବା ପାଇଁ ଆମେ କେଉଁ ଅଙ୍ଗ ବ୍ୟବହାର କରୁ?", ne:"हेर्न हामी कुन अंग प्रयोग गर्छौं?" },
  hear: { en:"Which body part do we use to hear?", hi:"हम सुनने के लिए किस अंग का उपयोग करते हैं?", ta:"கேட்க நாம் எந்த உறுப்பைப் பயன்படுத்துகிறோம்?", te:"వినడానికి మనం ఏ శరీర భాగాన్ని ఉపయోగిస్తాం?", bn:"শোনার জন্য আমরা কোন অঙ্গ ব্যবহার করি?", mr:"ऐकण्यासाठी आपण कोणता अवयव वापरतो?", gu:"સાંભળવા માટે આપણે કયા અંગનો ઉપયોગ કરીએ છીએ?", kn:"ಕೇಳಲು ನಾವು ಯಾವ ಅಂಗವನ್ನು ಬಳಸುತ್ತೇವೆ?", ml:"കേൾക്കാൻ നാം ഏത് ശരീരഭാഗം ഉപയോഗിക്കുന്നു?", pa:"ਸੁਣਨ ਲਈ ਅਸੀਂ ਕਿਹੜੇ ਅੰਗ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ?", ur:"سننے کے لیے ہم کون سے عضو کا استعمال کرتے ہیں؟", or:"ଶୁଣିବା ପାଇଁ ଆମେ କେଉଁ ଅଙ୍ଗ ବ୍ୟବହାର କରୁ?", ne:"सुन्न हामी कुन अंग प्रयोग गर्छौं?" },
  smell: { en:"Which body part do we use to smell?", hi:"हम सूँघने के लिए किस अंग का उपयोग करते हैं?", ta:"முகர நாம் எந்த உறுப்பைப் பயன்படுத்துகிறோம்?", te:"వాసన చూడటానికి మనం ఏ శరీర భాగాన్ని ఉపయోగిస్తాం?", bn:"গন্ধ নিতে আমরা কোন অঙ্গ ব্যবহার করি?", mr:"वास घेण्यासाठी आपण कोणता अवयव वापरतो?", gu:"સૂંઘવા માટે આપણે કયા અંગનો ઉપયોગ કરીએ છીએ?", kn:"ವಾಸನೆ ನೋಡಲು ನಾವು ಯಾವ ಅಂಗವನ್ನು ಬಳಸುತ್ತೇವೆ?", ml:"മണക്കാൻ നാം ഏത് ശരീരഭാഗം ഉപയോഗിക്കുന്നു?", pa:"ਸੁੰਘਣ ਲਈ ਅਸੀਂ ਕਿਹੜੇ ਅੰਗ ਦੀ ਵਰਤੋਂ ਕਰਦੇ ਹਾਂ?", ur:"سونگھنے کے لیے ہم کون سے عضو کا استعمال کرتے ہیں؟", or:"ଶୁଙ୍ଘିବା ପାଇଁ ଆମେ କେଉଁ ଅଙ୍ଗ ବ୍ୟବହାର କରୁ?", ne:"सुँघ्न हामी कुन अंग प्रयोग गर्छौं?" },
};

// opposite-of prompt embeds the English cue word (kept in English on purpose:
// this is an English-subject question about the word itself)
function oppPrompt(word) {
  const t = {};
  const tail = { en:`What is the opposite of "${word.en}"?`, hi:`"${word.en}" का विलोम क्या है?`, ta:`"${word.en}" இன் எதிர்ச்சொல் என்ன?`, te:`"${word.en}" కి వ్యతిరేకం ఏమిటి?`, bn:`"${word.en}" এর বিপরীত কী?`, mr:`"${word.en}" चा विरुद्धार्थी शब्द कोणता?`, gu:`"${word.en}" નો વિરોધી શબ્દ કયો છે?`, kn:`"${word.en}" ದ ವಿರುದ್ಧಾರ್ಥಕ ಪದ ಯಾವುದು?`, ml:`"${word.en}" ന്റെ വിപരീതം എന്ത്?`, pa:`"${word.en}" ਦਾ ਉਲਟ ਸ਼ਬਦ ਕੀ ਹੈ?`, ur:`"${word.en}" کا مخالف کیا ہے؟`, or:`"${word.en}" ର ବିପରୀତ କ'ଣ?`, ne:`"${word.en}" को विपरीत के हो?` };
  for (const l of LANGS) t[l] = tail[l];
  return t;
}
// ── RNG ──
function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, a) => [...a].sort(() => r() - 0.5);

// assemble a 4-choice MCQ: correct word + 3 distractor words, answer at `slot`
function mcq(id, prompt, correctWord, distractorWords, slot, visual) {
  const choices = [];
  let di = 0;
  for (let i = 0; i < 4; i++) choices.push(i === slot ? trObj(correctWord) : trObj(distractorWords[di++]));
  const q = { id, type: "mcq", prompt, choices, answerIndex: slot };
  if (visual) q.visual = visual;
  return q;
}

function buildEnglish() {
  const r = rng(202);
  const out = [];
  let n = 1;
  const id = () => `2-english-gen-${String(n++).padStart(3, "0")}`;
  // opposites (both directions)
  for (const [a, b] of OPPOSITES) {
    for (const [q, ans] of [[a, b], [b, a]]) {
      // opposite words are already VOCAB-shaped ({en, tr}); pass straight to mcq
      const others = OPPOSITES.flat().filter((w) => w.en !== q.en && w.en !== ans.en);
      const ds = shuffle(r, others).slice(0, 3);
      out.push(mcq(id(), oppPrompt(q), ans, ds, out.length % 4));
    }
  }
  // category: which is a fruit / animal / vehicle
  const cats = [["isFruit", "fruit"], ["isAnimal", "animal"], ["isVehicle", "vehicle"]];
  for (const [pk, cat] of cats) {
    const inC = catPool(cat), outC = ALL.filter((w) => w.cat !== cat);
    for (let k = 0; k < 4; k++) {
      const w = shuffle(r, inC)[0];
      const ds = shuffle(r, outC).slice(0, 3);
      out.push(mcq(id(), PROMPTS[pk], w, ds, out.length % 4));
    }
  }
  return out;
}

function buildEvs() {
  const r = rng(303);
  const out = [];
  let n = 1;
  const id = () => `2-evs-gen-${String(n++).padStart(3, "0")}`;
  // animal traits
  const traitQ = [["canFly", "canFly"], ["livesInWater", "livesInWater"], ["givesMilk", "givesMilk"], ["wild", "wild"], ["pet", "pet"]];
  for (const [pk, tr] of traitQ) {
    const inT = TRAIT[tr];
    const notT = ANIMALS.filter((en) => !inT.includes(en));
    for (let k = 0; k < 4; k++) {
      const w = byEn[shuffle(r, inT)[0]];
      const ds = shuffle(r, notT).slice(0, 3).map((en) => byEn[en]);
      out.push(mcq(id(), PROMPTS[pk], w, ds, out.length % 4));
    }
  }
  // category: fruit / vegetable / animal
  for (const [pk, cat] of [["isFruit", "fruit"], ["isVeg", "vegetable"], ["isAnimal", "animal"]]) {
    const inC = catPool(cat), outC = ALL.filter((w) => w.cat !== cat);
    for (let k = 0; k < 4; k++) {
      const w = shuffle(r, inC)[0];
      const ds = shuffle(r, outC).slice(0, 3);
      out.push(mcq(id(), PROMPTS[pk], w, ds, out.length % 4));
    }
  }
  // NOT-a-fruit / NOT-an-animal (odd one out)
  for (const [pk, cat] of [["notFruit", "fruit"], ["notAnimal", "animal"]]) {
    const inC = catPool(cat), outC = ALL.filter((w) => w.cat !== cat);
    for (let k = 0; k < 3; k++) {
      const w = shuffle(r, outC)[0];           // the correct answer is the NON-member
      const ds = shuffle(r, inC).slice(0, 3);   // distractors ARE members
      out.push(mcq(id(), PROMPTS[pk], w, ds, out.length % 4));
    }
  }
  // body-part functions
  const bodyParts = ["Eye", "Ear", "Nose", "Hand"];
  for (const [pk, ans] of [["see", "Eye"], ["hear", "Ear"], ["smell", "Nose"]]) {
    const ds = bodyParts.filter((b) => b !== ans).map((en) => byEn[en]);
    out.push(mcq(id(), PROMPTS[pk], byEn[ans], ds, out.length % 4));
  }
  return out;
}

function validate(qs) {
  const errs = []; const ids = new Set();
  for (const q of qs) {
    if (ids.has(q.id)) errs.push(`dup id ${q.id}`); ids.add(q.id);
    const en = q.choices.map((c) => c.en);
    if (en.length !== 4) errs.push(`${q.id}: ${en.length} choices`);
    if (new Set(en).size !== 4) errs.push(`${q.id}: dup choices ${en}`);
    if (!(q.answerIndex >= 0 && q.answerIndex < 4)) errs.push(`${q.id}: bad answerIndex`);
    if (!q.prompt.en) errs.push(`${q.id}: no en prompt`);
  }
  return errs;
}

const TASKS = [
  { file: "content/levels/2-english.json", build: buildEnglish, prefix: "2-english-gen" },
  { file: "content/levels/2-evs.json",     build: buildEvs,     prefix: "2-evs-gen" },
];

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
console.log("Verify: node scripts/verify-class2-prose.mjs");
