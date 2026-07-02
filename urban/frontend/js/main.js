import { ALL_CLASSES, CURRICULA, getSubjectsForClass } from "../../../content/curriculum.js";
import { getNextQuestion } from "./question-bank.js";
import { checkPremium, isPremiumCached, openRazorpayCheckout } from "./premium.js";
import { recordResult } from "./progress.js";
import { recordAnswer, recordScreenTime, loadStats, getLast7Days, formatDuration } from "./stats.js";
import { playCorrectChime, playWrongBuzz } from "./sound-fx.js";
import { playAudio } from "../../../shared-lib/audio-player.js";
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
} from "./auth.js";

// ── UI strings for all 22 official Indian languages + English ──
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

function applyUIStrings() {
  document.querySelectorAll(".pick-title").forEach(el => { el.textContent = t("pickClass"); });
  const subjectTitle = document.querySelector("#subject-picker .screen-title");
  if (subjectTitle) subjectTitle.textContent = t("pickSubject");
  const contLabel = document.querySelector(".continue-label");
  if (contLabel) contLabel.textContent = t("continueLabel");
}

// ── persisted state keys ──
const ADAPTIVE_KEY = "adaptiveState";
const LANG_KEY     = "lang";
const CURR_KEY     = "curriculum";

// ── session progress ──
const SESSION_TOTAL = 10;
let sessionCount   = 0;
let sessionCorrect = 0;
let sessionSeenIds = new Set();

// ── runtime state ──
let lang            = localStorage.getItem(LANG_KEY) || "en";
let curriculum      = localStorage.getItem(CURR_KEY) || "cbse";
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
const completeEmojiEl      = document.getElementById("complete-emoji");
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

function updateProgressBar() {
  const fill  = document.getElementById("session-bar-fill");
  const label = document.getElementById("session-label");
  if (fill)  fill.style.width = `${Math.min(sessionCount / SESSION_TOTAL, 1) * 100}%`;
  if (label) label.textContent = `${Math.min(sessionCount, SESSION_TOTAL)} / ${SESSION_TOTAL}`;
}

function updateWelcomeBanner() {
  if (!currentUser) return;
  const banner = document.getElementById("welcome-banner");
  banner.classList.remove("hidden");

  const hour = new Date().getHours();
  document.getElementById("time-greeting").textContent =
    hour < 12 ? t("morning") : hour < 17 ? t("afternoon") : t("evening");

  const name = currentUser.displayName || currentUser.email.split("@")[0];
  document.getElementById("welcome-name").textContent = `Hi, ${name.split(" ")[0]}! 👋`;

  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : null;
  document.getElementById("home-streak").textContent  = s.dayStreak   || 0;
  document.getElementById("home-stars").textContent   = s.totalAnswered || 0;
  document.getElementById("home-accuracy").textContent = pct !== null ? `${pct}%` : "—";
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

// ── signout ──
signoutBtnEl.addEventListener("click", () => logoutUser());

// ── auth state listener (entry point of the app) ──
onAuthChange(async (user) => {
  if (user) {
    currentUser = user;
    const name = user.displayName || user.email.split("@")[0];
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    userInitialsEl.textContent = initials;
    userInfoEl.classList.remove("hidden");
    authModalEl.classList.add("hidden");

    // Load cloud progress and merge into localStorage
    try {
      const serverProgress = await loadUserProgress(user.uid);
      if (serverProgress) {
        localStorage.setItem("progress", JSON.stringify(serverProgress));
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
    authModalEl.classList.remove("hidden");
  }
});

// ── lang switcher ──
langSwitcher.value = lang;
langSwitcher.addEventListener("change", () => {
  lang = langSwitcher.value;
  localStorage.setItem(LANG_KEY, lang);
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

// ── continue button ──
document.getElementById("continue-btn").addEventListener("click", () => {
  const last = loadJSON("lastPlayed", () => null);
  if (last) startPlayFromContinue(last.classNum, last.subject);
});

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

// ── back buttons ──
backToClassBtn.addEventListener("click", showClassPicker);
backToSubjectsBtn.addEventListener("click", () => showSubjectPicker(currentClass));

// ── repeat audio ──
repeatAudioBtn.addEventListener("click", () => {
  if (currentQuestion) speakPrompt(currentQuestion);
});

// ── navigation ──
function showClassPicker() {
  classPickerEl.classList.remove("hidden");
  subjectPickerEl.classList.add("hidden");
  playScreenEl.classList.add("hidden");
  sessionCompleteEl.classList.add("hidden");
  profileScreenEl.classList.add("hidden");
  streakDisplay.classList.add("hidden");
  updateWelcomeBanner();
}

document.getElementById("topbar-brand").addEventListener("click", showClassPicker);

function showSubjectPicker(classNum) {
  currentClass = classNum;
  const subjects = getSubjectsForClass(classNum);

  classBadgeEl.textContent = `Class ${classNum}`;
  subjectGridEl.innerHTML = "";
  subjects.forEach(({ id, label, emoji }) => {
    const btn = document.createElement("button");
    btn.className = "subject-btn";
    btn.innerHTML = `<span class="subject-emoji">${emoji}</span>${label}`;
    btn.addEventListener("click", () => startPlay(id));
    subjectGridEl.appendChild(btn);
  });

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
  sessionStartedAt = Date.now();
  updateProgressBar();

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
      currentClass, currentSubject, curriculum, difficulty, sessionSeenIds, getToken
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

function renderQuestion(question) {
  questionVisual.textContent = question.visual;
  questionPrompt.textContent = question.prompt[lang] || question.prompt.en;
  choicesEl.innerHTML = "";

  question.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn";
    btn.textContent = choice[lang] || choice.en;
    btn.addEventListener("click", () => handleAnswer(index));
    choicesEl.appendChild(btn);
  });

  speakPrompt(question);
}

function speakPrompt(question) {
  playAudio({
    id:   question.audioId || question.id,
    lang,
    text: question.prompt[lang] || question.prompt.en,
  });
}

function handleAnswer(selectedIndex) {
  const correct   = selectedIndex === currentQuestion.answerIndex;
  const elapsedMs = Date.now() - questionStartedAt;
  const key       = adaptiveKey(currentClass, currentSubject);

  [...choicesEl.children].forEach((btn, i) => {
    btn.disabled = true;
    if (i === currentQuestion.answerIndex) btn.classList.add("correct");
    else if (i === selectedIndex)          btn.classList.add("wrong");
  });

  feedbackEl.textContent = correct ? t("wellDone") : t("tryAgain");
  feedbackEl.classList.toggle("correct", correct);
  feedbackEl.classList.toggle("wrong",   !correct);

  sessionCount = Math.min(sessionCount + 1, SESSION_TOTAL);
  if (correct) sessionCorrect++;
  updateProgressBar();

  const stats = recordResult(key, correct);
  streakCountEl.textContent = stats.streak;
  recordAnswer({ correct, subject: currentSubject });
  syncProgress();

  mascotPlay.classList.remove("celebrate", "oops");
  if (correct) {
    burstConfetti();
    playCorrectChime();
    mascotPlay.classList.add("celebrate");
  } else {
    playWrongBuzz();
    mascotPlay.classList.add("oops");
  }

  recordAttempt(adaptiveState, key, { correct, ms: elapsedMs, startingDifficulty: 1 });
  saveAdaptiveState();

  if (sessionCount >= SESSION_TOTAL) {
    setTimeout(showSessionComplete, 1400);
  } else {
    setTimeout(loadNextQuestion, 1400);
  }
}

// ── Session Complete ──
function showSessionComplete() {
  window.speechSynthesis?.cancel();

  // Record screen time for this session
  if (sessionStartedAt) {
    recordScreenTime(Date.now() - sessionStartedAt);
    sessionStartedAt = null;
  }

  playScreenEl.classList.add("hidden");
  sessionCompleteEl.classList.remove("hidden");
  updateWelcomeBanner(); // refresh home stats now that session data is saved

  const pct  = sessionCorrect / SESSION_TOTAL;
  completeEmojiEl.textContent = pct >= 0.8 ? "🏆" : pct >= 0.5 ? "🎉" : "💪";
  completeScoreEl.textContent =
    `You got ${sessionCorrect} out of ${SESSION_TOTAL} correct`;

  // Hide upgrade strip for premium users
  upgradeStripEl.classList.toggle("hidden", isPremiumCached());
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

function shareScore() {
  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  shareContent(
    `I just scored ${sessionCorrect}/${SESSION_TOTAL} on EC Play! 🎯\n` +
    `Class ${currentClass} ${currentSubject} — playing in my language 🌏\n` +
    `Total: ${s.totalAnswered} questions, ${pct}% accuracy · ${s.dayStreak} day streak 🔥\n` +
    `Free for all Indian students →`
  );
}

function shareApp() {
  shareContent(
    `🌟 EC Play — Free AI-powered learning games for Indian students, Class 1–12!\n` +
    `Questions in 13 Indian languages · Completely FREE →`
  );
}

document.getElementById("share-score-btn").addEventListener("click", shareScore);

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

function renderProfileScreen() {
  if (!currentUser) return;
  const name = currentUser.displayName || currentUser.email.split("@")[0];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  document.getElementById("profile-avatar-lg").textContent   = initials;
  document.getElementById("profile-fullname").textContent    = name;
  document.getElementById("profile-useremail").textContent   = currentUser.email || "";

  const s   = loadStats();
  const pct = s.totalAnswered > 0 ? Math.round(s.totalCorrect / s.totalAnswered * 100) : 0;
  document.getElementById("stat-day-streak").textContent    = s.dayStreak || 0;
  document.getElementById("stat-total-q").textContent       = s.totalAnswered || 0;
  document.getElementById("stat-accuracy").textContent      = s.totalAnswered > 0 ? `${pct}%` : "—";
  document.getElementById("stat-screen-time").textContent   = formatDuration(s.screenTimeMs || 0);
  document.getElementById("stat-longest-streak").textContent = `${s.longestDayStreak || 0} days`;

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
document.getElementById("profile-share-score").addEventListener("click", shareScore);
document.getElementById("profile-share-app").addEventListener("click", shareApp);

playAgainBtn.addEventListener("click", () => startPlay(currentSubject));
newSubjectBtn.addEventListener("click", () => {
  sessionCompleteEl.classList.add("hidden");
  showSubjectPicker(currentClass);
});
upgradeFromSessionBtn.addEventListener("click", openPremiumModal);

// ── Premium Modal ──
function openPremiumModal() {
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
      ? "Pay ₹999 / year"
      : "Pay ₹149 / month";
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
    alert("Welcome to EC Play Premium! 🎉 You now have unlimited AI questions.");
  });
  checkoutBtn.disabled = false;
  checkoutBtn.textContent = selectedPlan === "yearly" ? "Pay ₹999 / year" : "Pay ₹149 / month";
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
