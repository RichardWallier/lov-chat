import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so file tracing isn't thrown off by
  // lockfiles in parent directories (e.g. a stray package-lock.json in $HOME).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
