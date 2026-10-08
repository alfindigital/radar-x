import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the frozen data snapshot into every serverless function bundle.
  outputFileTracingIncludes: {
    "/*": ["./data/*.json", "./data/derived-v2/*.json"],
  },
  // Routes were renamed to English; keep the old public URLs alive for
  // shared links.
  async redirects() {
    return [
      { source: "/asing", destination: "/foreign", permanent: false },
      { source: "/metodologi", destination: "/methodology", permanent: false },
      { source: "/rotasi", destination: "/rotation", permanent: false },
      { source: "/rotasi/:sub", destination: "/rotation/:sub", permanent: false },
      { source: "/kasus", destination: "/cases", permanent: false },
      { source: "/kasus/:id", destination: "/cases/:id", permanent: false },
      { source: "/orang/:holder", destination: "/person/:holder", permanent: false },
      { source: "/saham/:ticker", destination: "/stock/:ticker", permanent: false },
    ];
  },
  // Baseline hardening headers. CSP is intentionally not set: Next's bootstrap
  // inline scripts need hashed/nonced policy work; tracked as follow-up.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
