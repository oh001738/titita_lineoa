import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    SCHOOL_NAME: process.env.SCHOOL_NAME || '',
  },
  // 允許 Pinggy 隧道工具進行 Hot Reload (熱重載)
  allowedDevOrigins: [
    ""
  ],
};

export default nextConfig;
