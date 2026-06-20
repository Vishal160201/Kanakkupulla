import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['whatsapp-web.js'],
};

export default nextConfig;
