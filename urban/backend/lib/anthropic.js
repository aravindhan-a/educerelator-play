import Anthropic from "@anthropic-ai/sdk";
import { REGION_LABELS } from "./regions.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CURRICULUM_DESC = {
  cbse:          "Indian CBSE (Central Board of Secondary Education)",
  state:         "Indian State Board curriculum",
  international: "International curriculum (IB / Cambridge IGCSE equivalent)",
};

// 13 languages generated in every batch — frontend picks the right one instantly
const LANG_NAMES = {
  en: "English", hi: "Hindi (हिन्दी)", ta: "Tamil (தமிழ்)",
  bn: "Bengali (বাংলা)", te: "Telugu (తెలుగు)", mr: "Marathi (मराठी)",
  gu: "Gujarati (ગુજરાતી)", kn: "Kannada (ಕನ್ನಡ)", ml: "Malayalam (മലയാളം)",
  pa: "Punjabi (ਪੰਜਾਬੀ)", ur: "Urdu (اردو)", or: "Odia (ଓଡ଼ିଆ)",
  ne: "Nepali (नेपाली)",
};

const LANG_KEYS = Object.keys(LANG_NAMES);

export async function generateQuestionBatch({
  classNum, subject, curriculum, difficulty, region = "all", count = 20,
}) {
  const currDesc = CURRICULUM_DESC[curriculum] || curriculum;
  const regionLabel = REGION_LABELS[region] || null;

  // Contextual education: ground questions in the student's lived world.
  const regionBlock = regionLabel ? `

Contextual grounding — the student lives in ${regionLabel}, India:
- Set word problems and examples in everyday life there: local rivers, crops,
  festivals, foods, markets, landmarks, transport and city/town names that a
  student in ${regionLabel} actually encounters.
- The concept tested must stay exactly on the ${currDesc} syllabus; only the
  context is local.
- Every local fact used (river names, festival seasons, crops, landmarks)
  must be verifiably correct — when unsure of a local detail, use a neutral
  setting instead of guessing.` : "";

  const prompt = `Generate ${count} multiple-choice quiz questions for a Class ${classNum} student
studying "${subject}" under the ${currDesc} curriculum, at difficulty level ${difficulty}
(1 = easiest, 10 = hardest).${regionBlock}

Return ONLY a valid JSON array, no markdown fences or prose. Each item must follow this exact shape:
{
  "id": "c${classNum}-${subject}-001",
  "type": "identify",
  "prompt": {
    "en": "...", "hi": "...", "ta": "...", "bn": "...", "te": "...",
    "mr": "...", "gu": "...", "kn": "...", "ml": "...",
    "pa": "...", "ur": "...", "or": "...", "ne": "..."
  },
  "visual": "🔬",
  "choices": [
    { "en": "...", "hi": "...", "ta": "...", "bn": "...", "te": "...",
      "mr": "...", "gu": "...", "kn": "...", "ml": "...",
      "pa": "...", "ur": "...", "or": "...", "ne": "..." },
    { "en": "...", "hi": "...", "ta": "...", "bn": "...", "te": "...",
      "mr": "...", "gu": "...", "kn": "...", "ml": "...",
      "pa": "...", "ur": "...", "or": "...", "ne": "..." },
    { "en": "...", "hi": "...", "ta": "...", "bn": "...", "te": "...",
      "mr": "...", "gu": "...", "kn": "...", "ml": "...",
      "pa": "...", "ur": "...", "or": "...", "ne": "..." },
    { "en": "...", "hi": "...", "ta": "...", "bn": "...", "te": "...",
      "mr": "...", "gu": "...", "kn": "...", "ml": "...",
      "pa": "...", "ur": "...", "or": "...", "ne": "..." }
  ],
  "answerIndex": 0
}

Languages to translate into: ${LANG_KEYS.map(k => LANG_NAMES[k]).join(", ")}.

Requirements:
- Strictly aligned to Class ${classNum} ${currDesc} syllabus for ${subject}.
- All 13 language translations must be natural and age-appropriate — not literal word-for-word.
- Difficulty ${difficulty}: ${difficulty <= 3 ? "simple recall and recognition" : difficulty <= 6 ? "application and reasoning" : "analysis, inference, or multi-step problems"}.
- Exactly 4 choices per question — one correct, three plausible distractors.
- Vary question types; do not repeat identical scenarios.
- Keep choices short (a word, number, or brief phrase) in all languages.
- Emoji visual must relate clearly to the question topic.
- Use correct script for each language (Devanagari for hi/mr/ne, Tamil script for ta, etc.).`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.trim()
    .replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  return JSON.parse(text);
}
