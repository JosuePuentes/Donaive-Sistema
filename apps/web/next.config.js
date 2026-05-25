/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flp/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

module.exports = nextConfig;
