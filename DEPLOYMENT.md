# EC Play — Deployment & Payments Runbook

How the product ships, and how to take payments live. Follow top to bottom the first time; afterwards only the "Go live" and "Troubleshooting" sections matter.

## Architecture

```
educerelator.com (GitHub Pages, auto-deploys on push to main)
  └─ static frontend + 720-question bank (free tier works with no backend)

educerelator-backend.vercel.app (Vercel serverless, deploy manually)
  ├─ /api/generate-questions   premium AI questions (Claude), 50 batches/day/user
  ├─ /api/create-order         creates Razorpay order (₹149 monthly / ₹999 yearly)
  ├─ /api/verify-payment       instant premium activation after checkout
  ├─ /api/payment-webhook      backstop activation if the tab closed mid-payment
  └─ /api/check-premium        premium status for the frontend cache

Firebase: Auth (Google + email) · Firestore users/{uid} holds
  { premium, premiumPlan, premiumExpiry, lastPaymentId, aiUsage }
```

Payment flow: `create-order` (server, amount fixed server-side) → Razorpay Checkout (their JS, card/UPI/netbanking — we never touch credentials) → `verify-payment` (server verifies HMAC signature + order ownership → grants premium instantly) → webhook as backstop. Grants are idempotent (`lastPaymentId`) and renewals extend the existing expiry.

## 1. One-time Razorpay setup

1. Create an account at [dashboard.razorpay.com](https://dashboard.razorpay.com). You can build and test immediately in **Test Mode**; real payments need KYC (PAN, bank account; ~1–3 days to activate).
2. **Test keys:** Dashboard → toggle *Test Mode* ON → *Settings → API Keys → Generate Test Key*. Copy the Key ID (`rzp_test_…`) and Key Secret (shown once).
3. **Webhook (test mode):** *Settings → Webhooks → Add New Webhook*
   - URL: `https://educerelator-backend.vercel.app/api/payment-webhook`
   - Secret: generate a strong random string (e.g. `openssl rand -hex 32`) — this is the *webhook* secret, separate from the API secret
   - Active events: `payment.captured`
4. While KYC is pending, complete the *Website Details* section — Razorpay checks for pricing, terms, privacy, refund policy and contact info. All exist: `/terms.html` (§4 has pricing + refunds), `/privacy.html`, footer contact email.

## 2. Vercel environment variables

Vercel dashboard → the backend project → *Settings → Environment Variables* → scope **Production** (names must match exactly):

| Variable | Value |
|---|---|
| `RAZORPAY_KEY_ID` | `rzp_test_…` (later `rzp_live_…`) |
| `RAZORPAY_KEY_SECRET` | the API key secret |
| `RAZORPAY_WEBHOOK_SECRET` | the webhook secret from step 1.3 |
| `FIREBASE_SERVICE_ACCOUNT` | full JSON of the service account file, pasted as-is (Firebase console → *Project settings → Service accounts → Generate new private key*) |
| `ANTHROPIC_API_KEY` | for AI question generation |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | optional — Vercel KV (Upstash) for the shared question cache; without it every premium request hits Claude, so set it before launch |

Then redeploy the backend (env changes do NOT apply to old deployments):

```bash
cd urban/backend && npx vercel --prod
```

## 3. Verify in test mode (10 minutes)

1. Open educerelator.com → sign in (real account) → session complete → *Upgrade*.
2. Pick a plan → Pay. In the Razorpay test window use card `4111 1111 1111 1111`, any future expiry, any CVV — or UPI id `success@razorpay`.
3. **Expected:** "Welcome to EC Play Premium! 🎉" alert immediately (instant path). Firestore → `users/{uid}` shows `premium: true` and a future `premiumExpiry`.
4. Check Vercel → *Logs*: `create-order` 200, `verify-payment` 200, `payment-webhook` 200 (webhook may arrive a few seconds later — both paths granting is fine, it's idempotent).
5. Play a session → AI questions should now come from the backend (Network tab: `generate-questions` 200 instead of local fallback).
6. Failure drill: pay with test card `4000 0000 0000 0002` (declined) → user stays free, no grant.

## 4. Go live

1. KYC approved → switch dashboard to *Live Mode* → *Settings → API Keys → Generate Live Key*.
2. Create a **second webhook in Live Mode** (same URL, new secret — test and live webhooks are separate).
3. In Vercel, replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` with the live values → `npx vercel --prod`.
4. Make one real ₹149 purchase yourself, confirm premium activates, then refund it from the Razorpay dashboard (*Payments → Refund*) — this exercises the whole loop including your refund promise.
5. Settlements arrive in your bank T+2/T+3 by default. Fees: ~2% + GST per transaction (UPI can be lower) — at ₹149 you net roughly ₹145.

## 5. Troubleshooting checkout

The error alert shows the HTTP status — map it here:

| Status | Meaning | Fix |
|---|---|---|
| `503: Auth not configured on server` | `FIREBASE_SERVICE_ACCOUNT` missing/unset | Add env var, redeploy |
| `503: Payment not configured` | Razorpay key env vars missing | Add both, redeploy |
| `401` | Firebase token rejected — usually a malformed service-account JSON (`JSON.parse` fails server-side) | Re-paste the JSON exactly; check Vercel function logs |
| `502: Could not create order` | Razorpay rejected the API call — wrong/revoked keys, or test key against live dashboard | Regenerate keys; check logs for Razorpay's message |
| Popup opens but payment fails | Normal payment declines | Nothing to fix server-side |
| Paid but not premium | `verify-payment` and webhook both failed | Vercel logs → `grantPremium failed`; webhook misconfigured secret shows `Invalid signature` |

## 6. Mobile app path (Play Store)

EC Play is an installable PWA today: Android Chrome shows an "Install app" prompt (real icons + manifest shipped 2 Jul 2026); iOS installs via Share → *Add to Home Screen*. Both launch full-screen with the owl icon.

To ship a real **Play Store listing** without rewriting anything, wrap the PWA as a Trusted Web Activity — the same production URL runs inside the app (this is the standard route; the app IS the website, so every content update ships instantly with no app-store review):

1. `npm i -g @bubblewrap/cli && bubblewrap init --manifest https://educerelator.com/manifest.json`
2. It generates an Android project + signing key → `bubblewrap build` → `app-release-bundle.aab`
3. Host the digital asset link it prints at `https://educerelator.com/.well-known/assetlinks.json` (add to the deploy workflow) — this removes the browser bar inside the app
4. Google Play Console: one-time $25 developer fee → create app → upload the `.aab` → declare the *Designed for Families* / Teacher-approved program if targeting under-13s (stricter review, worth it for discoverability)
5. Each store update is only needed when the icon/name changes — content updates flow through the website

iOS App Store later requires a thin WebView wrapper (Capacitor) + $99/yr — defer until Android traction justifies it. Android is ~95% of the Indian student market.

## 7. Pre-launch checklist

- [ ] Backend redeployed with all six env vars (test keys)
- [ ] Test-mode purchase → instant activation verified
- [ ] Webhook shows 200 in Razorpay dashboard (*Webhooks → recent deliveries*)
- [ ] Vercel KV attached (protects Anthropic spend)
- [ ] KYC approved → live keys swapped in → one real purchase + refund tested
- [ ] **Firestore rules deployed** — paste [`firestore.rules`](firestore.rules) into Firebase console → Firestore → Rules → Publish. Without this, anyone can grant themselves premium from the browser console (the client can write its own user doc; the rules restrict it to name/email/lastActive/progress only)
