export default function DataStatus({ asOf, detail = "Coverage varies by issuer; missing evidence remains visible." }: { asOf: string; detail?: string }) {
  return (
    <div className="rounded-md border border-line bg-panel px-3 py-2 text-xs dim" role="status">
      <span className="font-medium text-ink">Historical Sectors snapshot</span> · market data through <span className="mono text-ink">{asOf}</span> · {detail}
    </div>
  );
}
