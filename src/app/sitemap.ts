// Sitemap — canonical English routes only: static pages + subsector drill-downs
// + issuer dossiers from the saved snapshot.

import type { MetadataRoute } from "next";
import { loadSnapshot } from "@/lib/snapshot";
import { getSectorRotation } from "@/lib/services";

export const dynamic = "force-dynamic";

const BASE = "https://radarx.web.id";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [snapshot, rotation] = await Promise.all([loadSnapshot(), getSectorRotation()]);
  const lastModified = snapshot.manifest.asOf ?? undefined;

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
