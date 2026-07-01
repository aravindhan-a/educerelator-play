// Plays a recorded clip if it exists, else falls back to text-to-speech.
// Usage: playAudio({ id: 'num-1-5-001', lang: 'hi', text: 'कितने सेब हैं?' })

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
  return `/urban/frontend/audio/${lang}/${id}.mp3`;
}

function speak(text, lang) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = TTS_LANG_CODES[lang] || "en-IN";
  window.speechSynthesis.speak(utterance);
}

export function playAudio({ id, lang, text }) {
  const url = clipUrl(id, lang);
  const audio = new Audio(url);

  audio.addEventListener("error", () => speak(text, lang));
  audio.play().catch(() => speak(text, lang));
}
