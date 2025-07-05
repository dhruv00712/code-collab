// next.config.js
const path = require('path');

const nextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      yjs: path.resolve(__dirname, 'node_modules/yjs'),
    };
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true, 
  },
};

module.exports = nextConfig;
