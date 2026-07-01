# Content schema

Shared by both builds. Rural reads these files directly (cached offline by the
service worker). Urban's backend uses them as seed/reference so AI-generated
questions stay on-topic, age-appropriate, and in the right shape.

## Level file (`content/levels/<skill>.json`)

```json
{
  "skill": "numbers",
  "levels": [
    {
      "id": "numbers-1-5",
      "difficulty": 1,
      "questions": [
        {
          "id": "num-1-5-001",
          "type": "count",
          "prompt": { "en": "How many apples?", "hi": "...", "ta": "..." },
          "visual": "🍎🍎🍎",
          "choices": [
            { "en": "2", "hi": "2", "ta": "2" },
            { "en": "3", "hi": "3", "ta": "3" },
            { "en": "4", "hi": "4", "ta": "4" }
          ],
          "answerIndex": 1,
          "audioId": "num-1-5-001"
        }
      ]
    }
  ]
}
```

Field notes:
- `id` — stable, used as the `audioId` lookup key (`urban/frontend/audio/<lang>/<id>.mp3`)
  unless a question sets its own `audioId`.
- `prompt` / `choices` — always keyed by `en` / `hi` / `ta`. Rural ships with all
  three baked in; urban's AI-generated questions also produce all three per item.
- `difficulty` — integer, used by the adaptive engine (see `shared-lib/adaptive-engine.js`)
  to pick the next question's level based on recent accuracy/speed.
- `visual` — emoji string (rural never downloads images).

## i18n file (`content/i18n/<lang>.json`)

UI strings only (buttons, headers, feedback messages) — not question content.

```json
{
  "play": "Play",
  "correct": "Well done!",
  "tryAgain": "Try again!"
}
```
