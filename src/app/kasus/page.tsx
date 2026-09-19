// Case Feed — all detected positioning patterns, filterable.

import Link from "next/link";
import { getCaseFeed } from "@/lib/services";
import { CaseCard } from "@/components/widgets";
import { PATTERN_LABEL } from "@/components/fmt";

export const dynamic = "force-dynamic";

const PATTERNS = ["", "EXIT_AHEAD", "STEALTH_ACCUMULATION", "INSIDER_CONTRA_BUY", "CLUSTER_PATTERN"];

export default async function CasesPage({ searchParams }: PageProps<"/kasus">) {
  const { pola } = await searchParams;
  const pattern = typeof pola === "string" ? pola : undefined;
  const cases = await getCaseFeed(pattern);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Case Feed</h1>
        <p className="text-xs dim">
          Pola positioning terdeteksi dari disclosure publik — {cases.length} kasus. Hasil 30 hari diukur, bukan diprediksi.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <Link
            key={p || "all"}
            href={p ? `/kasus?pola=${p}` : "/kasus"}
            className={`tag ${pattern === p || (!pattern && !p) ? "tag-acc" : ""}`}
          >
            {p ? PATTERN_LABEL[p] : "Semua"}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cases.map((c) => (
          <CaseCard key={c.id} c={c} />
        ))}
      </div>
      {!cases.length && (
        <div className="panel py-16 text-center text-sm dim">
          Tidak ada kasus dengan pola ini. Deteksi jalan setelah <code className="mono">scripts/compute.ts</code>.
        </div>
      )}
    </div>
  );
}
