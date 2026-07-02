const API_BASE   = "https://educerelator-backend.vercel.app";
const CACHE_KEY  = "ecplay_premium";
const CACHE_TTL  = 60 * 60 * 1000; // re-check every hour

export function isPremiumCached() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return !!(c?.premium && c.expiresAt > Date.now() && c.checkedAt > Date.now() - CACHE_TTL);
  } catch { return false; }
}

export async function checkPremium(user) {
  if (!user) return false;
  try {
    const token = await user.getIdToken();
    const res   = await fetch(`${API_BASE}/api/check-premium`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, checkedAt: Date.now() }));
    return !!data.premium;
  } catch { return false; }
}

export function clearPremiumCache() {
  localStorage.removeItem(CACHE_KEY);
}

export async function openRazorpayCheckout(user, plan, onSuccess) {
  if (!window.Razorpay) {
    await loadRazorpayScript();
  }

  let orderData;
  try {
    const token = await user.getIdToken();
    const res   = await fetch(`${API_BASE}/api/create-order`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ plan }),
    });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).error || ""; } catch {}
      throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
    }
    orderData = await res.json();
  } catch (err) {
    console.error("create-order failed:", err);
    alert(`Could not start checkout (${err.message}). Please try again.`);
    return;
  }

  const options = {
    key:         orderData.keyId,
    amount:      orderData.amount,
    currency:    orderData.currency,
    order_id:    orderData.orderId,
    name:        "EC Play",
    description: plan === "yearly" ? "Premium — 1 Year" : "Premium — 1 Month",
    prefill:     { name: user.displayName || "", email: user.email || "" },
    theme:       { color: "#7c3aed" },
    handler: async (response) => {
      clearPremiumCache();
      // Instant activation: server verifies the payment signature and grants
      // premium immediately. The webhook remains as a backstop.
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/verify-payment`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          }),
        });
        if (res.ok) {
          const status = await res.json();
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...status, checkedAt: Date.now() }));
          onSuccess();
          return;
        }
        console.error("verify-payment returned", res.status);
      } catch (err) {
        console.error("verify-payment failed:", err);
      }
      // Fallback: wait for the webhook, then re-check
      await new Promise(r => setTimeout(r, 2500));
      const isNowPremium = await checkPremium(user);
      if (isNowPremium) onSuccess();
      else alert("Payment received — your account will upgrade within a minute. Please refresh.");
    },
  };

  new window.Razorpay(options).open();
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
