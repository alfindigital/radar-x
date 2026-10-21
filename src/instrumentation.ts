// Warm only what the home page reads (tickers, insider, flow and the derived
  // artifacts). Loading the whole snapshot here would parse ~120 MB, including
  // the 70 MB broker file, on every cold start before the first request.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ loadSnapshotParts }, { loadDerived }] = await Promise.all([import("./lib/snapshot"), import("./lib/derive")]);
  await Promise.allSettled([loadSnapshotParts(["tickers", "insider", "flow"]), loadDerived()]);
}
