import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";

const titre = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-titre", display: "swap" });
const corps = Manrope({ subsets: ["latin"], variable: "--font-corps", display: "swap" });

const URL_SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITE),
  title: { default: "Perfect Stay · La location courte durée, version investisseur", template: "%s · Perfect Stay" },
  description:
    "Gestion locative courte durée à Casablanca : stratégie, opérations, contrôle qualité et reporting propriétaire. Estimez le potentiel de votre appartement.",
  keywords: ["gestion locative Casablanca", "conciergerie Airbnb Casablanca", "location courte durée Maroc", "gestion appartement investisseur"],
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "Perfect Stay",
    title: "Perfect Stay · La location courte durée, version investisseur",
    description: "Vous restez investisseur. Nous pilotons l'exploitation.",
  },
  twitter: { card: "summary_large_image" },
  // Prototype : pas d'indexation tant que le site n'est pas validé et mis en ligne
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#160813",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titre.variable} ${corps.variable}`}>
      <body>{children}</body>
    </html>
  );
}
