import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/logo";

export const metadata = { title: "Hors ligne" };

export default function HorsLigne() {
  return (
    <main className="grid min-h-dvh place-items-center bg-aub-900 px-6 text-center text-white">
      <div className="max-w-sm">
        <LogoMark className="mx-auto h-10 w-auto" />
        <span className="mx-auto mt-8 grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
          <WifiOff className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Pas de connexion</h1>
        <p className="mt-2 text-aub-200 text-pretty">Perfect Stay a besoin d&apos;internet pour afficher vos données à jour. Vérifiez votre connexion, puis réessayez.</p>
        {/* Rechargement complet voulu : la navigation douce ne fonctionne pas sans connexion */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="press mt-6 inline-flex h-12 items-center rounded-xl bg-wine-600 px-6 font-medium text-white hover:bg-wine-700">
          Réessayer
        </a>
      </div>
    </main>
  );
}
