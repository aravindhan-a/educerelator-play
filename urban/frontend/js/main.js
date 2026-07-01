import { ALL_CLASSES, CURRICULA, getSubjectsForClass } from "../../../content/curriculum.js";
import { getNextQuestion } from "./question-bank.js";
import { recordResult } from "./progress.js";
import { playCorrectChime, playWrongBuzz } from "./sound-fx.js";
import { playAudio } from "../../../shared-lib/audio-player.js";
import {
  createAdaptiveState,
  recordAttempt,
  getDifficulty,
} from "../../../shared-lib/adaptive-engine.js";
import {
  onAuthChange,
  registerUser,
  loginUser,
  logoutUser,
  loadUserProgress,
  saveUserProgress,
} from "./auth.js";

// ── persisted state keys ──
const ADAPTIVE_KEY = "adaptiveState";
const LANG_KEY     = "lang";
const CURR_KEY     = "curriculum";

// ── runtime state ──
let lang            = localStorage.getItem(LANG_KEY) || "en";
let curriculum      = localStorage.getItem(CURR_KEY) || "cbse";
let adaptiveState   = loadJSON(ADAPTIVE_KEY, createAdaptiveState);
let currentClass    = null;
let currentSubject  = null;
let currentQuestion = null;
let questionStartedAt = null;
let currentUser     = null;

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
const userNameEl       = document.getElementById("user-name");
const signoutBtnEl     = document.getElementById("signout-btn");

const CONFETTI_EMOJI = ["🎉", "⭐", "✨", "🎈", "🏆"];

// ── helpers ──
function loadJSON(key, defaultFn) {
  try { return JSON.parse(localStorage.getItem(key)) || defaultFn(); }
  catch { return defaultFn(); }
}
function saveAdaptiveState() {
  localStorage.setItem(ADAPTIVE_KEY, JSON.stringify(adaptiveState));
}
function adaptiveKey(classNum, subject) { return `${classNum}:${subject}`; }

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
    userNameEl.textContent = name.split(" ")[0];
    userInfoEl.classList.remove("hidden");
    authModalEl.classList.add("hidden");

    // Load cloud progress and merge into localStorage
    try {
      const serverProgress = await loadUserProgress(user.uid);
      if (serverProgress) {
        localStorage.setItem("progress", JSON.stringify(serverProgress));
      }
    } catch { /* offline — use whatever is in localStorage */ }

    showClassPicker();
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
  if (currentQuestion) renderQuestion(currentQuestion);
});

// ── class grid ──
ALL_CLASSES.forEach(({ num, groupLabel, colorClass }) => {
  const btn = document.createElement("button");
  btn.className = `class-btn ${colorClass}`;
  btn.innerHTML = `<span class="class-num">${num}</span><span class="class-label">${groupLabel}</span>`;
  btn.addEventListener("click", () => showSubjectPicker(num));
  classGridEl.appendChild(btn);
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
  streakDisplay.classList.add("hidden");
}

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

  subjectPickerEl.classList.add("hidden");
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

  try {
    currentQuestion = await getNextQuestion(
      currentClass, currentSubject, curriculum, difficulty
    );
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

  feedbackEl.textContent = correct ? "Well done! 🎉" : "Try again next time!";
  feedbackEl.classList.toggle("correct", correct);
  feedbackEl.classList.toggle("wrong",   !correct);

  const stats = recordResult(key, correct);
  streakCountEl.textContent = stats.streak;
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

  setTimeout(loadNextQuestion, 1400);
}

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
