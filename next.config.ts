import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})({
  reactStrictMode: true,
  transpilePackages: ['react-leaflet-cluster', 'leaflet', 'react-leaflet'],
  experimental: {
    turbo: {
      rules: {
        // Configure turbo rules here
      }
    }
  },
  webpack: (config) => {
    // Fix for leaflet and marker cluster imports
    return config;
  }
});

export default nextConfig;
