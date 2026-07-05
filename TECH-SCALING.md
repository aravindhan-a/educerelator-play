# EC Play — Technical Scaling & Hardening Plan

Getting ready to serve many users, reliably. This is grounded in the *current*
architecture and its real gaps — not a generic checklist. Priorities are ordered
by (impact ÷ effort), with the cheap high-impact hardening first.

---

## Where we are today (honest baseline)

```
Frontend   static HTML/CSS/JS on GitHub Pages (global CDN)      — scales ~infinitely, cheap
Backend    Vercel serverless (Node ESM), ~8 endpoints           — auto-scales; watch cold starts + abuse
Data       Firebase Auth + Firestore (asia-south1 / Mumbai)     — single region, India-optimal
Content    static JSON question bank + Claude AI (premium)      — CDN-cached; generators exist
Payments   Razorpay (test mode today)                           — one-time, idempotent grants
Cache      Vercel KV (Upstash) for AI batches                   — protects Anthropic spend
App        Android TWA wrapping the site                        — content updates via the web
```

**What already scales well:** the free experience is client-side (adaptive engine
+ CDN-served content), so 1 user or 1,000,000 users cost about the same. Keep it
that way. The backend is only touched for things that need secrets or trust (AI,
payments, admin) — the right boundary.

**The load-bearing weaknesses** (details below): no abuse/rate protection in
front of the API, no error/uptime visibility, the admin dashboard scans *every*
user on each load, no automated test gate before deploy, no offline/service
worker, and — for a global *children's* app — no formalized privacy-compliance
workstream.

---

## Phase 0 — Harden now (days, cheap, high impact)

1. **Put Cloudflare in front of the domain** (free tier). Instant global caching,
   WAF, bot protection, DDoS absorption, and per-IP rate limiting for the API —
   the single biggest resilience upgrade for the least effort.
2. **Firebase App Check** (reCAPTCHA/Play Integrity). Attests that API calls come
   from *our* app, not a script hammering `create-order` / `generate-questions`.
   Protects spend and data.
3. **Error tracking — Sentry** (frontend + Vercel functions). Right now a
   production error is invisible. This is the difference between "a user emailed"
   and "we caught it in 5 minutes."
4. **Uptime + budget alerts.** UptimeRobot/Better Uptime on the site + `/api`
   health; billing alerts on Firebase, Vercel, Anthropic, Razorpay so cost can't
   surprise us.
5. **Firestore Point-in-Time Recovery + scheduled exports to GCS.** One toggle +
   a scheduled export. Cheap insurance against a bad write or deletion.
6. **CI gate before deploy.** A GitHub Action that runs the JSON content
   validators, `node --check` on all JS, and the streak/content tests on every
   push — block deploys that would ship broken content or code. The scripts
   already exist; wire them into CI.

## Phase 1 — Scale foundations (this month)

7. **Fix the admin dashboard's O(users) scan.** `/api/admin-users` currently
   lists *all* Auth users and reads the *whole* `users` collection on every load
   — fine at hundreds, slow and costly at tens of thousands. Move to:
   - a single `stats/summary` doc updated incrementally (Cloud Function on user
     write, or `FieldValue.increment`) for the summary cards, and
   - a **paginated / queried** user table (Firestore cursors, server-side search),
     not "fetch everyone."
8. **Service worker (PWA offline).** Cache the app shell + question banks
   (cache-first) and use network-first for `/api`. Big wins for India's spotty
   connectivity, faster repeat loads, and a more robust TWA. Must include a
   versioned cache + update flow (we've already been bitten by stale caches).
9. **Rate-limit every public endpoint** (via Cloudflare or Vercel edge). The AI
   endpoint has a per-user fair-use cap; the others have none.
10. **Staging environment.** A second Firebase project + Vercel preview + a
    staging subdomain, so schema/rules/payment changes are tested before prod.
    (We just learned the cost of "prod is the only environment.")
11. **Content pipeline maturity.** Keep growing the bank via the generators
    (math drills done; extend to 9–12 and, with the key, prose subjects). If the
    repo/deploy gets heavy, move large content to object storage (R2/S3) behind
    the CDN and lazy-load by class/subject. Version content so clients cache-bust
    cleanly.

## Phase 2 — Global readiness (this quarter)

12. **Compliance workstream (legal + technical).** A children's app going global
    triggers **India DPDP Act 2023**, **COPPA** (US, under-13), and **GDPR-K**
    (EU, under-16). Needs, with counsel: age gating, *verifiable parental
    consent* flows, data export & deletion (DSAR) endpoints, and region-aware
    privacy notices. Our data-minimization posture is a strong head start — but
    this is real work, not a checkbox.
13. **Analytics pipeline.** Replace "scan users to count things" with a proper
    stream: Firestore → BigQuery export (or a privacy-respecting product-analytics
    tool) for cohort/retention/funnel analysis without touching the hot path.
14. **Data-residency & latency strategy.** Firestore is Mumbai-only (a
    create-time choice). For a genuinely global audience, evaluate edge caching of
    read-heavy data and/or a migration — but stay India-first until non-India
    traffic justifies the cost.
15. **Load testing** (k6/Artillery) against the backend + a Firestore soak test,
    so we know the ceiling *before* a launch spike finds it for us.

---

## Architecture principles to hold as we grow

- **Free tier stays client-side + CDN.** It's what makes "the world" affordable.
- **Backend only for secrets/trust** (AI, payments, admin). Never move
  free-content logic server-side.
- **Cache everything cacheable at the edge.** Content is immutable per version.
- **Data minimization is a feature** — legally (kids) and for trust. Collect the
  minimum that serves the student + light educational context, nothing more.
- **Every deploy passes CI; every risky change goes through staging first.**

## Suggested first five (if we do nothing else this week)
Cloudflare · App Check · Sentry · Firestore PITR+exports · CI validation gate.
These remove the scariest "we're blind / we're exposed / we lost data" risks for
a few hours of setup.
