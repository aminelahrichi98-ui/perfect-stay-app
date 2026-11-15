"use client";

import { Gift } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { Monogramme } from "@/components/ui/logo";
import { Revele } from "@/components/ui/revele";
import { OFFRE } from "@/lib/content";
import { useExperience } from "@/lib/experience";

export function Offre() {
  const { ouvrirTunnel } = useExperience();
  return (
    <section aria-labelledby="titre-offre" className="bg-charbon py-20 md:py-28">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <Revele className="grain relative overflow-hidden rounded-[2rem] border border-or/25 bg-graphite px-6 py-14 text-center md:px-16 md:py-20">
          <Monogramme aria-hidden className="pointer-events-none absolute -right-16 -bottom-24 h-[26rem] w-auto text-white/[0.03]" />
          <h2 id="titre-offre" className="titre relative mx-auto max-w-3xl text-[2.4rem] text-papier md:text-[3.8rem]">
            {OFFRE.titre}
          </h2>
          <p className="relative mx-auto mt-7 inline-flex items-center gap-3 rounded-full border border-or/40 bg-or/10 px-5 py-2.5 text-[0.95rem] text-or-clair">
            <Gift className="h-4 w-4" /> {OFFRE.offre}
          </p>
          <div className="relative mt-9">
            <button type="button" onClick={() => ouvrirTunnel("offre")} className={bouton("or", "lg")}>
              {OFFRE.cta}
            </button>
          </div>
          {/* Conditions d'éligibilité : à renseigner dans content.ts une fois validées */}
          <p className="relative mx-auto mt-6 max-w-xl text-[0.78rem] leading-relaxed text-papier/45">
            {OFFRE.conditions || "Offre soumise à conditions d'éligibilité, précisées lors de l'évaluation de votre bien."}
          </p>
        </Revele>
      </div>
    </section>
  );
}
