import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { EnregistrerSw } from "@/components/enregistrer-sw";
import "./globals.css";

const titre = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-titre",
  display: "swap",
});

const corps = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-corps",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Perfect Stay", template: "%s · Perfect Stay" },
  description: "Application de gestion de Perfect Stay Conciergerie.",
  applicationName: "Perfect Stay",
  appleWebApp: { capable: true, title: "Perfect Stay", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2b1727",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${titre.variable} ${corps.variable}`}>
      <body>
        {children}
        <EnregistrerSw />
      </body>
    </html>
  );
}
