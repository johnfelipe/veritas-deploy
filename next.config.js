/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // For Leaflet SSR compatibility
  transpilePackages: ['react-leaflet', 'leaflet'],
};

module.exports = nextConfig;
