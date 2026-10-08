// CohortNetChart — CHART-B + EC2 signature.
// Two aligned panels sharing one zero baseline per panel: institutional-
// classified net flow on top, retail-classified net flow below. Cohort
// identity uses blue/ochre — never red/green opposing teams. Direction is
// carried by position relative to the zero baseline plus signed labels,
// not color alone. A "View observations" table mirrors every bar so the
// chart is never the only path to the data.

import { fmtIDR } from "./fmt";

interface Day {
  date: string;
  instNet: number;
  retailNet: number;
}

const W = 560;
const PANEL_H = 64;
const PAD = 4;

function Panel({ days, field, label, color }: { days: Day[]; field: "instNet" | "retailNet"; label: string; color: string }) {
  const max = Math.max(1e-9, ...days.map((d) => Math.abs(d[field])));
  const zero = PANEL_H / 2;
  const bw = W / Math.max(days.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${PANEL_H + PAD * 2}`} className="w-full" role="img" aria-label={`${label} net flow per session`}>
      <line x1="0" x2={W} y1={zero + PAD} y2={zero + PAD} stroke="var(--line-2)" strokeWidth="1" />
      {days.map((d, i) => {
        const v = d[field];
        const h = (Math.abs(v) / max) * (PANEL_H / 2 - 2);
        const y = v < 0 ? zero + PAD : zero + PAD - h;
        return (
          <rect key={d.date} x={i * bw + bw * 0.15} y={y} width={bw * 0.7} height={Math.max(h, 0.5)} fill={color} opacity="0.9">
            <title>{`${d.date} · ${label}: ${v < 0 ? "−" : "+"}Rp${fmtIDR(Math.abs(v))}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function CohortNetChart({ days }: { days: Day[] }) {
  if (!days.length) {
    return (
      <p className="dim text-xs">
        No daily labeled-broker detail for this issuer: aggregate top-broker feeds were used for the score instead.
      </p>
    );
  }
  const instNet = days.reduce((s, d) => s + d.instNet, 0);
  const retailNet = days.reduce((s, d) => s + d.retailNet, 0);
  return (
    <div>
      <div className="space-y-1">
        <div>
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="faint uppercase tracking-wider">Institutional-classified brokers</span>
            <span className="mono cohort-inst">
              {instNet < 0 ? "−" : "+"}Rp{fmtIDR(Math.abs(instNet))} net
            </span>
          </div>
          <Panel days={days} field="instNet" label="Institutional" color="var(--cohort-inst)" />
        </div>
        <div>
          <div className="flex items-baseline justify-between text-[10px]">
            <span className="faint uppercase tracking-wider">Retail-classified brokers</span>
            <span className="mono cohort-retail">
              {retailNet < 0 ? "−" : "+"}Rp{fmtIDR(Math.abs(retailNet))} net
            </span>
          </div>
          <Panel days={days} field="retailNet" label="Retail" color="var(--cohort-retail)" />
        </div>
      </div>
      <p className="mt-2 text-[10px] faint">
        Broker cohort classification comes from the broker registry: it describes the channel, not proof of the
        ultimate trader&rsquo;s identity. Zero baseline shared per panel; dates {days[0].date} → {days.at(-1)!.date}.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs dim">View observations ({days.length} sessions)</summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
              <th className="py-1 pr-3 font-medium">Date</th>
              <th className="py-1 pr-3 text-right font-medium">Institutional net</th>
              <th className="py-1 text-right font-medium">Retail net</th>
            </tr>
          </thead>
          <tbody className="mono">
            {days.map((d) => (
              <tr key={d.date} className="border-b border-line/40">
                <td className="py-1 pr-3">{d.date}</td>
                <td className={`py-1 pr-3 text-right ${d.instNet < 0 ? "cohort-inst" : ""}`}>
                  {d.instNet < 0 ? "−" : "+"}Rp{fmtIDR(Math.abs(d.instNet))}
                </td>
                <td className={`py-1 text-right ${d.retailNet < 0 ? "cohort-retail" : ""}`}>
                  {d.retailNet < 0 ? "−" : "+"}Rp{fmtIDR(Math.abs(d.retailNet))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
