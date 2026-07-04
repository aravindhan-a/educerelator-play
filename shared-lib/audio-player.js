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

async function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;
  const langCode = TTS_LANG_CODES[lang] || "en-IN";
  const voices = await getVoices();
  const voice = pickVoice(voices, langCode);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  // Only assign a same-language voice; forcing an English voice onto Tamil text
  // produces gibberish, so we'd rather let the engine try than mispronounce.
  if (voice) utterance.voice = voice;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
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
