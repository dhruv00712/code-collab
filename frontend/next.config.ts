import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Force 'yjs' to always resolve to the same path
      'yjs': path.resolve(__dirname, 'node_modules/yjs'),
    };
    return config;
  },
};

export default nextConfig;
