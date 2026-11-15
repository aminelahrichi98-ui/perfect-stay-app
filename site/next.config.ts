import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Three.js est livré en modules ES : on laisse Next le compiler pour le découpage en morceaux
  transpilePackages: ["three"],
  poweredByHeader: false,
  // Le site vit dans un sous-dossier du dépôt de l'application : il ne doit rien lui emprunter
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
