// Countries EC Play serves ("Built by Educerelator. Built for the world.").
//
// Wave 1 = countries whose children can learn in languages EC Play already
// supports with verified content. India keeps every class and exam track;
// every other country starts with Class 1 foundations (numbers, letters and
// sounds, the world around us), which are taught much the same way everywhere.
// Languages marked "preview" in content/languages.js (Sinhala, Arabic, Malay,
// Chinese, Spanish) are AI-drafted for Class 1 and labelled Preview in the app
// until a native speaker reviews them.
//
// grade(n) gives the local name for EC Play's Class n, matched by age
// (Class 1 = about age 6).

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const ALL_LANGS = ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "ur", "or", "ne"];

export const COUNTRIES = [
  { code: "IN", name: "India", flag: "🇮🇳", lat: 22.5, lon: 79, langs: ALL_LANGS, defaultLang: null,
    classes: range(1, 12), exams: true, regions: true, grade: (n) => `Class ${n}`,
    tz: ["Asia/Kolkata", "Asia/Calcutta"] },
  { code: "NP", name: "Nepal", flag: "🇳🇵", lat: 28.2, lon: 84, langs: ["ne", "en"], defaultLang: "ne",
    classes: [1], grade: (n) => `Grade ${n}`, tz: ["Asia/Kathmandu", "Asia/Katmandu"] },
  { code: "BD", name: "Bangladesh", flag: "🇧🇩", lat: 23.7, lon: 90.4, langs: ["bn", "en"], defaultLang: "bn",
    classes: [1], grade: (n) => `Class ${n}`, tz: ["Asia/Dhaka", "Asia/Dacca"] },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰", lat: 7.9, lon: 80.7, langs: ["si", "ta", "en"], defaultLang: "en",
    classes: [1], grade: (n) => `Grade ${n}`, tz: ["Asia/Colombo"] },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", lat: 24.3, lon: 54.4, langs: ["en", "ar", "hi", "ur", "ml", "ta", "bn"], defaultLang: "en",
    classes: [1], grade: (n) => `Grade ${n}`, tz: ["Asia/Dubai"] },
  { code: "SG", name: "Singapore", flag: "🇸🇬", lat: 1.35, lon: 103.8, langs: ["en", "zh", "ms", "ta"], defaultLang: "en",
    classes: [1], grade: (n) => `Primary ${n}`, tz: ["Asia/Singapore"] },
  { code: "US", name: "United States", flag: "🇺🇸", lat: 39, lon: -98, langs: ["en", "es"], defaultLang: "en",
    classes: [1], grade: (n) => `Grade ${n}`,
    tz: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "America/Detroit", "America/Boise", "America/Indiana/Indianapolis", "America/Kentucky/Louisville", "Pacific/Honolulu", "US/Eastern", "US/Central", "US/Mountain", "US/Pacific"] },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", lat: 54, lon: -2, langs: ["en"], defaultLang: "en",
    classes: [1], grade: (n) => (n === 1 ? "Year 1–2" : `Year ${n + 1}`), tz: ["Europe/London", "Europe/Belfast"] },
  { code: "AU", name: "Australia", flag: "🇦🇺", lat: -25, lon: 134, langs: ["en"], defaultLang: "en",
    classes: [1], grade: (n) => `Year ${n}`,
    tz: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Australia/Hobart", "Australia/Darwin", "Australia/Canberra"] },
  { code: "GM", name: "The Gambia", flag: "🇬🇲", lat: 13.45, lon: -15.4, langs: ["en"], defaultLang: "en",
    classes: [1], grade: (n) => `Grade ${n}`, tz: ["Africa/Banjul"] },
];

export const COUNTRY_KEY = "ecplay_country";
const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export const getCountry = (code) => BY_CODE.get(code) || null;
export const INDIA = BY_CODE.get("IN");

// Best guess at the learner's country with no network call and no location
// prompt: the device's time zone first, then its language region (en-US).
// The language hint is used only when the time zone is unknown: browsers in
// many countries (India included) default to "en-US", so it must never
// override a time zone that points elsewhere.
export function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== "UTC" && tz !== "Etc/UTC") {
      const byTz = COUNTRIES.find((c) => c.tz.includes(tz));
      return byTz ? { country: byTz, how: "timezone" } : { country: null, how: "none" };
    }
  } catch { /* fall through */ }
  try {
    for (const l of navigator.languages || [navigator.language]) {
      const region = (l.split("-")[1] || "").toUpperCase();
      const c = BY_CODE.get(region);
      if (c) return { country: c, how: "language" };
    }
  } catch { /* fall through */ }
  return { country: null, how: "none" };
}

export function savedCountry() {
  try { return getCountry(localStorage.getItem(COUNTRY_KEY)); } catch { return null; }
}
export function saveCountry(code) {
  try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* ignore */ }
}
