export type BoardMode = "all" | "accumulation" | "distribution";

export interface BoardSelection<T> {
  rows: T[];
  total: number;
  accumulation: number;
  distribution: number;
}

export function selectBoard<T extends { symbol: string; score: number | null }>(
  rows: T[],
  mode: BoardMode,
  limit?: number,
): BoardSelection<T> {
  const total = rows.length;
  const accumulation = rows.filter((row) => row.score !== null && row.score >= 25).length;
  const distribution = rows.filter((row) => row.score !== null && row.score <= -25).length;
  const filtered = rows.filter((row) => {
    if (mode === "accumulation") return row.score !== null && row.score >= 25;
    if (mode === "distribution") return row.score !== null && row.score <= -25;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (mode === "distribution") return (a.score ?? Infinity) - (b.score ?? Infinity) || a.symbol.localeCompare(b.symbol);
    return (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.symbol.localeCompare(b.symbol);
  });
  return { rows: limit === undefined ? sorted : sorted.slice(0, limit), total, accumulation, distribution };
}
