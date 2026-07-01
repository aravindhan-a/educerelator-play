import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CURRICULUM_DESC = {
  cbse:          "Indian CBSE (Central Board of Secondary Education)",
  state:         "Indian State Board curriculum",
  international: "International curriculum (IB / Cambridge IGCSE equivalent)",
};

export async function generateQuestionBatch({
  classNum, subject, curriculum, difficulty, count = 20,
}) {
  const currDesc = CURRICULUM_DESC[curriculum] || curriculum;

  const prompt = `Generate ${count} multiple-choice quiz questions for a Class ${classNum} student
studying "${subject}" under the ${currDesc} curriculum, at difficulty level ${difficulty}
(1 = easiest, 10 = hardest).

Return ONLY a valid JSON array, no markdown fences or prose. Each item must follow this exact shape:
{
  "id": "<unique short id, e.g. c${classNum}-${subject}-001>",
  "type": "<short type tag, e.g. identify, count, match, solve, recall>",
  "prompt": { "en": "...", "hi": "...", "ta": "..." },
  "visual": "<1-6 relevant emoji that illustrate the question — no image files>",
  "choices": [
    { "en": "...", "hi": "...", "ta": "..." },
    { "en": "...", "hi": "...", "ta": "..." },
    { "en": "...", "hi": "...", "ta": "..." }
  ],
  "answerIndex": <0, 1, or 2>
}

Requirements:
- Strictly aligned to Class ${classNum} ${currDesc} syllabus for ${subject}.
- Natural, age-appropriate language in all three languages (English, Hindi, Tamil).
- Difficulty ${difficulty}: ${difficulty <= 3 ? "simple recall and recognition" : difficulty <= 6 ? "application and reasoning" : "analysis, inference, or multi-step problems"}.
- Exactly 3 choices per question — one correct, two plausible distractors.
- Vary question types; do not repeat identical scenarios.
- Keep choices short (a word, number, or brief phrase).
- Emoji visual must relate clearly to the question topic.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].text.trim()
    .replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  return JSON.parse(text);
}
