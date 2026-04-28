import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 允許 Pinggy 隧道工具進行 Hot Reload (熱重載)
  allowedDevOrigins: [
    "vshmr-1-34-1-78.run.pinggy-free.link"
  ],
};

export default nextConfig;
