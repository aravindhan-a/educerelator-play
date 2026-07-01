import { kv } from "@vercel/kv";

function cacheKey(classNum, subject, curriculum, difficulty) {
  return `bank:${classNum}:${subject}:${curriculum}:${difficulty}`;
}

export async function getCachedBatch(classNum, subject, curriculum, difficulty) {
  return kv.get(cacheKey(classNum, subject, curriculum, difficulty));
}

export async function setCachedBatch(classNum, subject, curriculum, difficulty, questions) {
  await kv.set(
    cacheKey(classNum, subject, curriculum, difficulty),
    questions,
    { ex: 60 * 60 * 24 * 7 }
  );
}
