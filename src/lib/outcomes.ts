import type { MeasuredOutcome, PriceDaily } from "./types";

type Horizon = 7 | 30 | 60;

const BASIS = "transaction-relative-retrospective" as const;

function addDays(date: string, days: number): string {
  return new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000 > 0
    ? new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
    : date;
}

function elapsedDays(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

function closeByDate(rows: PriceDaily[], asOf: string, label: string): Map<string, number> {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || row.date > asOf) continue;
    if (!Number.isFinite(row.close) || row.close <= 0) continue;
    const prior = byDate.get(row.date);
    if (prior !== undefined && prior !== row.close) {
      throw new Error(`conflicting duplicate ${label} close for ${row.date}`);
    }
    byDate.set(row.date, row.close);
  }
  return byDate;
}

function base(horizonDays: Horizon): MeasuredOutcome {
  return {
    status: "unavailable",
    reason: null,
    basis: BASIS,
    horizonDays,
    startDate: null,
    targetDate: null,
    endDate: null,
    elapsedDays: null,
    startClose: null,
    endClose: null,
    issuerPct: null,
    benchmarkPct: null,
    excessPp: null,
    adjustmentBasis: "unverified",
  };
}

export function measureOutcome(
  prices: PriceDaily[],
  benchmark: PriceDaily[],
  anchor: string,
  horizonDays: Horizon,
  asOf: string,
): MeasuredOutcome {
  const result = base(horizonDays);
  const issuer = closeByDate(prices, asOf, "issuer");
  const bench = closeByDate(benchmark, asOf, "benchmark");
  if (!bench.size) {
    result.reason = "Benchmark observations are unavailable for a paired outcome.";
    return result;
  }
  if (!issuer.size) {
    result.reason = "Issuer observations are unavailable for a paired outcome.";
    return result;
  }

  const common = [...issuer.keys()].filter((date) => bench.has(date)).sort();
  const startDeadline = addDays(anchor, 7);
  const startDate = common.find((date) => date >= anchor && date <= startDeadline);
  if (!startDate) {
    result.reason = asOf < anchor ? "Anchor is after the snapshot as-of date." : "No common start session within seven days of the anchor.";
    return result;
  }
  const targetDate = addDays(startDate, horizonDays);
  result.startDate = startDate;
  result.startClose = issuer.get(startDate)!;
  result.targetDate = targetDate;
  if (asOf < targetDate) {
    result.status = "pending";
    result.reason = "The full forward horizon has not elapsed as of the snapshot.";
    return result;
  }

  const endDeadline = addDays(targetDate, 7);
  const endDate = common.find((date) => date >= targetDate && date <= endDeadline);
  if (!endDate) {
    result.reason = "No common end session exists within seven days of the target.";
    return result;
  }
  const startClose = issuer.get(startDate)!;
  const endClose = issuer.get(endDate)!;
  const benchmarkStart = bench.get(startDate)!;
  const benchmarkEnd = bench.get(endDate)!;
  const issuerPct = ((endClose - startClose) / startClose) * 100;
  const benchmarkPct = ((benchmarkEnd - benchmarkStart) / benchmarkStart) * 100;
  result.status = "complete";
  result.reason = null;
  result.endDate = endDate;
  result.endClose = endClose;
  result.elapsedDays = elapsedDays(startDate, endDate);
  result.issuerPct = issuerPct;
  result.benchmarkPct = benchmarkPct;
  result.excessPp = issuerPct - benchmarkPct;
  return result;
}
