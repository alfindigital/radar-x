// Warm the mtime-keyed artifact caches at server start so the first request
// does not pay the full ~45MB JSON parse cost.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ loadSnapshot }, { loadDerived }] = await Promise.all([import("./lib/snapshot"), import("./lib/derive")]);
  await Promise.allSettled([loadSnapshot(), loadDerived()]);
}
