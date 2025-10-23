/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@reservasegura/ui', '@reservasegura/database', '@reservasegura/types'],
  images: {
    domains: ['localhost'],
  },
  // Ignore TypeScript and ESLint errors during build (for deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // WSL optimization
  experimental: {
    esmExternals: 'loose',
  },
  // Reduce memory usage and improve stability
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
  // Optimize for WSL
  compiler: {
    removeConsole: false,
  },
};

module.exports = nextConfig;
