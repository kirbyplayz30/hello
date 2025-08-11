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
<<<<<<< HEAD
  allowedDevOrigins: ['http://192.168.1.70:3000'],
=======
>>>>>>> 4bb4444f1210b108fccdc4264760e10f88a94643
};

export default nextConfig;
