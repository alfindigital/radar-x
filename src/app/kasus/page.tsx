// Candidate feed — bounded reported-activity patterns, filterable.

import Link from "next/link";
import { getCaseFeed } from "@/lib/services";
import { CaseRow } from "@/components/widgets";
import { PATTERN_LABEL } from "@/components/fmt";

export const dynamic = "force-dynamic";

const PATTERNS = ["", "STEALTH_ACCUMULATION", "INSIDER_CONTRA_BUY", "CLUSTER_PATTERN"];

export default async function CasesPage({ searchParams }: PageProps<"/kasus">) {
  const { pola } = await searchParams;
  const pattern = typeof pola === "string" ? pola : undefined;
  const cases = await getCaseFeed(pattern);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidate Feed</h1>
        <p className="mt-1.5 text-[13px] dim">
          Bounded patterns from reported disclosures: {cases.length} candidates. Retrospective outcomes are measured, not predicted.
        </p>
      </div>

      <div className="tabbar">
        {PATTERNS.map((p) => (
          <Link
            key={p || "all"}
            href={p ? `/kasus?pola=${p}` : "/kasus"}
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
