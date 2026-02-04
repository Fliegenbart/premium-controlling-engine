/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  
  // Optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Allow large file uploads (50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  // Webpack config for DuckDB native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@duckdb/node-api': '@duckdb/node-api',
      });
    }
    return config;
  },
  
  // Environment variables available to client
  env: {
    APP_VERSION: process.env.npm_package_version || '2.0.0',
  },
};

module.exports = nextConfig;
