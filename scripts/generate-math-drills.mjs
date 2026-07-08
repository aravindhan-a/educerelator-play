#!/usr/bin/env node
// Math drill generator — tops up content/levels/<class>-math.json to a target
// count using LANGUAGE-NEUTRAL computation questions, for ALL classes 1–12.
//
// Why this is safe to ship without review:
//   • Every prompt is pure math notation ("234 + 158 = ?", "sin 30° = ?",
//     "d/dx(x³) = ?"), identical in all 13 languages — zero translation risk.
//   • Every answer is COMPUTED or drawn from a standard fact table, and the
//     whole bank is independently re-verified by scripts/verify_math_drills.py
//     (separate logic, exact arithmetic).
//   • Distractors are generated to be plausible but provably != the answer.
// Deterministic (seeded RNG) so re-running produces the same bank — no churn.
//
// Usage (from repo root, no API key needed):
//   node scripts/generate-math-drills.mjs                    # classes 1-12 -> 100 each
//   node scripts/generate-math-drills.mjs --classes 9,10 --target 100
//   node scripts/generate-math-drills.mjs --dry              # print counts, write nothing
//
// Class 1 files use a { levels: [...] } structure; new drills are appended as
// an extra level so the app's flattening loader picks them up unchanged.

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
const CLASSES = String(arg("classes", "1,2,3,4,5,6,7,8,9,10,11,12")).split(",").map((n) => parseInt(n, 10));
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

// ---- notation helpers ----
const M = "−"; // math minus sign, matches existing bank style
const SUP = ["⁰","¹","²","³","⁴","⁵","⁶","⁷","⁸","⁹"];
const SUB = ["₀","₁","₂","₃","₄","₅","₆","₇","₈","₉"];
const sup = (n) => String(n).split("").map((d) => SUP[+d]).join("");
const sub = (n) => String(n).split("").map((d) => SUB[+d]).join("");
const fmtInt = (n) => (n < 0 ? M + Math.abs(n) : String(n));
const sgnTerm = (n) => (n < 0 ? `${M} ${Math.abs(n)}` : `+ ${n}`);
function fracStr(n, d) { const g = gcd(n, d) || 1; n /= g; d /= g; return d === 1 ? `${n}` : `${n}/${d}`; }

// Build a question object. Everything is language-neutral, so each field is
// the same string in all 13 languages.
function mono(str) { const o = {}; for (const l of LANGS) o[l] = String(str); return o; }
// Class 1 uses 3 choices (age-appropriate, matching its curated questions).
const CHOICE_COUNT = { 1: 3 };
function makeQuestion(prompt, correct, distractors, rng, posCounter, nChoices = 4) {
  let pos = 0, min = Infinity;
  for (let p = 0; p < nChoices; p++) if (posCounter[p] < min) { min = posCounter[p]; pos = p; }
  const wrong = shuffle(distractors.map(String), rng);
  const choices = [];
  let wi = 0;
  for (let p = 0; p < nChoices; p++) choices.push(p === pos ? String(correct) : wrong[wi++]);
  posCounter[pos]++;
  return { type: "mcq", prompt: mono(prompt), visual: "🔢", choices: choices.map(mono), answerIndex: pos };
}

// numeric distractors: unique, plausible, never equal to the answer
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

// string distractors from a pool of same-category values (fact-table answers)
function strDistractors(correct, pool, rng) {
  const flip = (v) => (v.startsWith(M) ? v.slice(1) : M + v);
  const set = new Set([correct]);
  const out = [];
  for (const c of shuffle([flip(correct), ...pool], rng)) {
    if (out.length >= 3) break;
    if (!c || set.has(c)) continue;
    set.add(c); out.push(c);
  }
  let k = 2;
  while (out.length < 3) { const c = `${correct}·${k}`; if (!set.has(c)) { set.add(c); out.push(c); } k++; }
  return out;
}

// ---- fact tables (duplicated independently in the verifier) ----
const TRIG = {
  [`sin 0°`]: "0",   [`sin 30°`]: "1/2",   [`sin 45°`]: "1/√2", [`sin 60°`]: "√3/2", [`sin 90°`]: "1",
  [`cos 0°`]: "1",   [`cos 30°`]: "√3/2",  [`cos 45°`]: "1/√2", [`cos 60°`]: "1/2",  [`cos 90°`]: "0",
  [`tan 0°`]: "0",   [`tan 30°`]: "1/√3",  [`tan 45°`]: "1",    [`tan 60°`]: "√3",
};
const DERIV = {
  "x²": "2x", "x³": "3x²", "x⁴": "4x³", "x⁵": "5x⁴",
  "sin x": "cos x", "cos x": `${M}sin x`, "eˣ": "eˣ", "ln x": "1/x", "tan x": "sec² x",
};
const INTEG = {
  "2x": "x² + C", "3x²": "x³ + C", "4x³": "x⁴ + C",
  "cos x": "sin x + C", "sin x": `${M}cos x + C`, "eˣ": "eˣ + C", "1/x": "ln|x| + C", "sec² x": "tan x + C",
};
const LIMITS = { "sin x/x": "1", "tan x/x": "1", [`(eˣ ${M} 1)/x`]: "1", [`(1 ${M} cos x)/x`]: "0" };
const IPOW = { "i²": `${M}1`, "i³": `${M}i`, "i⁴": "1", "i⁵": "i" };
const fact = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const comb = (n, r) => fact(n) / (fact(r) * fact(n - r));
const perm = (n, r) => fact(n) / fact(n - r);

// ---- per-class template registries ----
const TEMPLATES = {
  1: [ // numbers to 20 — addition, subtraction, counting patterns
    (r) => { const a = ri(r,1,10), b = ri(r,1,10); const c = a+b; return { prompt:`${a} + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,a,b]}) }; },
    (r) => { const a = ri(r,2,20), b = ri(r,1,a-1); const c = a-b; return { prompt:`${a} ${M} ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,a,b]}) }; },
    (r) => { const d = ri(r,1,2), a = ri(r,1,6); const s=[a,a+d,a+2*d]; const c=a+3*d; return { prompt:`${s.join(", ")}, ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,c+d]}) }; },
  ],
  2: [ // numbers to 100 — carrying, tables, halves, skip counting
    (r) => { const a = ri(r,11,89), b = ri(r,10,99-a); const c = a+b; return { prompt:`${a} + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+10,c-10,c+1]}) }; },
    (r) => { const a = ri(r,20,99), b = ri(r,10,a-1); const c = a-b; return { prompt:`${a} ${M} ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+10,c-10,c+1]}) }; },
    (r) => { const t=[2,3,5,10][ri(r,0,3)], a = ri(r,2,10); const c = t*a; return { prompt:`${t} × ${a} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[t*(a+1),t*(a-1),c+1]}) }; },
    (r) => { const a = ri(r,1,10)*2; const c = a/2; return { prompt:`${a} ÷ 2 = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,a]}) }; },
    (r) => { const d=[2,5,10][ri(r,0,2)], a = ri(r,1,5)*d; const s=[a,a+d,a+2*d]; const c=a+3*d; return { prompt:`${s.join(", ")}, ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+d,c-d,c+1]}) }; },
  ],
  3: [
    (r) => { const a = ri(r,100,899), b = ri(r,100,899); const c = a+b; return { prompt:`${a} + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+100,c-100,c+9,c-9]}) }; },
    (r) => { const a = ri(r,300,999), b = ri(r,50,a-1); const c = a-b; return { prompt:`${a} ${M} ${b} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+10,c-10,c+100]}) }; },
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
    (r) => { const a = (ri(r,20,99)/10), b = (ri(r,10,a*10-1)/10); const c = +(a-b).toFixed(1); return { prompt:`${a} ${M} ${b} = ?`, correct:c, distractors:[+(c+0.1).toFixed(1),+(c-0.1).toFixed(1),+(c+1).toFixed(1)] }; },
    (r) => { const a = ri(r,2,9)/10, b = ri(r,2,9)/10; const c = +(a*b).toFixed(2); return { prompt:`${a} × ${b} = ?`, correct:c, distractors:[+(c+0.1).toFixed(2),+(c/10).toFixed(2),+(c*10).toFixed(2)] }; },
    (r) => { const a = ri(r,2,20); const c = a*a; return { prompt:`${a}² = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*a+a,a*a-a,(a+1)*(a+1)]}) }; },
    (r) => { const a = ri(r,2,20); const c = a*a; return { prompt:`√${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a+2]}) }; },
    (r) => { const parts=[2,4,5,10,20,25,50]; const p=parts[ri(r,0,parts.length-1)]; const base=ri(r,1,9)*10; const c=+(base*p/100); return { prompt:`${p}% × ${base} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c+1,c-1,c*2,Math.round(c/2)]}) }; },
  ],
  6: [
    (r) => { const a = ri(r,1,15), b = ri(r,1,15); const c = -a - b; return { prompt:`(${M}${a}) + (${M}${b}) = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[c+1,c-1,-a+b,a-b]}) }; },
    (r) => { const a = ri(r,1,15), b = ri(r,1,15); const c = -a + b; return { prompt:`(${M}${a}) + ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[c+1,c-1,-a-b,a-b]}) }; },
    (r) => { const a = ri(r,2,12), b = ri(r,2,9); const c = -(a*b); return { prompt:`(${M}${a}) × ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[a*b,c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,5), n = ri(r,2,4); const c = Math.pow(a,n); return { prompt:`${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*n,c+a,c-a,Math.pow(a,n+1)]}) }; },
    (r) => { const x = ri(r,2,9); let y = ri(r,2,9); if (y===x) y = x>=9 ? x-1 : x+1; const l = x*y/gcd(x,y); return { prompt:`LCM(${x}, ${y}) = ?`, correct:l, distractors:intDistractors(l,r,{pool:[x*y,l+x,l-x,x+y]}) }; },
    (r) => { const g0 = ri(r,2,9), m=ri(r,2,6); let n=ri(r,2,6); if (n===m) n = m>=6 ? m-1 : m+1; const x=g0*m, y=g0*n; const h=gcd(x,y); return { prompt:`HCF(${x}, ${y}) = ?`, correct:h, distractors:intDistractors(h,r,{pool:[h+1,h-1,Math.min(x,y),g0*2]}) }; },
    (r) => { const a = ri(r,2,9), b = ri(r,2,9), c = ri(r,2,9); const v = a + b*c; return { prompt:`${a} + ${b} × ${c} = ?`, correct:v, distractors:intDistractors(v,r,{pool:[(a+b)*c,v+1,v-b,a*b+c]}) }; },
    (r) => { const n1=ri(r,1,5), d1=ri(r,2,6), n2=ri(r,1,5), d2=ri(r,2,6); const corr=fracStr(n1*n2,d1*d2); return { prompt:`${n1}/${d1} × ${n2}/${d2} = ?`, correct:corr, distractors:[fracStr(n1+n2,d1+d2),fracStr(n1*n2+1,d1*d2),fracStr(n1*n2,d1*d2+1)] }; },
  ],
  7: [
    (r) => { const a = ri(r,5,25), b = ri(r,5,25); const c = -a - b; return { prompt:`(${M}${a}) ${M} ${b} = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[b-a,a-b,c+1]}) }; },
    (r) => { const a = ri(r,2,12), b = ri(r,2,12); const c = a*b*-1; return { prompt:`(${M}${a}) × (${b}) = ?`, correct:c, distractors:intDistractors(c,r,{allowNeg:true,pool:[a*b,c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,4), n = ri(r,2,5); const c = Math.pow(a,n); return { prompt:`${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*n,Math.pow(a,n-1),c+a]}) }; },
    (r) => { const a = ri(r,3,12), b = ri(r,1,a-1), c = ri(r,2,6); const v = (a-b)*c; return { prompt:`(${a} ${M} ${b}) × ${c} = ?`, correct:v, distractors:intDistractors(v,r,{pool:[a-b*c,v+c,v-c,a*c-b]}) }; },
    (r) => { const n1=ri(r,1,7), n2=ri(r,1,7), d=ri(r,3,9); const corr=fracStr(n1-n2,d); const s=new Set([corr]); const ds=[]; for(const c of [fracStr(n1+n2,d),fracStr(n1-n2+1,d),fracStr(n1-n2,d+1)]) if(!s.has(c)){s.add(c);ds.push(c);} while(ds.length<3)ds.push(`${n1-n2+ds.length+2}/${d}`); return { prompt:`${n1}/${d} ${M} ${n2}/${d} = ?`, correct:corr, distractors:ds.slice(0,3) }; },
    (r) => { const p=[10,20,25,50,5][ri(r,0,4)]; const base=ri(r,1,20)*10; const c=+(base*p/100); return { prompt:`${p}% × ${base} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[c*2,Math.round(c/2),c+10,c-5]}) }; },
  ],
  8: [
    (r) => { const a = ri(r,2,3), m = ri(r,2,4), n = ri(r,2,3); const c = Math.pow(a,m+n); return { prompt:`${a}^${m} × ${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[Math.pow(a,m*n),Math.pow(a,m+n+1),c+a,c-a]}) }; },
    (r) => { const a = ri(r,11,30); const c = a*a; return { prompt:`${a}² = ?`, correct:c, distractors:intDistractors(c,r,{pool:[(a+1)*(a+1),(a-1)*(a-1),c+a,c-a]}) }; },
    (r) => { const a = ri(r,2,12); const c = a*a*a; return { prompt:`${a}³ = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*a,a*3,c+a,(a+1)*(a+1)*(a+1)]}) }; },
    (r) => { const a = ri(r,2,15); const c = a*a; return { prompt:`√${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a+2,Math.round(c/2)]}) }; },
    (r) => { const a = ri(r,2,10); const c = a*a*a; return { prompt:`∛${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a*a]}) }; },
    (r) => { const a = ri(r,2,9), b = ri(r,2,9), c2 = ri(r,2,9); const v = a*b - c2; return { prompt:`${a} × ${b} ${M} ${c2} = ?`, correct:v, distractors:intDistractors(v,r,{allowNeg:true,pool:[a*(b-c2),v+1,v-1,a*b+c2]}) }; },
    (r) => { const base = ri(r,2,9); const c = 1; return { prompt:`${base}^0 = ?`, correct:c, distractors:[0, base, base*base] }; },
  ],
  9: [ // exponent laws, roots, linear equations, negative exponents
    (r) => { const a = ri(r,2,3), m = ri(r,2,5), n = ri(r,2,4); const c = Math.pow(a,m+n); return { prompt:`${a}^${m} × ${a}^${n} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[Math.pow(a,m*n),Math.pow(a,Math.abs(m-n)),c+a]}) }; },
    (r) => { const a = ri(r,16,30); const c = a*a; return { prompt:`√${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a+2]}) }; },
    (r) => { const a = ri(r,5,15); const c = a*a*a; return { prompt:`∛${c} = ?`, correct:a, distractors:intDistractors(a,r,{pool:[a+1,a-1,a*2]}) }; },
    (r) => { const A = ri(r,2,9), x = ri(r,2,12), B = ri(r,1,15); const C = A*x + B; return { prompt:`${A}x + ${B} = ${C} ⇒ x = ?`, correct:x, distractors:intDistractors(x,r,{pool:[x+1,x-1,C-B,A]}) }; },
    (r) => { const A = ri(r,2,9), x = ri(r,2,12), B = ri(r,1,Math.min(15,A*x-1)); const C = A*x - B; return { prompt:`${A}x ${M} ${B} = ${C} ⇒ x = ?`, correct:x, distractors:intDistractors(x,r,{pool:[x+1,x-1,C+B,A]}) }; },
    (r) => { const a = ri(r,2,5), n = ri(r,2,3); const c = `1/${Math.pow(a,n)}`; const p = Math.pow(a,n); const ds=[`${M}${p}`, `${p}`, `1/${a*n===p?p*a:a*n}`]; return { prompt:`${a}^${M}${n} = ?`, correct:c, distractors:ds }; },
  ],
  10: [ // quadratics, AP, trig values, identities
    (r) => { let p = ri(r,-9,9), q = ri(r,-9,9); if (p===0) p=2; if (q===0) q=3; if (p===q) q=p+1; const B=-(p+q), C=p*q; if (B===0 || C===0) { p=2; q=3; } const b2=-(p+q), c2=p*q; const lo=Math.min(p,q), hi=Math.max(p,q); const corr=`{${fmtInt(lo)}, ${fmtInt(hi)}}`; const s=new Set([corr]); const cands=[`{${fmtInt(-lo)}, ${fmtInt(-hi)}}`,`{${fmtInt(lo)}, ${fmtInt(hi+1)}}`,`{${fmtInt(lo-1)}, ${fmtInt(hi)}}`,`{1, ${fmtInt(c2)}}`]; const ds=[]; for(const c of cands){ if(!s.has(c)&&ds.length<3){s.add(c);ds.push(c);} } let k=2; while(ds.length<3){const c=`{${fmtInt(lo+k)}, ${fmtInt(hi+k)}}`; if(!s.has(c)){s.add(c);ds.push(c);} k++;}
      return { prompt:`x² ${sgnTerm(b2)}x ${sgnTerm(c2)} = 0 ⇒ x = ?`, correct:corr, distractors:ds }; },
    (r) => { const a = ri(r,1,9), d = ri(r,2,9), n = ri(r,8,15); const c = a+(n-1)*d; return { prompt:`AP: ${a}, ${a+d}, ${a+2*d}, … → a${sub(n)} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a+n*d,a+(n-2)*d,c+d,c-d]}) }; },
    (r) => { const keys=Object.keys(TRIG); const k=keys[ri(r,0,keys.length-1)]; const corr=TRIG[k]; return { prompt:`${k} = ?`, correct:corr, distractors:strDistractors(corr, Object.values(TRIG), r) }; },
    (r) => { const th=[30,45,60][ri(r,0,2)]; return { prompt:`sin² ${th}° + cos² ${th}° = ?`, correct:1, distractors:[0, 2, "1/2"] }; },
    (r) => { const a = ri(r,20,40); const c = a*a; return { prompt:`${a}² = ?`, correct:c, distractors:intDistractors(c,r,{pool:[(a+1)*(a+1),(a-1)*(a-1),c+a]}) }; },
  ],
  11: [ // combinatorics, factorials, logs, complex numbers, GP
    (r) => { const n = ri(r,4,12), k = ri(r,2,4); if (k >= n) return null; const c = comb(n,k); return { prompt:`C(${n}, ${k}) = ?`, correct:c, distractors:intDistractors(c,r,{pool:[perm(n,k),comb(n,k===2?3:2),c+n]}) }; },
    (r) => { const n = ri(r,4,9), k = ri(r,2,3); const c = perm(n,k); return { prompt:`P(${n}, ${k}) = ?`, correct:c, distractors:intDistractors(c,r,{pool:[comb(n,k),perm(n,k===2?3:2),c+n]}) }; },
    (r) => { const n = ri(r,3,8); const c = fact(n); return { prompt:`${n}! = ?`, correct:c, distractors:intDistractors(c,r,{pool:[fact(n+1),fact(n-1),n*n,c+n]}) }; },
    (r) => { const base=[2,3,5,10][ri(r,0,3)], e = ri(r,2,5); const argn = Math.pow(base,e); return { prompt:`log${sub(base)}(${argn}) = ?`, correct:e, distractors:intDistractors(e,r,{pool:[e+1,e-1,base,argn/base]}) }; },
    (r) => { const keys=Object.keys(IPOW); const k=keys[ri(r,0,keys.length-1)]; const corr=IPOW[k]; return { prompt:`${k} = ?`, correct:corr, distractors:strDistractors(corr, Object.values(IPOW).concat(["i",`${M}i`,"1",`${M}1`]), r) }; },
    (r) => { const a = ri(r,1,5), q = ri(r,2,3), n = ri(r,4,8); const c = a*Math.pow(q,n-1); return { prompt:`GP: ${a}, ${a*q}, ${a*q*q}, … → a${sub(n)} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a*Math.pow(q,n),a*Math.pow(q,n-2),c+q]}) }; },
    (r) => { const a = ri(r,2,15), d = ri(r,3,12), n = ri(r,10,20); const c = a+(n-1)*d; return { prompt:`AP: ${a}, ${a+d}, ${a+2*d}, … → a${sub(n)} = ?`, correct:c, distractors:intDistractors(c,r,{pool:[a+n*d,a+(n-2)*d,c+d,c-d]}) }; },
  ],
  12: [ // derivatives, integrals, definite integrals, determinants, limits
    (r) => { const keys=Object.keys(DERIV); const k=keys[ri(r,0,keys.length-1)]; const corr=DERIV[k]; return { prompt:`d/dx(${k}) = ?`, correct:corr, distractors:strDistractors(corr, Object.values(DERIV), r) }; },
    (r) => { const keys=Object.keys(INTEG); const k=keys[ri(r,0,keys.length-1)]; const corr=INTEG[k]; return { prompt:`∫ ${k} dx = ?`, correct:corr, distractors:strDistractors(corr, Object.values(INTEG), r) }; },
    (r) => { if (r() < 0.6) { const b = ri(r,1,5); const c = b*b; return { prompt:`∫₀${sup(b)} 2x dx = ?`, correct:c, distractors:intDistractors(c,r,{pool:[2*b,b,c+b]}) }; } const b = ri(r,1,3); const c = b*b*b; return { prompt:`∫₀${sup(b)} 3x² dx = ?`, correct:c, distractors:intDistractors(c,r,{pool:[3*b*b,b*b,c+b]}) }; },
    (r) => { const a = ri(r,-5,9), b = ri(r,-5,9), c2 = ri(r,-5,9), d = ri(r,-5,9); const v = a*d - b*c2; return { prompt:`det[[${fmtInt(a)}, ${fmtInt(b)}], [${fmtInt(c2)}, ${fmtInt(d)}]] = ?`, correct:v, distractors:intDistractors(v,r,{allowNeg:true,pool:[a*d+b*c2,b*c2-a*d,v+1,v-1]}) }; },
    (r) => { const keys=Object.keys(LIMITS); const k=keys[ri(r,0,keys.length-1)]; const corr=LIMITS[k]; return { prompt:`lim(x→0) ${k} = ?`, correct:corr, distractors:strDistractors(corr, ["0","1","∞","1/2"], r) }; },
  ],
};

function normPrompt(p) { return p.replace(/\s+/g, "").trim(); }

let grandNew = 0;
const report = [];
for (const cls of CLASSES) {
  const file = path.join(ROOT, "content", "levels", `${cls}-math.json`);
  if (!fs.existsSync(file)) { report.push(`class ${cls}: SKIP (no ${cls}-math.json)`); continue; }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const existing = data.levels ? data.levels.flatMap((l) => l.questions || []) : (data.questions || []);
  const seen = new Set(existing.map((q) => normPrompt(q.prompt.en)));
  let maxId = 0;
  for (const q of existing) { const m = /(\d+)$/.exec(q.id || ""); if (m) maxId = Math.max(maxId, parseInt(m[1], 10)); }

  const templates = TEMPLATES[cls] || [];
  if (!templates.length) { report.push(`class ${cls}: no templates`); continue; }
  const rng = makeRng(cls * 100003 + 7);
  const nChoices = CHOICE_COUNT[cls] || 4;
  const posCounter = new Array(nChoices).fill(0);
  for (const q of existing) if (Number.isInteger(q.answerIndex) && q.answerIndex < nChoices) posCounter[q.answerIndex]++;

  const added = [];
  let attempts = 0;
  const need = TARGET - existing.length;
  while (added.length < need && attempts < need * 300 + 8000) {
    attempts++;
    const t = templates[ri(rng, 0, templates.length - 1)];
    let spec;
    try { spec = t(rng); } catch { continue; }
    if (!spec || spec.correct === undefined) continue;
    const key = normPrompt(spec.prompt);
    if (seen.has(key)) continue;
    const ds = [...new Set(spec.distractors.map(String))].filter((d) => d !== String(spec.correct));
    if (ds.length < nChoices - 1) continue;
    seen.add(key);
    maxId++;
    const q = makeQuestion(spec.prompt, spec.correct, ds.slice(0, nChoices - 1), rng, posCounter, nChoices);
    q.id = `${cls}-math-${String(maxId).padStart(3, "0")}`;
    added.push(q);
  }

  grandNew += added.length;
  report.push(`class ${cls}: +${added.length} -> ${existing.length + added.length} total (answer positions ${posCounter.join("/")})`);
  if (!DRY && added.length) {
    if (data.levels) data.levels.push({ level: `class${cls}-math-drills`, questions: added });
    else data.questions = existing.concat(added);
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  }
}

console.log(DRY ? "DRY RUN (no files written)" : "WROTE files");
report.forEach((r) => console.log("  " + r));
console.log(`Total new questions: ${grandNew}`);
console.log(`Now verify: python3 scripts/verify_math_drills.py`);
