function cacheKey(classNum, subject, curriculum, difficulty) {
  return `bank:${classNum}:${subject}:${curriculum}:${difficulty}`;
}

function getKV() {
  if (
    !process.env.KV_REST_API_URL ||
    !process.env.KV_REST_API_TOKEN
  ) return null;
  try {
    const { kv } = require("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export async function getCachedBatch(classNum, subject, curriculum, difficulty) {
  const kv = getKV();
  if (!kv) return null;
  try {
    return await kv.get(cacheKey(classNum, subject, curriculum, difficulty));
  } catch {
    return null;
  }
}

export async function setCachedBatch(classNum, subject, curriculum, difficulty, questions) {
  const kv = getKV();
  if (!kv) return;
  try {
    await kv.set(
      cacheKey(classNum, subject, curriculum, difficulty),
      questions,
      { ex: 60 * 60 * 24 * 7 }
    );
  } catch {
    // cache miss is acceptable
  }
}
