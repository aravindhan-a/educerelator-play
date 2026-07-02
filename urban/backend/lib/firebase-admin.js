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
