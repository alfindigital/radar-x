import type { PriceObservation } from "./types";

function sourceMap(row: PriceObservation): NonNullable<PriceObservation["fieldSources"]> {
  return { ...(row.fieldSources ?? {}) };
}

const FIELDS = ["open", "high", "low", "close", "volume", "marketCap"] as const;

/**
 * Merge one observation into the stored row for the same symbol+date.
 * Invariants: a close-only (or legacy/unknown) observation may only update the
 * measured close, and a null field never erases a value we already know.
 */
export function mergePriceObservation(
  existing: PriceObservation | undefined,
  incoming: PriceObservation,
): PriceObservation {
  if (existing && (existing.symbol !== incoming.symbol || existing.date !== incoming.date)) {
    throw new Error("price observations must have the same symbol and date");
  }

  const kind = incoming.observationKind ?? "ohlcv";
  if (!existing) {
    return {
      ...incoming,
      observationKind: kind,
      fieldSources: sourceMap(incoming),
    };
  }

  if (kind !== "ohlcv") {
    return {
      ...existing,
      close: incoming.close ?? existing.close,
      observationKind: existing.observationKind === "ohlcv" ? "ohlcv" : kind,
      fieldSources: { ...sourceMap(existing), ...sourceMap(incoming) },
    };
  }

  const merged: PriceObservation = { ...existing, ...incoming, observationKind: kind };
  for (const field of FIELDS) {
    if (merged[field] === null || merged[field] === undefined) merged[field] = existing[field] ?? null;
  }
  merged.fieldSources = { ...sourceMap(existing), ...sourceMap(incoming) };
  return merged;
}
