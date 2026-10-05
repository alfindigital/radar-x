// Exit Watch pressure badge — numeric 0–100 reading of observed exit pressure.
// Semantics per DESIGN_SPEC_V3: high number = higher observed exit-side
// pressure. Low numbers are "lower observed exit pressure", never "Safe".

export function ExitPressureBadge({ score, coverage }: { score: number | null; coverage: number }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="mono faint text-sm">—</span>
        <span className="tag" title="Fewer than half of the weighted components had usable evidence in this window.">
          low coverage
        </span>
      </span>
    );
  }
  const cls = score >= 75 ? "dist" : score >= 55 ? "neutral" : score >= 35 ? "dim" : "acc";
  const label =
    score >= 75 ? "High exit pressure" : score >= 55 ? "Elevated exit pressure" : score >= 35 ? "Watch" : "Lower observed exit pressure";
  return (
    <span className="inline-flex items-baseline gap-1.5" title={`${label} — bounded reading over labeled broker-cohort flow; not proof of intent.`}>
      <span className={`mono text-base font-bold tabular-nums ${cls}`}>{score}</span>
      {coverage < 1 && (
        <span className="faint text-[10px]" title="Share of component weight backed by usable evidence.">
          cov {coverage.toFixed(2)}
        </span>
      )}
    </span>
  );
}
