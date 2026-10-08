import type { ReactNode } from "react";

// Stats band — one elevated console strip segmented by hairlines. Cells share
// the panel fill so the band reads as a single readout unit; an accent value
// color is the only per-cell signal. Auto-fit keeps cells honest on any count.
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden border border-line" style={{ borderRadius: "var(--radius-sm)" }}>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-px bg-line/70">
        {children}
      </div>
    </section>
  );
}

export function Stat({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div className="bg-panel px-3.5 py-3">
      <div className="mono text-[10px] uppercase tracking-[0.14em] faint">{label}</div>
      <div
        className="mono mt-1.5 text-[20px] font-semibold leading-none tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mono mt-1.5 text-[10px] leading-snug faint">{sub}</div>}
    </div>
  );
}
