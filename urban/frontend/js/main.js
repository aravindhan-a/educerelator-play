import { ALL_CLASSES, CURRICULA, getSubjectsForClass } from "../../../content/curriculum.js";
import { getRegionLabel } from "../../../content/regions.js";
import { EXAMS, topicLabel } from "../../../content/exams.js";
import { getNextQuestion } from "./question-bank.js";
import { checkPremium, isPremiumCached, getPremiumInfo, openRazorpayCheckout } from "./premium.js";
import { recordResult } from "./progress.js";
import { recordAnswer, recordScreenTime, loadStats, getLast7Days, formatDuration, effectiveDayStreak, adoptStats } from "./stats.js";
import { playCorrectChime, playWrongBuzz, playToggleBlip, unlockAudio } from "./sound-fx.js";
import { drawSessionCard, drawStreakCard, drawReportCard, shareCard } from "./share-cards.js";
import { playAudio, unlockSpeech } from "../../../shared-lib/audio-player.js";
import {
  createAdaptiveState,
  recordAttempt,
  getDifficulty,
} from "../../../shared-lib/adaptive-engine.js";
import {
  onAuthChange,
  loginWithGoogle,
  registerUser,
  loginUser,
  logoutUser,
  loadUserProgress,
  saveUserProgress,
  resetPassword,
} from "./auth.js";

// ── UI strings for supported languages (English + 12 Indian languages) ──
const UI_STRINGS = {
  en:  { pickClass:"Choose your class", pickSubject:"Choose a subject", morning:"Good morning! ☀️", afternoon:"Good afternoon! 🌤️", evening:"Good evening! 🌙", wellDone:"Well done! 🎉", tryAgain:"Try again next time!", continueLabel:"Continue where you left off" },
  hi:  { pickClass:"अपनी कक्षा चुनें", pickSubject:"एक विषय चुनें", morning:"शुभ प्रभात! ☀️", afternoon:"शुभ दोपहर! 🌤️", evening:"शुभ संध्या! 🌙", wellDone:"शाबाश! 🎉", tryAgain:"अगली बार फिर कोशिश करें!", continueLabel:"जहाँ छोड़ा वहाँ से जारी रखें" },
  ta:  { pickClass:"உங்கள் வகுப்பைத் தேர்ந்தெடுங்கள்", pickSubject:"ஒரு பாடத்தைத் தேர்ந்தெடுங்கள்", morning:"காலை வணக்கம்! ☀️", afternoon:"மதிய வணக்கம்! 🌤️", evening:"மாலை வணக்கம்! 🌙", wellDone:"மிகவும் நல்லது! 🎉", tryAgain:"அடுத்த முறை முயற்சிக்கவும்!", continueLabel:"நிறுத்திய இடத்தில் தொடரவும்" },
  bn:  { pickClass:"আপনার শ্রেণী বেছে নিন", pickSubject:"একটি বিষয় বেছে নিন", morning:"শুভ সকাল! ☀️", afternoon:"শুভ দুপুর! 🌤️", evening:"শুভ সন্ধ্যা! 🌙", wellDone:"চমৎকার! 🎉", tryAgain:"পরের বার আবার চেষ্টা করুন!", continueLabel:"যেখানে ছেড়েছিলেন সেখান থেকে চালিয়ে যান" },
  gu:  { pickClass:"તમારો વર્ગ પસંદ કરો", pickSubject:"એક વિષય પસંદ કરો", morning:"સુપ્રભાત! ☀️", afternoon:"શુભ બપોર! 🌤️", evening:"શુભ સાંજ! 🌙", wellDone:"શાબાશ! 🎉", tryAgain:"આગળ વખત ફરી પ્રયાસ કરો!", continueLabel:"જ્યાં છોડ્યું ત્યાંથી ચાલુ રાખો" },
  kn:  { pickClass:"ನಿಮ್ಮ ತರಗತಿ ಆಯ್ಕೆ ಮಾಡಿ", pickSubject:"ಒಂದು ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ", morning:"ಶುಭೋದಯ! ☀️", afternoon:"ಶುಭ ಮಧ್ಯಾಹ್ನ! 🌤️", evening:"ಶುಭ ಸಂಜೆ! 🌙", wellDone:"ಭಲೇ! 🎉", tryAgain:"ಮುಂದಿನ ಬಾರಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ!", continueLabel:"ನಿಲ್ಲಿಸಿದ ಕಡೆಯಿಂದ ಮುಂದುವರಿಸಿ" },
  ml:  { pickClass:"നിങ്ങളുടെ ക്ലാസ് തിരഞ്ഞെടുക്കുക", pickSubject:"ഒരു വിഷയം തിരഞ്ഞെടുക്കുക", morning:"ശുഭപ്രഭാതം! ☀️", afternoon:"ശുഭ ഉച്ചനേരം! 🌤️", evening:"ശുഭ സന്ധ്യ! 🌙", wellDone:"നന്നായി! 🎉", tryAgain:"അടുത്ത തവണ വീണ്ടും ശ്രമിക്കൂ!", continueLabel:"നിർത്തിയ ഇടത്ത് നിന്ന് തുടരുക" },
  mr:  { pickClass:"तुमचा वर्ग निवडा", pickSubject:"एक विषय निवडा", morning:"शुभ प्रभात! ☀️", afternoon:"शुभ दुपार! 🌤️", evening:"शुभ संध्या! 🌙", wellDone:"शाबास! 🎉", tryAgain:"पुढच्या वेळी पुन्हा प्रयत्न करा!", continueLabel:"सोडलेल्या जागेपासून सुरू ठेवा" },
  pa:  { pickClass:"ਆਪਣੀ ਕਲਾਸ ਚੁਣੋ", pickSubject:"ਇੱਕ ਵਿਸ਼ਾ ਚੁਣੋ", morning:"ਸ਼ੁਭ ਸਵੇਰ! ☀️", afternoon:"ਸ਼ੁਭ ਦੁਪਹਿਰ! 🌤️", evening:"ਸ਼ੁਭ ਸ਼ਾਮ! 🌙", wellDone:"ਸ਼ਾਬਾਸ਼! 🎉", tryAgain:"ਅਗਲੀ ਵਾਰ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ!", continueLabel:"ਜਿੱਥੇ ਛੱਡਿਆ ਉੱਥੋਂ ਜਾਰੀ ਰੱਖੋ" },
  te:  { pickClass:"మీ తరగతిని ఎంచుకోండి", pickSubject:"ఒక సబ్జెక్ట్ ఎంచుకోండి", morning:"శుభోదయం! ☀️", afternoon:"శుభ మధ్యాహ్నం! 🌤️", evening:"శుభ సాయంత్రం! 🌙", wellDone:"చాలా బాగు! 🎉", tryAgain:"తదుపరి సారి మళ్ళీ ప్రయత్నించు!", continueLabel:"ఆగిన చోటి నుండి కొనసాగించు" },
  ur:  { pickClass:"اپنی کلاس منتخب کریں", pickSubject:"ایک مضمون منتخب کریں", morning:"صبح بخیر! ☀️", afternoon:"سہ پہر بخیر! 🌤️", evening:"شام بخیر! 🌙", wellDone:"شاباش! 🎉", tryAgain:"اگلی بار پھر کوشش کریں!", continueLabel:"جہاں چھوڑا وہاں سے جاری رکھیں" },
  as:  { pickClass:"আপোনাৰ শ্ৰেণী বাছক", pickSubject:"এটা বিষয় বাছক", morning:"শুভ ৰাতিপুৱা! ☀️", afternoon:"শুভ দুপৰীয়া! 🌤️", evening:"শুভ সন্ধিয়া! 🌙", wellDone:"চমৎকাৰ! 🎉", tryAgain:"পৰৱৰ্তী বাৰ আকৌ চেষ্টা কৰক!", continueLabel:"য'ত এৰি থৈছিল তাৰ পৰা আৰম্ভ কৰক" },
  or:  { pickClass:"ଆପଣଙ୍କ ଶ୍ରେଣୀ ବାଛନ୍ତୁ", pickSubject:"ଏକ ବିଷୟ ବାଛନ୍ତୁ", morning:"ଶୁଭ ସକାଳ! ☀️", afternoon:"ଶୁଭ ଅପରାହ୍ନ! 🌤️", evening:"ଶୁଭ ସନ୍ଧ୍ୟା! 🌙", wellDone:"ବଢ଼ିଆ! 🎉", tryAgain:"ପରବର୍ତ୍ତୀ ଥର ଆଉ ଚେଷ୍ଟା କର!", continueLabel:"ଯେଉଁଠୁ ଛାଡ଼ିଥିଲ ସେଠୁ ଜାରି ରଖ" },
  ne:  { pickClass:"आफ्नो कक्षा छान्नुहोस्", pickSubject:"एउटा विषय छान्नुहोस्", morning:"शुभ प्रभात! ☀️", afternoon:"शुभ दिउँसो! 🌤️", evening:"शुभ साँझ! 🌙", wellDone:"साबाश! 🎉", tryAgain:"अर्को पटक फेरि कोशिश गर्नुहोस्!", continueLabel:"छाडेकोबाट जारी राख्नुहोस्" },
  sa:  { pickClass:"स्वकक्षां चिनुत", pickSubject:"एकं विषयं चिनुत", morning:"सुप्रभातम्! ☀️", afternoon:"शुभं मध्याह्नम्! 🌤️", evening:"शुभं सायाह्नम्! 🌙", wellDone:"साधु! 🎉", tryAgain:"पुनः प्रयत्नं करोतु!", continueLabel:"यत्र अत्यक्षत तत्र पुनरारभत" },
};
function t(key) { return (UI_STRINGS[lang] || UI_STRINGS.en)[key] || UI_STRINGS.en[key]; }

// current home-screen mode ("battle" = Friend Quest, "learn" = classic quiz);
// declared early because applyUIStrings consults it. Set properly at init.
let gameMode = "learn";

function applyUIStrings() {
  // quest mode owns the pick-title copy (setGameMode); don't clobber it
  if (gameMode !== "battle") {
    document.querySelectorAll(".pick-title").forEach(el => { el.textContent = t("pickClass"); });
  }
  const subjectTitle = document.querySelector("#subject-picker .screen-title");
  if (subjectTitle) subjectTitle.textContent = t("pickSubject");
  const contLabel = document.querySelector(".continue-label");
  if (contLabel) contLabel.textContent = t("continueLabel");
}

// ── persisted state keys ──
const ADAPTIVE_KEY = "adaptiveState";
const LANG_KEY     = "lang";
const CURR_KEY     = "curriculum";
const GUEST_KEY    = "ecplay_guest";
const REGION_KEY   = "ecplay_region";   // cached auto-detected region { id, ts }
const SOUND_KEY    = "ecplay_sound";
// Payments are OFF until company compliance + GST registration are complete.
// Flip to true to restore the premium upsell, modal and checkout — no other
// code changes needed. (Backend endpoints stay deployed but unused.)
const PAYMENTS_ENABLED = false;
// Prices live here, NOT in the static HTML, so no ₹ pricing is ever shipped in
// the crawlable markup while payments are paused (compliance + clean SEO — a
// search engine can't pull "₹149" into a snippet). When PAYMENTS_ENABLED flips
// to true, applyPricingUI() injects them into the pre-built (hidden) UI.
const PRICES = { monthly: "₹149", yearly: "₹999" };
function applyPricingUI() {
  if (!PAYMENTS_ENABLED) return;
  document.querySelectorAll("[data-plan-price]").forEach((el) => {
    el.textContent = PRICES[el.dataset.planPrice] || "";
  });
  const sb = document.getElementById("upgrade-from-session");
  if (sb) sb.textContent = `Upgrade · ${PRICES.monthly}/mo`;
}
applyPricingUI();
const API_BASE     = "https://educerelator-backend.vercel.app";
const REGION_TTL   = 7 * 24 * 60 * 60 * 1000; // re-detect at most weekly

// ── session progress ──
const SESSION_TOTAL = 10;
let sessionCount   = 0;
let sessionCorrect = 0;
let sessionSeenIds = new Set();
// ── game state ──
let sessionScore   = 0;
let sessionCombo   = 0;
let sessionHearts  = 3;
let sessionAnswers = []; // true/false per question answered
let comboBannerTimer = null;
let advanceTimer     = null; // pending next-question timer (cancelled on navigation)
let lastSessionStars  = 1;   // for the share card
let lastSessionRecord = false;

// ── runtime state ──
let guestMode       = localStorage.getItem(GUEST_KEY) === "1";
let lang            = localStorage.getItem(LANG_KEY) || "en";
let curriculum      = localStorage.getItem(CURR_KEY) || "cbse";
let region          = "all"; // resolved from the user's location by detectRegion()
let soundOn         = localStorage.getItem(SOUND_KEY) !== "0"; // default on
let adaptiveState   = loadJSON(ADAPTIVE_KEY, createAdaptiveState);
let currentClass    = null;
let currentSubject  = null;
let currentQuestion = null;
let questionStartedAt = null;
let sessionStartedAt  = null;   // for screen-time tracking
let currentUser     = null;
let profilePrevScreen = null;   // which screen to restore when leaving profile

// ── DOM refs ──
const classPickerEl    = document.getElementById("class-picker");
const subjectPickerEl  = document.getElementById("subject-picker");
const playScreenEl     = document.getElementById("play-screen");
const classGridEl      = document.getElementById("class-grid");
const subjectGridEl    = document.getElementById("subject-grid");
const currTabsEl       = document.getElementById("curriculum-tabs");
const classBadgeEl     = document.getElementById("class-badge");
const playBadgeEl      = document.getElementById("play-badge");
const langSwitcher     = document.getElementById("lang-switcher");
const backToClassBtn   = document.getElementById("back-to-class");
const backToSubjectsBtn= document.getElementById("back-to-subjects");
const repeatAudioBtn   = document.getElementById("repeat-audio-btn");
const questionVisual   = document.getElementById("question-visual");
const questionPrompt   = document.getElementById("question-prompt");
const choicesEl        = document.getElementById("choices");
const feedbackEl       = document.getElementById("feedback");
const confettiLayer    = document.getElementById("confetti-layer");
const streakDisplay    = document.getElementById("streak-display");
const streakCountEl    = document.getElementById("streak-count");
const mascotPlay       = document.getElementById("mascot-play");
const aboutLink        = document.getElementById("about-link");
const aboutModal       = document.getElementById("about-modal");
const aboutClose       = document.getElementById("about-close");
// auth
const authModalEl      = document.getElementById("auth-modal");
const loginFormEl      = document.getElementById("login-form");
const registerFormEl   = document.getElementById("register-form");
const loginErrorEl     = document.getElementById("login-error");
const registerErrorEl  = document.getElementById("register-error");
const userInfoEl       = document.getElementById("user-info");
const userInitialsEl   = document.getElementById("user-initials");
const userAvatarBtn    = document.getElementById("user-avatar-btn");
const signoutBtnEl     = document.getElementById("signout-btn");
const profileScreenEl  = document.getElementById("profile-screen");
const backFromProfile  = document.getElementById("back-from-profile");
// session complete + premium
const sessionCompleteEl    = document.getElementById("session-complete");
const completeScoreEl      = document.getElementById("complete-score");
const completeTitleEl      = document.getElementById("complete-title");
const scoreRevealValEl     = document.getElementById("score-reveal-val");
const newRecordBadgeEl     = document.getElementById("new-record-badge");
const playAgainBtn         = document.getElementById("play-again-btn");
const newSubjectBtn        = document.getElementById("new-subject-btn");
const upgradeStripEl       = document.getElementById("upgrade-strip");
const upgradeFromSessionBtn= document.getElementById("upgrade-from-session");
const premiumModalEl       = document.getElementById("premium-modal");
const premiumCloseBtn      = document.getElementById("premium-close");
const checkoutBtn          = document.getElementById("checkout-btn");

const CONFETTI_EMOJI = ["🎉", "⭐", "✨", "🎈", "🏆"];

const GROUP_EMOJI = {
  "group-primary-low": "🐣",
  "group-primary":     "🌱",
  "group-middle":      "🚀",
  "group-secondary":   "⚡",
  "group-senior":      "🏆",
};

// ── helpers ──
function loadJSON(key, defaultFn) {
  try { return JSON.parse(localStorage.getItem(key)) || defaultFn(); }
  catch { return defaultFn(); }
}
function saveAdaptiveState() {
  localStorage.setItem(ADAPTIVE_KEY, JSON.stringify(adaptiveState));
}
function adaptiveKey(classNum, subject) { return `${classNum}:${subject}`; }

// ── HUD rendering ──
function renderHUD() {
  // Hearts
  const heartsEl = document.getElementById("hud-hearts");
  if (heartsEl) {
    heartsEl.innerHTML = "";
    heartsEl.setAttribute("role", "img");
    heartsEl.setAttribute("aria-label", `${sessionHearts} of 3 lives remaining`);
    for (let i = 0; i < 3; i++) {
      const h = document.createElement("span");
      h.className = "hud-heart" + (i >= sessionHearts ? " broken" : "");
      h.textContent = "❤️";
      h.setAttribute("aria-hidden", "true");
      heartsEl.appendChild(h);
    }
  }
  // Score
  const scoreEl = document.getElementById("hud-score-val");
  if (scoreEl) {
    scoreEl.textContent = sessionScore.toLocaleString();
    scoreEl.classList.remove("pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pop");
    setTimeout(() => scoreEl.classList.remove("pop"), 200);
  }
  // Dots
  const dotsEl = document.getElementById("hud-dots");
  if (dotsEl) {
    dotsEl.innerHTML = "";
    for (let i = 0; i < SESSION_TOTAL; i++) {
      const d = document.createElement("div");
      d.className = "hud-dot";
      if (i < sessionCount) {
        d.classList.add(sessionAnswers[i] ? "dot-correct" : "dot-wrong");
      }
      dotsEl.appendChild(d);
    }
  }
}

function showComboBanner(multiplier) {
  const el = document.getElementById("combo-banner");
  if (!el) return;
  const labels = { 2: "🔥 Combo ×2!", 3: "🔥🔥 Combo ×3!", 4: "⚡ MAX COMBO ×4!" };
  el.textContent = labels[multiplier] || `×${multiplier}`;
  el.classList.add("show");
  clearTimeout(comboBannerTimer);
  comboBannerTimer = setTimeout(() => el.classList.remove("show"), 1500);
}

function flyScore(points, fromEl) {
  const rect = fromEl.getBoundingClientRect();
  const el   = document.createElement("div");
  el.className   = "fly-score";
  el.textContent = `+${points}`;
  el.style.left  = `${rect.left + rect.width / 2}px`;
  el.style.top   = `${rect.top}px`;
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

function sparkleAnswer(fromEl) {
  const rect   = fromEl.getBoundingClientRect();
  const cx     = rect.left + rect.width / 2;
  const cy     = rect.top  + rect.height / 2;
  const sparks = ["✨","⭐","💫","🌟","✦"];
  for (let i = 0; i < 8; i++) {
    const s   = document.createElement("span");
    s.className   = "sparkle-piece";
    const angle   = (i / 8) * Math.PI * 2;
    const dist    = 50 + Math.random() * 60;
    s.style.left  = `${cx}px`;
    s.style.top   = `${cy}px`;
    s.style.setProperty("--sdx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--sdy", `${Math.sin(angle) * dist}px`);
    s.style.setProperty("--srot", `${(Math.random() - 0.5) * 360}deg`);
    s.textContent = sparks[Math.floor(Math.random() * sparks.length)];
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
}

function launchEndConfetti() {
  const container = document.getElementById("end-confetti");
  if (!container) return;
  container.innerHTML = "";
  const colors = ["#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6","#ef4444","#fbbf24"];
  for (let i = 0; i < 80; i++) {
    const p = document.createElement("div");
    p.className      = "end-confetti-piece";
    p.style.left     = `${Math.random() * 100}%`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.setProperty("--fdx",  `${(Math.random() - 0.5) * 200}px`);
    p.style.setProperty("--frot", `${(Math.random() - 0.5) * 720}deg`);
    p.style.animationDuration = `${1.5 + Math.random() * 2}s`;
    p.style.animationDelay   = `${Math.random() * 0.6}s`;
    p.style.width  = `${6 + Math.random() * 8}px`;
    p.style.height = `${6 + Math.random() * 8}px`;
    container.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

function animateStars(count) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`star${i}`);
    if (!el) continue;
    if (i <= count) {
      setTimeout(() => el.classList.add("earned"), i * 220);
    } else {
      el.classList.remove("earned");
    }
  }
}

function countUpScore(target) {
  const el = document.getElementById("score-reveal-val");
  if (!el) return;
  let current = 0;
  const step  = Math.ceil(target / 40);
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(timer);
  }, 30);
}

function updateWelcomeBanner() {
  if (!currentUser && !guestMode) return;
  const banner = document.getElementById("welcome-banner");
  banner.classList.remove("hidden");

  const hour = new Date().getHours();
  document.getElementById("time-greeting").textContent =
    hour < 12 ? t("morning") : hour < 17 ? t("afternoon") : t("evening");

  const name = currentUser
    ? (currentUser.displayName || currentUser.email.split("@")[0])
    : null;
  document.getElementById("welcome-name").textContent =
    name ? `Hi, ${name.split(" ")[0]}! 👋` : "Welcome! 👋";

  // Deliberately no accuracy here — the home screen celebrates showing up and
  // playing (streaks, volume), never how often a student is wrong.
  const s = loadStats();
  document.getElementById("home-streak").textContent      = effectiveDayStreak(s);
  document.getElementById("home-stars").textContent       = s.totalAnswered || 0;
  document.getElementById("home-best-streak").textContent = s.longestDayStreak || 0;
  document.getElementById("home-stats").classList.toggle("hidden", s.totalAnswered === 0);

  // Continue bar
  const last = loadJSON("lastPlayed", () => null);
  const continueBar = document.getElementById("continue-bar");
  if (last) {
    const subjects = getSubjectsForClass(last.classNum);
    const meta = subjects.find((s) => s.id === last.subject);
    const label = meta ? `${meta.emoji} Class ${last.classNum} · ${meta.label}` : `Class ${last.classNum} · ${last.subject}`;
    document.getElementById("continue-btn").textContent = label;
    continueBar.classList.remove("hidden");
  } else {
    continueBar.classList.add("hidden");
  }
}

async function startPlayFromContinue(classNum, subject) {
  currentClass = classNum;
  await startPlay(subject);
}

function syncProgress() {
  if (!currentUser) return;
  const prog = JSON.parse(localStorage.getItem("progress") || '{"skills":{}}');
  // Stats (streak, totals) ride inside the synced progress object so they
  // follow the account across devices — Firestore rules already allow it.
  prog.stats = loadStats();
  saveUserProgress(currentUser.uid, prog);
}

function friendlyAuthError(code) {
  if (["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(code))
    return "Incorrect email or password.";
  if (code === "auth/email-already-in-use") return "An account with this email already exists.";
  if (code === "auth/weak-password")        return "Password must be at least 6 characters.";
  if (code === "auth/invalid-email")        return "Please enter a valid email address.";
  return "Something went wrong. Please try again.";
}

// ── Google sign-in ──
document.getElementById("google-signin-btn").addEventListener("click", async () => {
  const btn = document.getElementById("google-signin-btn");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  try {
    await loginWithGoogle();
  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A353" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31z"/></svg> Continue with Google`;
    loginErrorEl.textContent = friendlyAuthError(err.code);
  }
});

// ── auth tabs ──
document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const which = tab.dataset.tab;
    document.querySelectorAll(".auth-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.tab === which)
    );
    loginFormEl.classList.toggle("hidden",   which !== "login");
    registerFormEl.classList.toggle("hidden", which !== "register");
  });
});

// ── login form ──
loginFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginErrorEl.textContent = "";
  const btn = loginFormEl.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await loginUser(
      document.getElementById("login-email").value,
      document.getElementById("login-password").value
    );
  } catch (err) {
    loginErrorEl.textContent = friendlyAuthError(err.code);
    btn.disabled = false;
  }
});

// ── register form ──
registerFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  registerErrorEl.textContent = "";
  const btn = registerFormEl.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await registerUser(
      document.getElementById("reg-name").value.trim(),
      document.getElementById("reg-email").value,
      document.getElementById("reg-password").value
    );
  } catch (err) {
    registerErrorEl.textContent = friendlyAuthError(err.code);
    btn.disabled = false;
  }
});

// ── password visibility toggles ──
document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show  = input.type === "password";
    input.type  = show ? "text" : "password";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.classList.toggle("showing", show);
  });
});

// ── forgot password ──
document.getElementById("forgot-password-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  loginErrorEl.classList.remove("auth-success");
  if (!email) {
    loginErrorEl.textContent = "Type your email above first, then tap 'Forgot password?'";
    return;
  }
  try {
    await resetPassword(email);
    loginErrorEl.textContent =
      `If an account exists for ${email}, a reset link is on its way — check your inbox and spam folder. ` +
      `If you signed up with Google, use "Continue with Google" instead.`;
    loginErrorEl.classList.add("auth-success");
  } catch (err) {
    loginErrorEl.textContent =
      err.code === "auth/invalid-email" ? "Please enter a valid email address."
      : err.code === "auth/user-not-found" ? "No account found with this email. Try creating an account instead."
      : "Could not send the reset email. Please try again in a minute.";
  }
});

// ── signout ──
signoutBtnEl.addEventListener("click", () => logoutUser());

// ── auth state listener (entry point of the app) ──
const topbarSigninBtn = document.getElementById("topbar-signin");

onAuthChange(async (user) => {
  if (user) {
    currentUser = user;
    guestMode = false;
    localStorage.removeItem(GUEST_KEY);
    const name = user.displayName || user.email.split("@")[0];
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    userInitialsEl.textContent = initials;
    userInfoEl.classList.remove("hidden");
    topbarSigninBtn.classList.add("hidden");
    authModalEl.classList.add("hidden");

    // Load cloud progress. Cloud wins only if it has real data — a fresh
    // account (e.g. a guest upgrading) must not wipe local progress.
    try {
      const serverProgress = await loadUserProgress(user.uid);
      const hasServerData  = serverProgress && Object.keys(serverProgress.skills || {}).length > 0;
      const local          = loadJSON("progress", () => null);
      const hasLocalData   = local && Object.keys(local.skills || {}).length > 0;
      // Streak/stats follow the account: adopt the cloud snapshot when it has
      // seen more play than this device (fresh phone, reinstall, new browser).
      const cloudStats = serverProgress && serverProgress.stats;
      if (cloudStats && (cloudStats.totalAnswered || 0) > (loadStats().totalAnswered || 0)) {
        adoptStats(cloudStats);
      }
      if (hasServerData) {
        localStorage.setItem("progress", JSON.stringify(serverProgress));
      } else if (hasLocalData) {
        local.stats = loadStats();
        saveUserProgress(user.uid, local);
      }
    } catch { /* offline */ }

    // Background premium check (non-blocking)
    checkPremium(user).catch(() => {});

    applyUIStrings();
    showClassPicker();
    updateWelcomeBanner();
  } else {
    currentUser = null;
    userInfoEl.classList.add("hidden");
    if (guestMode) {
      authModalEl.classList.add("hidden");
      topbarSigninBtn.classList.remove("hidden");
      applyUIStrings();
      showClassPicker();
    } else {
      authModalEl.classList.remove("hidden");
    }
  }
});

// ── guest mode ──
document.getElementById("guest-btn").addEventListener("click", () => {
  guestMode = true;
  localStorage.setItem(GUEST_KEY, "1");
  authModalEl.classList.add("hidden");
  topbarSigninBtn.classList.remove("hidden");
  applyUIStrings();
  showClassPicker();
});

topbarSigninBtn.addEventListener("click", () => {
  authModalEl.classList.remove("hidden");
});

// ── lang switcher ──
langSwitcher.value = lang;
document.documentElement.lang = lang;
langSwitcher.addEventListener("change", () => {
  lang = langSwitcher.value;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyUIStrings();
  updateWelcomeBanner();
  if (currentQuestion) renderQuestion(currentQuestion);
});

// ── class grid ──
ALL_CLASSES.forEach(({ num, groupLabel, colorClass }) => {
  const btn = document.createElement("button");
  btn.className = `class-btn ${colorClass}`;
  const emoji = GROUP_EMOJI[colorClass] || "⭐";
  btn.innerHTML = `<span class="class-emoji">${emoji}</span><span class="class-num">${num}</span><span class="class-label">${groupLabel}</span>`;
  btn.addEventListener("click", () => showSubjectPicker(num));
  classGridEl.appendChild(btn);
});

// ── NEET / JEE / UPSC revision (in-app, parallel to the K-12 loop) ──
const examGridEl   = document.getElementById("exam-grid");
const examScreenEl  = document.getElementById("exam-screen");
const examBadgeEl   = document.getElementById("exam-badge");
const examBodyEl    = document.getElementById("exam-body");
const EXAM_REVIEW_KEY = "ecplay_pyq_review";
const EXAM_DAY = 86400000;
const EXAM_INTERVALS = [0, 1, 3, 7, 16]; // Leitner box → days
let exState = { id: null, subject: null, bank: [], queue: [], idx: 0, answered: false, right: 0, total: 0, mode: "all", returnClass: null };

// Board-exam tracks (cbse-10 / cbse-12) live INSIDE their class's subject
// picker, not on the home screen — only competitive exams get home tiles.
EXAMS.forEach((ex) => {
  if (ex.category === "board") return;
  const btn = document.createElement("button");
  btn.className = "class-btn exam-btn";
  btn.innerHTML = `<span class="class-emoji">${ex.emoji}</span><span class="class-num">${ex.label}</span><span class="class-label">Previous Years</span>`;
  btn.addEventListener("click", () => openExam(ex.id, null));
  examGridEl.appendChild(btn);
});
const BOARD_EXAM_BY_CLASS = { 10: "cbse-10", 12: "cbse-12" };

const exLoadReview = () => { try { return JSON.parse(localStorage.getItem(EXAM_REVIEW_KEY) || "{}"); } catch { return {}; } };
const exSaveReview = (r) => localStorage.setItem(EXAM_REVIEW_KEY, JSON.stringify(r));
const exReviewIds  = () => Object.keys(exLoadReview());
function exMarkWrong(id) {
  const r = exLoadReview(); const e = r[id] || { misses: 0, box: 0 };
  e.misses++; e.box = 1; e.lastSeen = Date.now(); e.nextReview = Date.now() + EXAM_INTERVALS[1] * EXAM_DAY;
  r[id] = e; exSaveReview(r);
}
function exMarkRight(id) {
  const r = exLoadReview(); if (!r[id]) return;
  r[id].box = Math.min(r[id].box + 1, EXAM_INTERVALS.length - 1);
  if (r[id].box >= EXAM_INTERVALS.length - 1) delete r[id];
  else r[id].nextReview = Date.now() + EXAM_INTERVALS[r[id].box] * EXAM_DAY;
  exSaveReview(r);
}
const exShuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const exT = (obj) => (obj && (obj[lang] || obj.en)) || "";

function showExamScreen() {
  clearTimeout(advanceTimer);
  window.speechSynthesis?.cancel();
  document.body.classList.remove("focus-mode");
  window.scrollTo(0, 0);
  classPickerEl.classList.add("hidden");
  subjectPickerEl.classList.add("hidden");
  playScreenEl.classList.add("hidden");
  sessionCompleteEl.classList.add("hidden");
  profileScreenEl.classList.add("hidden");
  streakDisplay.classList.add("hidden");
  examScreenEl.classList.remove("hidden");
}

// returnClass: when a board track is opened from inside a class's subject
// picker, Back returns there instead of the home screen. Passing undefined
// (internal navigation) keeps the current returnClass.
function openExam(id, returnClass) {
  if (returnClass !== undefined) exState.returnClass = returnClass;
  else if (exState.id !== id) exState.returnClass = null;
  exState.id = id;
  const exam = EXAMS.find((e) => e.id === id);
  examBadgeEl.textContent = exam.label;
  showExamScreen();
  examBodyEl.innerHTML =
    `<h2 class="screen-title">${exam.label} · choose a subject</h2><div class="subject-grid" id="exam-subjects"></div>`;
  const grid = examBodyEl.querySelector("#exam-subjects");
  exam.subjects.forEach((s) => {
    const b = document.createElement("button");
    b.className = "subject-btn";
    b.innerHTML = `<span class="subject-emoji">${s.emoji}</span>${s.label}`;
    b.addEventListener("click", () => openExamSubject(id, s));
    grid.appendChild(b);
  });
}

async function openExamSubject(examId, subj) {
  exState.subject = subj.id;
  let data = null;
  try {
    const res = await fetch(`../../content/exams/${examId}/${subj.id}.json`);
    if (res.ok) data = await res.json();
  } catch { /* offline / missing */ }
  if (!data || !(data.questions || []).length) {
    examBodyEl.innerHTML =
      `<div class="exam-empty"><div class="exam-empty-emoji">📚</div>
        <strong>${subj.label} questions are coming soon.</strong>
        <p>NEET · Biology is available now to try the revision experience.</p>
        <button class="mode-btn" id="exam-empty-back">← Back</button></div>`;
    examBodyEl.querySelector("#exam-empty-back").addEventListener("click", () => openExam(examId));
    return;
  }
  exState.bank = data.questions;
  renderExamHome();
}

function renderExamHome() {
  const exam = EXAMS.find((e) => e.id === exState.id);
  const subj = exam.subjects.find((s) => s.id === exState.subject);
  const due = exReviewIds().length;
  const counts = {}; exState.bank.forEach((q) => (counts[q.topic] = (counts[q.topic] || 0) + 1));
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((r) => r[1]), 1);
  examBodyEl.innerHTML =
    `<div class="exam-note">📄 Sample previous-year questions — real sourced PYQs coming soon.</div>
     <div class="exam-modes">
       <button class="mode-btn primary" data-m="all">Practice all questions <b>${exState.bank.length}</b></button>
       <button class="mode-btn" data-m="review">🔁 Revise my mistakes ${due ? `<b class="ex-badge">${due}</b>` : '<span class="ex-muted">none yet</span>'}</button>
       <button class="mode-btn" id="exam-subj-back">← Other subjects</button>
     </div>
     <h3 class="exam-hy-title">High-yield topics</h3>
     ${rows.map(([t, n]) => `<div class="exam-hy-row"><span>${topicLabel(t)}</span><span>${n}</span></div><div class="exam-hy-bar" style="width:${Math.round(n / max * 100)}%"></div>`).join("")}`;
  examBadgeEl.textContent = `${exam.label} · ${subj.label}`;
  examBodyEl.querySelector("#exam-subj-back").addEventListener("click", () => openExam(exState.id));
  examBodyEl.querySelectorAll(".mode-btn[data-m]").forEach((b) => b.addEventListener("click", () => startExamSession(b.dataset.m)));
}

function startExamSession(mode) {
  exState.mode = mode;
  if (mode === "review") {
    const ids = new Set(exReviewIds());
    exState.queue = exShuffle(exState.bank.filter((q) => ids.has(q.id)));
    if (!exState.queue.length) return;
  } else {
    exState.queue = exShuffle(exState.bank);
  }
  exState.idx = 0; exState.right = 0; exState.total = 0;
  renderExamQuestion();
}

function renderExamQuestion() {
  const q = exState.queue[exState.idx];
  exState.answered = false;
  const order = exShuffle(q.choices.map((_, i) => i));
  examBodyEl.innerHTML =
    `<div class="exam-qmeta">
       <span class="tag">${topicLabel(q.topic)}</span><span class="tag">${q.source || "PYQ"}</span>
       <span class="tag">Q ${exState.idx + 1} / ${exState.queue.length}</span>
     </div>
     <div class="exam-prompt">${exT(q.prompt)}</div>
     <div id="exam-choices">${order.map((oi) => `<button class="exam-choice" data-oi="${oi}">${exT(q.choices[oi])}</button>`).join("")}</div>
     <div id="exam-sol" class="exam-solution hidden"></div>
     <div class="exam-row"><span class="ex-muted" id="exam-score">Score: <b>0</b> / 0</span><button class="mode-btn primary hidden" id="exam-next" style="width:auto">Next →</button></div>`;
  examBodyEl.querySelectorAll(".exam-choice").forEach((b) => b.addEventListener("click", () => examAnswer(parseInt(b.dataset.oi, 10), b)));
  examBodyEl.querySelector("#exam-next").addEventListener("click", () => {
    exState.idx++;
    (exState.idx >= exState.queue.length) ? renderExamSummary() : renderExamQuestion();
  });
}

function examAnswer(oi, btn) {
  if (exState.answered) return;
  exState.answered = true;
  const q = exState.queue[exState.idx];
  const correct = oi === q.answerIndex;
  exState.total++;
  examBodyEl.querySelectorAll(".exam-choice").forEach((b) => {
    b.disabled = true;
    const i = parseInt(b.dataset.oi, 10);
    if (i === q.answerIndex) b.classList.add("correct");
    else if (b === btn) b.classList.add("wrong");
  });
  if (correct) { exState.right++; if (exState.mode === "review") exMarkRight(q.id); }
  else exMarkWrong(q.id);
  examBodyEl.querySelector("#exam-score").innerHTML = `Score: <b>${exState.right}</b> / ${exState.total}`;
  const sol = examBodyEl.querySelector("#exam-sol");
  sol.innerHTML = `<div class="exam-sol-h">${correct ? "✅ Correct" : "❌ " + exT(q.choices[q.answerIndex]) + " is correct"}</div>${exT(q.solution)}`;
  sol.classList.remove("hidden");
  examBodyEl.querySelector("#exam-next").classList.remove("hidden");
}

function renderExamSummary() {
  const pct = exState.total ? Math.round(exState.right / exState.total * 100) : 0;
  const due = exReviewIds().length;
  examBodyEl.innerHTML =
    `<div class="exam-summary">
       <div class="exam-big">${exState.right} / ${exState.total}</div>
       <p class="ex-muted">${pct}% correct</p>
       ${due ? `<p>📒 <b>${due}</b> question${due > 1 ? "s" : ""} in your revision notebook.</p>` : `<p>🎉 Nothing to revise — clean run!</p>`}
       <div class="exam-modes">
         ${due ? `<button class="mode-btn primary" id="exam-rev">🔁 Revise my mistakes now <b class="ex-badge">${due}</b></button>` : ""}
         <button class="mode-btn" id="exam-again">← Back to ${EXAMS.find((e) => e.id === exState.id)?.label} subjects</button>
       </div>
     </div>`;
  const rev = examBodyEl.querySelector("#exam-rev");
  if (rev) rev.addEventListener("click", () => startExamSession("review"));
  examBodyEl.querySelector("#exam-again").addEventListener("click", () => openExam(exState.id));
}

document.getElementById("exam-back").addEventListener("click", () => {
  if (exState.returnClass) showSubjectPicker(exState.returnClass);
  else showClassPicker();
});

// ── continue button ──
document.getElementById("continue-btn").addEventListener("click", () => {
  const last = loadJSON("lastPlayed", () => null);
  if (last) startPlayFromContinue(last.classNum, last.subject);
});

// ── region (auto-detected from the user's location, never chosen) ──
const regionLabelEl = document.getElementById("region-label");

function showRegionLabel() {
  if (!regionLabelEl) return;
  if (region && region !== "all") {
    regionLabelEl.textContent = `📍 Local questions for ${getRegionLabel(region)}`;
    regionLabelEl.classList.remove("hidden");
  } else {
    regionLabelEl.classList.add("hidden");
  }
}

async function detectRegion() {
  // Reuse a recent detection so we don't hit the network on every visit.
  try {
    const cached = JSON.parse(localStorage.getItem(REGION_KEY) || "null");
    if (cached && cached.id && Date.now() - cached.ts < REGION_TTL) {
      region = cached.id;
      showRegionLabel();
      return;
    }
  } catch { /* ignore malformed cache */ }

  try {
    const res = await fetch(`${API_BASE}/api/detect-region`);
    if (res.ok) {
      const data = await res.json();
      region = data.region || "all";
      localStorage.setItem(REGION_KEY, JSON.stringify({ id: region, ts: Date.now() }));
    }
  } catch {
    region = "all"; // offline or backend unreachable → generic all-India content
  }
  showRegionLabel();
}
detectRegion();

// ── curriculum tabs ──
currTabsEl.querySelectorAll(".curr-tab").forEach((tab) => {
  tab.classList.toggle("active", tab.dataset.curr === curriculum);
  tab.addEventListener("click", () => {
    curriculum = tab.dataset.curr;
    localStorage.setItem(CURR_KEY, curriculum);
    currTabsEl.querySelectorAll(".curr-tab").forEach((t) =>
      t.classList.toggle("active", t.dataset.curr === curriculum)
    );
  });
});

// ── about modal ──
aboutLink.addEventListener("click", () => aboutModal.classList.remove("hidden"));
aboutClose.addEventListener("click", () => aboutModal.classList.add("hidden"));
aboutModal.addEventListener("click", (e) => {
  if (e.target === aboutModal) aboutModal.classList.add("hidden");
});

// ── Escape closes overlays ──
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  aboutModal.classList.add("hidden");
  premiumModalEl.classList.add("hidden");
  if (guestMode || currentUser) authModalEl.classList.add("hidden");
});

// ── back buttons ──
backToClassBtn.addEventListener("click", showClassPicker);
backToSubjectsBtn.addEventListener("click", () => showSubjectPicker(currentClass));

// ── sound toggle (gates auto-narration + effects; repeat stays available) ──
const soundToggleEl = document.getElementById("sound-toggle");
function renderSoundToggle() {
  soundToggleEl.textContent = soundOn ? "🔊" : "🔇";
  soundToggleEl.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
  soundToggleEl.setAttribute("aria-pressed", String(soundOn));
}
renderSoundToggle();
soundToggleEl.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
  renderSoundToggle();
  if (soundOn) {
    unlockSpeech();       // allow narration to play later this session
    playToggleBlip();     // immediate audible confirmation the switch worked
    // if a question is on screen, read it now so the effect is obvious
    if (currentQuestion) speakPrompt(currentQuestion, true);
  } else {
    window.speechSynthesis?.cancel();
  }
});

// Unlock audio + speech on the very first tap anywhere, so chimes and narration
// are allowed to play during the session (browsers gate both behind a gesture).
document.addEventListener("pointerdown", () => {
  unlockAudio();
  unlockSpeech();
}, { once: true });

// ── repeat audio ──
repeatAudioBtn.addEventListener("click", () => {
  // explicit request: speak even when the sound toggle is off
  if (currentQuestion) speakPrompt(currentQuestion, true);
});

// ── navigation ──
function showClassPicker() {
  clearTimeout(advanceTimer);           // leaving mid-session: no ghost next question
  window.speechSynthesis?.cancel();
  recordAbandonedScreenTime();
  document.body.classList.remove("focus-mode");
  window.scrollTo(0, 0);
  classPickerEl.classList.remove("hidden");
  subjectPickerEl.classList.add("hidden");
  playScreenEl.classList.add("hidden");
  sessionCompleteEl.classList.add("hidden");
  profileScreenEl.classList.add("hidden");
  examScreenEl.classList.add("hidden");
  streakDisplay.classList.add("hidden");
  updateWelcomeBanner();
}

document.getElementById("topbar-brand").addEventListener("click", showClassPicker);

// A student who leaves mid-session still spent that time learning — count it.
// (Session completion records and nulls sessionStartedAt itself, so this can
// never double-count.)
function recordAbandonedScreenTime() {
  if (sessionStartedAt && !playScreenEl.classList.contains("hidden")) {
    recordScreenTime(Date.now() - sessionStartedAt);
    sessionStartedAt = null;
  }
}

function showSubjectPicker(classNum) {
  clearTimeout(advanceTimer);
  window.speechSynthesis?.cancel();
  recordAbandonedScreenTime();
  document.body.classList.remove("focus-mode");
  window.scrollTo(0, 0);
  currentClass = classNum;
  const subjects = getSubjectsForClass(classNum);

  classBadgeEl.textContent = `Class ${classNum}`;
  subjectGridEl.innerHTML = "";
  subjects.forEach(({ id, label, emoji }) => {
    const btn = document.createElement("button");
    btn.className = "subject-btn";
    btn.innerHTML = `<span class="subject-emoji">${emoji}</span>${label}`;
    btn.addEventListener("click", () => gameMode === "battle" ? startBattle(id) : startPlay(id));
    subjectGridEl.appendChild(btn);
  });

  // Board-exam revision lives inside its class, alongside the subjects.
  const boardExamId = BOARD_EXAM_BY_CLASS[classNum];
  if (boardExamId) {
    const btn = document.createElement("button");
    btn.className = "subject-btn board-subject-btn";
    btn.innerHTML = `<span class="subject-emoji">🎓</span>Board Exam PYQs`;
    btn.addEventListener("click", () => openExam(boardExamId, classNum));
    subjectGridEl.appendChild(btn);
  }

  classPickerEl.classList.add("hidden");
  subjectPickerEl.classList.remove("hidden");
  playScreenEl.classList.add("hidden");
}

async function startPlay(subject) {
  currentSubject = subject;
  const subjects = getSubjectsForClass(currentClass);
  const meta = subjects.find((s) => s.id === subject);
  playBadgeEl.textContent = `Class ${currentClass} · ${meta?.label ?? subject}`;
  localStorage.setItem("lastPlayed", JSON.stringify({ classNum: currentClass, subject }));

  sessionCount     = 0;
  sessionCorrect   = 0;
  sessionSeenIds   = new Set();
  sessionScore     = 0;
  sessionCombo     = 0;
  sessionHearts    = 3;
  sessionAnswers   = [];
  sessionStartedAt = Date.now();
  renderHUD();

  document.body.classList.add("focus-mode");
  subjectPickerEl.classList.add("hidden");
  sessionCompleteEl.classList.add("hidden");
  playScreenEl.classList.remove("hidden");
  streakDisplay.classList.remove("hidden");
  await loadNextQuestion();
}

// ── question loop ──
async function loadNextQuestion() {
  const key        = adaptiveKey(currentClass, currentSubject);
  const difficulty = getDifficulty(adaptiveState, key, 1);

  feedbackEl.textContent = "";
  feedbackEl.className   = "feedback";
  questionPrompt.textContent = "…";
  choicesEl.innerHTML = "";

  const getToken = (currentUser && isPremiumCached())
    ? () => currentUser.getIdToken()
    : null;

  try {
    currentQuestion = await getNextQuestion(
      currentClass, currentSubject, curriculum, difficulty, sessionSeenIds, getToken, region
    );
    sessionSeenIds.add(currentQuestion.id);
  } catch (err) {
    questionPrompt.textContent =
      "⚠️ Connect to the internet to load questions for this class and subject.";
    console.error(err);
    return;
  }

  renderQuestion(currentQuestion);
  questionStartedAt = Date.now();
}

let displayOrder = []; // shuffled original-index per button position

function renderQuestion(question) {
  questionVisual.textContent = question.visual;
  questionPrompt.textContent = question.prompt[lang] || question.prompt.en;
  choicesEl.innerHTML = "";

  // Shuffle choice order at render time so the correct answer's position
  // is unpredictable even for AI-generated batches.
  displayOrder = question.choices.map((_, i) => i);
  for (let i = displayOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [displayOrder[i], displayOrder[j]] = [displayOrder[j], displayOrder[i]];
  }

  const labels = displayOrder.map(
    (i) => question.choices[i][lang] || question.choices[i].en
  );
  // sentence-length answers stack full-width instead of cramping into columns
  choicesEl.classList.toggle("choices-long", labels.some((l) => l.length > 24));

  displayOrder.forEach((origIndex, pos) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = labels[pos];
    btn.addEventListener("click", () => handleAnswer(origIndex, btn));
    choicesEl.appendChild(btn);
  });

  speakPrompt(question);
}

function speakPrompt(question, force = false) {
  if (!soundOn && !force) return;
  playAudio({
    id:   question.audioId || question.id,
    lang,
    text: question.prompt[lang] || question.prompt.en,
  });
}

function handleAnswer(selectedIndex, selectedBtn) {
  const correct   = selectedIndex === currentQuestion.answerIndex;
  const elapsedMs = Date.now() - questionStartedAt;
  const key       = adaptiveKey(currentClass, currentSubject);

  const btns = [...choicesEl.children];
  btns.forEach((btn, pos) => {
    btn.disabled = true;
    const origIndex = displayOrder[pos];
    if (origIndex === currentQuestion.answerIndex) btn.classList.add("correct");
    else if (origIndex === selectedIndex)          btn.classList.add("wrong");
  });

  feedbackEl.textContent = correct ? t("wellDone") : t("tryAgain");
  feedbackEl.classList.toggle("correct", correct);
  feedbackEl.classList.toggle("wrong",   !correct);

  // ── game logic ──
  sessionCount = Math.min(sessionCount + 1, SESSION_TOTAL);
  sessionAnswers.push(correct);
  if (correct) {
    sessionCorrect++;
    sessionCombo++;
    const multiplier = sessionCombo >= 6 ? 4 : sessionCombo >= 4 ? 3 : sessionCombo >= 2 ? 2 : 1;
    const points     = 100 * multiplier;
    sessionScore    += points;
    flyScore(points, selectedBtn);
    sparkleAnswer(selectedBtn);
    if (sessionCombo >= 2) showComboBanner(multiplier);
  } else {
    sessionCombo  = 0;
    sessionHearts = Math.max(0, sessionHearts - 1);
  }
  renderHUD();

  const stats = recordResult(key, correct);
  streakCountEl.textContent = stats.streak;
  recordAnswer({ correct, subject: currentSubject });
  syncProgress();

  mascotPlay.classList.remove("celebrate", "oops");
  if (correct) {
    burstConfetti();
    if (soundOn) playCorrectChime();
    mascotPlay.classList.add("celebrate");
  } else {
    if (soundOn) playWrongBuzz();
    mascotPlay.classList.add("oops");
  }

  recordAttempt(adaptiveState, key, { correct, ms: elapsedMs, startingDifficulty: 1 });
  saveAdaptiveState();

  if (sessionCount >= SESSION_TOTAL) {
    // Completion always fires — it saves the high score and shows the
    // (exclusive) score screen even if the student taps away meanwhile.
    setTimeout(showSessionComplete, 1400);
  } else {
    advanceTimer = setTimeout(loadNextQuestion, 1400);
  }
}

// ── Session Complete ──
function showSessionComplete() {
  document.body.classList.remove("focus-mode");
  window.speechSynthesis?.cancel();

  if (sessionStartedAt) {
    recordScreenTime(Date.now() - sessionStartedAt);
    sessionStartedAt = null;
  }

  // Exclusive screen: the student may have tapped home/back during the
  // 1.4 s celebration delay — hide everything else so the score is never
  // stacked below another screen.
  classPickerEl.classList.add("hidden");
  subjectPickerEl.classList.add("hidden");
  profileScreenEl.classList.add("hidden");
  playScreenEl.classList.add("hidden");
  sessionCompleteEl.classList.remove("hidden");
  window.scrollTo(0, 0);
  updateWelcomeBanner();

  // Stars: 3 = ≥8/10, 2 = ≥5/10, 1 = below
  const stars = sessionCorrect >= 8 ? 3 : sessionCorrect >= 5 ? 2 : 1;
  const titles = { 3: "Brilliant! 🏆", 2: "Well done! 🎉", 1: "Keep going! 💪" };
  if (completeTitleEl) completeTitleEl.textContent = titles[stars];
  completeScoreEl.textContent = `${sessionCorrect} / ${SESSION_TOTAL} correct`;

  // High score per class+subject
  const hsKey  = `ecplay_hs_${currentClass}_${currentSubject}`;
  const prevHs = parseInt(localStorage.getItem(hsKey) || "0");
  const isNew  = sessionScore > prevHs;
  if (isNew) localStorage.setItem(hsKey, sessionScore);
  if (newRecordBadgeEl) newRecordBadgeEl.classList.toggle("hidden", !isNew);
  lastSessionStars  = stars;
  lastSessionRecord = isNew;

  // Streak milestone celebration — the share moment that works
  const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];
  const sNow = loadStats();
  const milestoneStrip = document.getElementById("milestone-strip");
  const hitMilestone = MILESTONES.includes(sNow.dayStreak)
    && localStorage.getItem("ecplay_milestone_done") !== String(sNow.dayStreak);
  if (hitMilestone) {
    document.getElementById("milestone-text").textContent = `🔥 ${sNow.dayStreak}-day streak!`;
    localStorage.setItem("ecplay_milestone_done", String(sNow.dayStreak));
  }
  milestoneStrip.classList.toggle("hidden", !hitMilestone);

  // Animate in order: confetti → stars → score count-up → badge
  launchEndConfetti();
  animateStars(stars);
  setTimeout(() => countUpScore(sessionScore), 400);

  // Respectful upsell: at most once a day, and only after a good session —
  // never while a student is struggling.
  const UPSELL_KEY = "ecplay_upsell_last";
  const lastUpsell = parseInt(localStorage.getItem(UPSELL_KEY) || "0");
  const showUpsell = !isPremiumCached()
    && sessionCorrect >= 5
    && Date.now() - lastUpsell > 24 * 60 * 60 * 1000;
  if (showUpsell) localStorage.setItem(UPSELL_KEY, Date.now());
  upgradeStripEl.classList.toggle("hidden", !showUpsell);
  if (!PAYMENTS_ENABLED) {
    // Payments paused: same respectful once-a-day slot, but as an expectation-
    // setting teaser — no checkout button until compliance + GST are done.
    const head = upgradeStripEl.querySelector("strong");
    const body = upgradeStripEl.querySelector("p");
    if (head) head.textContent = "Premium is coming soon ⚡";
    if (body) body.textContent = "Fresh AI-generated questions tuned to your level — launching soon. What you play today stays free.";
    upgradeFromSessionBtn.classList.add("hidden");
  }
}

// ── Social Share ──
async function shareContent(text) {
  const url = "https://educerelator.com";
  if (navigator.share) {
    try { await navigator.share({ title: "EC Play", text, url }); return; } catch { /* cancelled */ }
  }
  // Fallback: WhatsApp
  window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank", "noopener");
}

// ── Share cards (image-first, Duolingo-style) ──
async function shareSessionCard() {
  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  const canvas = await drawSessionCard({
    score:      sessionScore,
    correct:    sessionCorrect,
    total:      SESSION_TOTAL,
    stars:      lastSessionStars,
    badgeLabel: playBadgeEl.textContent,
    streak:     effectiveDayStreak(s),
    accuracy:   pct,
    newRecord:  lastSessionRecord,
  });
  await shareCard(canvas,
    `I scored ${sessionScore.toLocaleString()} pts (${sessionCorrect}/${SESSION_TOTAL}) on EC Play! 🎯 Can you beat me?`,
    "ecplay-score.png");
}

async function shareStreakCard() {
  const s = loadStats();
  const streakNow = effectiveDayStreak(s);
  if (streakNow === 0) {
    alert("Play one session today to light your streak 🔥 — then share it!");
    return;
  }
  const canvas = await drawStreakCard({ streak: streakNow });
  await shareCard(canvas,
    `🔥 ${streakNow}-day learning streak on EC Play! Learning every single day.`,
    "ecplay-streak.png");
}

async function shareReportCard() {
  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  const canvas = await drawReportCard({
    totalAnswered: s.totalAnswered || 0,
    accuracy:      pct,
    dayStreak:     effectiveDayStreak(s),
    longestStreak: s.longestDayStreak || 0,
  });
  await shareCard(canvas,
    `My EC Play report card 📋 ${s.totalAnswered} questions · ${pct}% accuracy · ${effectiveDayStreak(s)}-day streak!`,
    "ecplay-report-card.png");
}

function shareApp() {
  shareContent(
    `🌟 EC Play — adaptive learning games for Indian students, Class 1–12!\n` +
    `Questions in 13 languages · Free to play →`
  );
}

document.getElementById("share-score-btn").addEventListener("click", shareSessionCard);
document.getElementById("milestone-share").addEventListener("click", shareStreakCard);
// Streak sharing is first-class: from the home chip and the profile, any day.
document.getElementById("home-streak-chip").addEventListener("click", shareStreakCard);
document.getElementById("profile-share-streak").addEventListener("click", shareStreakCard);

// ── Profile Screen ──
function openProfileScreen() {
  // Remember which screen was active
  profilePrevScreen = [classPickerEl, subjectPickerEl, playScreenEl, sessionCompleteEl]
    .find(el => !el.classList.contains("hidden")) || classPickerEl;
  profilePrevScreen.classList.add("hidden");
  profileScreenEl.classList.remove("hidden");
  renderProfileScreen();
}

function closeProfileScreen() {
  profileScreenEl.classList.add("hidden");
  (profilePrevScreen || classPickerEl).classList.remove("hidden");
}

// Premium status / upgrade option shown inside the account (profile) screen.
function renderProfilePremium() {
  const el = document.getElementById("profile-premium");
  if (!el) return;
  if (!PAYMENTS_ENABLED) {
    // Payments paused (compliance + GST pending): set expectations, no checkout.
    el.innerHTML =
      `<div class="premium-active-card free-card">` +
        `<span class="premium-card-icon">⚡</span>` +
        `<div class="premium-card-text">` +
          `<strong>Premium is coming soon</strong>` +
          `<p>Fresh AI-generated questions, tuned to your level. Everything you use today is free during our launch.</p>` +
        `</div>` +
      `</div>`;
    return;
  }
  const info = getPremiumInfo();
  const active = info && info.premium && info.expiresAt > Date.now();
  if (active) {
    const dateStr = new Date(info.expiresAt).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
    el.innerHTML =
      `<div class="premium-active-card">` +
        `<span class="premium-card-icon">⚡</span>` +
        `<div class="premium-card-text">` +
          `<strong>Premium is active</strong>` +
          `<p>Fresh AI questions unlocked · valid till ${dateStr}</p>` +
        `</div>` +
      `</div>`;
  } else {
    el.innerHTML =
      `<div class="premium-offer-card">` +
        `<span class="premium-card-icon">⚡</span>` +
        `<div class="premium-card-text">` +
          `<strong>Go Premium</strong>` +
          `<p>Fresh AI-generated questions every day, tuned to your level.</p>` +
        `</div>` +
        `<button id="profile-upgrade-btn" class="btn-upgrade">Upgrade · ${PRICES.monthly}/mo</button>` +
      `</div>`;
    const btn = document.getElementById("profile-upgrade-btn");
    if (btn) btn.addEventListener("click", openPremiumModal);
  }
}

function renderProfileScreen() {
  if (!currentUser) return;
  const name = currentUser.displayName || currentUser.email.split("@")[0];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  document.getElementById("profile-avatar-lg").textContent   = initials;
  document.getElementById("profile-fullname").textContent    = name;
  document.getElementById("profile-useremail").textContent   = currentUser.email || "";

  renderProfilePremium();
  // Refresh premium status from the server, then re-render if it changed.
  checkPremium(currentUser).then(() => renderProfilePremium()).catch(() => {});

  // Streaks and volume lead; accuracy is demoted to a small row below —
  // the founder wants students encouraged to play and try, not graded.
  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  document.getElementById("stat-day-streak").textContent  = effectiveDayStreak(s);
  document.getElementById("stat-total-q").textContent     = s.totalAnswered || 0;
  document.getElementById("stat-best-streak").textContent = s.longestDayStreak || 0;
  document.getElementById("stat-screen-time").textContent = formatDuration(s.screenTimeMs || 0);
  document.getElementById("stat-accuracy").textContent    = s.totalAnswered > 0 ? `${pct}%` : "—";

  // 7-day calendar
  const calEl = document.getElementById("profile-calendar");
  calEl.innerHTML = "";
  getLast7Days().forEach(({ dayName, answered }) => {
    const div = document.createElement("div");
    div.className = "cal-day";
    div.innerHTML =
      `<div class="cal-dot ${answered > 0 ? "played" : "empty"}">${answered > 0 ? "✓" : ""}</div>` +
      `<div class="cal-day-name">${dayName}</div>`;
    calEl.appendChild(div);
  });

  // Subject breakdown
  const subEl = document.getElementById("profile-subjects");
  subEl.innerHTML = "";
  const subjects = Object.entries(s.subjectStats || {})
    .sort((a, b) => b[1].answered - a[1].answered)
    .slice(0, 6);
  if (subjects.length === 0) {
    subEl.innerHTML = `<p style="color:rgba(255,255,255,0.7);font-size:0.9rem;text-align:center">Play a few sessions to see your breakdown!</p>`;
  } else {
    subjects.forEach(([subj, data]) => {
      const acc = data.answered > 0 ? Math.round(data.correct / data.answered * 100) : 0;
      const label = subj.replace(/-/g, " ");
      const row = document.createElement("div");
      row.className = "subject-bar-row";
      row.innerHTML =
        `<span class="subject-bar-label">${label}</span>` +
        `<div class="subject-bar-track"><div class="subject-bar-fill" style="width:${acc}%"></div></div>` +
        `<span class="subject-bar-pct">${acc}%</span>` +
        `<span class="subject-bar-count">${data.answered}q</span>`;
      subEl.appendChild(row);
    });
  }
}

userAvatarBtn.addEventListener("click", openProfileScreen);
backFromProfile.addEventListener("click", closeProfileScreen);
document.getElementById("profile-share-score").addEventListener("click", shareReportCard);
document.getElementById("profile-share-app").addEventListener("click", shareApp);

playAgainBtn.addEventListener("click", () => startPlay(currentSubject));
newSubjectBtn.addEventListener("click", () => {
  sessionCompleteEl.classList.add("hidden");
  showSubjectPicker(currentClass);
});
upgradeFromSessionBtn.addEventListener("click", openPremiumModal);

// ── Premium Modal ──
function openPremiumModal() {
  if (!PAYMENTS_ENABLED) return; // payments paused until compliance + GST
  if (!currentUser) {
    authModalEl.classList.remove("hidden");
    return;
  }
  premiumModalEl.classList.remove("hidden");
}

premiumCloseBtn.addEventListener("click", () => premiumModalEl.classList.add("hidden"));

let selectedPlan = null;
document.querySelectorAll(".plan-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".plan-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    selectedPlan = card.dataset.plan;
    checkoutBtn.textContent = selectedPlan === "yearly"
      ? `Pay ${PRICES.yearly} / year`
      : `Pay ${PRICES.monthly} / month`;
    checkoutBtn.disabled = false;
  });
});

checkoutBtn.addEventListener("click", async () => {
  if (!selectedPlan || !currentUser) return;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Opening checkout…";
  await openRazorpayCheckout(currentUser, selectedPlan, () => {
    premiumModalEl.classList.add("hidden");
    upgradeStripEl.classList.add("hidden");
    alert("Welcome to EC Play Premium! 🎉 Fresh AI questions are now unlocked for you.");
  });
  checkoutBtn.disabled = false;
  checkoutBtn.textContent = selectedPlan === "yearly" ? `Pay ${PRICES.yearly} / year` : `Pay ${PRICES.monthly} / month`;
});

function burstConfetti() {
  for (let i = 0; i < 14; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.textContent = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist  = 80 + Math.random() * 100;
    piece.style.setProperty("--dx",  `${Math.cos(angle) * dist}px`);
    piece.style.setProperty("--dy",  `${Math.sin(angle) * dist}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 360}deg`);
    confettiLayer.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

// ══════════════════ 🐾 Friend Quest (game mode) ══════════════════
// A game-first layer over the SAME verified question bank — and deliberately
// non-violent: knowledge TAMES, it never harms. Each stage is a shy wild
// creature; correct answers toss it knowledge sparks that fill a friendship
// meter, wrong answers startle it and cost the player a heart of patience.
// Befriend the creature and IT joins the collection (the creature you play
// with is the one you win — no kill-then-catch disconnect). Reuses
// getNextQuestion so no content is duplicated. State (coins, friends, best
// stage) persists locally; pure play — no payments, no accounts required.
// (gameMode itself is declared near the top of the file.)
const battleScreenEl = document.getElementById("battle-screen");
// the ladder: each creature needs more sparks (correct answers) than the last
const WILD = [
  { name: "Sleepy Turtle",    emoji: "🐢", need: 3 },
  { name: "Shy Bunny",        emoji: "🐰", need: 3 },
  { name: "Lost Penguin",     emoji: "🐧", need: 4 },
  { name: "Clever Fox",       emoji: "🦊", need: 4 },
  { name: "Grumpy Koala",     emoji: "🐨", need: 5 },
  { name: "Hungry Panda",     emoji: "🐼", need: 5 },
  { name: "Wary Unicorn",     emoji: "🦄", need: 6 },
  { name: "Proud Tiger",      emoji: "🐯", need: 6 },
  { name: "Brave Lion",       emoji: "🦁", need: 7 },
  { name: "Tangled Octopus",  emoji: "🐙", need: 7 },
  { name: "Ancient Dino",     emoji: "🦕", need: 8 },
  { name: "Legendary Dragon", emoji: "🐲", need: 8 },
];

function battleStore() {
  return {
    coins: parseInt(localStorage.getItem("ecplay_coins") || "0"),
    creatures: JSON.parse(localStorage.getItem("ecplay_creatures") || "[]"),
    bestStage: parseInt(localStorage.getItem("ecplay_best_stage") || "0"),
  };
}
function battleStoreSave(s) {
  localStorage.setItem("ecplay_coins", String(s.coins));
  localStorage.setItem("ecplay_creatures", JSON.stringify(s.creatures));
  localStorage.setItem("ecplay_best_stage", String(s.bestStage));
}

let battle = null;
const bEl = (id) => document.getElementById(id);

// mode toggle on the home screen
function setGameMode(mode) {
  gameMode = mode;
  bEl("mode-learn").classList.toggle("active", mode === "learn");
  bEl("mode-battle").classList.toggle("active", mode === "battle");
  bEl("mode-learn").setAttribute("aria-selected", mode === "learn");
  bEl("mode-battle").setAttribute("aria-selected", mode === "battle");
  bEl("battle-cta").classList.toggle("hidden", mode !== "battle");
  bEl("pick-title").textContent = mode === "battle" ? "Choose a class to play" : "Choose your class";
  // exams stay classic-quiz only, so hide their tiles in quest mode
  document.querySelectorAll(".exam-section, #exam-grid").forEach((e) => e.classList.toggle("hidden", mode === "battle"));
}
bEl("mode-learn").addEventListener("click", () => setGameMode("learn"));
bEl("mode-battle").addEventListener("click", () => setGameMode("battle"));
setGameMode("battle"); // Friend Quest is the mainstream default; Learn is one tap away

async function startBattle(subject) {
  currentSubject = subject;
  const store = battleStore();
  battle = {
    stage: 1, heroMax: 3, heroHP: 3, combo: 0, seen: new Set(),
    coins: store.coins, creatures: store.creatures, bestStage: store.bestStage,
    answering: false, monster: null, monsterHP: 0, monsterMax: 0,
  };
  document.body.classList.add("focus-mode");
  [classPickerEl, subjectPickerEl, playScreenEl].forEach((s) => s.classList.add("hidden"));
  bEl("battle-victory").classList.add("hidden");
  bEl("battle-defeat").classList.add("hidden");
  battleScreenEl.classList.remove("hidden");
  window.scrollTo(0, 0);
  spawnCreature();
  await battleNextQuestion();
}

function spawnCreature() {
  const base = WILD[(battle.stage - 1) % WILD.length];
  const extra = Math.floor((battle.stage - 1) / WILD.length) * 2; // repeat visits are shyer
  battle.monster = base;
  battle.monsterMax = base.need + extra;
  battle.monsterHP = battle.monsterMax; // sparks still needed; bar renders as friendship gained
  bEl("monster-avatar").textContent = base.emoji;
  bEl("monster-name").textContent = base.name;
  bEl("fighter-monster").classList.remove("faint");
  bEl("battle-stage").textContent = `Friend ${((battle.stage - 1) % WILD.length) + 1} of ${WILD.length}`;
  renderBattleHUD();
}

function renderBattleHUD() {
  bEl("hero-hp").style.width = `${(battle.heroHP / battle.heroMax) * 100}%`;
  const bond = battle.monsterMax - battle.monsterHP; // friendship fills UP
  bEl("monster-hp").style.width = `${(bond / battle.monsterMax) * 100}%`;
  bEl("monster-hp").title = `Friendship ${bond}/${battle.monsterMax}`;
  bEl("hero-hearts").textContent = "❤️".repeat(battle.heroHP) + "🖤".repeat(battle.heroMax - battle.heroHP);
  bEl("battle-coins").textContent = `🪙 ${battle.coins}`;
}

async function battleNextQuestion() {
  battle.answering = false;
  bEl("battle-combo").textContent = battle.combo >= 2 ? `🔥 Combo ×${battle.combo}` : "";
  bEl("battle-prompt").textContent = "…";
  bEl("battle-visual").textContent = "";
  bEl("battle-choices").innerHTML = "";
  const key = adaptiveKey(currentClass, currentSubject);
  const difficulty = getDifficulty(adaptiveState, key, 1);
  let q;
  try {
    q = await getNextQuestion(currentClass, currentSubject, curriculum, difficulty, battle.seen, null, region);
  } catch {
    bEl("battle-prompt").textContent = "Couldn't load a question. Tap quit and try again.";
    return;
  }
  battle.seen.add(q.id);
  battle.current = q;
  bEl("battle-prompt").textContent = q.prompt[lang] || q.prompt.en;
  bEl("battle-visual").textContent = q.visual || "";
  const order = q.choices.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  order.forEach((origIndex) => {
    const btn = document.createElement("button");
    btn.className = "battle-choice";
    btn.textContent = q.choices[origIndex][lang] || q.choices[origIndex].en;
    btn.addEventListener("click", () => battleAnswer(origIndex, btn));
    bEl("battle-choices").appendChild(btn);
  });
  if (soundOn) speakPrompt(q);
}

function battleFx(projectile, fromHero) {
  const arena = bEl("battle-fx");
  const el = document.createElement("span");
  el.className = "projectile proj-fly";
  el.textContent = projectile;
  el.style.left = fromHero ? "22%" : "70%";
  el.style.top = "38%";
  el.style.setProperty("--dx", fromHero ? "150px" : "-150px");
  el.style.setProperty("--dy", "-6px");
  arena.appendChild(el);
  setTimeout(() => el.remove(), 460);
}
function dmgPop(text, crit, atMonster) {
  const arena = bEl("battle-fx");
  const el = document.createElement("span");
  el.className = "dmg-pop" + (crit ? " crit" : "");
  el.textContent = text;
  el.style.left = atMonster ? "70%" : "22%";
  el.style.top = "30%";
  arena.appendChild(el);
  setTimeout(() => el.remove(), 820);
}

function battleAnswer(origIndex, btn) {
  if (battle.answering) return;
  battle.answering = true;
  const q = battle.current;
  const correct = origIndex === q.answerIndex;
  const correctText = q.choices[q.answerIndex][lang] || q.choices[q.answerIndex].en;
  [...bEl("battle-choices").children].forEach((b) => {
    b.disabled = true;
    if (b.textContent === correctText) b.classList.add("correct");
  });
  if (!correct) btn.classList.add("wrong");

  recordAnswer({ correct, subject: currentSubject });
  const key = adaptiveKey(currentClass, currentSubject);
  recordResult(key, correct);

  if (correct) {
    // toss a knowledge spark — a kindness streak throws a golden one (double bond)
    battle.combo++;
    const crit = battle.combo >= 3;
    const bond = crit ? 2 : 1;
    bEl("fighter-hero").classList.add("attack");
    battleFx(crit ? "🌟" : "✨", true);
    if (soundOn) playCorrectChime();
    setTimeout(() => {
      bEl("fighter-hero").classList.remove("attack");
      bEl("fighter-monster").classList.add("hit"); // excited wiggle
      battle.monsterHP = Math.max(0, battle.monsterHP - bond);
      dmgPop(crit ? `SUPER! +${bond} 💖` : `+${bond} 💖`, crit, true);
      renderBattleHUD();
      setTimeout(() => bEl("fighter-monster").classList.remove("hit"), 380);
      if (battle.monsterHP <= 0) { setTimeout(battleVictory, 500); }
      else { setTimeout(battleNextQuestion, 850); }
    }, 240);
  } else {
    // the creature never retaliates — it just gets startled, and your patience dips
    battle.combo = 0;
    bEl("fighter-monster").classList.add("hit"); // startled tremble
    dmgPop("💨", false, true);
    if (soundOn) playWrongBuzz();
    setTimeout(() => {
      bEl("fighter-monster").classList.remove("hit");
      bEl("fighter-hero").classList.add("hit");
      battle.heroHP = Math.max(0, battle.heroHP - 1);
      dmgPop("😟 -1", false, false);
      renderBattleHUD();
      setTimeout(() => bEl("fighter-hero").classList.remove("hit"), 380);
      if (battle.heroHP <= 0) { setTimeout(battleDefeat, 500); }
      else { setTimeout(battleNextQuestion, 900); }
    }, 240);
  }
}

function battleVictory() {
  // friendship won: THIS creature joins the collection (no kill-then-catch)
  bEl("fighter-monster").classList.add("attack"); // happy hop
  setTimeout(() => bEl("fighter-monster").classList.remove("attack"), 500);
  const reward = 20 + battle.stage * 5;
  battle.coins += reward;
  const isNew = !battle.creatures.includes(battle.monster.emoji);
  if (isNew) battle.creatures.push(battle.monster.emoji);
  battle.bestStage = Math.max(battle.bestStage, battle.stage);
  battleStoreSave(battle);
  burstConfetti();
  bEl("reward-creature").textContent = battle.monster.emoji;
  bEl("reward-line").textContent = isNew
    ? `${battle.monster.name} is your friend now! 🎉`
    : `${battle.monster.name} loves learning with you! 💖`;
  bEl("reward-coins").textContent = `🪙 +${reward}`;
  setTimeout(() => bEl("battle-victory").classList.remove("hidden"), 650);
}
function battleDefeat() {
  bEl("fighter-monster").classList.add("faint"); // it shyly slips away
  battle.bestStage = Math.max(battle.bestStage, battle.stage);
  battleStoreSave(battle);
  bEl("defeat-line").textContent = `${battle.monster.name} slipped away shyly… You befriended ${battle.creatures.length} of ${WILD.length}. Try again!`;
  setTimeout(() => bEl("battle-defeat").classList.remove("hidden"), 650);
}

bEl("battle-next").addEventListener("click", async () => {
  bEl("battle-victory").classList.add("hidden");
  bEl("fighter-hero").classList.remove("faint");
  battle.stage++;
  battle.heroHP = Math.min(battle.heroMax, battle.heroHP + 1); // new friends restore patience
  spawnCreature();
  await battleNextQuestion();
});
bEl("battle-retry").addEventListener("click", () => { bEl("battle-defeat").classList.add("hidden"); startBattle(currentSubject); });
bEl("battle-home").addEventListener("click", () => { bEl("battle-defeat").classList.add("hidden"); quitBattle(); });
bEl("battle-quit").addEventListener("click", quitBattle);
function quitBattle() {
  window.speechSynthesis?.cancel();
  document.body.classList.remove("focus-mode");
  battleScreenEl.classList.add("hidden");
  bEl("battle-victory").classList.add("hidden");
  bEl("battle-defeat").classList.add("hidden");
  bEl("fighter-hero").classList.remove("faint");
  showClassPicker();
}

// collection overlay
function openCollection() {
  const store = battleStore();
  const grid = bEl("collection-grid");
  grid.innerHTML = "";
  WILD.forEach((w) => {
    const cell = document.createElement("div");
    const friend = store.creatures.includes(w.emoji);
    cell.className = "collection-cell " + (friend ? "caught" : "locked");
    cell.textContent = friend ? w.emoji : "❓";
    cell.title = friend ? w.name : "Not befriended yet";
    grid.appendChild(cell);
  });
  const friends = WILD.filter((w) => store.creatures.includes(w.emoji)).length;
  bEl("collection-count").textContent = `${friends} of ${WILD.length} friends · 🪙 ${store.coins}`;
  bEl("collection-modal").classList.remove("hidden");
}
bEl("battle-collection-open").addEventListener("click", openCollection);
bEl("collection-close").addEventListener("click", () => bEl("collection-modal").classList.add("hidden"));
