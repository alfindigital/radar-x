import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ship the frozen data snapshot into every serverless function bundle.
  outputFileTracingIncludes: {
    "/*": ["./data/*.json", "./data/derived-v2/*.json"],
  },
};

export default nextConfig;
