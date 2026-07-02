import Razorpay from "razorpay";
import { verifyAndGetUid } from "../lib/firebase-admin.js";

const PLANS = {
  monthly: { amount: 14900, label: "EC Play Premium — 1 Month" },
  yearly:  { amount: 99900, label: "EC Play Premium — 1 Year"  },
};

function cors(req, res) {
  const allowed = new Set(["https://educerelator.com", "https://www.educerelator.com"]);
  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).end();

  let uid;
  try { uid = await verifyAndGetUid(req.headers.authorization); }
  catch { return res.status(401).json({ error: "Unauthorized" }); }

  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ error: "Invalid plan" });

  const rzp = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  const order = await rzp.orders.create({
    amount:   PLANS[plan].amount,
    currency: "INR",
    receipt:  `${uid.slice(0, 8)}-${plan}-${Date.now()}`,
    notes:    { uid, plan },
  });

  res.status(200).json({
    orderId:  order.id,
    amount:   order.amount,
    currency: order.currency,
    keyId:    process.env.RAZORPAY_KEY_ID,
    plan,
  });
}
