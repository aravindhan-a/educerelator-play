// Plays a recorded clip if it exists, else falls back to text-to-speech.
// Usage: playAudio({ id: 'num-1-5-001', lang: 'hi', text: 'कितने सेब हैं?' })

// No recorded clips ship yet, so we go straight to text-to-speech and skip the
// (guaranteed-404) network probe on every question. To enable recorded audio:
//   1. add the mp3s under frontend `audio/<lang>/<id>.mp3`
//   2. copy that folder in .github/workflows/deploy.yml so it deploys to /audio
//   3. flip HAS_RECORDED_CLIPS to true
const HAS_RECORDED_CLIPS = false;

const TTS_LANG_CODES = {
  en: "en-IN", hi: "hi-IN", ta: "ta-IN",
  bn: "bn-IN", gu: "gu-IN", kn: "kn-IN", ml: "ml-IN",
  mr: "mr-IN", pa: "pa-IN", te: "te-IN", ur: "ur-IN",
  as: "as-IN", or: "or-IN", ne: "ne-IN", sa: "sa-IN",
  // fallbacks for less-supported locales
  brx: "hi-IN", doi: "hi-IN", kok: "mr-IN", mai: "hi-IN",
  mni: "bn-IN", sat: "hi-IN", sd: "ur-IN", ks: "ur-IN",
};

function clipUrl(id, lang) {
  return `/audio/${lang}/${id}.mp3`;
}

// Voices load asynchronously: getVoices() is often empty on the first call and
// only populates after the "voiceschanged" event. Speaking before that lands
// silently — the single biggest reason TTS "doesn't work" on first use. We wait
// for the list, cache it, and pick a voice that actually matches the language.
let voicesPromise = null;
function getVoices() {
  if (!("speechSynthesis" in window)) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const ready = window.speechSynthesis.getVoices();
    if (ready.length) return resolve(ready);
    const onChange = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // Safety net: some engines never fire the event.
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
  });
  return voicesPromise;
}

function pickVoice(voices, langCode) {
  const lc = langCode.toLowerCase();
  const base = lc.split("-")[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === lc) ||
    voices.find((v) => v.lang.toLowerCase().replace("_", "-").startsWith(base)) ||
    // For English text an en-US/en-GB voice is fine when en-IN is absent.
    (base === "en" && voices.find((v) => v.lang.toLowerCase().startsWith("en"))) ||
    null
  );
}

// Math notation reads terribly symbol-by-symbol ("open paren minus fifteen…"),
// so turn it into WORDS for the spoken version — and in the reader's OWN
// language, so a Tamil voice doesn't jarringly say "plus"/"equals" in English
// mid-sentence. The on-screen prompt is unchanged; this only affects the voice.
// Digits themselves are read in-language automatically by the locale voice, so
// only the operators/symbols need translating.
const MATH_WORDS = {
  en: { plus:"plus", minus:"minus", times:"times", div:"divided by", eq:"equals", eqQ:"equals what?", sqrt:"square root of", cbrt:"cube root of", sq:"squared", cube:"cubed", pow:"to the power", over:"over", pct:"percent" },
  hi: { plus:"जमा", minus:"घटा", times:"गुणा", div:"बटा", eq:"बराबर", eqQ:"बराबर कितना?", sqrt:"वर्गमूल", cbrt:"घनमूल", sq:"का वर्ग", cube:"का घन", pow:"की घात", over:"बटा", pct:"प्रतिशत" },
  ta: { plus:"கூட்டல்", minus:"கழித்தல்", times:"பெருக்கல்", div:"வகுத்தல்", eq:"சமம்", eqQ:"சமம் எவ்வளவு?", sqrt:"வர்க்கமூலம்", cbrt:"கனமூலம்", sq:"வர்க்கம்", cube:"கனம்", pow:"அடுக்கு", over:"வகுத்தல்", pct:"சதவீதம்" },
  te: { plus:"కూడిక", minus:"తీసివేత", times:"గుణకారం", div:"భాగహారం", eq:"సమానం", eqQ:"సమానం ఎంత?", sqrt:"వర్గమూలం", cbrt:"ఘనమూలం", sq:"వర్గం", cube:"ఘనం", pow:"ఘాతం", over:"భాగా", pct:"శాతం" },
  bn: { plus:"যোগ", minus:"বিয়োগ", times:"গুণ", div:"ভাগ", eq:"সমান", eqQ:"সমান কত?", sqrt:"বর্গমূল", cbrt:"ঘনমূল", sq:"বর্গ", cube:"ঘন", pow:"ঘাত", over:"ভাগ", pct:"শতাংশ" },
  mr: { plus:"अधिक", minus:"वजा", times:"गुणिले", div:"भागिले", eq:"बरोबर", eqQ:"बरोबर किती?", sqrt:"वर्गमूळ", cbrt:"घनमूळ", sq:"चा वर्ग", cube:"चा घन", pow:"घात", over:"भागिले", pct:"टक्के" },
  gu: { plus:"વત્તા", minus:"ઓછા", times:"ગુણ્યા", div:"ભાગ્યા", eq:"બરાબર", eqQ:"બરાબર કેટલા?", sqrt:"વર્ગમૂળ", cbrt:"ઘનમૂળ", sq:"નો વર્ગ", cube:"નો ઘન", pow:"ઘાત", over:"ભાગ્યા", pct:"ટકા" },
  kn: { plus:"ಕೂಡಿಸಿ", minus:"ಕಳೆ", times:"ಗುಣಿಸಿ", div:"ಭಾಗಿಸಿ", eq:"ಸಮ", eqQ:"ಸಮ ಎಷ್ಟು?", sqrt:"ವರ್ಗಮೂಲ", cbrt:"ಘನಮೂಲ", sq:"ವರ್ಗ", cube:"ಘನ", pow:"ಘಾತ", over:"ಭಾಗಿಸಿ", pct:"ಶೇಕಡ" },
  ml: { plus:"കൂട്ടൽ", minus:"കുറയ്ക്കൽ", times:"ഗുണനം", div:"ഹരണം", eq:"സമം", eqQ:"സമം എത്ര?", sqrt:"വർഗമൂലം", cbrt:"ഘനമൂലം", sq:"വർഗം", cube:"ഘനം", pow:"കൃതി", over:"ഹരണം", pct:"ശതമാനം" },
  pa: { plus:"ਜਮ੍ਹਾਂ", minus:"ਘਟਾਓ", times:"ਗੁਣਾ", div:"ਭਾਗ", eq:"ਬਰਾਬਰ", eqQ:"ਬਰਾਬਰ ਕਿੰਨਾ?", sqrt:"ਵਰਗਮੂਲ", cbrt:"ਘਣਮੂਲ", sq:"ਦਾ ਵਰਗ", cube:"ਦਾ ਘਣ", pow:"ਘਾਤ", over:"ਭਾਗ", pct:"ਪ੍ਰਤੀਸ਼ਤ" },
  ur: { plus:"جمع", minus:"منفی", times:"ضرب", div:"تقسیم", eq:"برابر", eqQ:"برابر کتنا؟", sqrt:"جذر", cbrt:"مکعب جذر", sq:"کا مربع", cube:"کا مکعب", pow:"کی طاقت", over:"تقسیم", pct:"فیصد" },
  or: { plus:"ଯୋଗ", minus:"ବିୟୋଗ", times:"ଗୁଣନ", div:"ଭାଗ", eq:"ସମାନ", eqQ:"ସମାନ କେତେ?", sqrt:"ବର୍ଗମୂଳ", cbrt:"ଘନମୂଳ", sq:"ବର୍ଗ", cube:"ଘନ", pow:"ଘାତ", over:"ଭାଗ", pct:"ପ୍ରତିଶତ" },
  ne: { plus:"जोड", minus:"घटाउ", times:"गुणन", div:"भाग", eq:"बराबर", eqQ:"बराबर कति?", sqrt:"वर्गमूल", cbrt:"घनमूल", sq:"को वर्ग", cube:"को घन", pow:"घात", over:"भाग", pct:"प्रतिशत" },
};

function speakableText(text, lang = "en") {
  const w = MATH_WORDS[lang] || MATH_WORDS.en;
  const pad = (s) => ` ${s} `;
  return String(text)
    .replace(/\s*=\s*\?\s*$/, pad(w.eqQ))
    .replace(/√/g, pad(w.sqrt))
    .replace(/∛/g, pad(w.cbrt))
    .replace(/²/g, pad(w.sq))
    .replace(/³/g, pad(w.cube))
    .replace(/\bLCM\b/g, "L C M")
    .replace(/\bHCF\b/g, "H C F")
    .replace(/(\d)\s*\^\s*(\d)/g, `$1 ${w.pow} $2`)
    .replace(/(\d)\s*\/\s*(\d)/g, `$1 ${w.over} $2`)
    .replace(/×/g, pad(w.times))
    .replace(/÷/g, pad(w.div))
    .replace(/\+/g, pad(w.plus))
    .replace(/[−–]/g, pad(w.minus))         // math minus signs (U+2212 / en-dash)
    .replace(/(^|\s)-(\d)/g, `$1 ${w.minus} $2`) // a leading "-5"
    .replace(/=/g, pad(w.eq))               // any remaining equals
    .replace(/%/g, pad(w.pct))
    .replace(/[()]/g, " ")                  // parens just add noise when spoken
    .replace(/\s+/g, " ")
    .trim();
}

async function speak(text, lang) {
  const ss = window.speechSynthesis;
  if (!ss) return;
  const langCode = TTS_LANG_CODES[lang] || "en-IN";
  const voices = await getVoices();
  const voice = pickVoice(voices, langCode);
  // Only cancel when something is actually in flight — a cancel() immediately
  // followed by speak() with nothing playing drops the new utterance on Chrome.
  if (ss.speaking || ss.pending) ss.cancel();
  const utterance = new SpeechSynthesisUtterance(speakableText(text, lang));
  utterance.lang = langCode;
  // Only assign a same-language voice; forcing an English voice onto Tamil text
  // produces gibberish, so we'd rather let the engine try than mispronounce.
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.volume = 1;
  // Chrome can leave the queue paused; resume before and just after speaking.
  if (ss.paused) ss.resume();
  ss.speak(utterance);
  setTimeout(() => { try { if (ss.paused) ss.resume(); } catch {} }, 150);
}

// Many browsers only allow speechSynthesis after it has been invoked inside a
// user gesture. Call this from the first tap so later auto-narration (which
// fires after an async question fetch, outside the gesture) is allowed to play.
// The primer utterance is muted, so nothing is heard.
export function unlockSpeech() {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function playAudio({ id, lang, text }) {
  if (!HAS_RECORDED_CLIPS) {
    speak(text, lang);
    return;
  }
  const audio = new Audio(clipUrl(id, lang));
  audio.addEventListener("error", () => speak(text, lang));
  audio.play().catch(() => speak(text, lang));
}
