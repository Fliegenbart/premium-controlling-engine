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
      // Externalize native modules that can't be bundled
      config.externals.push({
        'duckdb': 'commonjs duckdb',
        '@duckdb/node-api': 'commonjs @duckdb/node-api',
        '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
        'node-gyp': 'commonjs node-gyp',
      });
    }

    // Ignore problematic files from node-pre-gyp
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.html$/,
      include: /node_modules/,
      use: 'ignore-loader',
    });
    config.module.rules.push({
      test: /\.cs$/,
      use: 'ignore-loader',
    });

    return config;
  },
  
  // Environment variables available to client
  env: {
    APP_VERSION: process.env.npm_package_version || '2.0.0',
  },
};

module.exports = nextConfig;
