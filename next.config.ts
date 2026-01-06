import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://192.168.68.117:3000",
    "https://le-brouillon.netlify.app"
  ]
};

export default nextConfig;
