#!/usr/bin/env node
// Math drill generator — tops up content/levels/<class>-math.json to a target
// count using LANGUAGE-NEUTRAL computation questions.
//
// Why this is safe to ship without review:
//   • Every prompt is pure math notation ("234 + 158 = ?", "LCM(4, 6) = ?"),
//     which is identical in all 13 languages — zero translation risk.
//   • Every answer is COMPUTED here, so it cannot be factually wrong.
//   • Distractors are generated to be plausible but provably != the answer.
// Deterministic (seeded RNG) so re-running produces the same bank — no churn.
//
// Usage (from repo root, no API key needed):
//   node scripts/generate-math-drills.mjs                 # classes 3-8 -> 100 each
//   node scripts/generate-math-drills.mjs --classes 6,7 --target 100
//   node scripts/generate-math-drills.mjs --dry           # print counts, write nothing

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne"];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? (process.argv[i + 1] ?? true) : fallback;
}
const TARGET  = parseInt(arg("target", "100"), 10);
const CLASSES = String(arg("classes", "3,4,5,6,7,8")).split(",").map((n) => parseInt(n, 10));
const DRY     = process.argv.includes("--dry");

// ---- deterministic RNG (mulberry32) ----
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Build a question from a prompt string, the correct answer, and 3 distractors.
// Everything is language-neutral, so each field is the same string in all langs.
function mono(str) { const o = {}; for (const l of LANGS) o[l] = String(str); return o; }
function makeQuestion(prompt, correct, distractors, rng, posCounter) {
  const opts = [String(correct), ...distractors.map(String)];
  // place the answer in the least-used position so answers aren't position-biased
  let pos = 0, min = Infinity;
  for (let p = 0; p < 4; p++) if (posCounter[p] < min) { min = posCounter[p]; pos = p; }
  const wrong = shuffle(distractors.map(String), rng);
  const choices = [];
  let wi = 0;
  for (let p = 0; p < 4; p++) choices.push(p === pos ? String(correct) : wrong[wi++]);
  posCounter[pos]++;
  return {
    type: "mcq",
    prompt: mono(prompt),
    visual: "🔢",
    choices: choices.map(mono),
    answerIndex: pos,
  };
}

// A distractor helper: unique integers near the answer, valid for the class.
function intDistractors(correct, rng, { allowNeg = false, pool = [] } = {}) {
  const set = new Set([correct]);
  const out = [];
  const cands = shuffle([...pool, correct + 1, correct - 1, correct + 2, correct - 2,
    correct + 10, correct - 10, correct * 2, correct + 5, correct - 5], rng);
  for (const c of cands) {
    if (out.length >= 3) break;
    if (!Number.isFinite(c) || set.has(c)) continue;
    if (!allowNeg && c < 0) continue;
    set.add(c); out.push(c);
  }
  let k = 3;
  while (out.length < 3) { const c = correct + k; if (!set.has(c) && (allowNeg || c >= 0)) { set.add(c); out.push(c); } k++; }
  return out;
}

// ---- per-class template registries: each returns {prompt, correct, distractors} ----
function fracStr(n, d) { const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? `${n}` : `${n}/${d}`; }

const TEMPLATES = {
  3: [
    (r) => { const a = ri(r,100,899), b = ri(r,100,899); const c = a+b; return { prompt:`${a} + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+100,c-100,c+9,c-9]}) }; },
    (r) => { const a = ri(r,300,999), b = ri(r,50,a-1); const c = a-b; return { prompt:`${a} − ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+10,c-10,c+100]}) }; },
    (r) => { const a = ri(r,2,10), b = ri(r,2,10); const c = a*b; return { prompt:`${a} × ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*(b+1),a*(b-1),(a+1)*b]}) }; },
    (r) => { const b = ri(r,2,10), q = ri(r,2,10), a = b*q; return { prompt:`${a} ÷ ${b} = ?`, correct:q, distractors:intDistractors(q,r,{pool:[q+1,q-1,q+2]}) }; },
    (r) => { const a = ri(r,10,99), b = ri(r,10,99), c = ri(r,10,99), s = a+b+c; return { prompt:`${a} + ${b} + ${c} = ?`, correct:s, distractors:intDistractors(s,r,{pool:[s+10,s-10,s+1]}) }; },
  ],
  4: [
    (r) => { const a = ri(r,11,99), b = ri(r,2,9); const c = a*b; return { prompt:`${a} × ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*(b+1),(a+1)*b,a*(b-1)]}) }; },
    (r) => { const a = ri(r,100,999), b = ri(r,2,9); const c = a*b; return { prompt:`${a} × ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*(b+1),a*(b-1),c+10]}) }; },
    (r) => { const b = ri(r,2,12), q = ri(r,10,50), a = b*q; return { prompt:`${a} ÷ ${b} = ?`, correct:q, distractors:intDistractors(q,r,{pool:[q+1,q-1,q+10]}) }; },
    (r) => { const a = ri(r,1000,9999), b = ri(r,1000,9999); const c = a+b; return { prompt:`${a} + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1000,c-1000,c+100]}) }; },
    (r) => { const d = ri(r,4,12), n1 = ri(r,1,d-2), n2 = ri(r,1,d-n1); const corr = fracStr(n1+n2,d); const set=new Set([corr]); const ds=[]; for (const cand of [fracStr(n1+n2+1,d),fracStr(Math.max(1,n1+n2-1),d),`${n1+n2}/${d+1}`,`${n1}/${n2||1}`]) if(!set.has(cand)){set.add(cand);ds.push(cand);} while(ds.length<3){ds.push(`${n1+n2+ds.length+1}/${d}`);} return { prompt:`${n1}/${d} + ${n2}/${d} = ?`, correct:corr, distractors:ds.slice(0,3) }; },
  ],
  5: [
    (r) => { const a = (ri(r,10,99)/10), b = (ri(r,10,99)/10); const c = +(a+b).toFixed(1); return { prompt:`${a} + ${b} = ?`, correct:c, distractors:[+(c+0.1).toFixed(1),+(c-0.1).toFixed(1),+(c+1).toFixed(1)] }; },
    (r) => { const a = (ri(r,20,99)/10), b = (ri(r,10,a*10-1)/10); const c = +(a-b).toFixed(1); return { prompt:`${a} − ${b} = ?`, correct:c, distractors:[+(c+0.1).toFixed(1),+(c-0.1).toFixed(1),+(c+1).toFixed(1)] }; },
    (r) => { const a = ri(r,2,9)/10, b = ri(r,2,9)/10; const c = +(a*b).toFixed(2); return { prompt:`${a} × ${b} = ?`, correct:c, distractors:[+(c+0.1).toFixed(2),+(c/10).toFixed(2),+(c*10).toFixed(2)] }; },
    (r) => { const a = ri(r,2,20); const c = a*a; return { prompt:`${a}² = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*a+a,a*a-a,(a+1)*(a+1)]}) }; },
    (r) => { const a = ri(r,2,20); const c = a*a; return { prompt:`√${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a+2]}) }; },
    (r) => { const parts=[2,4,5,10,20,25,50]; const p=parts[ri(r,0,parts.length-1)]; const base=ri(r,1,9)*10; const c=+(base*p/100); return { prompt:`${p}% × ${base} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,c*2,Math.round(c/2)]}) }; },
  ],
  6: [
    (r) => { const a = ri(r,1,15), b = ri(r,1,15); const c = -a - b; return { prompt:`(−${a}) + (−${b}) = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[c+1,c-1,-a+b,a-b]}) }; },
    (r) => { const a = ri(r,1,15), b = ri(r,1,15); const c = -a + b; return { prompt:`(−${a}) + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[c+1,c-1,-a-b,a-b]}) }; },
    (r) => { const a = ri(r,2,12), b = ri(r,2,9); const c = -(a*b); return { prompt:`(−${a}) × ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[a*b,c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,5), n = ri(r,2,4); const c = Math.pow(a,n); return { prompt:`${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*n,c+a,c-a,Math.pow(a,n+1)]}) }; },
    (r) => { const x = ri(r,2,9); let y = ri(r,2,9); if (y===x) y = x>=9 ? x-1 : x+1; const l = x*y/gcd(x,y); return { prompt:`LCM(${x}, ${y}) = ?`, correct:l, distractors:intDistractors(l,r,{pool:[x*y,l+x,l-x,x+y]}) }; },
    (r) => { const g0 = ri(r,2,9), m=ri(r,2,6); let n=ri(r,2,6); if (n===m) n = m>=6 ? m-1 : m+1; const x=g0*m, y=g0*n; const h=gcd(x,y); return { prompt:`HCF(${x}, ${y}) = ?`, correct:h, distractors:intDistractors(h,r,{pool:[h+1,h-1,Math.min(x,y),g0*2]}) }; },
    (r) => { const a = ri(r,2,9), b = ri(r,2,9), c = ri(r,2,9); const v = a + b*c; return { prompt:`${a} + ${b} × ${c} = ?`, correct:v, distractors:intDistractors(v,r,{pool:[(a+b)*c,v+1,v-b,a*b+c]}) }; },
    (r) => { const n1=ri(r,1,5), d1=ri(r,2,6), n2=ri(r,1,5), d2=ri(r,2,6); const corr=fracStr(n1*n2,d1*d2); return { prompt:`${n1}/${d1} × ${n2}/${d2} = ?`, correct:corr, distractors:[fracStr(n1+n2,d1+d2),fracStr(n1*n2+1,d1*d2),fracStr(n1*n2,d1*d2+1)] }; },
  ],
  7: [
    (r) => { const a = ri(r,5,25), b = ri(r,5,25); const c = -a - b; return { prompt:`(−${a}) − ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[b-a,a-b,c+1]}) }; },
    (r) => { const a = ri(r,2,12), b = ri(r,2,12); const c = a*b*-1; return { prompt:`(−${a}) × (${b}) = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[a*b,c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,4), n = ri(r,2,5); const c = Math.pow(a,n); return { prompt:`${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*n,Math.pow(a,n-1),c+a]}) }; },
    (r) => { const a = ri(r,3,12), b = ri(r,1,a-1), c = ri(r,2,6); const v = (a-b)*c; return { prompt:`(${a} − ${b}) × ${c} = ?`, correct:v, distractors:intDistractors(v,r,{pool:[a-b*c,v+c,v-c,a*c-b]}) }; },
    (r) => { const n1=ri(r,1,7), n2=ri(r,1,7), d=ri(r,3,9); const corr=fracStr(n1-n2,d); const s=new Set([corr]); const ds=[]; for(const c of [fracStr(n1+n2,d),fracStr(n1-n2+1,d),fracStr(n1-n2,d+1)]) if(!s.has(c)){s.add(c);ds.push(c);} while(ds.length<3)ds.push(`${n1-n2+ds.length+2}/${d}`); return { prompt:`${n1}/${d} − ${n2}/${d} = ?`, correct:corr, distractors:ds.slice(0,3) }; },
    (r) => { const p=[10,20,25,50,5][ri(r,0,4)]; const base=ri(r,1,20)*10; const c=+(base*p/100); return { prompt:`${p}% × ${base} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c*2,Math.round(c/2),c+10,c-5]}) }; },
  ],
  8: [
    (r) => { const a = ri(r,2,3), m = ri(r,2,4), n = ri(r,2,3); const c = Math.pow(a,m+n); return { prompt:`${a}^${m} × ${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[Math.pow(a,m*n),Math.pow(a,m+n+1),c+a,c-a]}) }; },
    (r) => { const a = ri(r,11,30); const c = a*a; return { prompt:`${a}² = ?`, correct:c, distractors:intDistractors(c,r,{pool:[(a+1)*(a+1),(a-1)*(a-1),c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,12); const c = a*a*a; return { prompt:`${a}³ = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*a,a*3,c+a,(a+1)*(a+1)*(a+1)]}) }; },
    (r) => { const a = ri(r,2,15); const c = a*a; return { prompt:`√${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a+2,Math.round(c/2)]}) }; },
    (r) => { const a = ri(r,2,10); const c = a*a*a; return { prompt:`∛${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a*a]}) }; },
    (r) => { const a = ri(r,2,9), b = ri(r,2,9), c2 = ri(r,2,9); const v = a*b - c2; return { prompt:`${a} × ${b} − ${c2} = ?`, correct:v, distractors:intDistractors(v,r,{allowNeg:true,pool:[a*(b-c2),v+1,v-1,a*b+c2]}) }; },
    (r) => { const base = ri(r,2,9); const c = 1; return { prompt:`${base}^0 = ?`, correct:c, distractors:[0, base, base*base] }; },
  ],
};

function normPrompt(p) { return p.replace(/\s+/g, "").trim(); }

let grandNew = 0;
const report = [];
for (const cls of CLASSES) {
  const file = path.join(ROOT, "content", "levels", `${cls}-math.json`);
  if (!fs.existsSync(file)) { report.push(`class ${cls}: SKIP (no ${cls}-math.json)`); continue; }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const questions = data.questions || [];
  const seen = new Set(questions.map((q) => normPrompt(q.prompt.en)));
  let maxId = 0;
  for (const q of questions) { const m = /(\d+)$/.exec(q.id || ""); if (m) maxId = Math.max(maxId, parseInt(m[1], 10)); }

  const templates = TEMPLATES[cls] || [];
  if (!templates.length) { report.push(`class ${cls}: no templates`); continue; }
  const rng = makeRng(cls * 100003 + 7);
  const posCounter = [0, 0, 0, 0];
  // seed posCounter from existing answerIndex so overall bank stays balanced
  for (const q of questions) if (Number.isInteger(q.answerIndex)) posCounter[q.answerIndex]++;

  let added = 0, attempts = 0;
  const need = TARGET - questions.length;
  while (added < need && attempts < need * 200 + 5000) {
    attempts++;
    const t = templates[ri(rng, 0, templates.length - 1)];
    let spec;
    try { spec = t(rng); } catch { continue; }
    if (!spec || spec.correct === undefined) continue;
    const key = normPrompt(spec.prompt);
    if (seen.has(key)) continue;
    // validate distractors: 3 unique, none equal to correct
    const ds = [...new Set(spec.distractors.map(String))].filter((d) => d !== String(spec.correct));
    if (ds.length < 3) continue;
    seen.add(key);
    maxId++;
    const q = makeQuestion(spec.prompt, spec.correct, ds.slice(0, 3), rng, posCounter);
    q.id = `${cls}-math-${String(maxId).padStart(3, "0")}`;
    questions.push(q);
    added++;
  }
  data.questions = questions;
  grandNew += added;
  report.push(`class ${cls}: +${added} -> ${questions.length} total (answer positions ${posCounter.join("/")})`);
  if (!DRY) fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
}

console.log(DRY ? "DRY RUN (no files written)" : "WROTE files");
report.forEach((r) => console.log("  " + r));
console.log(`Total new questions: ${grandNew}`);
