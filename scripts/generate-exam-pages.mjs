#!/usr/bin/env node
// Programmatic SEO, exam tracks: emits one static, crawlable practice page per
// exam×subject (24 pages) + a /practice/exams/ hub. Same progressive
// enhancement as the class pages (generate-practice-pages.mjs): crawlable text
// with <details> answers for no-JS/crawlers, tap-to-answer buttons with a
// running score when JS runs. HONESTY RULE: these banks are original
// exam-PATTERN questions (draft sample packs), NOT past papers — every page
// says so and carries the non-affiliation disclaimer. Never use "PYQ" or
// "previous year" in page copy. Deterministic; re-runs are idempotent.
// Run:  node scripts/generate-exam-pages.mjs
// Sitemap + class-hub links are owned by generate-practice-pages.mjs (run it after).

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EXAMS } from "../content/exams.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "urban/frontend/practice/exams");
const SITE = "https://educerelator.com";

// Display metadata per exam track. `name` leads titles/H1s; `conductedBy`
// feeds the non-affiliation disclaimer; `pattern` is shown as a fact chip.
const EXAM_META = {
  neet:       { name: "NEET",            about: "the NEET (UG) medical entrance exam",        conductedBy: "the National Testing Agency (NTA)", pattern: "Real exam: 180 questions · 200 minutes · +4 / −1 marking" },
  jee:        { name: "JEE",             about: "the JEE Main engineering entrance exam",     conductedBy: "the National Testing Agency (NTA)", pattern: "Real exam: 90 questions · 180 minutes · +4 / −1 marking" },
  upsc:       { name: "UPSC Prelims",    about: "the UPSC Civil Services Preliminary exam",   conductedBy: "the Union Public Service Commission", pattern: "Real exam: 100 questions · 120 minutes · negative marking" },
  olympiad:   { name: "Olympiad",        about: "school Olympiad exams",                      conductedBy: "the respective Olympiad foundations", pattern: null },
  "cbse-10":  { name: "Class 10 Boards", about: "the Class 10 board exams (CBSE pattern)",    conductedBy: "CBSE", pattern: null },
  "cbse-12":  { name: "Class 12 Boards", about: "the Class 12 board exams (CBSE pattern)",    conductedBy: "CBSE", pattern: null },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function loadPack(examId, subjId) {
  const p = path.join(ROOT, `content/exams/${examId}/${subjId}.json`);
  if (!fs.existsSync(p)) return null;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  const qs = (d.questions || []).filter((q) => q?.prompt?.en && q.choices?.length >= 3);
  return qs.length ? qs : null;
}

const SHARED_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#1a1a2e;background:#faf9ff;line-height:1.6}
.topbar{background:linear-gradient(135deg,#ff5e7e,#7c3aed);padding:14px 24px;display:flex;align-items:center;gap:16px}
.topbar a{color:#fff;text-decoration:none;font-weight:800}.topbar-nav{margin-left:auto;display:flex;gap:14px}.topbar-nav a{font-weight:600;font-size:.9rem;color:rgba(255,255,255,.85)}
.hero{background:linear-gradient(135deg,#7c3aed,#ff5e7e);color:#fff;padding:44px 24px 38px;text-align:center}
.hero h1{font-size:1.9rem;font-weight:900;line-height:1.25;margin-bottom:10px}
.hero p{opacity:.92;max-width:640px;margin:0 auto 22px}
.hero .fact{display:inline-block;background:rgba(255,255,255,.16);border-radius:999px;padding:5px 16px;font-size:.85rem;font-weight:700;margin-bottom:18px}
.cta{display:inline-block;background:#fff;color:#7c3aed;font-weight:900;padding:14px 34px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.wrap{max-width:760px;margin:0 auto;padding:36px 20px}
.wrap h2{font-size:1.35rem;font-weight:800;color:#2d1b4e;margin:26px 0 10px}
.note{font-size:.9rem;color:#6b5b95;background:#f3e8ff;border-left:4px solid #a78bfa;border-radius:8px;padding:10px 14px;margin:6px 0 4px}
.q{background:#fff;border-radius:14px;padding:18px 18px 12px;margin:14px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.q-prompt{font-weight:700;color:#1e1b4b}.q-num{color:#7c3aed}.q-topic{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.3px;text-transform:uppercase;color:#6d28d9;background:#f3e8ff;border-radius:999px;padding:2px 10px;margin-bottom:8px}
.q-choices{margin:10px 0 6px 26px;color:#333}.q-choices li{margin:3px 0}
.q-answer summary{cursor:pointer;color:#7c3aed;font-weight:700;font-size:.9rem}
.q-answer p{margin:8px 0 4px;color:#065f46;background:#ecfdf5;padding:8px 12px;border-radius:8px;font-size:.92rem}
.choice{display:block;width:100%;text-align:left;font:inherit;color:#333;background:#f8f7ff;border:2px solid #e9e4f8;border-radius:10px;padding:9px 12px;cursor:pointer;transition:border-color .15s,background .15s}
.choice:hover{border-color:#c4b5fd}.q[data-done] .choice{cursor:default;opacity:.85}
.choice.right{background:#ecfdf5;border-color:#10b981;color:#065f46;font-weight:800;opacity:1!important}
.choice.wrong{background:#fef2f2;border-color:#f87171;color:#991b1b;opacity:1!important}
.q.js .q-choices{list-style:none;margin-left:0}.q.js .q-choices li{margin:7px 0}
.q-reveal{margin:10px 0 4px;color:#065f46;background:#ecfdf5;padding:8px 12px;border-radius:8px;font-size:.92rem}
.score-pill{position:sticky;top:10px;z-index:5;display:none;width:max-content;margin:0 auto;background:#1e1b4b;color:#fff;font-weight:800;font-size:.9rem;padding:7px 18px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.finish-card{display:none;text-align:center;background:#fff;border:2px solid #e9e4f8;border-radius:16px;padding:26px 18px;margin:18px 0;box-shadow:0 4px 18px rgba(124,58,237,.12)}
.finish-card .fc-emoji{font-size:2.4rem}.finish-card h3{color:#2d1b4e;margin:6px 0 4px}.finish-card p{color:#555;margin-bottom:14px}
.links{font-size:.92rem;color:#555;background:#f3e8ff;border-radius:12px;padding:14px 16px;margin-top:26px}
.links a{color:#6d28d9;font-weight:700;text-decoration:none}
.band{background:linear-gradient(135deg,#7c3aed,#ff5e7e);text-align:center;color:#fff;padding:38px 20px;margin-top:36px}
.band h2{color:#fff;font-size:1.4rem;margin:0 0 8px}
.disclaimer{max-width:760px;margin:0 auto;padding:18px 20px 0;font-size:.8rem;color:#888}
footer{text-align:center;padding:22px;background:#1a1030;color:rgba(255,255,255,.5);font-size:.85rem}footer a{color:#a78bfa}`;

// Identical interactive behaviour to the class practice pages.
const PAGE_SCRIPT = `
(function(){
  "use strict";
  var qs = [].slice.call(document.querySelectorAll(".q"));
  var total = qs.length, done = 0, ok = 0;
  var pill = document.getElementById("score-pill");
  if (!qs.length || !pill) return;
  pill.style.display = "block";
  qs.forEach(function(q){
    var ans = +q.dataset.answer;
    var det = q.querySelector("details");
    var lis = [].slice.call(q.querySelectorAll(".q-choices li"));
    q.classList.add("js");
    if (det) det.style.display = "none";
    var btns = lis.map(function(li, i){
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice";
      b.innerHTML = String.fromCharCode(65 + i) + ". " + li.innerHTML;
      li.textContent = ""; li.appendChild(b);
      return b;
    });
    btns.forEach(function(b, i){
      b.addEventListener("click", function(){
        if (q.dataset.done) return;
        q.dataset.done = "1"; done++;
        if (i === ans) { b.classList.add("right"); ok++; }
        else { b.classList.add("wrong"); btns[ans].classList.add("right"); }
        if (det) { var p = det.querySelector("p"); if (p) { p.className = "q-reveal"; q.appendChild(p); } det.remove(); }
        pill.textContent = "Score: " + ok + " / " + total;
        if (done === total) finish();
      });
    });
  });
  function finish(){
    var card = document.getElementById("finish-card");
    var em = document.getElementById("fc-emoji"), ti = document.getElementById("fc-title"), tx = document.getElementById("fc-text");
    var pc = ok / total;
    if (pc >= 0.8) { em.textContent = "🏆"; ti.textContent = "Outstanding! " + ok + " out of " + total + "!"; tx.textContent = "You are ready for harder questions — keep this momentum going in the full revision mode."; }
    else if (pc >= 0.5) { em.textContent = "🎉"; ti.textContent = "Well done — " + ok + " out of " + total + "!"; tx.textContent = "A little more practice and you will master this. The revision mode re-asks what you missed at smart intervals."; }
    else { em.textContent = "🌱"; ti.textContent = "Good start — " + ok + " out of " + total + "."; tx.textContent = "Every topper began exactly here. The revision mode re-asks what you missed until it sticks."; }
    card.style.display = "block";
    card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
})();`;

function topicPretty(t) {
  return t ? String(t).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
}

function pageHTML({ exam, meta, subj, questions, siblings }) {
  const file = `${exam.id}-${subj.id}.html`;
  const url = `${SITE}/practice/exams/${file}`;
  const title = `${meta.name} ${subj.label} Practice Questions – Free Exam-Pattern MCQs | EC Play`;
  const desc = `${questions.length} free ${meta.name} ${subj.label} practice questions with step-by-step solutions. Original exam-pattern MCQs, tap to answer, instant feedback — no sign-up, no ads.`;
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "EC Play", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "Practice Questions", item: `${SITE}/practice/` },
    { "@type": "ListItem", position: 3, name: "Exam Practice", item: `${SITE}/practice/exams/` },
    { "@type": "ListItem", position: 4, name: `${meta.name} ${subj.label}` } ] };
  const quiz = { "@context": "https://schema.org", "@type": "Quiz", name: `${meta.name} ${subj.label} practice quiz`,
    about: { "@type": "Thing", name: `${subj.label} — ${meta.about}` },
    inLanguage: "en", url,
    hasPart: questions.slice(0, 5).map((q) => ({ "@type": "Question", eduQuestionType: "Multiple choice", name: q.prompt.en,
      suggestedAnswer: q.choices.filter((_, i) => i !== q.answerIndex).slice(0, 1).map((c) => ({ "@type": "Answer", text: c.en }))[0],
      acceptedAnswer: { "@type": "Answer", text: q.choices[q.answerIndex].en } })) };

  const qBlocks = questions.map((q, i) => `
    <div class="q" data-answer="${q.answerIndex}">
      ${q.topic ? `<span class="q-topic">${esc(topicPretty(q.topic))}</span>` : ""}
      <p class="q-prompt"><span class="q-num">Q${i + 1}.</span> ${esc(q.prompt.en)}</p>
      <ol class="q-choices" type="A">${q.choices.map((c) => `<li>${esc(c.en)}</li>`).join("")}</ol>
      <details class="q-answer"><summary>Show answer</summary>
        <p><strong>${String.fromCharCode(65 + q.answerIndex)}. ${esc(q.choices[q.answerIndex].en)}</strong>${q.solution?.en ? ` — ${esc(q.solution.en)}` : ""}</p>
      </details>
    </div>`).join("\n");

  const sameExam = siblings.filter((s) => s.id !== subj.id)
    .map((s) => `<a href="${exam.id}-${s.id}.html">${esc(meta.name)} ${esc(s.label)}</a>`).join(" · ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta name="robots" content="index, follow, max-snippet:-1" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:site_name" content="EC Play by Educerelator" />
<script type="application/ld+json">${JSON.stringify(crumbs)}</script>
<script type="application/ld+json">${JSON.stringify(quiz)}</script>
<style>${SHARED_CSS}</style>
</head>
<body>
<nav class="topbar"><a href="/">🦉 EC Play</a><div class="topbar-nav"><a href="/">Play Now</a><a href="/practice/exams/">Exam Prep</a><a href="/practice/">Class 1–12</a></div></nav>
<div class="hero">
  <h1>${esc(meta.name)} ${esc(subj.label)} Practice Questions</h1>
  ${meta.pattern ? `<div class="fact">${esc(meta.pattern)}</div>` : ""}
  <p>${questions.length} free ${esc(subj.label)} MCQs written in the ${esc(meta.name)} exam pattern, each with a step-by-step solution. Tap an option for instant feedback — no sign-up, no ads.</p>
  <a class="cta" href="/">Revise with smart repetition →</a>
</div>
<div class="wrap">
  <p class="note">✍️ These are <strong>original practice questions written in the ${esc(meta.name)} pattern</strong> for ${esc(meta.about)} — not questions from any official past paper.</p>
  <h2>Practice questions with solutions</h2>
  <div class="score-pill" id="score-pill">Score: 0 / ${questions.length}</div>
  ${qBlocks}
  <div class="finish-card" id="finish-card">
    <div class="fc-emoji" id="fc-emoji">🎉</div>
    <h3 id="fc-title">Great practice!</h3>
    <p id="fc-text"></p>
    <a class="cta" href="/">Keep revising on EC Play →</a>
  </div>
  <div class="links">
    ${sameExam ? `<p><strong>More ${esc(meta.name)} practice:</strong> ${sameExam}</p>` : ""}
    <p><a href="/practice/exams/">All exam practice sets →</a> · <a href="/practice/">Class 1–12 practice →</a></p>
  </div>
</div>
<div class="band"><h2>Missed a few? EC Play remembers them.</h2><p>The in-app revision mode re-asks your mistakes at smart intervals until they stick.</p><br/><a class="cta" href="/">Start revising →</a></div>
<p class="disclaimer">EC Play by Educerelator is an independent learning platform. We are not affiliated with, endorsed by, or connected to ${esc(meta.conductedBy)}, CBSE, NCERT, or any examination board or conducting body. Exam names are used only to describe the question pattern and syllabus these practice sets follow.</p>
<footer>© 2026 Educerelator · <a href="/">EC Play</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer>
<script>${PAGE_SCRIPT}
</script>
</body>
</html>`;
}

// ── generate pages ──
fs.mkdirSync(OUT, { recursive: true });
const pages = [];
for (const exam of EXAMS) {
  const meta = EXAM_META[exam.id];
  if (!meta) { console.log(`skip exam ${exam.id} (no meta)`); continue; }
  const avail = exam.subjects.filter((s) => fs.existsSync(path.join(ROOT, `content/exams/${exam.id}/${s.id}.json`)));
  for (const subj of avail) {
    const questions = loadPack(exam.id, subj.id);
    if (!questions) { console.log(`skip ${exam.id}/${subj.id} (empty)`); continue; }
    const html = pageHTML({ exam, meta, subj, questions, siblings: avail });
    const file = `${exam.id}-${subj.id}.html`;
    fs.writeFileSync(path.join(OUT, file), html);
    pages.push({ file, examId: exam.id, examName: meta.name, emoji: subj.emoji, label: subj.label, count: questions.length });
  }
}

// ── exam hub ──
const byExam = {};
for (const p of pages) (byExam[p.examId] = byExam[p.examId] || []).push(p);
const order = EXAMS.map((e) => e.id).filter((id) => byExam[id]);
const hubBody = order.map((id) => {
  const ex = EXAMS.find((e) => e.id === id);
  const meta = EXAM_META[id];
  return `
  <h2>${ex.emoji} ${esc(meta.name)}</h2>
  <ul>${byExam[id].map((p) => `<li><a href="${p.file}">${esc(meta.name)} ${esc(p.label)} practice questions</a> <span class="n">(${p.count} MCQs with solutions)</span></li>`).join("")}</ul>`;
}).join("\n");
const totalQ = pages.reduce((a, p) => a + p.count, 0);
fs.writeFileSync(path.join(OUT, "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Exam Practice Questions – NEET, JEE, UPSC, Boards, Olympiad | EC Play</title>
<meta name="description" content="${totalQ}+ free exam-pattern practice questions with step-by-step solutions — NEET, JEE, UPSC Prelims, Class 10 &amp; 12 Boards, Olympiad. No sign-up, no ads." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${SITE}/practice/exams/" />
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "EC Play exam practice sets", url: `${SITE}/practice/exams/`, isPartOf: { "@id": `${SITE}/#website` } })}</script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",system-ui,sans-serif;background:#faf9ff;color:#1a1a2e;line-height:1.6}
.topbar{background:linear-gradient(135deg,#ff5e7e,#7c3aed);padding:14px 24px;display:flex;align-items:center;gap:16px}.topbar a{color:#fff;font-weight:800;text-decoration:none}.topbar-nav{margin-left:auto;display:flex;gap:14px}.topbar-nav a{font-weight:600;font-size:.9rem;color:rgba(255,255,255,.85)}
.hero{background:linear-gradient(135deg,#7c3aed,#ff5e7e);color:#fff;text-align:center;padding:40px 20px}
.hero h1{font-size:1.8rem;font-weight:900}.hero p{opacity:.92;margin-top:8px}
.wrap{max-width:720px;margin:0 auto;padding:30px 20px}
.note{font-size:.9rem;color:#6b5b95;background:#f3e8ff;border-left:4px solid #a78bfa;border-radius:8px;padding:10px 14px;margin:0 0 10px}
h2{color:#2d1b4e;margin:22px 0 8px;font-size:1.2rem}
ul{list-style:none}li{padding:6px 0;border-bottom:1px solid #f0eafc}
a{color:#6d28d9;font-weight:700;text-decoration:none}.n{color:#999;font-weight:400;font-size:.85rem}
.disclaimer{max-width:720px;margin:0 auto;padding:18px 20px 0;font-size:.8rem;color:#888}
footer{text-align:center;padding:22px;background:#1a1030;color:rgba(255,255,255,.5);font-size:.85rem}footer a{color:#a78bfa}</style>
</head>
<body>
<nav class="topbar"><a href="/">🦉 EC Play</a><div class="topbar-nav"><a href="/">Play Now</a><a href="/practice/">Class 1–12</a></div></nav>
<div class="hero"><h1>Exam Practice Questions</h1><p>${totalQ}+ exam-pattern MCQs with step-by-step solutions · NEET · JEE · UPSC · Boards · Olympiad</p></div>
<div class="wrap">
<p class="note">✍️ All sets are <strong>original practice questions written in each exam's pattern</strong> — not questions from official past papers.</p>
${hubBody}
<h2>Looking for school practice?</h2>
<ul><li><a href="/practice/">Class 1–12 practice questions by subject →</a></li></ul>
</div>
<p class="disclaimer">EC Play by Educerelator is an independent learning platform. We are not affiliated with, endorsed by, or connected to the NTA, UPSC, CBSE, NCERT, or any examination board or conducting body. Exam names are used only to describe the question pattern and syllabus these practice sets follow.</p>
<footer>© 2026 Educerelator · <a href="/">Play the full adaptive quiz →</a></footer>
</body>
</html>`);

console.log(`Generated ${pages.length} exam practice pages + hub (${totalQ} questions surfaced). Now run generate-practice-pages.mjs to refresh sitemap + hub links.`);
