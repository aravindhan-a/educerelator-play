#!/usr/bin/env node
/**
 * One-time seed content generator for Educerelator Play.
 *
 * Run from the project root:
 *   cd urban/backend && npm install
 *   cd ../..
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-seed-content.js
 *
 * Existing files are skipped (safe to re-run after a failure).
 * Uses claude-haiku for speed and cost efficiency.
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname  = dirname(fileURLToPath(import.meta.url));
const LEVELS_DIR = join(__dirname, "..", "content", "levels");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Class 1 is already seeded manually; everything else is generated here.
const CONTENT_MAP = [
  { classNum: 2,  subjects: ["math", "english", "evs"] },
  { classNum: 3,  subjects: ["math", "english", "science", "social-studies"] },
  { classNum: 4,  subjects: ["math", "english", "science", "social-studies"] },
  { classNum: 5,  subjects: ["math", "english", "science", "social-studies"] },
  { classNum: 6,  subjects: ["math", "science", "english", "social-studies", "hindi", "tamil"] },
  { classNum: 7,  subjects: ["math", "science", "english", "social-studies", "hindi", "tamil"] },
  { classNum: 8,  subjects: ["math", "science", "english", "social-studies", "hindi", "tamil"] },
  { classNum: 9,  subjects: ["math", "science", "english", "social-studies", "computer-science"] },
  { classNum: 10, subjects: ["math", "science", "english", "social-studies", "computer-science"] },
  {
    classNum: 11,
    subjects: [
      "math", "physics", "chemistry", "biology", "english",
      "economics", "business-studies", "history", "geography",
      "political-science", "computer-science", "psychology", "sociology",
    ],
  },
  {
    classNum: 12,
    subjects: [
      "math", "physics", "chemistry", "biology", "english",
      "economics", "business-studies", "history", "geography",
      "political-science", "computer-science", "psychology", "sociology",
    ],
  },
];

async function generate(classNum, subject) {
  const filePath = join(LEVELS_DIR, `${classNum}-${subject}.json`);
  if (existsSync(filePath)) {
    process.stdout.write(`  skip  ${classNum}-${subject}.json\n`);
    return;
  }

  process.stdout.write(`  gen   ${classNum}-${subject}...\n`);

  const prompt = `Generate 10 multiple-choice quiz questions for a Class ${classNum} student studying "${subject}" under the Indian CBSE curriculum at difficulty level 2 (simple recall and recognition).

Return ONLY a valid JSON array — no markdown fences, no prose. Each element must follow this exact shape:
{
  "id": "c${classNum}-${subject}-001",
  "type": "recall",
  "prompt": { "en": "...", "hi": "...", "ta": "..." },
  "visual": "<1-3 relevant emoji>",
  "choices": [
    { "en": "...", "hi": "...", "ta": "..." },
    { "en": "...", "hi": "...", "ta": "..." },
    { "en": "...", "hi": "...", "ta": "..." }
  ],
  "answerIndex": <0, 1, or 2>
}

Rules:
- Strictly aligned to Class ${classNum} CBSE syllabus for ${subject}.
- Age-appropriate language in all three languages (English, Hindi, Tamil).
- Exactly 3 choices per question — one correct, two plausible distractors.
- Vary question types (don't repeat same scenario).
- Keep choices short (a word, number, or brief phrase).
- Increment the id suffix: 001, 002, 003…`;

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3500,
    messages: [{ role: "user", content: prompt }],
  });

  let text = resp.content[0].text.trim()
    .replace(/^```(?:json)?[^\n]*\n?/, "").replace(/```$/, "").trim();

  const questions = JSON.parse(text);
  writeFileSync(filePath, JSON.stringify(questions, null, 2));
  process.stdout.write(`  done  ${questions.length} q → ${classNum}-${subject}.json\n`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set.\n");
    console.error("Usage: ANTHROPIC_API_KEY=sk-... node scripts/generate-seed-content.js");
    process.exit(1);
  }

  mkdirSync(LEVELS_DIR, { recursive: true });

  let total = 0;
  for (const { subjects } of CONTENT_MAP) total += subjects.length;
  console.log(`Generating seed content for ${total} class/subject combos…\n`);

  for (const { classNum, subjects } of CONTENT_MAP) {
    console.log(`Class ${classNum}:`);
    for (const subject of subjects) {
      try {
        await generate(classNum, subject);
      } catch (err) {
        console.error(`  ERROR ${classNum}-${subject}: ${err.message}`);
      }
      // Gentle rate limiting between calls
      await new Promise((r) => setTimeout(r, 700));
    }
  }

  console.log("\nAll done! Content is in content/levels/");
}

main();
