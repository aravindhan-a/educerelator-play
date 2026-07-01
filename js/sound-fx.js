// Tiny celebratory/oops sound effects synthesized with Web Audio --
// no audio files needed, works the moment the page loads.

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tone(freq, startTime, duration, ctx, gainPeak = 0.2) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playCorrectChime() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => tone(freq, now + i * 0.1, 0.25, ctx));
}

export function playWrongBuzz() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  tone(180, now, 0.3, ctx, 0.15);
}
