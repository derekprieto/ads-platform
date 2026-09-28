import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / node-only packages must not be bundled.
  serverExternalPackages: ["@resvg/resvg-js", "satori", "postgres", "jszip", "cheerio"],
};

export default nextConfig;
