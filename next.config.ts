import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server at .next/standalone/server.js so the
  // Docker runtime image needs only that output (no node_modules at runtime).
  output: "standalone",
  // Pin the workspace root to this project so file tracing isn't thrown off by
  // lockfiles in parent directories (e.g. a stray package-lock.json in $HOME).
  // Applies to standalone's file tracing too, not just turbopack.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
