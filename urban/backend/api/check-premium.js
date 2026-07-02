import { verifyAndGetUid, getPremiumStatus } from "../lib/firebase-admin.js";

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).end();

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT env var");
    return res.status(503).json({ error: "Auth not configured on server" });
  }

  let uid;
  try { uid = await verifyAndGetUid(req.headers.authorization); }
  catch { return res.status(401).json({ error: "Unauthorized" }); }

  const { premium, expiresAt } = await getPremiumStatus(uid);
  res.status(200).json({ premium, expiresAt, checkedAt: Date.now() });
}
