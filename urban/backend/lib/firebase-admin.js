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
