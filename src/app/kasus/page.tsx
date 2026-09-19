// Case Feed — all detected positioning patterns, filterable.

import Link from "next/link";
import { getCaseFeed } from "@/lib/services";
import { CaseRow } from "@/components/widgets";
import { PATTERN_LABEL } from "@/components/fmt";

export const dynamic = "force-dynamic";

const PATTERNS = ["", "EXIT_AHEAD", "STEALTH_ACCUMULATION", "INSIDER_CONTRA_BUY", "CLUSTER_PATTERN"];

export default async function CasesPage({ searchParams }: PageProps<"/kasus">) {
  const { pola } = await searchParams;
  const pattern = typeof pola === "string" ? pola : undefined;
  const cases = await getCaseFeed(pattern);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Case Feed</h1>
          <p className="mt-1 text-xs dim">
            Pola positioning terdeteksi dari disclosure publik — {cases.length} kasus. Hasil 30 hari diukur, bukan
            diprediksi.
          </p>
        </div>
        <div className="flex items-center gap-1">
          {PATTERNS.map((p) => (
            <Link
              key={p || "all"}
              href={p ? `/kasus?pola=${p}` : "/kasus"}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                pattern === p || (!pattern && !p) ? "bg-panel-2 text-ink" : "faint hover:text-ink"
              }`}
            >
              {p ? PATTERN_LABEL[p] : "Semua"}
            </Link>
          ))}
        </div>
      </div>

      <div>
        {cases.map((c) => (
          <CaseRow key={c.id} c={c} />
        ))}
      </div>
      {!cases.length && (
        <div className="py-16 text-center text-sm dim">
          Tidak ada kasus dengan pola ini. Deteksi jalan setelah <code className="mono">scripts/compute.ts</code>.
        </div>
      )}
    </div>
  );
}
