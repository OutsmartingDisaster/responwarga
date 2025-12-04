import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  transpilePackages: ['react-leaflet-cluster', 'leaflet', 'react-leaflet'],
  turbopack: {
    rules: {
      // Configure turbo rules here
    }
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      // Redirect old /responder/[slug]/dashboard to new /{slug}/responder/dashboard
      {
        source: '/responder/:slug/dashboard',
        destination: '/:slug/responder/dashboard',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
