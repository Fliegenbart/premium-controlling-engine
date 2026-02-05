/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['docx', 'duckdb'],
  },

  // Webpack config for DuckDB native modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize native modules that can't be bundled
      config.externals.push({
        'duckdb': 'commonjs duckdb',
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
}

module.exports = nextConfig
