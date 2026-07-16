#!/usr/bin/env node
// Programmatic SEO: emits one static, crawlable practice page per
// class×subject (72 pages) + a /practice/ hub + a regenerated sitemap.xml.
// Each page carries REAL sample questions from the verified bank (crawlable
// HTML, answers behind <details>), unique title/description/H1, Quiz +
// BreadcrumbList JSON-LD, and internal links. Deterministic (seeded) so
// re-runs are idempotent. Run:  node scripts/generate-practice-pages.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALL_CLASSES, getSubjectsForClass } from "../content/curriculum.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "urban/frontend/practice");
const SITE = "https://educerelator.com";
const TODAY = "2026-07-15";
const SAMPLES_PER_PAGE = 18;

const SLUG = { math: "maths" }; // nicer search slug; others use their id
const slugOf = (id) => SLUG[id] || id;

function rng(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function loadBank(cls, subjId) {
  const p = path.join(ROOT, `content/levels/${cls}-${subjId}.json`);
  if (!fs.existsSync(p)) return null;
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  return d.questions || d.levels.flatMap((l) => l.questions);
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// spread a deterministic sample across the whole bank (early = curated, late = generated)
function sampleQuestions(bank, seed, n) {
  const r = rng(seed);
  const idx = new Set();
  const step = Math.max(1, Math.floor(bank.length / n));
  for (let i = 0; i < bank.length && idx.size < n; i += step) idx.add(Math.min(bank.length - 1, i + Math.floor(r() * step)));
  return [...idx].map((i) => bank[i]).filter((q) => q?.prompt?.en && q.choices?.length >= 3);
}

function pageHTML({ cls, subj, label, bank, samples, allSubjects }) {
  const slug = slugOf(subj);
  const url = `${SITE}/practice/class-${cls}-${slug}.html`;
  const title = `Class ${cls} ${label} Practice Questions – Free MCQs | EC Play`;
  const desc = `Free Class ${cls} ${label} practice questions with answers — ${bank.length} CBSE/NCERT-aligned MCQs in 13 Indian languages. Adaptive quiz, no sign-up, no ads.`;
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "EC Play", item: `${SITE}/` },
    { "@type": "ListItem", position: 2, name: "Practice Questions", item: `${SITE}/practice/` },
    { "@type": "ListItem", position: 3, name: `Class ${cls} ${label}` } ] };
  const quiz = { "@context": "https://schema.org", "@type": "Quiz", name: `Class ${cls} ${label} practice quiz`,
    about: { "@type": "Thing", name: `${label} — CBSE/NCERT Class ${cls}` },
    educationalLevel: `Grade ${cls}`, inLanguage: "en", url,
    hasPart: samples.slice(0, 5).map((q) => ({ "@type": "Question", eduQuestionType: "Multiple choice", name: q.prompt.en,
      suggestedAnswer: q.choices.filter((_, i) => i !== q.answerIndex).slice(0, 1).map((c) => ({ "@type": "Answer", text: c.en }))[0],
      acceptedAnswer: { "@type": "Answer", text: q.choices[q.answerIndex].en } })) };

  const qBlocks = samples.map((q, i) => `
    <div class="q">
      <p class="q-prompt"><span class="q-num">Q${i + 1}.</span> ${esc(q.prompt.en)}${q.visual ? ` <span class="q-visual">${esc(q.visual)}</span>` : ""}</p>
      <ol class="q-choices" type="A">${q.choices.map((c) => `<li>${esc(c.en)}</li>`).join("")}</ol>
      <details class="q-answer"><summary>Show answer</summary>
        <p><strong>${String.fromCharCode(65 + q.answerIndex)}. ${esc(q.choices[q.answerIndex].en)}</strong>${q.solution?.en ? ` — ${esc(q.solution.en)}` : ""}</p>
      </details>
    </div>`).join("\n");

  const sameClass = allSubjects.filter((s) => s.id !== subj).map((s) => `<a href="class-${cls}-${slugOf(s.id)}.html">Class ${cls} ${esc(s.label)}</a>`).join(" · ");
  const adjacent = [cls - 1, cls + 1].filter((c) => c >= 1 && c <= 12 && fs.existsSync(path.join(ROOT, `content/levels/${c}-${subj}.json`)))
    .map((c) => `<a href="class-${c}-${slug}.html">Class ${c} ${esc(label)}</a>`).join(" · ");

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
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#1a1a2e;background:#faf9ff;line-height:1.6}
.topbar{background:linear-gradient(135deg,#ff5e7e,#7c3aed);padding:14px 24px;display:flex;align-items:center;gap:16px}
.topbar a{color:#fff;text-decoration:none;font-weight:800}.topbar-nav{margin-left:auto;display:flex;gap:14px}.topbar-nav a{font-weight:600;font-size:.9rem;color:rgba(255,255,255,.85)}
.hero{background:linear-gradient(135deg,#7c3aed,#ff5e7e);color:#fff;padding:44px 24px 38px;text-align:center}
.hero h1{font-size:1.9rem;font-weight:900;line-height:1.25;margin-bottom:10px}
.hero p{opacity:.92;max-width:640px;margin:0 auto 22px}
.cta{display:inline-block;background:#fff;color:#7c3aed;font-weight:900;padding:14px 34px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.wrap{max-width:760px;margin:0 auto;padding:36px 20px}
.wrap h2{font-size:1.35rem;font-weight:800;color:#2d1b4e;margin:26px 0 10px}
.q{background:#fff;border-radius:14px;padding:18px 18px 12px;margin:14px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.q-prompt{font-weight:700;color:#1e1b4b}.q-num{color:#7c3aed}.q-visual{font-size:1.4rem}
.q-choices{margin:10px 0 6px 26px;color:#333}.q-choices li{margin:3px 0}
.q-answer summary{cursor:pointer;color:#7c3aed;font-weight:700;font-size:.9rem}
.q-answer p{margin:8px 0 4px;color:#065f46;background:#ecfdf5;padding:8px 12px;border-radius:8px;font-size:.92rem}
.links{font-size:.92rem;color:#555;background:#f3e8ff;border-radius:12px;padding:14px 16px;margin-top:26px}
.links a{color:#6d28d9;font-weight:700;text-decoration:none}
.band{background:linear-gradient(135deg,#7c3aed,#ff5e7e);text-align:center;color:#fff;padding:38px 20px;margin-top:36px}
.band h2{color:#fff;font-size:1.4rem;margin:0 0 8px}
footer{text-align:center;padding:22px;background:#1a1030;color:rgba(255,255,255,.5);font-size:.85rem}footer a{color:#a78bfa}
</style>
</head>
<body>
<nav class="topbar"><a href="/">🦉 EC Play</a><div class="topbar-nav"><a href="/">Play Now</a><a href="/practice/">All Practice Sets</a><a href="/cbse-practice-questions.html">CBSE</a></div></nav>
<div class="hero">
  <h1>Class ${cls} ${esc(label)} Practice Questions</h1>
  <p>${bank.length} free CBSE/NCERT-aligned MCQs for Class ${cls} ${esc(label)} — playable as an adaptive quiz in English, Hindi, Tamil, Telugu, Bengali and 8 more Indian languages. No sign-up, no ads.</p>
  <a class="cta" href="/">Practice all ${bank.length} questions free →</a>
</div>
<div class="wrap">
  <h2>Sample questions with answers</h2>
  ${qBlocks}
  <div class="links">
    <p><strong>More Class ${cls} practice:</strong> ${sameClass || "—"}</p>
    ${adjacent ? `<p><strong>Same subject, other classes:</strong> ${adjacent}</p>` : ""}
    <p><a href="/practice/">Browse all classes &amp; subjects →</a></p>
  </div>
</div>
<div class="band"><h2>Ready for the full adaptive quiz?</h2><p>Combo scores, streaks and instant feedback — in 13 languages.</p><br/><a class="cta" href="/">Play free on EC Play →</a></div>
<footer>© 2026 Educerelator · <a href="/">EC Play</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></footer>
</body>
</html>`;
}

// ── generate ──
fs.mkdirSync(OUT, { recursive: true });
const pages = [];
for (const c of ALL_CLASSES) {
  const cls = c.num;
  const subjects = getSubjectsForClass(cls);
  for (const s of subjects) {
    const bank = loadBank(cls, s.id);
    if (!bank || bank.length < 10) { console.log(`skip ${cls}-${s.id}`); continue; }
    const samples = sampleQuestions(bank, cls * 100 + s.id.length, SAMPLES_PER_PAGE);
    const html = pageHTML({ cls, subj: s.id, label: s.label, bank, samples, allSubjects: subjects });
    const file = `class-${cls}-${slugOf(s.id)}.html`;
    fs.writeFileSync(path.join(OUT, file), html);
    pages.push({ file, cls, label: s.label, count: bank.length });
  }
}

// hub page
const byClass = {};
for (const p of pages) (byClass[p.cls] = byClass[p.cls] || []).push(p);
const hubBody = Object.keys(byClass).sort((a, b) => a - b).map((cls) => `
  <h2>Class ${cls}</h2>
  <ul>${byClass[cls].map((p) => `<li><a href="${p.file}">Class ${cls} ${esc(p.label)} practice questions</a> <span class="n">(${p.count} MCQs)</span></li>`).join("")}</ul>`).join("\n");
const total = pages.reduce((a, p) => a + p.count, 0);
fs.writeFileSync(path.join(OUT, "index.html"), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Free Practice Questions by Class &amp; Subject (1–12) | EC Play</title>
<meta name="description" content="Browse ${total}+ free CBSE/NCERT practice questions by class and subject — Class 1 to 12, every subject, 13 Indian languages. MCQs with answers, no sign-up." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${SITE}/practice/" />
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: "EC Play practice question sets", url: `${SITE}/practice/`, isPartOf: { "@id": `${SITE}/#website` } })}</script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",system-ui,sans-serif;background:#faf9ff;color:#1a1a2e;line-height:1.6}
.topbar{background:linear-gradient(135deg,#ff5e7e,#7c3aed);padding:14px 24px}.topbar a{color:#fff;font-weight:800;text-decoration:none}
.hero{background:linear-gradient(135deg,#7c3aed,#ff5e7e);color:#fff;text-align:center;padding:40px 20px}
.hero h1{font-size:1.8rem;font-weight:900}.hero p{opacity:.92;margin-top:8px}
.wrap{max-width:720px;margin:0 auto;padding:30px 20px}
h2{color:#2d1b4e;margin:22px 0 8px;font-size:1.2rem}
ul{list-style:none}li{padding:6px 0;border-bottom:1px solid #f0eafc}
a{color:#6d28d9;font-weight:700;text-decoration:none}.n{color:#999;font-weight:400;font-size:.85rem}
footer{text-align:center;padding:22px;background:#1a1030;color:rgba(255,255,255,.5);font-size:.85rem}footer a{color:#a78bfa}</style>
</head>
<body>
<nav class="topbar"><a href="/">🦉 EC Play</a></nav>
<div class="hero"><h1>Free Practice Questions by Class &amp; Subject</h1><p>${total}+ CBSE/NCERT-aligned MCQs · Class 1–12 · 13 Indian languages · always free</p></div>
<div class="wrap">${hubBody}</div>
<footer>© 2026 Educerelator · <a href="/">Play the full adaptive quiz free →</a></footer>
</body>
</html>`);

// sitemap: core pages + hub + practice pages (privacy/terms are noindex → excluded)
const core = [
  { loc: `${SITE}/`, pri: "1.0", freq: "weekly" },
  { loc: `${SITE}/cbse-practice-questions.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/online-learning-games-india.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/learn-in-hindi.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/learn-in-tamil.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/learn-in-telugu.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/learn-in-bengali.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/learn-in-marathi.html`, pri: "0.9", freq: "monthly" },
  { loc: `${SITE}/about.html`, pri: "0.6", freq: "yearly" },
  { loc: `${SITE}/practice/`, pri: "0.9", freq: "weekly" },
];
const urls = core.concat(pages.map((p) => ({ loc: `${SITE}/practice/${p.file}`, pri: "0.8", freq: "monthly" })));
fs.writeFileSync(path.join(ROOT, "urban/frontend/sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority><lastmod>${TODAY}</lastmod></url>`).join("\n")}
</urlset>
`);

console.log(`Generated ${pages.length} practice pages + hub; sitemap now has ${urls.length} URLs (${total} questions surfaced).`);
