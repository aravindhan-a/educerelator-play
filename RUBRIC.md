# EC Play — The 4-A Rubric

**Mission:** world-class learning for every Indian student, then the world.
**Rule:** every claim on the site must be true. Every score below is evidence-based — re-audit after each major release.

Scoring: 🟢 met · 🟡 partially met · 🔴 not met
_Last audit: 2 July 2026_

---

## 1. Availability — "Can every student reach it, whenever they want?"

| # | Criterion | Target | Status | Evidence / Gap |
|---|-----------|--------|--------|----------------|
| A1 | Works in any modern browser, no install | 100% of flows | 🟢 | Static site + PWA manifest; no app store gate |
| A2 | No sign-up wall to try | Play a full session with zero accounts | 🟢 | Guest mode ("Try without an account") added 2 Jul 2026 |
| A3 | Works on low-end Android + slow networks | First play < 5 s on 3G | 🟡 | Static assets are light, but no service worker yet — repeat visits re-download. **Gap: offline PWA / service-worker caching** |
| A4 | Survives backend outage | Free tier fully usable with API down | 🟢 | Local question bank is the free path; backend only needed for premium AI + sync |
| A5 | Full offline play | Practice with zero connectivity | 🔴 | **Gap: service worker + pre-cached question banks.** Highest-impact next feature for rural/intermittent-connectivity students |
| A6 | Uptime of paid features | > 99.5% | 🟡 | Vercel + Firebase are reliable, but no monitoring/alerting configured. **Gap: uptime monitor + status contact** |

**Verdict: 🟡 Strong free-tier availability; offline mode is the missing piece before "every student" is true.**

## 2. Accessibility — "Can every student actually use it?"

| # | Criterion | Target | Status | Evidence / Gap |
|---|-----------|--------|--------|----------------|
| B1 | Mother-tongue learning | Full experience in each supported language | 🟢 | 13 languages (English + 12 Indian) — every question, choice, UI string and TTS audio verified present in all 13. Claim corrected from false "22" |
| B2 | Audio for pre-readers & low-vision | Every question read aloud | 🟢 | TTS in all 13 languages, repeat button, auto-play on question load |
| B3 | Screen-reader support | Core flow announceable | 🟢 | aria-live on prompt/feedback, hearts labelled ("N of 3 lives"), form labels, `document.lang` follows language switch |
| B4 | Keyboard-only play | Full session without mouse | 🟢 | All interactive elements are real `<button>`s; focus-visible outlines added; Escape closes modals |
| B5 | Motion sensitivity | Respect prefers-reduced-motion | 🟢 | Media query disables confetti/sparkles/animations |
| B6 | Early-childhood usability | Class 1 child can self-serve | 🟡 | Emoji visuals + audio help, but no full session in a single tap from home. **Gap: "continue" flow is good; consider a kid-mode with bigger targets** |
| B7 | Colour contrast | WCAG AA on text | 🟡 | Main text passes; some white-on-gradient chips are borderline. **Gap: run a full contrast sweep** |
| B8 | Account recovery | Self-service password reset, any email provider | 🟢 | "Forgot password?" → Firebase reset email (added 2 Jul 2026); email/password signup works without Gmail |
| B9 | Mobile-first install | Installable on Android/iOS without a store | 🟢 | PWA with real 192/512 icons + maskable variant; Android install prompt now fires; Play Store path documented (TWA) |
| B10 | Calm learning surface | Minimal distraction while answering | 🟢 | Focus mode: decorations hidden + background animation paused during questions; premium upsell limited to once/day after good sessions |

**Verdict: 🟢 Genuinely accessible for the core flows — rare for edtech at this stage.**

## 3. Adaptability — "Does it meet each student at their level?"

| # | Criterion | Target | Status | Evidence / Gap |
|---|-----------|--------|--------|----------------|
| C1 | Real-time difficulty adjustment | Difficulty moves within one session | 🟢 | Adaptive engine: accuracy + speed over last 5 attempts, per class+subject skill |
| C2 | Difficulty range | Enough headroom above/below grade | 🟡 | 10 difficulty levels exist for AI questions; seed bank is single-difficulty per question. **Gap: tag seed questions with difficulty** |
| C3 | Class coverage | All 12 classes, real content | 🟢 | 720 curated questions: 10 per class-subject including Class 1 (was 12 total, now 30) |
| C4 | Subject coverage | Matches what schools teach | 🟢 | 74 class-subject combinations incl. Tamil/Hindi language subjects and 13 senior-secondary subjects |
| C5 | Content correctness | Zero known wrong answers | 🟢 | Full 720-question audit (2 Jul 2026): 6 errors found and fixed; answer positions de-biased (was 85% B/C); render-time shuffle added |
| C6 | Fresh content for heavy users | Practice never feels stale | 🟡 | Premium AI generation solves this; free tier recycles 10 questions/subject. **Gap: grow seed bank toward 30/subject** |
| C7 | Board adaptation | State boards, international | 🔴 | Tabs exist; AI can generate board-specific (premium), but no curated state-board content. Site now labels this honestly. **Gap: Samacheer/SSC content** |

**Verdict: 🟡→🟢 The adaptive core is real; content depth is the growth axis.**

## 4. Affordability — "Can every family afford it — and trust it?"

| # | Criterion | Target | Status | Evidence / Gap |
|---|-----------|--------|--------|----------------|
| D1 | Free tier is genuinely useful | Complete practice, no ads, forever | 🟢 | All 720 questions + adaptive engine + progress tracking free; no ads |
| D2 | Premium price fits Indian wallets | ≤ one streaming subscription | 🟢 | ₹149/mo, ₹999/yr (≈ ₹83/mo, "Save 44%" is mathematically correct). Benchmarks: YouTube Premium ₹149, Netflix Mobile ₹149, Spotify ₹119 |
| D3 | No dark patterns | No auto-renew traps, honest copy | 🟢 | One-time payment, **no auto-renewal** (stated in modal + terms); was previously mislabelled "cancel anytime" |
| D4 | Sustainable "unlimited" promise | Never promise what we can't keep | 🟢 | All "unlimited" claims replaced. Premium = **50 fresh AI batches/day (~1,000 questions)**, server-enforced via Firestore transaction, defined in Terms §4. Cache-hits don't count, so real students never hit it |
| D5 | Refund policy | Clear, written, honoured | 🟢 | Terms §4: full refund if broken and unfixed within 7 days |
| D6 | Payment trust | Recognised processor, no card storage | 🟢 | Razorpay (UPI/cards/netbanking); privacy policy names it and states we never see credentials |
| D7 | Cost control on our side | AI spend bounded per user | 🟢 | KV batch cache (7 days, shared) + per-user daily cap = worst-case spend is calculable |

**Verdict: 🟢 The pricing is right and every promise is now one we can keep.**

---

## Truth ledger (claims we make → why they're true)

| Claim on site | Verified reality |
|---|---|
| "13 languages" | All 720 questions have identical 13-language coverage (en, hi, bn, te, mr, ta, gu, kn, ml, or, pa, ur, ne); switcher offers exactly these 13 |
| "700+ questions" | 720 curated questions on disk |
| "No registration needed" | Guest mode plays full sessions with zero account |
| "Fresh AI questions daily (fair use)" | 50 batches/day server-enforced; Terms define it |
| "One-time payment, no auto-renewal" | Razorpay orders, fixed expiry in Firestore, nothing recurs |
| "No ads" | No ad code anywhere in the repo |
| "CBSE/NCERT aligned" | Free bank follows NCERT topics; board tabs labelled honestly as premium-AI feature |

## Fix log — 2 July 2026 audit

Content: `3-math-003` (no choice equalled ½ — now 3/6), `7-math-001` (duplicate-value distractor 6:20), `8-math-003` (duplicate "26 cm²" choice), `3-english-004` (ambiguous punctuation option), `6-hindi-002` (Hindi swar count 12→11), `12-english-010` (tiger-reserve premise → Antarctica journey, matching the actual chapter). Answer-position bias 85% B/C → uniform, plus render-time shuffle.

Product: guest mode; fair-use quota (backend + terms); "22 languages"→13 everywhere incl. JSON-LD; "thousands"→"700+"; Razorpay added to privacy policy; premium terms written; deploy workflow now ships landing pages + og-image.png; manifest start_url fixed; landing-page links fixed for production; sitemap completed; OG image created; ARIA/focus/reduced-motion pass; © 2026.

## Next milestones (ranked by mission impact)

1. **Offline PWA** (A5) — service worker + pre-cached banks; transforms availability for rural India
2. **Seed bank depth** (C6) — 30 questions/class-subject so free-tier practice stays fresh for a week
3. **Answer explanations** — after a wrong answer, one sentence of "why" turns practice into teaching
4. **Difficulty-tagged seed content** (C2) — lets the adaptive engine work fully offline
5. **Uptime monitoring** (A6) — free tier of any uptime service + alert email
6. **State-board content** (C7) — start with Tamil Nadu Samacheer Class 10
7. **Contextual scaling** (the long-term vision) — questions localised to the student's state and district: word problems using local rivers, crops, festivals and city names. The content pipeline already supports it (per-curriculum AI generation + JSON banks keyed by class/subject — a `region` key extends it naturally). Sequence: state boards → state context in questions → district context
8. **Play Store listing** — wrap the PWA as a TWA once weekly actives justify the $25 fee (steps in DEPLOYMENT.md §6)
9. **Phone-OTP sign-in** — for parents without any email; Firebase supports it (SMS costs apply), removes the last sign-up barrier
