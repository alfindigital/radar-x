// Distribution-pressure badge — numeric 0–100 reading of observed exit-side
// pressure (labeled cohort flow, foreign flow, reported insider transactions,
// retail absorption). High = more exit-side evidence; low = lower observed
// pressure, never "Safe".

export function PressureBadge({ score, coverage }: { score: number | null; coverage: number }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="mono faint text-base">—</span>
        <span className="tag" data-tip="Fewer than half of the weighted components had usable evidence in this window.">
          low coverage
        </span>
      </span>
    );
  }
  const cls = score >= 75 ? "dist" : score >= 55 ? "neutral" : score >= 35 ? "dim" : "acc";
  const bar =
    score >= 75 ? "var(--dist)" : score >= 55 ? "var(--watch)" : score >= 35 ? "var(--ink-dim)" : "var(--acc)";
  const label =
    score >= 75 ? "High distribution pressure" : score >= 55 ? "Elevated distribution pressure" : score >= 35 ? "Watch" : "Lower observed distribution pressure";
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className={`mono text-lg font-semibold tabular-nums leading-none ${cls}`}
          data-tip={`${label}: bounded reading over labeled broker-cohort flow; not proof of intent.`}
        >
          {score}
        </span>
        {coverage < 1 && (
          <span className="faint text-[10px]" data-tip="Share of component weight backed by usable evidence.">
            cov {coverage.toFixed(2)}
          </span>
        )}
      </span>
      <span className="gauge w-16" aria-hidden>
        <i style={{ width: `${score}%`, background: bar }} />
      </span>
    </span>
  );
}
