/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flp/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
