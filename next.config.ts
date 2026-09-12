import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Nothing to serve: the joined Eurostat/GDELT series are baked into
  // public/data by scripts/build-data.mjs and fetched by the client.
  output: "export",
  // Keeps the page URL a directory, so the relative fetch for the dataset
  // resolves the same way in dev and on Pages.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
