// Hero visual: price line + insider trade markers + foreign flow bars.
// Pure SVG, server-renderable, no client JS.

import type { FlowDaily, InsiderTrade, PriceDaily } from "@/lib/types";

const W = 860;
const H = 300;
const FLOW_H = 60;
const PAD = { l: 44, r: 10, t: 12, b: 20 };

interface Props {
  price: PriceDaily[];
  flow: FlowDaily[];
  insider: InsiderTrade[];
  anchorDate?: string;
}

export default function TimelineChart({ price, flow, insider, anchorDate }: Props) {
  if (!price.length) {
    return <div className="panel flex h-[300px] items-center justify-center dim text-sm">Belum ada data harga.</div>;
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
  const y = (v: number) => PAD.t + (1 - (v - minP) / spanP) * (H - PAD.t - PAD.b - FLOW_H);

  const line = price.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.close).toFixed(1)}`).join(" ");

  // flow bars (normalized to window max abs)
  const flowInRange = flow.filter((f) => f.date >= t0 && f.date <= t1);
  const maxFlow = Math.max(...flowInRange.map((f) => Math.abs(f.netForeignInflow)), 1);
  const flowBase = H - PAD.b;
  const bw = Math.max(1.5, ((W - PAD.l - PAD.r) / Math.max(1, flowInRange.length)) * 0.7);

  // insider markers in range
  const marks = insider.filter((t) => t.txnDate >= t0 && t.txnDate <= t1 && t.txnType !== "others");

  // gridlines (4 price levels)
  const grid = [0, 1, 2, 3].map((i) => minP + (spanP * i) / 3);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Timeline harga, flow asing, dan transaksi insider">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth="0.5" />
          <text x={PAD.l - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="var(--ink-faint)" className="mono">
            {g >= 1000 ? `${(g / 1000).toFixed(1)}k` : g.toFixed(0)}
          </text>
        </g>
      ))}

      {flowInRange.map((f) => {
        const h = (Math.abs(f.netForeignInflow) / maxFlow) * (FLOW_H - 8);
        const up = f.netForeignInflow >= 0;
        return (
          <rect
            key={f.date}
            x={x(f.date) - bw / 2}
            y={up ? flowBase - h : flowBase}
            width={bw}
            height={h}
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
            <title>{`${t.holderName} ${buy ? "beli" : "jual"} ${t.amount.toLocaleString("id-ID")} @${t.price} (${t.txnDate})`}</title>
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
        harga
      </text>
      <text x={PAD.l + 4} y={flowBase - FLOW_H + 12} fontSize="9" fill="var(--ink-dim)" className="mono">
        net flow asing
      </text>
      <text x={W - PAD.r - 4} y={PAD.t + 10} textAnchor="end" fontSize="9" fill="var(--ink-dim)" className="mono">
        ▲ insider beli · ▼ insider jual
      </text>
    </svg>
  );
}
