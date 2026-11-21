"use client";

import { BarChart3, ClipboardCheck, Sofa, Workflow } from "lucide-react";
import { useState } from "react";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { cn } from "@/lib/cn";
import { PROGRAMME } from "@/lib/content";

const ICONES = { audit: ClipboardCheck, upgrade: Sofa, optimisation: BarChart3, gestion: Workflow } as const;

/** Les quatre piliers du Perfect Stay Investor Program : on clique un pilier pour voir le détail. */
export function Programme() {
  const [actif, setActif] = useState(0);
  const pilier = PROGRAMME.piliers[actif];
  return (
    <section id="programme" aria-labelledby="titre-programme" className="zone-contraste scroll-mt-20 bg-papier-2 py-20 text-charbon md:py-28">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <Revele className="max-w-3xl">
          <Surtitre className="text-or-fonce">{PROGRAMME.surtitre}</Surtitre>
          <h2 id="titre-programme" className="titre mt-5 text-[2.2rem] md:text-[3.2rem]">
            {PROGRAMME.titre}
          </h2>
        </Revele>

        <div role="tablist" aria-label="Les quatre piliers" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMME.piliers.map((p, i) => {
            const Icone = ICONES[p.id as keyof typeof ICONES];
            const on = i === actif;
            return (
              <button
                key={p.id}
                type="button"
                role="tab"
                id={`onglet-${p.id}`}
                aria-selected={on}
                aria-controls="panneau-pilier"
                onClick={() => setActif(i)}
                className={cn(
                  "relative flex flex-col rounded-[1.5rem] border p-6 text-left transition-[background-color,border-color,color,transform,box-shadow] duration-500 ease-[var(--ease-cine)]",
                  on ? "-translate-y-1 border-or-fonce bg-or-fonce text-papier shadow-[0_30px_60px_-30px_rgb(35_12_31/0.8)]" : "border-charbon/15 bg-eclat/50 hover:-translate-y-1 hover:border-or-fonce/60",
                )}
              >
                <span className="flex items-center justify-between">
                  <span className={cn("num text-[0.78rem]", on ? "text-papier/60" : "text-gris-fonce")}>Pilier {i + 1}</span>
                  <Icone className={cn("h-5 w-5", on ? "text-or-clair" : "text-or-fonce")} />
                </span>
                <span className="titre mt-8 text-[1.7rem] leading-tight">{p.nom}</span>
                <span className={cn("mt-2 text-[0.9rem]", on ? "text-papier/75" : "text-gris-fonce")}>{p.accroche}</span>
              </button>
            );
          })}
        </div>

        <div id="panneau-pilier" role="tabpanel" aria-labelledby={`onglet-${pilier.id}`} key={pilier.id} className="mt-4 grid gap-8 rounded-[1.75rem] border border-charbon/15 bg-eclat/60 p-7 [animation:entree-bas_0.7s_var(--ease-cine)_both] md:grid-cols-2 md:p-10">
          <div>
            <p className="titre text-[1.9rem] md:text-[2.3rem]">{pilier.nom}</p>
            <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-gris-fonce">{pilier.texte}</p>
          </div>
          <ul className="grid content-center gap-3">
            {pilier.details.map((d) => (
              <li key={d} className="flex items-start gap-3 border-b border-charbon/10 pb-3 text-[0.98rem] last:border-0">
                <span aria-hidden className="mt-2 h-px w-6 shrink-0 -rotate-[60deg] bg-or-fonce" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
