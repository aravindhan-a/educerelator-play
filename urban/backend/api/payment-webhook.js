import crypto from "crypto";
import { grantPremium } from "../lib/firebase-admin.js";

function rawBodyString(req) {
  // Vercel may give us a string, Buffer, or already-parsed object
  if (typeof req.body === "string")       return req.body;
  if (Buffer.isBuffer(req.body))          return req.body.toString("utf8");
  if (typeof req.body === "object")       return JSON.stringify(req.body);
  return String(req.body);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Backstop for verify-payment: grants premium even if the user closed the
// tab before the checkout handler ran. Idempotent via lastPaymentId.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing RAZORPAY_WEBHOOK_SECRET env var");
    return res.status(503).json({ error: "Webhook not configured" });
  }

  const sig  = req.headers["x-razorpay-signature"];
  const body = rawBodyString(req);
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (!sig || !safeEqual(sig, expected)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = typeof req.body === "object" ? req.body : JSON.parse(body);
  if (event.event !== "payment.captured") return res.status(200).json({ ok: true });

  const payment = event.payload?.payment?.entity || {};
  const { uid, plan } = payment.notes || {};
  if (!uid || !plan) return res.status(200).json({ ok: true });

  try {
    await grantPremium(uid, plan, payment.id);
  } catch (err) {
    // Non-200 makes Razorpay retry the webhook, which is what we want here.
    console.error("webhook grantPremium failed:", err);
    return res.status(500).json({ error: "Grant failed" });
  }

  res.status(200).json({ ok: true });
}
