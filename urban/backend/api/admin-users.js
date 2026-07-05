import { auth, db } from "../lib/firebase-admin.js";

// Admin-only dashboard data. The Firestore rules stop any client from reading
// other users' docs, so this data can ONLY be assembled server-side with the
// Admin SDK — and only for an allowlisted admin. Set ADMIN_EMAILS (comma-
// separated) in the backend env; a caller whose verified token email isn't on
// that list gets 403.

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const DAY = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).end();

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    return res.status(503).json({ error: "Auth not configured on server" });
  }
  if (ADMIN_EMAILS.length === 0) {
    return res.status(503).json({ error: "Admin not configured — set ADMIN_EMAILS" });
  }

  let decoded;
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    decoded = await auth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!ADMIN_EMAILS.includes((decoded.email || "").toLowerCase())) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Firestore docs hold progress + premium; keyed by uid.
  const fsByUid = {};
  const snap = await db().collection("users").get();
  snap.forEach((doc) => { fsByUid[doc.id] = doc.data() || {}; });

  // Auth users include accounts that never got a Firestore doc (e.g. signups
  // from before the database existed). List all pages.
  const authUsers = [];
  let pageToken;
  do {
    const page = await auth().listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const now = Date.now();
  const users = authUsers.map((au) => {
    const fs = fsByUid[au.uid] || {};
    const skills = (fs.progress && fs.progress.skills) || {};
    let attempts = 0, correct = 0;
    const classes = new Set(), subjects = new Set();
    for (const [key, s] of Object.entries(skills)) {
      attempts += s.attempts || 0;
      correct  += s.correct  || 0;
      const [cls, subj] = String(key).split(":");
      if (cls)  classes.add(cls);
      if (subj) subjects.add(subj);
    }
    const lastActive = fs.lastActive && typeof fs.lastActive.toMillis === "function"
      ? fs.lastActive.toMillis() : null;
    return {
      uid:          au.uid,
      name:         au.displayName || fs.name || "",
      email:        au.email || fs.email || "",
      provider:     (au.providerData[0] && au.providerData[0].providerId) || "password",
      createdAt:    au.metadata.creationTime || null,
      lastSignIn:   au.metadata.lastSignInTime || null,
      lastActive,
      premium:      !!(fs.premium && fs.premiumExpiry > now),
      premiumExpiry: fs.premiumExpiry || null,
      totalAnswered: attempts,
      accuracy:     attempts ? Math.round((correct / attempts) * 100) : null,
      classes:      [...classes].sort(),
      subjects:     [...subjects].sort(),
      hasProgress:  attempts > 0,
    };
  });

  users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const active7 = (t) => t && (now - new Date(t).getTime()) < 7 * DAY;
  const summary = {
    totalUsers:     users.length,
    withProgress:   users.filter((u) => u.hasProgress).length,
    premiumUsers:   users.filter((u) => u.premium).length,
    totalQuestions: users.reduce((a, u) => a + u.totalAnswered, 0),
    newLast7Days:   users.filter((u) => active7(u.createdAt)).length,
    activeLast7Days: users.filter((u) => active7(u.lastSignIn)).length,
  };

  res.status(200).json({ summary, users, generatedAt: now });
}
