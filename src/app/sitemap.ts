// Sitemap — canonical English routes only: static pages + subsector drill-downs
// + issuer dossiers from the saved snapshot.

import type { MetadataRoute } from "next";
import { loadSnapshotParts } from "@/lib/snapshot";
import { loadDerived } from "@/lib/derive";
import { getSectorRotation } from "@/lib/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://radarx.web.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [snapshot, derived, rotation] = await Promise.all([loadSnapshotParts(["tickers"]), loadDerived(), getSectorRotation()]);
  const lastModified = derived.manifest.asOf ?? undefined;

  const staticRoutes: MetadataRoute.Sitemap = ["", "/broker", "/foreign", "/rotation", "/cases", "/methodology"].map(
    (p) => ({ url: `${BASE}${p}`, lastModified }),
  );

  const subsectorRoutes: MetadataRoute.Sitemap = (rotation?.sectors ?? []).flatMap((g) =>
    g.subs.map((s) => ({ url: `${BASE}/rotation/${s.slug}`, lastModified })),
  );

  const issuerRoutes: MetadataRoute.Sitemap = snapshot.tickers.map((t) => ({
    url: `${BASE}/stock/${t.symbol.replace(/\.JK$/, "")}`,
    lastModified,
  }));

  return [...staticRoutes, ...subsectorRoutes, ...issuerRoutes];
}
