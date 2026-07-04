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
  ├─ /api/check-premium        premium status for the frontend cache
  └─ /api/detect-region        maps the caller's IP → Indian state (Vercel geo
                               headers) so questions are locally contextual; no
                               prompt, no stored IP, falls back to all-India

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

## 6. Android app (BUILT 3 Jul 2026 — ready for Play Store)

The app is a Trusted Web Activity: the production site runs inside it, so every
content update ships instantly with no app-store review. Project lives in
`android-app/`; artifacts are built and signed:

- **`android-app/app-release-signed.apk`** — install directly on any Android phone
  (send via WhatsApp/USB, enable "install from unknown sources")
- **`android-app/app-release-bundle.aab`** — upload this one to Play Store
- Package id: `com.educerelator.ecplay` (permanent — never change)
- `https://educerelator.com/.well-known/assetlinks.json` links site↔app so the app
  runs fullscreen without a browser bar (shipped via the deploy workflow)

⚠️ **`android-app/android.keystore` + `android-app/SIGNING-KEYS.txt` are the app's
permanent identity.** Both are gitignored. Back them up NOW (password manager +
offline copy). Lost keystore = you can never update the app on Play Store.

### Uploading to Google Play (one-time, ~1 hour + review wait)

1. **Developer account**: [play.google.com/console](https://play.google.com/console/signup)
   → personal account, one-time **$25** fee, identity verification (1–2 days).
2. **Create app**: *All apps → Create app* — name "EC Play — Learning Games",
   default language English (India), App (not game… or Education game — either is
   fine), Free.
3. **Store listing**: short + full description (honest claims: 700+ questions,
   13 languages, Class 1–12, free); screenshots (phone: take 4–6 from the app);
   app icon 512×512 (`urban/frontend/icon-512.png`); feature graphic 1024×500
   (crop `og-image.png`).
4. **App content declarations** (Policy → App content): privacy policy URL
   `https://educerelator.com/privacy.html`; ads: NO; target audience: select the
   child age brackets → this enters **Designed for Families** review (stricter,
   but unlocks kids-category discoverability; our no-ads/no-tracking posture is
   exactly what it wants); data safety form: account data (name/email) collected,
   not sold, deletable on request.
5. **Upload**: *Production → Create new release* → upload
   `app-release-bundle.aab` → let Google manage the signing key when prompted
   (Play App Signing) → release notes → *Review and roll out*.
6. **Review**: typically 1–7 days (longer for family programs). Fix-and-resubmit
   is normal; nothing is lost.

### Updating the app later

Only needed if the icon/name/package changes or Chrome requires a new TWA
version — the CONTENT always updates through the website automatically.

```bash
cd android-app
# bump appVersionCode (+1) and appVersionName in twa-manifest.json, then:
npx @bubblewrap/cli update --skipVersionUpgrade
PW=$(grep storepass SIGNING-KEYS.txt | awk '{print $2}')
BUBBLEWRAP_KEYSTORE_PASSWORD="$PW" BUBBLEWRAP_KEY_PASSWORD="$PW" \
  npx @bubblewrap/cli build --skipPwaValidation
```

iOS later: thin Capacitor wrapper + $99/yr — defer until Android traction
justifies it (Android is ~95% of the Indian student market).

## 7. Pre-launch checklist

- [ ] Backend redeployed with all six env vars (test keys)
- [ ] Test-mode purchase → instant activation verified
- [ ] Webhook shows 200 in Razorpay dashboard (*Webhooks → recent deliveries*)
- [ ] Vercel KV attached (protects Anthropic spend)
- [ ] KYC approved → live keys swapped in → one real purchase + refund tested
- [ ] **Firestore rules deployed** — paste [`firestore.rules`](firestore.rules) into Firebase console → Firestore → Rules → Publish. Without this, anyone can grant themselves premium from the browser console (the client can write its own user doc; the rules restrict it to name/email/lastActive/progress only)
