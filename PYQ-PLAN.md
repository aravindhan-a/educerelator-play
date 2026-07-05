# EC Play — PYQ Revision Plan (Exam-Prep Beachhead)

**The product in one line:** adaptive previous-year-question revision for
NEET / JEE / UPSC, in 13 languages, with an auto **error notebook** and **spaced
repetition** — the revision loop wrapped around official questions.

**Why PYQ-first:** accuracy-safe (official Q + official answers, no risky
generation), *finite & static* (a decade of papers is a bounded set → perfect for
our static-content-on-CDN model), universally endorsed ("solve PYQs"), and
vernacular PYQ revision is genuinely underserved. The moat isn't the questions —
everyone has those — it's the adaptive revision loop, which is already our
strength.

---

## Pilot scope (v0 — prove the loop cheaply)

- **Exam:** NEET (pure MCQ, huge volume, one clean pattern). *[decision below]*
- **Subject:** Biology (90 of NEET's 180 marks — highest leverage).
- **Years:** last 5 (2020–2024) ≈ ~450 questions. Manageable, high-value.
- **Modes shipped:** practice by topic / by year · **revise my mistakes** ·
  high-yield view · solution reveal.
- **Explicitly NOT in v0:** timed full-length mocks, JEE/UPSC, UPSC-Mains answer
  evaluation. Those are later phases.

---

## Data model (extends what exists — minimal disruption)

### 1. Exam taxonomy — new `content/exams.js` (mirrors `content/curriculum.js`)
```js
export const EXAMS = [
  {
    id: "neet", label: "NEET",
    pattern: { total: 180, durationMin: 200, marking: { correct: 4, wrong: -1 } },
    subjects: [
      { id: "physics",   label: "Physics",   topics: [/* official syllabus topics */] },
      { id: "chemistry", label: "Chemistry", topics: [/* … */] },
      { id: "biology",   label: "Biology",
        topics: ["cell-biology","plant-physiology","human-physiology",
                 "genetics-evolution","reproduction","ecology","biotechnology",
                 "diversity-living-world","structural-organisation"] },
    ],
  },
  // { id: "jee-main", … }, { id: "upsc-prelims", … } — later
];
```

### 2. PYQ question schema — extends the current question object
Same base as today (`type/prompt/choices/answerIndex`, all 13 languages) plus
exam metadata and a **solution**:
```json
{
  "id": "neet-biology-2023-042",
  "type": "mcq",
  "exam": "neet", "subject": "biology",
  "year": 2023, "topic": "human-physiology", "difficulty": 2,
  "source": "NEET 2023",
  "prompt":  { "en": "…", "hi": "…", "ta": "…", "…": "…" },
  "choices": [ { "en": "…", "…": "…" }, … ],
  "answerIndex": 1,
  "solution": { "en": "…why the answer is correct…", "…": "…" }
}
```

### 3. Storage layout
```
content/exams/neet/biology.json      { exam, subject, questions: [ …tagged by year/topic ] }
content/exams/neet/high-yield.json   precomputed topic frequency (build-time)
```
Split per-year later if a file gets large. Same **draft gate** as regional
content: `"draft": true` packs never reach students until reviewed.

### 4. Error notebook & spaced repetition — no Firestore-rules change needed
Lives inside the existing `progress` object (rules already permit writing
`progress`):
```js
progress.review = {
  "neet-biology-2023-042": { misses: 2, lastSeen: <ts>, nextReview: <ts>, box: 1 }
}
```
Interval schedule (Leitner-style): wrong → review in 1 day → 3 → 7 → 16. A
question graduates out of the notebook after N clean recalls.

---

## Engine extensions (reuse the play loop)

1. **Revision mode / error notebook** — resurfaces the PYQs a student keeps
   missing. Small extension of the existing per-skill mastery tracking.
2. **Spaced repetition** — schedule missed questions to return (the adaptive
   engine is already built for "surface what you're weak on").
3. **Solution reveal** — after answering, show the explanation (new `solution`
   field). Today there's no explanation; this is the biggest UX add.
4. **High-yield view** — "Genetics: asked 6× in the last 5 years," computed from
   the tags at build time. Aspirants treasure this.
5. **Filters** — by year, by topic, "only my mistakes," "unattempted."
6. **(Phase C) Timed mock mode** — full paper to the exact pattern (NEET 180Q /
   200min), negative marking, section timing, no per-question feedback, submit →
   score + percentile + full solution review. This is a distinct new mode.

New entry flow, reusing existing screens:
`Exam → Subject → Mode (Practice · By year · Revise mistakes · High-yield · Mock)`.

---

## Content operations (the real work — editorial, not engineering)

Pipeline per subject:
1. **Source** official papers (NTA for NEET/JEE, UPSC publishes Prelims papers).
2. **Digitise / tag** — exam, year, subject, topic, difficulty. (A one-time
   import/tagging script; extend the existing content factory + validators.)
3. **Write ORIGINAL solutions.** ⚠️ The one copyright line: the *questions* from
   official government exams are freely reproducible (every prep platform does),
   but **solutions must be our own writing** — never copy another platform's
   explanations.
4. **Validate** — schema, exactly one correct option, answer key present, all 13
   languages (reuse/extend current validators).
5. **Translate** to the 13 languages, then **SME review**, then remove `draft`.

This phase needs an editorial hand (a subject expert to author/verify solutions),
not just code. Budget for it — it's what makes the product trustworthy.

---

## Accuracy safeguards (existential for exam prep)

- Automated validators in CI before publish (schema + single-correct + langs).
- **Human SME sign-off** per pack; `draft: true` until signed off.
- Show **source attribution** ("NEET 2023") on every question — builds trust and
  is honest.
- A "report this question" button so students flag errors → fast correction loop.

---

## Monetisation

PYQ revision is a natural **premium exam-track** with much higher willingness to
pay than the ₹149 K-12 tier (aspirants/parents pay ₹10k–50k for coaching).
Suggested shape: a free sample (e.g. one recent year or one subject) to hook, then
a per-exam subscription. *[pricing decision below]* Don't out-market
PhysicsWallah/Unacademy/Testbook — win on **vernacular + affordability + adaptive**.

---

## Phased build

| Phase | Scope | Rough effort |
|---|---|---|
| **A — Engine + schema** | `exams.js`, PYQ schema, exam fetch path in `question-bank.js`, revision mode + error notebook + solution reveal + high-yield view; seed a small NEET-Bio pack (a few verified PYQs) to prove the loop end-to-end | ~1–2 wks eng |
| **B — Content scale** | full NEET Bio (5 yrs), tagging/import tooling, translations, review workflow | editorial-led |
| **C — Timed mocks** | full-length mock engine: pattern, timer, negative marking, submit, percentile/rank, review | ~1–2 wks eng |
| **D — Expand** | JEE Main next; UPSC last (bigger: current affairs pipeline + Mains answer evaluation) | ongoing |

---

## Decisions that shape this (yours to make)

1. **Pilot exam & subject** — recommend **NEET Biology**. (JEE if you'd rather
   start with numeric-answer questions; UPSC is the biggest lift, do it last.)
2. **Who writes the solutions** — this is the bottleneck and the quality bar. In-
   house SME, a hire, or a content partnership?
3. **Pricing** for the exam track and the free/paid boundary.
4. **v0 = practice/revision only, or include a first timed mock?** (Recommend
   revision-only for v0; mocks in Phase C.)

---

## What I can build immediately (the code-shaped Phase A)
`content/exams.js` taxonomy + the PYQ schema + a seeded sample NEET-Bio pack
(a handful of real PYQs I can author with verified answers + original solutions)
+ `question-bank.js` exam path + revision mode / error notebook / solution reveal
+ validators. A working end-to-end proof you can click through — *without*
committing to the full content build.
