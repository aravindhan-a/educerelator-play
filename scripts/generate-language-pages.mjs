#!/usr/bin/env node
// Regional-language landing pages (Tamil, Telugu, Bengali, Marathi) — the
// vernacular-search moat. Each page: native-script title/H1/copy (hand-written
// below, not machine-churned), REAL sample questions pulled from the verified
// bank in that language, FAQ, and the full reciprocal hreflang cluster.
// Idempotent. Run:  node scripts/generate-language-pages.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SITE = "https://educerelator.com";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// full hreflang cluster shared by every page in the language set
const CLUSTER = [
  ["en-IN", `${SITE}/`],
  ["hi-IN", `${SITE}/learn-in-hindi.html`],
  ["ta-IN", `${SITE}/learn-in-tamil.html`],
  ["te-IN", `${SITE}/learn-in-telugu.html`],
  ["bn-IN", `${SITE}/learn-in-bengali.html`],
  ["mr-IN", `${SITE}/learn-in-marathi.html`],
  ["x-default", `${SITE}/`],
];
const clusterTags = () => CLUSTER.map(([l, h]) => `<link rel="alternate" hreflang="${l}" href="${h}" />`).join("\n");

const LANGS = [
  { code: "ta", file: "learn-in-tamil.html", nameEn: "Tamil",
    title: "தமிழில் படியுங்கள் — Class 1–12 இலவச பயிற்சி | EC Play",
    desc: "Class 1 முதல் 12 வரை கணிதம், அறிவியல், ஆங்கிலம் — தமிழில் இலவச CBSE/NCERT பயிற்சி வினாக்கள். விளம்பரம் இல்லை, கட்டணம் இல்லை. Free Tamil practice questions.",
    h1: "தமிழில் படியுங்கள்<br>Class 1 முதல் 12 வரை",
    tagline: "கணிதம் · அறிவியல் · ஆங்கிலம் · சமூக அறிவியல் — எல்லாம் தமிழில், முற்றிலும் இலவசம்",
    why: ["6,000+ வினாக்கள் — அனைத்தும் தமிழிலும் கிடைக்கும்", "CBSE / NCERT பாடத்திட்டத்தின் படி", "உங்கள் திறனுக்கு ஏற்ப கேள்விகள் தானாக மாறும்", "பதிவு தேவையில்லை · விளம்பரம் இல்லை · இலவசம்"],
    whyTitle: "ஏன் EC Play?", sampleTitle: "மாதிரி வினாக்கள் (தமிழில்)", showAnswer: "விடையைக் காட்டு",
    faqTitle: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    faq: [
      { q: "EC Play உண்மையில் இலவசமா?", a: "ஆம். அனைத்து வகுப்புகளும், அனைத்து பாடங்களும் முற்றிலும் இலவசம். விளம்பரங்கள் இல்லை." },
      { q: "தமிழ் வழி மாணவர்களுக்கு ஏற்றதா?", a: "ஆம். கேள்விகள், விடைகள் அனைத்தும் தமிழில் காட்டப்படும்; தேவைப்பட்டால் ஆங்கிலத்திற்கு மாறலாம்." },
      { q: "எந்த வகுப்புகள் உள்ளன?", a: "Class 1 முதல் Class 12 வரை — ஒவ்வொரு வகுப்பிற்கும் தனித்தனி பாடங்கள் உள்ளன." } ],
    cta: "இப்போதே தொடங்குங்கள் — முற்றிலும் இலவசம்", playBtn: "இலவசமாக விளையாடு →" },
  { code: "te", file: "learn-in-telugu.html", nameEn: "Telugu",
    title: "తెలుగులో చదవండి — Class 1–12 ఉచిత ప్రాక్టీస్ | EC Play",
    desc: "Class 1 నుండి 12 వరకు గణితం, సైన్స్, ఇంగ్లీష్ — తెలుగులో ఉచిత CBSE/NCERT ప్రాక్టీస్ ప్రశ్నలు. ప్రకటనలు లేవు, రుసుము లేదు. Free Telugu practice questions.",
    h1: "తెలుగులో చదవండి<br>Class 1 నుండి 12 వరకు",
    tagline: "గణితం · సైన్స్ · ఇంగ్లీష్ · సాంఘిక శాస్త్రం — అన్నీ తెలుగులో, పూర్తిగా ఉచితం",
    why: ["6,000+ ప్రశ్నలు — అన్నీ తెలుగులోనూ అందుబాటులో", "CBSE / NCERT సిలబస్ ప్రకారం", "మీ స్థాయికి తగ్గట్టు ప్రశ్నలు ఆటోమేటిక్‌గా మారతాయి", "రిజిస్ట్రేషన్ అవసరం లేదు · ప్రకటనలు లేవు · ఉచితం"],
    whyTitle: "EC Play ఎందుకు?", sampleTitle: "నమూనా ప్రశ్నలు (తెలుగులో)", showAnswer: "జవాబు చూపించు",
    faqTitle: "తరచుగా అడిగే ప్రశ్నలు",
    faq: [
      { q: "EC Play నిజంగా ఉచితమా?", a: "అవును. అన్ని తరగతులు, అన్ని సబ్జెక్టులు పూర్తిగా ఉచితం. ప్రకటనలు లేవు." },
      { q: "తెలుగు మీడియం విద్యార్థులకు సరిపోతుందా?", a: "అవును. ప్రశ్నలు, జవాబులు అన్నీ తెలుగులో కనిపిస్తాయి; కావాలంటే ఇంగ్లీషుకు మారవచ్చు." },
      { q: "ఏ తరగతులు ఉన్నాయి?", a: "Class 1 నుండి Class 12 వరకు — ప్రతి తరగతికీ ప్రత్యేక సబ్జెక్టులు ఉన్నాయి." } ],
    cta: "ఇప్పుడే ప్రారంభించండి — పూర్తిగా ఉచితం", playBtn: "ఉచితంగా ఆడండి →" },
  { code: "bn", file: "learn-in-bengali.html", nameEn: "Bengali",
    title: "বাংলায় পড়ুন — Class 1–12 বিনামূল্যে অনুশীলন | EC Play",
    desc: "Class 1 থেকে 12 পর্যন্ত গণিত, বিজ্ঞান, ইংরেজি — বাংলায় বিনামূল্যে CBSE/NCERT অনুশীলন প্রশ্ন। কোনো বিজ্ঞাপন নেই, কোনো ফি নেই। Free Bengali practice questions.",
    h1: "বাংলায় পড়ুন<br>Class 1 থেকে 12 পর্যন্ত",
    tagline: "গণিত · বিজ্ঞান · ইংরেজি · সমাজবিজ্ঞান — সবই বাংলায়, সম্পূর্ণ বিনামূল্যে",
    why: ["৬,০০০+ প্রশ্ন — সবই বাংলাতেও পাওয়া যায়", "CBSE / NCERT পাঠ্যক্রম অনুযায়ী", "আপনার দক্ষতা অনুযায়ী প্রশ্ন নিজে থেকে বদলায়", "রেজিস্ট্রেশন লাগে না · বিজ্ঞাপন নেই · বিনামূল্যে"],
    whyTitle: "কেন EC Play?", sampleTitle: "নমুনা প্রশ্ন (বাংলায়)", showAnswer: "উত্তর দেখুন",
    faqTitle: "সাধারণ জিজ্ঞাসা",
    faq: [
      { q: "EC Play কি সত্যিই বিনামূল্যে?", a: "হ্যাঁ। সব শ্রেণি, সব বিষয় সম্পূর্ণ বিনামূল্যে। কোনো বিজ্ঞাপন নেই।" },
      { q: "বাংলা মাধ্যমের শিক্ষার্থীদের জন্য উপযুক্ত?", a: "হ্যাঁ। প্রশ্ন ও উত্তর সবই বাংলায় দেখা যায়; চাইলে ইংরেজিতে বদলানো যায়।" },
      { q: "কোন কোন শ্রেণি আছে?", a: "Class 1 থেকে Class 12 পর্যন্ত — প্রতিটি শ্রেণির নিজস্ব বিষয় আছে।" } ],
    cta: "এখনই শুরু করুন — সম্পূর্ণ বিনামূল্যে", playBtn: "বিনামূল্যে খেলুন →" },
  { code: "mr", file: "learn-in-marathi.html", nameEn: "Marathi",
    title: "मराठीत शिका — Class 1–12 मोफत सराव | EC Play",
    desc: "Class 1 ते 12 पर्यंत गणित, विज्ञान, इंग्रजी — मराठीत मोफत CBSE/NCERT सराव प्रश्न. जाहिराती नाहीत, फी नाही. Free Marathi practice questions.",
    h1: "मराठीत शिका<br>Class 1 ते 12 पर्यंत",
    tagline: "गणित · विज्ञान · इंग्रजी · समाजशास्त्र — सर्व मराठीत, पूर्णपणे मोफत",
    why: ["6,000+ प्रश्न — सर्व मराठीतही उपलब्ध", "CBSE / NCERT अभ्यासक्रमानुसार", "तुमच्या पातळीनुसार प्रश्न आपोआप बदलतात", "नोंदणी लागत नाही · जाहिराती नाहीत · मोफत"],
    whyTitle: "EC Play का?", sampleTitle: "नमुना प्रश्न (मराठीत)", showAnswer: "उत्तर दाखवा",
    faqTitle: "नेहमी विचारले जाणारे प्रश्न",
    faq: [
      { q: "EC Play खरंच मोफत आहे का?", a: "होय. सर्व वर्ग, सर्व विषय पूर्णपणे मोफत. जाहिराती नाहीत." },
      { q: "मराठी माध्यमाच्या विद्यार्थ्यांसाठी योग्य आहे का?", a: "होय. प्रश्न व उत्तरे सर्व मराठीत दिसतात; हवे असल्यास इंग्रजीत बदलता येते." },
      { q: "कोणते वर्ग उपलब्ध आहेत?", a: "Class 1 ते Class 12 — प्रत्येक वर्गासाठी स्वतंत्र विषय आहेत." } ],
    cta: "आत्ताच सुरुवात करा — पूर्णपणे मोफत", playBtn: "मोफत खेळा →" },
];

// pull real sample questions that have full native translations
function samplesFor(code, n = 4) {
  const sources = ["3-science", "5-science", "4-social-studies", "2-evs", "6-science"];
  const out = [];
  for (const src of sources) {
    if (out.length >= n) break;
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, `content/levels/${src}.json`), "utf8"));
    const qs = d.questions || d.levels.flatMap((l) => l.questions);
    const q = qs.find((q) => q.prompt?.[code] && q.choices.every((c) => c[code]) && !out.some((o) => o.prompt[code] === q.prompt[code]));
    if (q) out.push(q);
  }
  return out;
}

for (const L of LANGS) {
  const url = `${SITE}/${L.file}`;
  const samples = samplesFor(L.code);
  const qBlocks = samples.map((q, i) => `
    <div class="q">
      <p class="q-p"><strong>${i + 1}.</strong> ${esc(q.prompt[L.code])}${q.visual ? ` <span class="q-v">${esc(q.visual)}</span>` : ""}</p>
      <ol type="A">${q.choices.map((c) => `<li>${esc(c[L.code])}</li>`).join("")}</ol>
      <details><summary>${esc(L.showAnswer)}</summary><p class="ans">${String.fromCharCode(65 + q.answerIndex)}. ${esc(q.choices[q.answerIndex][L.code])}</p></details>
    </div>`).join("\n");

  const ld = { "@context": "https://schema.org", "@type": "WebPage", name: L.title, url, inLanguage: L.code,
    isPartOf: { "@id": `${SITE}/#website` }, publisher: { "@id": `${SITE}/#organization` },
    breadcrumb: { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "EC Play", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: `Learn in ${L.nameEn}` } ] } };

  const html = `<!DOCTYPE html>
<html lang="${L.code}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(L.title)}</title>
<meta name="description" content="${esc(L.desc)}" />
<meta name="robots" content="index, follow, max-snippet:-1" />
<link rel="canonical" href="${url}" />
${clusterTags()}
<meta property="og:title" content="${esc(L.title)}" />
<meta property="og:description" content="${esc(L.desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:locale" content="${L.code}_IN" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#1a1a2e;background:#faf9ff;line-height:1.7}
.topbar{background:linear-gradient(135deg,#ff5e7e,#7c3aed);padding:14px 24px;display:flex;gap:14px;align-items:center}
.topbar a{color:#fff;text-decoration:none;font-weight:800}.nav{margin-left:auto;display:flex;gap:12px}.nav a{font-weight:600;font-size:.9rem;color:rgba(255,255,255,.85)}
.hero{background:linear-gradient(135deg,#7c3aed,#ff5e7e);color:#fff;text-align:center;padding:52px 22px 44px}
.hero h1{font-size:2rem;font-weight:900;line-height:1.35;margin-bottom:12px}
.hero p{opacity:.93;max-width:620px;margin:0 auto 24px}
.cta-btn{display:inline-block;background:#fff;color:#7c3aed;font-weight:900;font-size:1.05rem;padding:15px 38px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.2)}
.wrap{max-width:720px;margin:0 auto;padding:36px 20px}
.wrap h2{font-size:1.35rem;font-weight:800;color:#2d1b4e;margin:26px 0 12px}
.why{list-style:none}.why li{background:#fff;border-radius:12px;padding:12px 16px;margin:8px 0;box-shadow:0 2px 8px rgba(0,0,0,.05);font-weight:600}
.why li::before{content:"✅ ";}
.q{background:#fff;border-radius:14px;padding:16px 18px 10px;margin:12px 0;box-shadow:0 2px 10px rgba(0,0,0,.06)}
.q-p{font-weight:700;color:#1e1b4b}.q-v{font-size:1.3rem}
.q ol{margin:8px 0 6px 26px}.q li{margin:2px 0}
.q summary{cursor:pointer;color:#7c3aed;font-weight:700;font-size:.9rem}
.ans{color:#065f46;background:#ecfdf5;padding:8px 12px;border-radius:8px;margin:8px 0 4px;font-weight:700}
.faq details{border-bottom:1px solid #e9d5ff;padding:12px 0}.faq summary{font-weight:700;color:#2d1b4e;cursor:pointer}.faq p{margin:8px 0 4px 14px;color:#555}
.band{background:linear-gradient(135deg,#7c3aed,#ff5e7e);text-align:center;color:#fff;padding:40px 20px;margin-top:36px}
.band h2{color:#fff;margin:0 0 16px;font-size:1.4rem}
footer{text-align:center;padding:22px;background:#1a1030;color:rgba(255,255,255,.5);font-size:.85rem}footer a{color:#a78bfa}
</style>
</head>
<body>
<nav class="topbar"><a href="/">🦉 EC Play</a><div class="nav"><a href="/">Play</a><a href="/practice/">Practice Sets</a><a href="/learn-in-hindi.html">हिंदी</a></div></nav>
<div class="hero">
  <h1>${L.h1}</h1>
  <p>${esc(L.tagline)}</p>
  <a class="cta-btn" href="/">${esc(L.playBtn)}</a>
</div>
<div class="wrap">
  <h2>${esc(L.whyTitle)}</h2>
  <ul class="why">${L.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
  <h2>${esc(L.sampleTitle)}</h2>
  ${qBlocks}
  <h2>${esc(L.faqTitle)}</h2>
  <div class="faq">${L.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
</div>
<div class="band"><h2>${esc(L.cta)}</h2><a class="cta-btn" href="/">${esc(L.playBtn)}</a></div>
<footer>© 2026 Educerelator · <a href="/">EC Play</a> · <a href="/practice/">All practice sets</a></footer>
</body>
</html>`;
  fs.writeFileSync(path.join(ROOT, "urban/frontend", L.file), html);
  console.log(`${L.file}: ${samples.length} native sample questions`);
}
console.log("Done. Remember: hreflang cluster must also be updated on / and /learn-in-hindi.html.");
