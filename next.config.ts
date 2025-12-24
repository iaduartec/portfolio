import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Turbopack is currently not compatible with withBundleAnalyzer in some setups,
  // but we keep it here as requested in the original config.
  turbopack: {
    root: __dirname,
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default analyzer(nextConfig);
