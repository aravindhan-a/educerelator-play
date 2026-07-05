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
// so turn it into words for the spoken version. The on-screen prompt is
// unchanged; this only affects what the voice says.
function speakableText(text) {
  return String(text)
    .replace(/\s*=\s*\?\s*$/, " equals what?")
    .replace(/√/g, " square root of ")
    .replace(/∛/g, " cube root of ")
    .replace(/²/g, " squared ")
    .replace(/³/g, " cubed ")
    .replace(/\bLCM\b/g, "L C M")
    .replace(/\bHCF\b/g, "H C F")
    .replace(/(\d)\s*\^\s*(\d)/g, "$1 to the power $2")
    .replace(/(\d)\s*\/\s*(\d)/g, "$1 over $2")
    .replace(/×/g, " times ")
    .replace(/÷/g, " divided by ")
    .replace(/\+/g, " plus ")
    .replace(/[−–]/g, " minus ")          // math minus signs (U+2212 / en-dash)
    .replace(/(^|\s)-(\d)/g, "$1 minus $2") // a leading "-5"
    .replace(/%/g, " percent ")
    .replace(/[()]/g, " ")                 // parens just add noise when spoken
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
  const utterance = new SpeechSynthesisUtterance(speakableText(text));
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
