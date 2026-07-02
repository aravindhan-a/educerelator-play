import crypto from "crypto";
import { db } from "../lib/firebase-admin.js";

function rawBodyString(req) {
  // Vercel may give us a string, Buffer, or already-parsed object
  if (typeof req.body === "string")       return req.body;
  if (Buffer.isBuffer(req.body))          return req.body.toString("utf8");
  if (typeof req.body === "object")       return JSON.stringify(req.body);
  return String(req.body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const sig    = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const body   = rawBodyString(req);

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (sig !== expected) return res.status(400).json({ error: "Invalid signature" });

  const event = req.body;
  if (event.event !== "payment.captured") return res.status(200).json({ ok: true });

  const { uid, plan } = event.payload.payment.entity.notes || {};
  if (!uid || !plan) return res.status(200).json({ ok: true });

  const daysMap = { monthly: 30, yearly: 365 };
  const days    = daysMap[plan] || 30;
  const expiry  = Date.now() + days * 24 * 60 * 60 * 1000;

  await db().collection("users").doc(uid).set({
    premium:       true,
    premiumPlan:   plan,
    premiumExpiry: expiry,
    updatedAt:     Date.now(),
  }, { merge: true });

  res.status(200).json({ ok: true });
}
