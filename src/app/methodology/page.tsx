// Methodology and non-advisory disclaimer.

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 text-sm leading-relaxed">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Methodology</h1>
        <p className="mt-1 text-[13px] dim">How RadarX summarizes reported ownership activity and its limits.</p>
      </div>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">How to read a page</h2>
        <ul className="list-inside list-disc space-y-1.5 dim">
          <li>
            <b className="text-ink">Board.</b> Issuers rank by exit pressure: ≥75 <span className="dist">high</span>, ≥55 <span className="neutral">elevated</span>, ≥35 <span className="dim">watch</span>, below that lower observed pressure. A <span className="mono">—</span> with <span className="tag">low coverage</span> means fewer than half of the weighted components had usable evidence; it is suppressed, not scored zero.
          </li>
          <li>
            <b className="text-ink">Component chips.</b> <span className="mono">INST / FOR / INS</span> are exit-side z-scores (institutional broker flow, foreign flow, insider sells); <span className="mono">RET</span> is the absorption side (retail-classified broker buying). Positive means above-cohort pressure in that component&apos;s own direction. Focus or hover any chip for its raw value, window, and observation count.
          </li>
          <li>
            <b className="text-ink">Flags.</b> <span className="mono">SUSP ≤14D</span> a suspension was recorded near the window, <span className="mono">CA ±7D</span> a corporate action sits at the window edge, <span className="mono">FF&lt;20%</span> the float is thin. <span className="mono">SPARSE</span> marks thin labeled-broker coverage; it is context, not an alert. <span className="mono">SUSPENDED</span> means a suspension is on record and the regular-market tape printed zero volume all window — the row is quarantined out of the publishable board because negotiated-market blocks can still flow through the broker feed.
          </li>
          <li>
            <b className="text-ink">Dossier.</b> The paired panels show institutional-classified (blue) versus retail-classified (ochre) net flow per session on a shared zero baseline. Below them sit the insider transaction wire, each row linked to its filing PDF on idx.co.id, and monthly holder composition. A <b className="text-ink">Pending</b> or <b className="text-ink">Unavailable</b> outcome means the horizon is not measurable yet; it never prints as 0%.
          </li>
          <li>
            <b className="text-ink">Suggested order.</b> Open the <span className="mono">Flagged</span> scope, pick a row, check which components carry the score, then follow the source links before drawing any conclusion.
          </li>
        </ul>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Positioning index (−100 to +100)</h2>
        <p>
          The v2 index is a descriptive, cross-sectional comparison across the saved cohort as of the displayed date.
          It is not a forecast and it is not a trading signal. Each component uses a robust median and interpolated IQR
          scale, clipped to ±3σ. Fewer than five valid cohort observations make a component unrankable.
        </p>
        <pre className="mono overflow-x-auto rounded-md bg-panel-2 p-3 text-xs">
{`index = Σ(z × weight × 100/3), published only with ≥2 rankable components
weights = reported ownership .30 · foreign flow .25 · broker context .20
          shareholder count .15 · foreign holder-class shift .10`}
        </pre>
        <ul className="list-inside list-disc space-y-1 dim">
          <li><b className="text-ink">Reported ownership (30%)</b>: signed transaction value in the inclusive 90-calendar-day window.</li>
          <li><b className="text-ink">Foreign flow (25%)</b>: signed net inflow in the inclusive 90-day window, normalized only when an observed positive market cap exists.</li>
          <li><b className="text-ink">Broker context (20%)</b>: eligible institutional or foreign broker net value in the inclusive 14-day window; no rows means missing.</li>
          <li><b className="text-ink">Shareholder count (15%)</b>: latest valid month-over-month change on or before the as-of date.</li>
          <li><b className="text-ink">Foreign holder-class shift (10%)</b>: foreign institutional classes minus foreign individual classes across the same two months.</li>
        </ul>
        <p className="text-xs faint">A null component is missing evidence, not a measured zero. Coverage weight is the sum of rankable weights and is not a probability.</p>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Bounded candidate patterns</h2>
        <ul className="list-inside list-disc space-y-1 dim">
          <li><b className="text-ink">Holder cluster</b>: at least three distinct normalized holders transacting in one direction inside a 30-day event window.</li>
          <li><b className="text-ink">Buy during decline</b>: reported buys while the pre-anchor close was lower than the prior context close.</li>
          <li><b className="text-ink">Stealth flow</b>: reported buys with abnormal foreign flow in the bounded pre-anchor window.</li>
        </ul>
        <p className="dim">Candidate membership and evidence stop at the event anchor. Post-anchor prices can change only the retrospective outcome object.</p>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Retrospective outcomes</h2>
        <p className="dim">
          Outcomes use the first common issuer and IHSG observed session on or after the anchor (within seven calendar days),
          then the first common session on or after the 7-, 30-, or 60-day target (also within seven days). A missing full
          horizon is <b className="text-ink">Pending</b> or <b className="text-ink">Unavailable</b>; it is never formatted as 0%.
          Excess return is the issuer percentage minus the benchmark percentage over the same sessions.
        </p>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Exit Watch (v3, 0–100)</h2>
        <p className="dim">
          Exit Watch is a bounded reading of observed exit-side pressure: which investor cohorts appear to be leaving a
          name, and which may be absorbing that flow. It combines four robust cross-sectional components, each normalized
          by the issuer&rsquo;s observed market cap:
        </p>
        <ul className="dim list-inside list-disc space-y-1 text-xs">
          <li><span className="mono">instExit · 30%</span>: net flow of brokers classified <em>institutional</em> in the broker registry (14-day window). Precision overlays from per-cohort top-broker feeds are preferred when present.</li>
          <li><span className="mono">foreignExit · 25%</span>: net foreign flow over the same window.</li>
          <li><span className="mono">insiderExit · 25%</span>: reported insider sell value over 90 days.</li>
          <li><span className="mono">retailAbsorb · 20%</span>: net flow of brokers classified <em>retail</em> (inverted: retail net buying raises the reading as absorption of exit supply).</li>
        </ul>
        <p className="dim">
          An N-day window covers exactly N calendar dates ending at the as-of date: for as-of 2026-10-01 the 14-day
          window is 2026-09-18 to 2026-10-01 inclusive and the 90-day insider window is 2026-07-04 to 2026-10-01.
        </p>
        <p className="dim">
          Each component is a clipped robust z-score (±3σ) across the scored universe. The score publishes only when at
          least half of the component weight has usable evidence; otherwise the issuer is listed as{" "}
          <em>suppressed / low coverage</em>, never scored zero. Missing components are shown with their reason.
        </p>
        <p className="dim">
          Broker cohort labels come from the broker registry. Of 88 classified firms, 42 are <em>mixed</em> and 2{" "}
          <em>unknown</em>: they are not counted as either side, so the cohort view is a labeled subset, not a census.
          Flags (<span className="mono">SUSP ≤14D</span>, <span className="mono">CA ±7D</span>,{" "}
          <span className="mono">FF&lt;20%</span>, <span className="mono">SPARSE</span>) mark context that can distort the
          reading; they annotate, they do not change the score.
        </p>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Where the data comes from</h2>
        <p className="dim">
          Everything external enters through one intermediary, the Sectors Financial API. Its upstream is official
          Indonesian market plumbing: IDX disclosures and trading records, and KSEI custody registers. Insider rows and
          suspension rows carry a <span className="mono">source</span> link to the original document on idx.co.id, so
          the claim is checkable rather than asserted.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wider faint">
                <th className="py-1.5 pr-3 font-medium">What you see</th>
                <th className="py-1.5 pr-3 font-medium">Upstream source</th>
                <th className="py-1.5 font-medium">Cadence</th>
              </tr>
            </thead>
            <tbody className="dim">
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Insider &amp; ≥5% holder transactions</td>
                <td className="py-1.5 pr-3">IDX announcements forwarded from KSEI (LK ownership reports)</td>
                <td className="py-1.5">per filing</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Cohort flow, broker boards</td>
                <td className="py-1.5 pr-3">IDX per-broker daily trading records</td>
                <td className="py-1.5">per session</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Foreign flow</td>
                <td className="py-1.5 pr-3">IDX foreign-investor trading totals</td>
                <td className="py-1.5">per session</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Holder composition</td>
                <td className="py-1.5 pr-3">KSEI monthly shareholder register, aggregate by investor class</td>
                <td className="py-1.5">monthly</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Major holders (≥5%)</td>
                <td className="py-1.5 pr-3">Issuer-disclosed ownership register</td>
                <td className="py-1.5">rolling</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Prices, IHSG, market cap</td>
                <td className="py-1.5 pr-3">IDX end-of-day official series</td>
                <td className="py-1.5">per session</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Suspensions, corporate actions</td>
                <td className="py-1.5 pr-3">IDX announcements and corporate action calendar</td>
                <td className="py-1.5">per event</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Free float</td>
                <td className="py-1.5 pr-3">IDX published free-float figures</td>
                <td className="py-1.5">periodic</td>
              </tr>
              <tr className="border-b border-line/40">
                <td className="py-1.5 pr-3">Broker cohort labels (retail/institutional)</td>
                <td className="py-1.5 pr-3">Sectors-curated broker registry; not an official IDX classification</td>
                <td className="py-1.5">registry</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-3">News</td>
                <td className="py-1.5 pr-3">Indonesian financial media aggregation</td>
                <td className="py-1.5">rolling</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider dim">Data lineage and coverage</h2>
        <p className="dim">
          The public app reads a hash-verified local Sectors snapshot and generated artifacts. The snapshot includes
          parsed filings, foreign flow, daily prices, broker rows, monthly holders, tickers, a benchmark-observed IHSG
          series, and a saved subsector-aggregate artifact used by the sector rotation board. v3 Exit Watch additionally
          consumes the broker registry, per-issuer top-broker feeds, suspensions, corporate actions, and free-float feeds;
          each hashed into the derived manifest (<span className="mono">feedHashes</span>). The full feed-by-feed map
          lives in <span className="mono">docs/DATA-LINEAGE.md</span> in the public repository.
          Retrieval times and historical publication availability are not verified for legacy rows. Ambiguous flat-OHLC or zero-volume
          observations are marked <span className="mono">legacy-unknown</span>.
        </p>
      </section>

      <section className="panel space-y-3 border-watch/40 p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider neutral">Disclaimer</h2>
        <p className="dim">
          RadarX is public-data research, not investment advice, a recommendation, or a claim about intent or wrongdoing.
          Reported ownership activity is not proof of future price direction. Historical outcomes do not predict future returns.
        </p>
      </section>
    </div>
  );
}
