import crypto from "crypto";
import Razorpay from "razorpay";
import { verifyAndGetUid, grantPremium } from "../lib/firebase-admin.js";

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Called by the frontend right after Razorpay checkout succeeds.
// Verifies the payment signature per Razorpay's docs, confirms the order
// belongs to the authenticated user, then activates premium immediately.
// The webhook remains as a backstop for payments where the tab closed first.
export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT env var");
    return res.status(503).json({ error: "Auth not configured on server" });
  }
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars");
    return res.status(503).json({ error: "Payment not configured" });
  }

  let uid;
  try { uid = await verifyAndGetUid(req.headers.authorization); }
  catch { return res.status(401).json({ error: "Unauthorized" }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing payment fields" });
  }

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (!safeEqual(expected, razorpay_signature)) {
    return res.status(400).json({ error: "Invalid payment signature" });
  }

  // Confirm the order is ours and belongs to this user before granting.
  let order;
  try {
    const rzp = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    order = await rzp.orders.fetch(razorpay_order_id);
  } catch (err) {
    console.error("Order fetch failed:", err.message || err);
    return res.status(502).json({ error: "Could not confirm order" });
  }

  const { uid: orderUid, plan } = order.notes || {};
  if (orderUid !== uid) {
    return res.status(403).json({ error: "Order does not belong to this account" });
  }

  try {
    const status = await grantPremium(uid, plan, razorpay_payment_id);
    return res.status(200).json(status);
  } catch (err) {
    console.error("grantPremium failed:", err);
    return res.status(500).json({ error: "Could not activate premium" });
  }
}
