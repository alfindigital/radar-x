import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the frozen data snapshot into every serverless function bundle.
  outputFileTracingIncludes: {
    "/*": ["./data/*.json", "./data/derived-v2/*.json"],
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
