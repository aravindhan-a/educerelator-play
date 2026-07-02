// Branded share cards — the growth loop. Rendered on a canvas, shared as an
// image through the native share sheet (WhatsApp status / Instagram stories),
// with download + WhatsApp-text fallback on desktop.
//
// Child safety: cards show results only — never the student's name or email.

const W = 1080, H = 1080;
const SITE = "https://educerelator.com";

function baseCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // brand gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#7c3aed");
  g.addColorStop(1, "#ff5e7e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft decorative circles
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath(); ctx.arc(W - 80, 120, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(60, H - 140, 220, 0, Math.PI * 2); ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  return { canvas, ctx };
}

function font(ctx, weight, size) {
  ctx.font = `${weight} ${size}px 'Baloo 2', 'Segoe UI', system-ui, sans-serif`;
}

function header(ctx) {
  font(ctx, 800, 64);
  ctx.fillText("🦉 EC Play", W / 2, 110);
}

function footer(ctx) {
  font(ctx, 700, 34);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Play free · educerelator.com", W / 2, H - 76);
  font(ctx, 600, 26);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Class 1–12 · 13 languages · No ads", W / 2, H - 36);
}

function chip(ctx, text, cx, cy) {
  font(ctx, 700, 34);
  const w = ctx.measureText(text).width + 56;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  roundRect(ctx, cx - w / 2, cy - 34, w, 68, 34);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, cx, cy + 12);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawSessionCard({ score, correct, total, stars, badgeLabel, streak, accuracy, newRecord }) {
  await document.fonts.ready;
  const { canvas, ctx } = baseCanvas();
  header(ctx);

  // stars
  font(ctx, 700, 110);
  const starStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  ctx.fillText(starStr, W / 2, 320);

  // score
  font(ctx, 800, 190);
  ctx.fillText(score.toLocaleString(), W / 2, 530);
  font(ctx, 700, 44);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("POINTS", W / 2, 590);

  ctx.fillStyle = "#fff";
  font(ctx, 700, 46);
  ctx.fillText(`${correct}/${total} correct · ${badgeLabel}`, W / 2, 690);

  if (newRecord) {
    font(ctx, 800, 44);
    ctx.fillStyle = "#ffd76b";
    ctx.fillText("🏆 NEW HIGH SCORE!", W / 2, 760);
    ctx.fillStyle = "#fff";
  }

  const chipY = newRecord ? 850 : 800;
  chip(ctx, `🔥 ${streak}-day streak`, W / 2 - 180, chipY);
  chip(ctx, `🎯 ${accuracy}% accuracy`, W / 2 + 190, chipY);

  footer(ctx);
  return canvas;
}

export async function drawStreakCard({ streak }) {
  await document.fonts.ready;
  const { canvas, ctx } = baseCanvas();
  header(ctx);

  font(ctx, 700, 200);
  ctx.fillText("🔥", W / 2, 400);

  font(ctx, 800, 260);
  ctx.fillText(String(streak), W / 2, 660);

  font(ctx, 800, 64);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("DAY STREAK", W / 2, 750);

  font(ctx, 600, 40);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("Learning every single day", W / 2, 830);

  footer(ctx);
  return canvas;
}

export async function drawReportCard({ totalAnswered, accuracy, dayStreak, longestStreak }) {
  await document.fonts.ready;
  const { canvas, ctx } = baseCanvas();
  header(ctx);

  font(ctx, 800, 72);
  ctx.fillText("My Report Card 📋", W / 2, 250);

  // white panel
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 3;
  roundRect(ctx, 120, 320, W - 240, 480, 40);
  ctx.fill(); ctx.stroke();

  const rows = [
    ["📝 Questions answered", String(totalAnswered)],
    ["🎯 Accuracy", `${accuracy}%`],
    ["🔥 Current streak", `${dayStreak} days`],
    ["🏆 Best streak", `${longestStreak} days`],
  ];
  rows.forEach(([label, value], i) => {
    const y = 420 + i * 105;
    ctx.textAlign = "left";
    font(ctx, 700, 42);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(label, 180, y);
    ctx.textAlign = "right";
    font(ctx, 800, 52);
    ctx.fillStyle = "#fff";
    ctx.fillText(value, W - 180, y);
  });
  ctx.textAlign = "center";

  footer(ctx);
  return canvas;
}

// Share the card as an image. Order of preference:
// 1. Native share sheet with the image file (Android/iOS -> WhatsApp status,
//    Instagram stories, anywhere)
// 2. Download the PNG and open a WhatsApp text share (desktop)
export async function shareCard(canvas, text, filename = "ecplay-card.png") {
  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const file = new File([blob], filename, { type: "image/png" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "EC Play", text: `${text}\n${SITE}` });
      return "shared";
    } catch (err) {
      if (err.name === "AbortError") return "cancelled";
      // fall through to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + SITE)}`, "_blank", "noopener");
  return "downloaded";
}
