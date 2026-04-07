import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/rfq-automation-demo',
  assetPrefix: '/rfq-automation-demo/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
