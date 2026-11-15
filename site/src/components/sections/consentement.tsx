"use client";

import { useEffect, useState } from "react";
import { enregistrerConsentement, lireConsentement } from "@/lib/analytics";

/** Bandeau de consentement : aucun outil de mesure non essentiel n'est activé sans accord. */
export function Consentement() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(lireConsentement() === null), 1800);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  const choisir = (v: "accepte" | "refuse") => {
    enregistrerConsentement(v);
    setVisible(false);
  };
  return (
    <div role="dialog" aria-label="Mesure d'audience" className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-papier/10 bg-graphite/95 p-5 shadow-2xl backdrop-blur [animation:entree-bas_0.6s_var(--ease-cine)_both] md:right-6 md:bottom-6 md:left-auto md:mx-0">
      <p className="text-[0.88rem] leading-relaxed text-papier/80">
        Nous aimerions mesurer l&apos;audience du site pour l&apos;améliorer. Aucune mesure n&apos;est activée sans votre accord.{" "}
        <a href="/confidentialite" className="underline underline-offset-4 hover:text-papier">
          En savoir plus
        </a>
      </p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => choisir("accepte")} className="h-10 rounded-full bg-papier px-5 text-[0.85rem] font-medium text-charbon">
          Accepter
        </button>
        <button type="button" onClick={() => choisir("refuse")} className="h-10 rounded-full border border-papier/20 px-5 text-[0.85rem] text-papier/80">
          Refuser
        </button>
      </div>
    </div>
  );
}
