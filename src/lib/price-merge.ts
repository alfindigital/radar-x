import type { PriceObservation } from "./types";

function sourceMap(row: PriceObservation): NonNullable<PriceObservation["fieldSources"]> {
  return { ...(row.fieldSources ?? {}) };
}

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

  if (kind === "close-only") {
    return {
      ...existing,
      close: incoming.close,
      observationKind: existing.observationKind ?? "ohlcv",
      fieldSources: { ...sourceMap(existing), ...sourceMap(incoming) },
    };
  }

  return {
    ...existing,
    ...incoming,
    observationKind: kind,
    fieldSources: { ...sourceMap(existing), ...sourceMap(incoming) },
  };
}
