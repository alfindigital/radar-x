// Candidate feed — bounded reported-activity patterns, filterable.

import Link from "next/link";
import { getCaseFeed } from "@/lib/services";
import { CaseRow } from "@/components/widgets";
import { PATTERN_LABEL } from "@/components/fmt";

export const dynamic = "force-dynamic";

const PATTERNS = ["", "STEALTH_ACCUMULATION", "INSIDER_CONTRA_BUY", "CLUSTER_PATTERN"];

export default async function CasesPage({ searchParams }: PageProps<"/cases">) {
  const q = await searchParams;
  // ?pola= kept as a fallback for links shared before the param was renamed.
  const raw = q.pattern ?? q.pola;
  const pattern = typeof raw === "string" ? raw : undefined;
  const cases = await getCaseFeed(pattern);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Candidate Feed</h1>
        <p className="mt-1.5 text-[13px] dim">
          Bounded patterns from reported disclosures: {cases.length} candidates. Retrospective outcomes are measured, not predicted.
        </p>
      </div>

      <div className="tabbar">
        {PATTERNS.map((p) => (
          <Link
            key={p || "all"}
            href={p ? `/cases?pattern=${p}` : "/cases"}
            aria-current={pattern === p || (!pattern && !p) ? "page" : undefined}
            className={`tab ${pattern === p || (!pattern && !p) ? "tab-active" : ""}`}
          >
            {p ? PATTERN_LABEL[p] : "All"}
          </Link>
        ))}
      </div>

      <div>
        {cases.map((c) => (
          <CaseRow key={c.id} c={c} />
        ))}
      </div>
      {!cases.length && (
        <div className="py-16 text-center text-sm dim">
          No candidates match this filter in the saved snapshot.
        </div>
      )}
    </div>
  );
}
