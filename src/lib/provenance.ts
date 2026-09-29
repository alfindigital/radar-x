export function safeSourceUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function availableBy(timestamp: string | null | undefined, verified: boolean, asOf: string): boolean {
  if (!verified || !timestamp) return false;
  const observed = Date.parse(timestamp);
  const cutoff = Date.parse(`${asOf}T23:59:59.999Z`);
  return Number.isFinite(observed) && Number.isFinite(cutoff) && observed <= cutoff;
}
