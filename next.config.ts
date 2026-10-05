import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Import de l'ancienne app (photos) : Vercel plafonne de toute façon à ~4,5 Mo par envoi.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
