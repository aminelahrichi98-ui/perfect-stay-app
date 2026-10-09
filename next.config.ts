import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Le service worker doit toujours être rechargé pour que les mises à jour arrivent
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  experimental: {
    // Import de l'ancienne app (photos) : Vercel plafonne de toute façon à ~4,5 Mo par envoi.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
