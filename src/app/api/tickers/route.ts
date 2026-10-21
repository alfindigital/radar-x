// Issuer directory for the header search datalist — read from the verified
// snapshot, never fetched upstream. Compact {s, n} shape keeps the payload
// small; fetched lazily by SearchBox on first focus.

import { loadSnapshotParts } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const snapshot = await loadSnapshotParts(["tickers"]);
  const rows = snapshot.tickers
    .map((t) => ({ s: t.symbol.replace(/\.JK$/, ""), n: t.name }))
    .sort((a, b) => a.s.localeCompare(b.s));
  return Response.json(rows);
}
