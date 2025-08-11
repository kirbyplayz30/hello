/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'export', // Enable static export
  basePath: '/hello', // Replace with your repo name
  allowedDevOrigins: ['http://192.168.1.70:3000'],
};

export default nextConfig;
