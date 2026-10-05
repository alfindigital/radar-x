export default function DataStatus({ asOf, detail = "Coverage varies by issuer; missing evidence remains visible." }: { asOf: string; detail?: string }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border border-line bg-panel px-3 py-1.5 text-[11px] dim"
      role="status"
      style={{ borderRadius: "var(--radius-sm)" }}
    >
      <span className="mono font-medium uppercase tracking-widest text-ink">Snapshot</span>
      <span className="faint">·</span>
      <span>
        market data through <span className="mono text-ink">{asOf}</span>
      </span>
      <span className="faint">·</span>
      <span>{detail}</span>
    </div>
  );
}
