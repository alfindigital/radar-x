import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the frozen data snapshot into every serverless function bundle.
  outputFileTracingIncludes: {
    "/*": ["./data/*.json"],
  },
};

export default nextConfig;
