import type { FlowDaily } from "./types";

export interface FlowRadarRow {
  symbol: string;
  days: number;
  observations: number;
  expectedSessions: number;
  missingSessions: number;
  cumNet: number;
  cumBuy: number;
  cumSell: number;
  lastDate: string | null;
  streak: number;
  streakStatus: "complete" | "incomplete" | "no-positive" | "unavailable";
}

export function rankFlowRows(rows: FlowDaily[], referenceDates: string[]): FlowRadarRow[] {
  const dates = [...new Set(referenceDates)].sort();
  const dateSet = new Set(dates);
  const bySymbol = new Map<string, Map<string, FlowDaily>>();
  for (const row of rows) {
    if (!dateSet.has(row.date)) continue;
    const perDate = bySymbol.get(row.symbol) ?? new Map<string, FlowDaily>();
    perDate.set(row.date, row);
    bySymbol.set(row.symbol, perDate);
  }
  return [...bySymbol.entries()].map(([symbol, perDate]) => {
    const observed = [...perDate.values()];
    const missingSessions = dates.filter((date) => !perDate.has(date)).length;
    let streak = 0;
    let encounteredMissing = false;
    for (let i = dates.length - 1; i >= 0; i -= 1) {
      const row = perDate.get(dates[i]);
      if (!row) {
        encounteredMissing = true;
        break;
      }
      if (row.netForeignInflow <= 0) break;
      streak += 1;
    }
    const streakStatus: FlowRadarRow["streakStatus"] = dates.length === 0
      ? "unavailable"
      : streak === 0
        ? (encounteredMissing ? "incomplete" : "no-positive")
        : encounteredMissing
          ? "incomplete"
          : "complete";
    return {
      symbol,
      days: observed.length,
      observations: observed.length,
      expectedSessions: dates.length,
      missingSessions,
      cumNet: observed.reduce((sum, row) => sum + row.netForeignInflow, 0),
      cumBuy: observed.reduce((sum, row) => sum + row.foreignBuyIdr, 0),
      cumSell: observed.reduce((sum, row) => sum + row.foreignSellIdr, 0),
      lastDate: observed.map((row) => row.date).sort().at(-1) ?? null,
      streak,
      streakStatus,
    };
  }).sort((a, b) => b.cumNet - a.cumNet || a.symbol.localeCompare(b.symbol));
}
