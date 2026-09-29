// Case detection engine — finds explainable positioning patterns in stored data.
// Patterns: EXIT_AHEAD, STEALTH_ACCUMULATION, INSIDER_CONTRA_BUY, CLUSTER_PATTERN.
// Everything is descriptive statistics over public disclosures — no advice.

import type {
  Candidate,
  CandidatePattern,
  CaseOutcome,
  CasePattern,
  CaseRecord,
  FlowDaily,
  InsiderTrade,
  PriceDaily,
} from "./types";

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mad(xs: number[], med: number): number {
  if (!xs.length) return 1;
  const m = median(xs.map((x) => Math.abs(x - med)));
  return m === 0 ? 1 : m;
}

function closeOnOrAfter(prices: PriceDaily[], date: string): number | null {
  for (const p of prices) {
    if (p.date >= date) return p.close;
  }
  return prices.length ? prices.at(-1)!.close : null;
}

function closeOnOrBefore(prices: PriceDaily[], date: string): number | null {
  for (let i = prices.length - 1; i >= 0; i--) {
    if (prices[i].date <= date) return prices[i].close;
  }
  return null;
}

function shiftDays(date: string, days: number): string {
  return new Date(new Date(date).getTime() + days * 864e5).toISOString().slice(0, 10);
}

function fwdReturn(prices: PriceDaily[], anchor: string, days: number): number | null {
  const base = closeOnOrBefore(prices, anchor);
  const fwd = closeOnOrAfter(prices, shiftDays(anchor, days));
  const lastDate = prices.at(-1)?.date;
  if (base === null || fwd === null || base === 0 || !lastDate) return null;
  // require ~2/3 of the forward window to have elapsed before calling it realized
  if (lastDate < shiftDays(anchor, Math.floor(days * 0.66))) return null;
  return ((fwd - base) / base) * 100;
}

function outcome(prices: PriceDaily[], bench: PriceDaily[], anchor: string): CaseOutcome {
  return {
    fwd7dPct: fwdReturn(prices, anchor, 7),
    fwd30dPct: fwdReturn(prices, anchor, 30),
    fwd60dPct: fwdReturn(prices, anchor, 60),
    benchmarkFwd30dPct: fwdReturn(bench, anchor, 30),
  };
}

interface Windows {
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  bench: PriceDaily[];
}

function tradeKey(trade: InsiderTrade): string {
  return [trade.symbol, trade.holderName, trade.holderType, trade.txnType, trade.txnDate, trade.amount, trade.price, trade.value, trade.pctBefore, trade.pctAfter, trade.sourceUrl ?? ""].join("|");
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface CandidateWindows {
  insider: InsiderTrade[];
  flow: FlowDaily[];
  price: PriceDaily[];
  bench?: PriceDaily[];
}

function evidenceStats(w: Windows, windowStart: string, anchor: string) {
  const flowWin = w.flow.filter((f) => f.date >= windowStart && f.date <= anchor);
  const flowBase = w.flow.filter((f) => f.date < windowStart).map((f) => f.netForeignInflow);
  const med = median(flowBase);
  const scale = mad(flowBase, med) * 1.4826;
  const cum = flowWin.reduce((s, f) => s + f.netForeignInflow, 0);
  const abnormalFlowZ = (cum - med * Math.max(1, flowWin.length)) / (scale * Math.sqrt(Math.max(1, flowWin.length)));

  const priceWin = w.price.filter((p) => p.date >= windowStart && p.date <= anchor);
  const volBase = w.price.filter((p) => p.date < windowStart).map((p) => p.volume);
  const vmed = median(volBase);
  const vscale = mad(volBase, vmed) * 1.4826;
  const vavg = priceWin.length ? priceWin.reduce((s, p) => s + p.volume, 0) / priceWin.length : 0;
  const abnormalVolumeZ = vscale ? (vavg - vmed) / vscale : 0;

  const c0 = closeOnOrBefore(w.price, windowStart);
  const c1 = closeOnOrBefore(w.price, anchor);
  const b0 = closeOnOrBefore(w.bench, windowStart);
  const b1 = closeOnOrBefore(w.bench, anchor);
  const preDriftPct = c0 && c1 ? ((c1 - c0) / c0) * 100 - (b0 && b1 ? ((b1 - b0) / b0) * 100 : 0) : 0;

  return { flowWin, priceWin, abnormalFlowZ, abnormalVolumeZ, preDriftPct };
}

function caseScore(args: {
  abnormalFlowZ: number;
  abnormalVolumeZ: number;
  preDriftPct: number;
  holdingShift: number; // Σ|pctAfter-pctBefore|
  directionMatch: boolean;
  postMovePct: number | null;
}): number {
  let s = 0;
  s += Math.min(30, Math.abs(args.abnormalFlowZ) * 8);
  s += Math.min(20, Math.abs(args.abnormalVolumeZ) * 5);
  s += Math.min(15, Math.abs(args.preDriftPct));
  s += Math.min(15, args.holdingShift * 30);
  s += args.directionMatch ? 10 : 0;
  s += args.postMovePct !== null ? Math.min(10, Math.abs(args.postMovePct)) : 0;
  return Math.round(Math.min(100, s));
}

function narrative(c: Omit<CaseRecord, "id" | "createdAt" | "score" | "evidence" | "outcome"> & {
  holders: string[];
  totalValue: number;
  nTrades: number;
  fwd30: number | null;
}): string {
  const names = c.holders.slice(0, 3).join(", ") + (c.holders.length > 3 ? ` +${c.holders.length - 3} lainnya` : "");
  const val = c.totalValue >= 1e12 ? `${(c.totalValue / 1e12).toFixed(1)}T` : `${(c.totalValue / 1e9).toFixed(0)}M`;
  const dir = c.direction === "accumulate" ? "beli" : "jual";
  const res =
    c.fwd30 === null
      ? "Hasil 30 hari belum terealisasi."
      : `30 hari setelahnya saham bergerak ${c.fwd30 >= 0 ? "+" : ""}${c.fwd30.toFixed(1)}%.`;
  return `${names} tercatat ${dir} sekitar Rp${val} (${c.nTrades} transaksi) pada ${c.symbol} sekitar ${c.anchorDate}. ${res}`;
}

/**
 * Find bounded disclosure patterns using only observations on or before each
 * event anchor. Outcomes and post-anchor prices are deliberately absent.
 */
export function detectCandidates(symbol: string, w: CandidateWindows): Candidate[] {
  const trades = [...w.insider]
    .filter((trade) => trade.txnType === "buy" || trade.txnType === "sell")
    .filter((trade, index, all) => all.findIndex((candidate) => tradeKey(candidate) === tradeKey(trade)) === index)
    .sort((a, b) => a.txnDate.localeCompare(b.txnDate) || a.holderName.localeCompare(b.holderName));
  if (!trades.length) return [];

  const groups: { dir: "buy" | "sell"; items: InsiderTrade[] }[] = [];
  for (const trade of trades) {
    const direction = trade.txnType as "buy" | "sell";
    const group = groups.at(-1);
    const firstDate = group?.items[0]?.txnDate;
    if (group && firstDate && group.dir === direction && trade.txnDate <= shiftDays(firstDate, 30)) {
      group.items.push(trade);
    } else {
      groups.push({ dir: direction, items: [trade] });
    }
  }

  const candidates: Candidate[] = [];
  for (const group of groups) {
    const firstDate = group.items[0].txnDate;
    const anchorDate = group.items.at(-1)!.txnDate;
    const windowStart = shiftDays(firstDate, -30);
    const ev = evidenceStats(
      { insider: w.insider, flow: w.flow, price: w.price, bench: w.bench ?? [] },
      windowStart,
      anchorDate,
    );
    const holders = [...new Set(group.items.map((trade) => trade.holderName))].sort();
    const common = {
      symbol,
      direction: group.dir === "buy" ? ("accumulate" as const) : ("distribute" as const),
      anchorDate,
      windowStart,
      windowEnd: anchorDate,
      holders,
      insiderTrades: group.items,
      flowWindow: ev.flowWin,
      priceWindow: ev.priceWin,
      abnormalFlowZ: ev.abnormalFlowZ,
      abnormalVolumeZ: ev.abnormalVolumeZ,
      preDriftPct: ev.preDriftPct,
    };
    const eventHash = stableHash(group.items.map(tradeKey).sort().join("||"));
    const patterns: CandidatePattern[] = [];
    if (holders.length >= 3) patterns.push("CLUSTER_PATTERN");
    if (group.dir === "buy") {
      const prior = closeOnOrBefore(w.price, anchorDate);
      const prior30 = closeOnOrBefore(w.price, shiftDays(anchorDate, -30));
      if (prior !== null && prior30 !== null && prior < prior30) patterns.push("INSIDER_CONTRA_BUY");
      if (ev.abnormalFlowZ > 1) patterns.push("STEALTH_ACCUMULATION");
    }
    for (const pattern of patterns) {
      candidates.push({ ...common, id: `${symbol}:${group.dir}:${anchorDate}:${pattern}:${eventHash}`, pattern });
    }
  }
  return candidates.sort((a, b) => a.anchorDate.localeCompare(b.anchorDate) || a.pattern.localeCompare(b.pattern) || a.id.localeCompare(b.id));
}

export function detectCases(symbol: string, w: Windows): CaseRecord[] {
  const cases: CaseRecord[] = [];
  const trades = [...w.insider].sort((a, b) => a.txnDate.localeCompare(b.txnDate));
  if (!trades.length || !w.price.length) return cases;

  // Group trades into event clusters: same direction within 30d rolling window
  const groups: { dir: "buy" | "sell"; items: InsiderTrade[] }[] = [];
  for (const t of trades) {
    if (t.txnType !== "buy" && t.txnType !== "sell") continue;
    const g = groups.at(-1);
    if (g && g.dir === t.txnType && t.txnDate <= shiftDays(g.items.at(-1)!.txnDate, 30)) {
      g.items.push(t);
    } else {
      groups.push({ dir: t.txnType, items: [t] });
    }
  }

  for (const g of groups) {
    const anchorDate = g.items.at(-1)!.txnDate;
    const windowStart = shiftDays(anchorDate, -60);
    const ev = evidenceStats({ insider: w.insider, flow: w.flow, price: w.price, bench: w.bench }, windowStart, anchorDate);
    const oc = outcome(w.price, w.bench, anchorDate);
    const totalValue = g.items.reduce((s, t) => s + t.value, 0);
    const holdingShift = g.items.reduce((s, t) => s + Math.abs((t.pctAfter ?? 0) - (t.pctBefore ?? 0)), 0);
    const holders = [...new Set(g.items.map((t) => t.holderName))];

    const base = {
      symbol,
      anchorDate,
      windowStart,
      windowEnd: anchorDate,
      narrative: "",
    };

    const mk = (pattern: CasePattern, direction: "accumulate" | "distribute", dirMatch: boolean): CaseRecord => {
      const score = caseScore({
        abnormalFlowZ: ev.abnormalFlowZ,
        abnormalVolumeZ: ev.abnormalVolumeZ,
        preDriftPct: ev.preDriftPct,
        holdingShift,
        directionMatch: dirMatch,
        postMovePct: oc.fwd30dPct,
      });
      return {
        ...base,
        id: `${symbol}:${anchorDate}:${pattern}`,
        pattern,
        direction,
        score,
        evidence: {
          insiderTrades: g.items,
          flowWindow: ev.flowWin,
          priceWindow: ev.priceWin,
          abnormalFlowZ: ev.abnormalFlowZ,
          abnormalVolumeZ: ev.abnormalVolumeZ,
          preDriftPct: ev.preDriftPct,
        },
        outcome: oc,
        narrative: narrative({ ...base, pattern, direction, holders, totalValue, nTrades: g.items.length, fwd30: oc.fwd30dPct }),
        createdAt: new Date().toISOString(),
      };
    };

    if (g.dir === "sell") {
      if (g.items.length >= 3 || holders.length >= 3) cases.push(mk("CLUSTER_PATTERN", "distribute", false));
      if (oc.fwd30dPct !== null && oc.fwd30dPct <= -5) cases.push(mk("EXIT_AHEAD", "distribute", true));
    } else {
      if (g.items.length >= 3 || holders.length >= 3) cases.push(mk("CLUSTER_PATTERN", "accumulate", false));
      const prior = closeOnOrBefore(w.price, anchorDate);
      const prior60 = closeOnOrBefore(w.price, shiftDays(anchorDate, -30));
      const fallingBefore = prior !== null && prior60 !== null && prior < prior60;
      if (fallingBefore) cases.push(mk("INSIDER_CONTRA_BUY", "accumulate", false));
      if (oc.fwd30dPct !== null && oc.fwd30dPct >= 8 && ev.abnormalFlowZ > 1) {
        cases.push(mk("STEALTH_ACCUMULATION", "accumulate", true));
      }
    }
  }
  return cases;
}
