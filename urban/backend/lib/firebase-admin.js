import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function ensureApp() {
  if (getApps().length > 0) return;
  initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}

export function db() { ensureApp(); return getFirestore(); }
export function auth() { ensureApp(); return getAuth(); }

export async function verifyAndGetUid(authHeader) {
  const token = authHeader?.replace("Bearer ", "");
  if (!token) throw Object.assign(new Error("No token"), { status: 401 });
  const decoded = await auth().verifyIdToken(token);
  return decoded.uid;
}

export async function isPremiumUser(uid) {
  const doc = await db().collection("users").doc(uid).get();
  const data = doc.data() || {};
  return !!(data.premium && data.premiumExpiry > Date.now());
}

export async function getPremiumStatus(uid) {
  const doc = await db().collection("users").doc(uid).get();
  const data = doc.data() || {};
  const active = !!(data.premium && data.premiumExpiry > Date.now());
  return { premium: active, expiresAt: active ? data.premiumExpiry : null };
}

const PLAN_DAYS = { monthly: 30, yearly: 365 };

// Grants or extends premium. Renewals extend from the current expiry rather
// than overwriting it, so paying early never costs the user remaining days.
// Recording the payment id makes the grant idempotent across webhook retries
// and the verify-payment fallback both firing for the same payment.
export async function grantPremium(uid, plan, paymentId) {
  const days = PLAN_DAYS[plan] || 30;
  const ref = db().collection("users").doc(uid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    if (paymentId && data.lastPaymentId === paymentId) {
      return { premium: true, expiresAt: data.premiumExpiry };
    }
    const base = Math.max(Date.now(), data.premiumExpiry || 0);
    const expiry = base + days * 24 * 60 * 60 * 1000;
    tx.set(ref, {
      premium:       true,
      premiumPlan:   plan,
      premiumExpiry: expiry,
      lastPaymentId: paymentId || null,
      updatedAt:     Date.now(),
    }, { merge: true });
    return { premium: true, expiresAt: expiry };
  });
}

// Fair-use guard: caps how many *fresh* AI generations a premium user can
// trigger per day. Cached batches don't count (they cost nothing), so a normal
// student never hits this — it only bounds abuse and our Anthropic spend.
// Uses a Firestore transaction so concurrent requests can't overshoot the cap.
export async function checkAndIncrementAiUsage(uid, limit) {
  const today = new Date().toISOString().slice(0, 10); // UTC day
  const ref = db().collection("users").doc(uid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const u = (snap.data() || {}).aiUsage || {};
    const count = u.date === today ? (u.count || 0) : 0;
    if (count >= limit) {
      return { allowed: false, used: count, limit };
    }
    tx.set(ref, { aiUsage: { date: today, count: count + 1 } }, { merge: true });
    return { allowed: true, used: count + 1, limit };
  });
}
