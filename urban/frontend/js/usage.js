// Privacy-first usage counters (ROADMAP C2). Sends one tiny, anonymous event
// per session start, answer and completion to the backend, which only adds
// to aggregate totals. No ids, no cookies, no names, nothing typed by the
// student; see urban/backend/api/track.js for exactly what is stored.
//
// Never blocks or breaks the app: fire-and-forget via sendBeacon, errors
// swallowed, skipped entirely in demo mode and on local test servers.

const ENDPOINT = "https://educerelator-backend.vercel.app/api/track";

function enabled() {
  try {
    if (window.EC_DEMO) return false;
    const h = location.hostname;
    return h === "educerelator.com" || h === "www.educerelator.com";
  } catch { return false; }
}

function currentLang() {
  try { return localStorage.getItem("lang") || "en"; } catch { return "en"; }
}

export function track(event, data = {}) {
  if (!enabled()) return;
  try {
    const body = JSON.stringify({ e: event, l: currentLang(), ...data });
    const blob = new Blob([body], { type: "text/plain" }); // simple request, no preflight
    if (!(navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob))) {
      fetch(ENDPOINT, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
    }
  } catch { /* counting is best-effort */ }
}

// How long since this device last played, as a coarse bucket. Computed
// locally from the device's own stats; only the bucket is sent.
export function recencyBucket(stats) {
  try {
    const last = stats && stats.lastPlayDate;
    if (!last || !stats.totalAnswered) return "new";
    const days = Math.round((Date.now() - new Date(`${last}T12:00:00`).getTime()) / 864e5);
    if (days <= 1) return "d1";
    if (days <= 7) return "d7";
    if (days <= 30) return "d30";
    return "older";
  } catch { return "new"; }
}
