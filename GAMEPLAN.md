# EC Play — Game Plan: from live product to platform

The strategy in one line: **prove students come back, deepen the contextual moat, then distribute through teachers and the Play Store — and only then go global.**

What kills edtech is known: students try it once and never return (retention cliff), content costs grow faster than revenue, and paid acquisition eats margins. EC Play's counter-position: zero marginal cost per student, a mother-tongue + local-context moat nobody big is building (metro edtech is English/Hindi first), and a founder with Teach for India roots — teacher networks are the unfair distribution advantage.

Each phase has a **gate**: numbers that must be true before spending energy on the next phase. Scaling something that doesn't retain just burns the audience faster.

---

## Phase 0 — See clearly (now → 2 weeks)

You cannot scale what you cannot measure. Today the product has zero visibility into real usage.

1. **Privacy-respecting analytics** — a self-hostable/free tier tool (Plausible, Umami, or PostHog free). Events: session started, session completed, D1/D7 return, share-card taps, install prompt accepted, upgrade clicks. No personal data of children; aggregate only (keep the privacy policy true).
2. **Error tracking** — Sentry free tier on frontend + backend. Right now a crash in production is invisible.
3. **Uptime monitor** — UptimeRobot free on educerelator.com + the backend endpoints.
4. **Razorpay live** — finish KYC, swap keys, one real ₹149 purchase + refund (runbook: DEPLOYMENT.md §4).
5. **Baseline week** — do nothing else for a few days; learn what D1/D7 actually are.

**Gate to Phase 1:** you can answer "how many students played yesterday, and how many came back from last week?" with a number.

## Phase 1 — The retention engine (months 1–3)

Duolingo's growth is not marketing; it is that people come back tomorrow. Everything here serves tomorrow's return visit.

1. **Content depth via the factory.** 10 questions/subject cannot retain a daily player. Run `generate-regional-content.mjs` weekly; review drafts (recruit 1–2 native-speaker reviewers per language — teacher friends, ₹ per pack). Targets: 30+ questions per class-subject generally; deep packs for the top-5 states by user count.
2. **Offline PWA** (rubric A5) — service worker + pre-cached banks. For rural India this converts "app that needs internet" into "app that always works." Biggest availability unlock left.
3. **The return trigger.** Streaks exist but nothing calls the student back. Installed-PWA notifications are unreliable on iOS and mixed on Android — the honest path is the **Play Store app (TWA)** in Phase 2 giving real notifications. Interim: streak-at-risk messaging inside the app ("play today to keep your 6-day streak") and a parent-facing weekly summary email (opt-in).
4. **Answer explanations** — one sentence of "why" after a wrong answer turns practice into teaching. This is also a premium differentiator the AI can generate cheaply.
5. **Fill the region map** — all 36 regions with at least one reviewed pack. The map itself becomes marketing ("does it know MY state?").

**Gate to Phase 2:** D7 retention ≥ 15–20% and ≥ 3 sessions/returning user/week, sustained for a month.

## Phase 2 — Distribution without a marketing budget (months 3–6)

1. **Play Store listing** (TWA, runbook DEPLOYMENT.md §6) + apply to Google Play's **Teacher Approved** program — kids-category discoverability is organic and compounding. This also unlocks real push notifications for streaks.
2. **Teachers as the channel.** One convinced teacher = 30–40 students, recurring. Build the minimum classroom kit: a teacher shares a class code / printable poster; students play; teacher sees nothing private, just "my class played X sessions this week." Founder-led: your Teach for India network is the seed — 20 classrooms as pilots, testimonials, then a referral loop (teacher invites teacher).
3. **Share loop v2** — per-language card text (a Tamil card in Tamil), achievement badges, and challenge links (card + URL that opens the same class/subject: "beat my score"). Measure K-factor from analytics.
4. **SEO compounding** — one landing page per state ("Tamil Nadu Class 10 practice in Tamil") generated from the region data you already have; each is unique, honest content targeting searches nobody else serves.
5. **WhatsApp-first everything** — India's distribution is WhatsApp. Share cards already target it; add a "send to a friend" moment after milestone streaks.

**Gate to Phase 3:** 10,000 weekly active students, organic growth week over week, teacher pilots retaining.

## Phase 3 — Revenue and a real organization (months 6–12)

1. **B2C premium** stays simple (₹149/₹999, fair-use, no auto-renew) — optimize the moment of offer, never the pressure.
2. **B2B schools** is likely the real Indian revenue line: affordable private schools pay per-classroom (₹3–5k/class/year) for the teacher dashboard + reports. Pilot with Phase 2 schools.
3. **First hires/contractors:** language content reviewers (per-pack rate), then a teacher-success person. Engineering can stay tiny — the architecture is cheap to run.
4. **Governance hygiene for scale:** DPDP-compliant parental consent flow, data deletion self-service, terms/privacy legal review, a proper entity if not already.
5. **Partnerships:** state education departments and NGOs (Pratham, Akshara) — the contextual thesis is exactly their language. Also explore DIKSHA/NCERT alignment listings.

**Gate to Phase 4:** revenue covers infra + content review costs (default-alive), 50k+ WAU.

## Phase 4 — The world (12+ months)

The thesis travels: **every country has students who learn better in their own language with their own context.** The region architecture generalizes — `content/regions/` becomes countries/regions, the factory takes any curriculum.

1. **Pick beachheads where the moat matters:** multilingual, mobile-first, underserved — Indonesia (Bahasa + regional), Nigeria (English + Hausa/Yoruba/Igbo), Bangladesh (Bengali content already exists!), Nepal (Nepali already exists!). Note: Bangla and Nepali packs are literally already in the bank — those two markets are near-free to test.
2. **Curriculum packs per country** (their boards, their contexts) using the same factory + local reviewer model.
3. **Global pricing** — per-country PPP pricing; the fair-use premium model translates directly.
4. **Keep the truth discipline** — every country claim verified, every language claim real. It's the brand.

---

## Metrics that matter (in order)

1. **D7 retention** — the only number that predicts a platform
2. Sessions per returning user per week (target ≥ 3)
3. WAU growth rate (organic)
4. K-factor (invites accepted / user) from share cards
5. Teacher pilots retained month over month
6. Only then: revenue

## What NOT to do

- Don't add feature breadth before D7 is healthy — depth of the loop beats surface area.
- Don't buy ads — with a free product, paid CAC is a treadmill; the moats here are content + teachers + shares.
- Don't promise what isn't true (the audit rule) — trust is the compounding asset.
- Don't chase iOS early — Android is the Indian student market.
- Don't build a native app from scratch — the PWA + TWA path keeps one codebase.
