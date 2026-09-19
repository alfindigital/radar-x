// Shared display helpers.

export function fmtIDR(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}${(a / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${sign}${(a / 1e9).toFixed(1)}M`;
  if (a >= 1e6) return `${sign}${(a / 1e6).toFixed(1)}jt`;
  return `${sign}${a.toFixed(0)}`;
}

export function fmtPct(n: number | null, digits = 1): string {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);
}

export function fmtShares(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}M`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}jt`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(0)}rb`;
  return `${n}`;
}

export function scoreColor(s: number): string {
  if (s >= 25) return "acc";
  if (s <= -25) return "dist";
  return "neutral";
}

export const PATTERN_LABEL: Record<string, string> = {
  EXIT_AHEAD: "Keluar Duluan",
  STEALTH_ACCUMULATION: "Akumulasi Diam-diam",
  INSIDER_CONTRA_BUY: "Beli Saat Turun",
  CLUSTER_PATTERN: "Bergerak Rombongan",
};

export function patternTagClass(pattern: string): string {
  if (pattern === "EXIT_AHEAD") return "tag-dist";
  if (pattern === "STEALTH_ACCUMULATION" || pattern === "INSIDER_CONTRA_BUY") return "tag-acc";
  return "tag-neutral";
}
