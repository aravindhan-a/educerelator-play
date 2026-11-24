#!/usr/bin/env node
// Independent verifier for ALL Class 1 English and EVS questions (curated,
// generated and the depth pack). It shares no tables with the generators:
// every answer is re-derived here from separately written truth tables, so a
// mistake in one place cannot hide in the other.
//
// Checks, for every question:
//   • prompt and all 3 options present in all 13 languages, ids unique
//   • exactly one correct option, no duplicate options
//   • English subject: options identical in every language (English stays English)
//   • the marked answer is right, and no distractor is also right
//
// Usage: node scripts/verify-class1-depth.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en","hi","ta","te","bn","mr","gu","kn","ml","pa","ur","or","ne"];
const errs = [];
const fail = (q, msg) => errs.push(`${q.id}: ${msg}`);
const strip = (s) => s.replace(/^\S+\s/u, "").trim(); // drop a leading picture
const answerOf = (q) => q.choices[q.answerIndex]?.en;

// ── Independent truth tables ────────────────────────────────────────────────
const PICTURE_WORD = { "🍎":"apple","⚽":"ball","🐱":"cat","🐶":"dog","🥚":"egg","🐟":"fish","🐐":"goat","🎩":"hat","🍦":"ice cream","🧃":"juice","🪁":"kite","🦁":"lion","🌙":"moon","👃":"nose","🍊":"orange","🐇":"rabbit","☀️":"sun","🌳":"tree","☂️":"umbrella","🦓":"zebra","⌚":"watch","🚌":"bus","🥭":"mango","🍌":"banana","✋":"hand","🐦":"bird","🐴":"horse","📖":"book","🖊️":"pen","🛏️":"bed","📦":"box","🦊":"fox","🐷":"pig","🦇":"bat","🕸️":"web","🐀":"rat","🚐":"van","🧢":"cap","🔟":"ten","🐜":"ant","🗺️":"map","🐄":"cow","🐘":"elephant","🐒":"monkey","🍇":"grape","🚗":"car","🚂":"train","⛵":"boat","✈️":"aeroplane","⭐":"star","🌸":"flower","👁️":"eye","👂":"ear","🏠":"house","🔴":"red","🔵":"blue","🟢":"green","🟡":"yellow" };
// Other fair names a child might use (their first letters can't be distractors).
const OTHER_NAMES = { "🐶":["puppy"], "🐱":["kitten"], "🎩":["cap"], "🍦":["cone"], "🧃":["drink"], "🐇":["bunny"], "⌚":["clock"], "⚽":["football"], "🍊":["fruit"], "🥭":["fruit"], "🍌":["fruit"] };
const RIME = { cat:"at",hat:"at",bat:"at",sun:"un",run:"un",dog:"og",log:"og",bee:"ee",tree:"ee",car:"ar",star:"ar",ten:"en",hen:"en",pen:"en",bed:"ed",red:"ed",cake:"ake",snake:"ake",mouse:"ouse",house:"ouse",goat:"oat",boat:"oat",bug:"ug",rug:"ug",fish:"ish",dish:"ish",pig:"ig",wig:"ig",fan:"an",van:"an",king:"ing",ring:"ing",moon:"oon",spoon:"oon",bear:"ear",pear:"ear",fox:"ox",box:"ox",ball:"all",wall:"all",cup:"up" };
const START_SOUND = { cat:"k",car:"k",ball:"b",bus:"b",dog:"d",duck:"d",sun:"s",star:"s",moon:"m",mango:"m",fish:"f",fan:"f",hat:"h",hen:"h",pen:"p",pig:"p",tree:"t",ten:"t",goat:"g",girl:"g" };
const OPPOSITE = { big:"small",hot:"cold",up:"down",in:"out",day:"night",happy:"sad",fast:"slow",open:"close",tall:"short",wet:"dry",full:"empty",old:"new",good:"bad",yes:"no",push:"pull",come:"go",top:"bottom",black:"white" };
for (const [a, b] of Object.entries({ ...OPPOSITE })) OPPOSITE[b] = a;

// EVS facts, written as plain sets.
const FACT = {
  "can fly": new Set(["bird","aeroplane","butterfly","bee"]),
  "lives in water": new Set(["fish","crab","whale"]),
  "do we eat": new Set(["apple","mango","banana","grape","orange","carrot","rice","bread"]),
  "brush our teeth": new Set(["toothbrush"]),
  "night sky": new Set(["moon","star"]),
  "gives us milk": new Set(["cow","goat"]),
  "gives us eggs": new Set(["hen","duck"]),
  "keep clean": new Set(["soap","toothbrush","water"]),
  "when it rains": new Set(["umbrella"]),
  "wild animal": new Set(["lion","tiger"]),
  "pet animal": new Set(["dog","cat"]),
  "moves on water": new Set(["boat","ship"]),
  "moves on the road": new Set(["car","bus","cycle"]),
  "do we wear": new Set(["shirt","shoe"]),
  "sleep on": new Set(["bed"]),
  "grows on a tree": new Set(["mango","apple","orange"]),
  "gives us light": new Set(["sun","bulb"]),
  "an animal": new Set(["dog","cat","cow","lion","elephant","monkey","fish","bird","horse","goat"]),
  "a fruit": new Set(["apple","mango","banana","grape","orange"]),
  "a vehicle": new Set(["car","bus","train","boat","aeroplane"]),
};
// Things that are TRUE for a fact but deliberately never used either way.
const AMBIGUOUS = { "can fly": new Set(["duck","hen"]), "lives in water": new Set(["duck","frog"]), "gives us light": new Set(["moon","star"]) };
const BODY = { see:"eye", hear:"ear", smell:"nose", taste:"tongue", walk:"leg", "hold things":"hand" };
const LEGS = { "🐶":4,"🐄":4,"🐱":4,"🐐":4,"🐴":4,"🐘":4,"🦁":4,"🐔":2,"🦆":2,"🐦":2,"🐜":6,"🕷️":8 };
const SHAPE = { "🔺":"triangle", "⬛":"square", "🔵":"circle" };
const COLOUR = { "🟥":"red", "🟦":"blue", "🟩":"green" };

// ── Generic checks ──────────────────────────────────────────────────────────
function generic(q, english) {
  for (const l of LANGS) if (!q.prompt?.[l]) fail(q, `prompt missing ${l}`);
  if (!Array.isArray(q.choices) || q.choices.length !== 3) return fail(q, "needs 3 options");
  for (const c of q.choices) for (const l of LANGS) if (!c[l]) fail(q, `option missing ${l}`);
  const en = q.choices.map((c) => c.en);
  if (new Set(en).size !== 3) fail(q, `duplicate options ${en}`);
  if (![0, 1, 2].includes(q.answerIndex)) fail(q, "bad answerIndex");
  if (english) for (const c of q.choices) for (const l of LANGS) if (c[l] !== c.en) fail(q, `English option translated in ${l}: ${c[l]}`);
}
// Exactly one option satisfies `ok`, and it is the marked one.
function exactlyOne(q, ok, what) {
  const hits = q.choices.map((c, i) => (ok(c.en) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) fail(q, `${what}: ${hits.length} options correct (${q.choices.map((c) => c.en)})`);
  else if (hits[0] !== q.answerIndex) fail(q, `${what}: marked ${answerOf(q)}, correct is ${q.choices[hits[0]].en}`);
}

// ── English ─────────────────────────────────────────────────────────────────
function checkEnglish(q) {
  generic(q, true);
  const p = q.prompt.en, v = q.visual || "";
  if (p.startsWith("Which capital letter")) { if (v !== v.toLowerCase()) fail(q, "visual must be a small letter"); return exactlyOne(q, (o) => o === v.toUpperCase(), "capital letter"); }
  if (p.startsWith("Which small letter")) return exactlyOne(q, (o) => o === v.toLowerCase(), "small letter");
  if (p.startsWith("The English word for this picture")) {
    const word = PICTURE_WORD[v];
    if (!word) return fail(q, `unknown picture ${v}`);
    const fair = new Set([word, ...(OTHER_NAMES[v] || [])].map((w) => w[0].toUpperCase()));
    exactlyOne(q, (o) => o === word[0].toUpperCase(), "first letter");
    q.choices.forEach((c, i) => { if (i !== q.answerIndex && fair.has(c.en)) fail(q, `distractor ${c.en} is also a fair answer`); });
    return;
  }
  if (p === "Which letter is missing?") {
    const [pic, ...rest] = v.split(/\s+/);
    const shown = rest.join("");
    const word = PICTURE_WORD[pic];
    if (!word || word.length !== shown.length) return fail(q, `bad missing-letter visual ${v}`);
    return exactlyOne(q, (o) => shown.replace("_", o) === word, "missing letter");
  }
  if (p.startsWith("Which word ends with the same sound")) {
    const word = strip(v);
    if (!RIME[word]) return fail(q, `no rime for ${word}`);
    return exactlyOne(q, (o) => RIME[o] === RIME[word] && o !== word, "rhyme");
  }
  if (p.startsWith("Which word starts with the same sound")) {
    const word = strip(v).toLowerCase();
    if (!START_SOUND[word]) return fail(q, `no start sound for ${word}`);
    return exactlyOne(q, (o) => START_SOUND[o.toLowerCase()] === START_SOUND[word] && o.toLowerCase() !== word, "same start");
  }
  if (p === "Which letter comes next?") {
    const seq = v.replace("_", "").trim().split(/\s+/);
    const last = seq[seq.length - 1].charCodeAt(0);
    for (let i = 1; i < seq.length; i++) if (seq[i].charCodeAt(0) !== seq[i - 1].charCodeAt(0) + 1) fail(q, `sequence not consecutive ${v}`);
    return exactlyOne(q, (o) => o === String.fromCharCode(last + 1), "next letter");
  }
  if (p.startsWith("What is the opposite")) return exactlyOne(q, (o) => OPPOSITE[v] === o, "opposite");
  if (p === "Which English word matches the picture?") {
    const word = PICTURE_WORD[v];
    if (!word) return fail(q, `unknown picture ${v}`);
    return exactlyOne(q, (o) => o.toLowerCase() === word, "picture word");
  }
  fail(q, `no rule for prompt "${p}"`);
}

// ── EVS ─────────────────────────────────────────────────────────────────────
function checkEvs(q) {
  generic(q, false);
  const p = q.prompt.en, v = q.visual || "";
  const word = (o) => strip(o).toLowerCase();
  const plain = (o) => o.toLowerCase();
  // Picture-labelled options must show the same picture in every language.
  for (const c of q.choices) {
    const pic = c.en.split(" ")[0];
    if (/\p{Extended_Pictographic}/u.test(pic)) for (const l of LANGS) if (!c[l].startsWith(pic)) fail(q, `picture missing in ${l} option`);
  }
  const m = p.match(/^Which body part do we use to (.+)\?$/);
  if (m) {
    const part = BODY[m[1]];
    if (!part) return fail(q, `unknown sense ${m[1]}`);
    return exactlyOne(q, (o) => word(o) === part, "body part");
  }
  if (p === "How many legs does this animal have?") return exactlyOne(q, (o) => Number(o) === LEGS[v], "legs");
  if (p === "How many legs does a dog have?") return exactlyOne(q, (o) => o === "4", "legs");
  if (p === "What shape is this?") return exactlyOne(q, (o) => plain(o) === SHAPE[v], "shape");
  if (p === "What color is this?") return exactlyOne(q, (o) => plain(o) === COLOUR[v], "colour");
  if (p === "Which one gives us milk?") return exactlyOne(q, (o) => FACT["gives us milk"].has(plain(o)), "milk");
  if (p === "Which animal says meow?") return exactlyOne(q, (o) => plain(o) === "cat", "meow");
  if (p === "Which one can fly?") return exactlyOne(q, (o) => FACT["can fly"].has(plain(o)), "fly");
  if (p === "Which word matches the picture?") {
    const w = PICTURE_WORD[v];
    if (!w) return fail(q, `unknown picture ${v}`);
    return exactlyOne(q, (o) => plain(o) === w, "picture word");
  }
  const key = Object.keys(FACT).find((k) => p.includes(k));
  if (key) {
    const opts = q.choices.map((c) => word(c.en));
    for (const o of opts) if (AMBIGUOUS[key]?.has(o)) fail(q, `ambiguous option ${o} for "${key}"`);
    return exactlyOne(q, (o) => FACT[key].has(word(o)), key);
  }
  fail(q, `no rule for prompt "${p}"`);
}

// Give-away check: a picture must never show the answer itself.
function noGiveaway(q) {
  const v = q.visual || "";
  if (!v || /How many legs|What shape|What color|Which letter|matches the picture|this picture|missing|same sound|opposite|comes next|small letter|capital letter/.test(q.prompt.en)) return;
  if (answerOf(q).includes(v)) fail(q, `picture ${v} gives the answer away`);
}

const ids = new Set();
let total = 0;
for (const [file, check] of [["content/levels/1-english.json", checkEnglish], ["content/levels/1-evs.json", checkEvs]]) {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  for (const lvl of data.levels) for (const q of lvl.questions) {
    total++;
    if (ids.has(q.id)) fail(q, "duplicate id"); ids.add(q.id);
    check(q); noGiveaway(q);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} problems in ${total} Class 1 questions:\n` + errs.slice(0, 40).join("\n")); process.exit(1); }
console.log(`Independently verified all ${total} Class 1 English and EVS questions.`);
console.log("ALL CORRECT ✓  (13 languages present; English options stay English; one right answer; no give-away pictures)");
