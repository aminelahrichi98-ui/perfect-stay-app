"use client";

import { ArrowLeft, MessageCircle, Printer } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui";

/** Numéro marocain « 06 12 34 56 78 » → « 212612345678 » pour un lien WhatsApp */
function numeroWhatsapp(tel: string) {
  const chiffres = tel.replace(/\D/g, "");
  if (/^0[5-7]\d{8}$/.test(chiffres)) return `212${chiffres.slice(1)}`;
  if (/^00\d{9,}$/.test(chiffres)) return chiffres.slice(2);
  return chiffres.length >= 9 ? chiffres : "";
}

/** Barre d'outils de l'aperçu (jamais imprimée) et mise à l'échelle des pages A4 sur petit écran. */
export function BarreApercu({ prenom, telephone }: { prenom: string; telephone: string }) {
  useEffect(() => {
    const ajuster = () => {
      // 210 mm ≈ 794 px : la page tient dans la largeur de l'écran, marges comprises
      const zoom = Math.min(1, (window.innerWidth - 32) / 794);
      document.documentElement.style.setProperty("--zoom-feuille", String(zoom));
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  const numero = numeroWhatsapp(telephone);
  const message = `Bonjour ${prenom}, voici l'estimation de revenus de votre bien préparée par Perfect Stay.`;

  return (
    <div className="sticky top-0 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-[210mm] items-center gap-2">
        <Link href="/estimateur" aria-label="Retour à l'estimateur" className={buttonClass("ghost", "md")}>
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Estimateur</span>
        </Link>
        <div className="ml-auto flex gap-2">
          {numero ? (
            <a href={`https://wa.me/${numero}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
              <MessageCircle className="h-4 w-4" /> <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">WhatsApp {prenom}</span>
            </a>
          ) : null}
          <button type="button" onClick={() => window.print()} className={buttonClass("primary", "md")}>
            <Printer className="h-4 w-4" /> <span className="sm:hidden">PDF</span>
            <span className="hidden sm:inline">Télécharger / Imprimer</span>
          </button>
        </div>
      </div>
      <p className="mx-auto mt-1.5 max-w-[210mm] text-[0.8rem] text-ink-3">Dans la fenêtre d&apos;impression, choisissez « Enregistrer au format PDF », puis envoyez le fichier sur WhatsApp.</p>
    </div>
  );
}
