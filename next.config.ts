
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Added for Leaflet tiles
        protocol: 'https',
        hostname: '*.tile.openstreetmap.org', 
      },
       { // Added for unpkg for leaflet css if not using direct link in head
        protocol: 'https',
        hostname: 'unpkg.com',
      }
    ],
  },
};

export default nextConfig;
