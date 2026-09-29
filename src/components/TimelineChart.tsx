// Hero visual: price line + insider trade markers + foreign flow bars.
// Pure SVG, server-renderable, no client JS.

import type { FlowDaily, InsiderTrade, PriceDaily } from "@/lib/types";
import { FLOW_GEOMETRY, flowBarGeometry } from "@/lib/chart-geometry";

const W = 860;
const H = 300;
const PAD = { l: 44, r: 10, t: 12, b: 20 };

interface Props {
  price: PriceDaily[];
  flow: FlowDaily[];
  insider: InsiderTrade[];
  anchorDate?: string;
}

export default function TimelineChart({ price, flow, insider, anchorDate }: Props) {
  if (!price.length) {
    return <div className="panel flex h-[300px] items-center justify-center dim text-sm">No price observations in the saved snapshot.</div>;
  }

  const dates = price.map((p) => p.date);
  const t0 = dates[0];
  const t1 = dates[dates.length - 1];
  const closes = price.map((p) => p.close);
  const minP = Math.min(...closes);
  const maxP = Math.max(...closes);
  const spanP = maxP - minP || 1;

  const x = (date: string) => {
    const i = dates.indexOf(date);
    const frac = i >= 0 ? i / (dates.length - 1 || 1) : (Date.parse(date) - Date.parse(t0)) / (Date.parse(t1) - Date.parse(t0) || 1);
    return PAD.l + Math.max(0, Math.min(1, frac)) * (W - PAD.l - PAD.r);
  };
  const y = (v: number) => PAD.t + (1 - (v - minP) / spanP) * (FLOW_GEOMETRY.top - PAD.t);

  const line = price.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.close).toFixed(1)}`).join(" ");

  // flow bars (normalized to window max abs)
  const flowInRange = flow.filter((f) => f.date >= t0 && f.date <= t1);
  const maxFlow = Math.max(...flowInRange.map((f) => Math.abs(f.netForeignInflow)), 1);
  const flowBase = FLOW_GEOMETRY.zero;
  const bw = Math.max(1.5, ((W - PAD.l - PAD.r) / Math.max(1, flowInRange.length)) * 0.7);

  // insider markers in range
  const marks = insider.filter((t) => t.txnDate >= t0 && t.txnDate <= t1 && t.txnType !== "others");
  const outOfRangeMarks = insider.filter((t) => t.txnType !== "others" && (t.txnDate < t0 || t.txnDate > t1)).length;

  // gridlines (4 price levels)
  const grid = [0, 1, 2, 3].map((i) => minP + (spanP * i) / 3);

  return (
    <div className="space-y-2">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby="timeline-title timeline-desc">
      <title id="timeline-title">Price, foreign flow, and reported ownership timeline</title>
      <desc id="timeline-desc">Signed foreign-flow bars share a zero line. Triangles mark reported buys and sells.</desc>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="0.5" />
          <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="var(--ink-faint)" className="mono">
            {g >= 1000 ? `${(g / 1000).toFixed(1)}k` : g.toFixed(0)}
          </text>
        </g>
      ))}

      {flowInRange.map((f) => {
        const geometry = flowBarGeometry(f.netForeignInflow, maxFlow);
        const up = f.netForeignInflow >= 0;
        return (
          <rect
            key={f.date}
            x={x(f.date) - bw / 2}
            y={geometry.y}
            width={bw}
            height={geometry.height}
            fill={up ? "var(--acc)" : "var(--dist)"}
            opacity="0.55"
          />
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={flowBase} y2={flowBase} stroke="var(--line)" strokeWidth="0.75" />

      <path d={line} fill="none" stroke="var(--sky)" strokeWidth="1.5" />

      {marks.map((t, i) => {
        const cx = x(t.txnDate);
        const near = price.find((p) => p.date >= t.txnDate) ?? price.at(-1)!;
        const cy = y(near.close);
        const buy = t.txnType === "buy";
        return (
          <g key={i}>
            <polygon
              points={buy ? `${cx},${cy - 5} ${cx - 4.5},${cy + 3} ${cx + 4.5},${cy + 3}` : `${cx},${cy + 5} ${cx - 4.5},${cy - 3} ${cx + 4.5},${cy - 3}`}
              fill={buy ? "var(--acc)" : "var(--dist)"}
              stroke="var(--bg)"
              strokeWidth="1"
            />
            <title>{`${t.holderName} ${buy ? "reported buy" : "reported sell"} ${t.amount.toLocaleString("en-US")} @${t.price} (${t.txnDate})`}</title>
          </g>
        );
      })}

      {anchorDate && (
        <line x1={x(anchorDate)} x2={x(anchorDate)} y1={PAD.t} y2={flowBase} stroke="var(--watch)" strokeWidth="1" strokeDasharray="3 3" />
      )}

      <text x={PAD.l} y={H - 6} fontSize="9" fill="var(--ink-faint)" className="mono">
        {t0}
      </text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize="9" fill="var(--ink-faint)" className="mono">
        {t1}
      </text>
      <text x={PAD.l + 4} y={PAD.t + 10} fontSize="9" fill="var(--sky)" className="mono">
        price
      </text>
      <text x={PAD.l + 4} y={FLOW_GEOMETRY.top + 12} fontSize="9" fill="var(--ink-dim)" className="mono">
        foreign flow (+ buy / − sell)
      </text>
      <text x={W - PAD.r - 4} y={PAD.t + 10} textAnchor="end" fontSize="9" fill="var(--ink-dim)" className="mono">
        ▲ reported buy · ▼ reported sell
      </text>
      {outOfRangeMarks > 0 && <text x={W - PAD.r - 4} y={H - 6} textAnchor="end" fontSize="9" fill="var(--ink-faint)">{outOfRangeMarks} marker(s) outside the displayed range</text>}
    </svg>
    <details className="rounded-md border border-line bg-panel px-3 py-2 text-xs">
      <summary className="cursor-pointer dim">View flow observations</summary>
      <div className="mt-2 max-h-40 overflow-auto">
        <table className="w-full text-left mono text-[11px]">
          <thead><tr className="faint"><th className="py-1">Date</th><th className="py-1 text-right">Net flow</th></tr></thead>
          <tbody>{flowInRange.map((row) => <tr key={row.date} className="border-t border-line/60"><td className="py-1">{row.date}</td><td className={`py-1 text-right ${row.netForeignInflow >= 0 ? "acc" : "dist"}`}>{row.netForeignInflow >= 0 ? "+" : "−"}{Math.abs(row.netForeignInflow).toLocaleString("en-US")}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
    </div>
  );
}
