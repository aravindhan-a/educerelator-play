# EC Play — Full-Fledged Portal Roadmap (McGinnis track)

Owner: Aravindhan (founder). Executor: Claude (this repo's AI engineer).
Goal: a full-fledged, demo-ready portal ASAP — for real students first, and
polished enough to anchor a McGinnis Venture Competition submission.

## How this file works (for any Claude session executing it)
- Work top-to-bottom within the current phase; pick the **first unchecked item**.
- One item per scheduled run (a live session with the founder may do several).
- Every item ships the same way: implement → verify in browser (fresh-visitor
  flow, console clean) → commit with a clear message → push → confirm live on
  educerelator.com (GitHub Pages deploy takes ~1–2 min; poll with cache-buster).
- Tick the box (`[x]`), add the commit hash beside it, commit the roadmap edit too.

## Non-negotiable constraints (apply to every item)
- **No payments UI** while compliance+GST is pending: `PAYMENTS_ENABLED=false`
  gates everything; no ₹ prices in static HTML. "Premium coming soon" is the
  only allowed framing — never "free forever".
- **No CBSE/NCERT affiliation claims** — "follows the school syllabus" phrasing
  only; non-affiliation disclaimers stay.
- **ANTHROPIC_API_KEY stays server-side** (Vercel env / gitignored .env.local);
  never in the repo, never in frontend code.
- **Accuracy is existential**: no new question content without an independent
  verifier script that recomputes every answer (see scripts/verify-*.mjs).
- **Children's app**: data minimization, no tracking of minors, no dark
  patterns, kind failure states, no PII in analytics.
- Organic-only growth: no paid promotion features; SEO must be real content,
  never doorway spam.

## Phase 1 — Portal depth (make the product feel complete)
- [x] **A1. Interactive practice pages** (`64df083`): turn all 72 /practice/*.html pages
  from static Q&A into tap-to-answer mini-quizzes (instant right/wrong, the
  explanation when wrong, running score, finish banner with CTA into the app).
  Progressive enhancement in generate-practice-pages.mjs: keep crawlable text
  + `<details>` fallback for no-JS; vanilla JS inline, no frameworks.
  Regenerate all pages, verify one page per class band in browser, deploy.
- [x] **A2. Classic-mode mistake review** (`0bf39ce`): after a session, "Practice my
  mistakes" — reuse the exam-mode Leitner queue (exLoadReview/exSaveReview
  pattern in main.js) for level questions; store missed question ids per
  class/subject in localStorage; surface a review entry on the subject screen.
- [ ] **A3. Guest personalization**: after the first completed session, one
  friendly prompt "What should we call you?" (skippable, stored locally only);
  greet by name on return ("Good morning, Priya! ☀️"); never required, never
  sent to a server for guests.
- [ ] **A4. Exam-subject landing pages**: generate 24 crawlable practice pages
  from content/exams/** (NEET Biology, JEE Physics, UPSC Polity …) with the
  same interactive treatment; add to sitemap + practice hub + hreflang-safe.
- [ ] **A5. PWA installability**: manifest.json (name, icons from the owl
  brand kit, theme #7c3aed), apple-touch-icon, "Add to Home Screen" friendly;
  sw.js already exists — extend precache list; verify Lighthouse PWA pass.
- [ ] **A6. Starter-chunk content split**: generate content/levels/starter/
  (first ~30 questions per class-subject); question-bank.js fetches starter
  first (fast first question on 2G/3G), full bank in background; fall back to
  full file if starter missing. Idempotent generator + verifier parity check.
- [ ] **A7. Classic-mode explanations**: wrong answers in classic mode show a
  one-line WHY. Start with math (generators can emit the explanation
  deterministically — extend each math generator + verifier); prose subjects
  get solutions authored batch-by-batch with verifier tables, same as the
  original content pipeline. Ship per-class as ready; app falls back to
  "The correct answer is X" when no solution exists.

## Phase 2 — Organic discovery (compound traffic)
- [ ] **B1. IndexNow**: host a key file, ping api.indexnow.org with all
  sitemap URLs post-deploy (Bing/DuckDuckGo instant discovery); add a
  scripts/indexnow-ping.mjs run after sitemap changes.
- [ ] **B2. Custom 404.html**: on-brand owl "oops" page with links to the
  practice hub, all 12 classes, and home; GitHub Pages serves 404.html
  automatically; add to deploy workflow copy list.
- [ ] **B3. Topic pages for maths** (long-tail): per class, 3–5 topic pages
  ("Class 10 trigonometry practice questions") generated from the math banks'
  topic tags; interactive like A1; sitemap + hub links; no thin pages — only
  topics with ≥15 real questions.
- [ ] **B4. Regional practice hubs**: /practice/hindi/ and /practice/tamil/
  hub pages listing all classes with native-script copy (reuse the i18n
  tables); hreflang pairs with the English pages.
- [ ] **B5. CTR pass**: retitle practice pages with the pattern students
  actually search ("Class 7 Science MCQ Online Test — Free with Answers");
  one FAQPage block per page (3 real questions); meta descriptions ≤155 chars.

## Phase 3 — Credibility & McGinnis readiness
- [ ] **C1. About/Impact page**: the founder story (TEDx, Teach For India),
  the mission, truthful numbers pulled at build time (question count, language
  count, class coverage); linked from footer; OG image from brand kit.
- [ ] **C2. Privacy-first usage counters**: anonymous aggregate counters
  (sessions started, questions answered, per language) via the existing
  Vercel backend → a tiny JSON endpoint; NO user ids, NO cookies, NO IP
  storage; a /stats view the founder can screenshot for the pitch. Gate
  behind founder review before launch.
- [ ] **C3. Demo mode**: ?demo=1 seeds a guest with a 7-day streak, stats and
  a mid-level profile so live pitches never start from an empty screen;
  clearly watermarked "demo"; never indexable (noindex on the param via JS).
- [ ] **C4. One-pager for teachers/parents** (printable): what EC Play is,
  how to use it in class, QR code to the site; served as /for-teachers.html
  with print CSS (PDF via browser print).
- [ ] **C5. Happiness polish** (from the happiness audit): warmer praise
  variety (rotate 6+ phrases per language), mascot celebration on 3 stars,
  gentle streak-restore message after a missed day, session-complete shows
  "you learned X new things" framing instead of raw score alone.

## Phase 4 — Reach (after 1–3 are solid)
- [ ] **D1. Accessibility pass**: keyboard navigation through a full session,
  aria-labels on icon buttons, focus-visible styles, contrast audit ≥4.5:1,
  prefers-reduced-motion respect.
- [ ] **D2. Share cards**: per-class OG images (owl + "Class 7 Science") so
  shared links look rich on WhatsApp — the #1 sharing channel for Indian
  parents; generated from brand SVG at build time.
- [ ] **D3. Hindi/Tamil UI audit**: native-speaker-style review pass of all
  UI strings in the top 6 languages; fix awkward machine phrasing.
- [ ] **D4. Question bank growth**: +200 questions per under-served
  class-subject (verifier-gated, same pipeline); exam banks toward 50/subject.

## Done (committed)
- [x] K-12 bank ~6,168 level questions, 13 languages, verifier-gated
- [x] 563 exam questions (adversarial two-solve gate), 24 exam-subject banks
- [x] 72 programmatic practice pages + hub + sitemap (82 URLs), GSC verified
- [x] Guest-first entry (no auth wall) — 8cdace3
- [x] Report-a-question loop on all surfaces — b38d563
- [x] CBSE/NCERT truthfulness pass + disclaimers — 5f0405b
- [x] TTS math-operator localization (13 languages) — f045e86
- [x] Brand kit: logo, wordmark, social + YouTube art — a308477
