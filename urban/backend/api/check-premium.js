import { verifyAndGetUid, isPremiumUser } from "../lib/firebase-admin.js";

function cors(req, res) {
  const allowed = new Set(["https://educerelator.com", "https://www.educerelator.com"]);
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).end();

  let uid;
  try { uid = await verifyAndGetUid(req.headers.authorization); }
  catch { return res.status(401).json({ error: "Unauthorized" }); }

  const premium = await isPremiumUser(uid);
  res.status(200).json({ premium, checkedAt: Date.now() });
}
