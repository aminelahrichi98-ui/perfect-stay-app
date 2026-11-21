"use client";

import { Check } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { AUDIT, CTA } from "@/lib/content";
import { track } from "@/lib/analytics";
import { useExperience } from "@/lib/experience";
import { useVisible } from "@/lib/use-visible";

/** Maquette du rapport : montre la FORME du livrable. Aucun chiffre, pour ne rien laisser croire. */
function MaquetteRapport() {
  const [ref, actif] = useVisible<HTMLDivElement>({ seuil: 0.3 });
  const barres = [38, 52, 61, 74, 88, 96, 92, 70, 58, 49, 44, 66];
  const lignes = ["Chiffre d'affaires potentiel", "Charges d'exploitation", "Commission de gestion", "Revenu net propriétaire"];
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[30rem]">
      <div aria-hidden className="absolute inset-x-6 -bottom-4 top-6 rotate-2 rounded-[1.25rem] bg-papier/20" />
      <div className="relative rounded-[1.25rem] bg-papier p-6 text-charbon shadow-[0_50px_100px_-40px_rgb(0_0_0/0.9)] md:p-8" role="img" aria-label="Aperçu de la mise en page du rapport d'audit : graphique de saisonnalité, comparaison longue et courte durée, tableau de revenu net">
        <div className="flex items-baseline justify-between border-b border-charbon/15 pb-4">
          <p className="titre text-[1.35rem]">Revenue Audit</p>
          <p className="num text-[0.66rem] tracking-[0.18em] text-gris-fonce uppercase">Aperçu du rapport</p>
        </div>
        <p className="mt-5 text-[0.7rem] tracking-[0.16em] text-gris-fonce uppercase">Saisonnalité de la demande</p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {barres.map((h, i) => (
            <span key={i} className="flex-1 origin-bottom rounded-t-sm bg-or-fonce transition-transform duration-[1200ms] ease-[var(--ease-cine)]" style={{ height: `${h}%`, transform: actif ? "scaleY(1)" : "scaleY(0.05)", transitionDelay: `${i * 50}ms`, opacity: 0.35 + (h / 100) * 0.65 }} />
          ))}
        </div>
        <p className="mt-6 text-[0.7rem] tracking-[0.16em] text-gris-fonce uppercase">Longue durée / courte durée</p>
        <div className="mt-3 space-y-2">
          {[
            ["Longue durée", 46, "bg-charbon/30"],
            ["Courte durée", 82, "bg-bouton"],
          ].map(([nom, l, c], i) => (
            <div key={nom as string} className="flex items-center gap-3">
              <span className="w-24 text-[0.76rem] text-gris-fonce">{nom}</span>
              <span className="h-3 flex-1 overflow-hidden rounded-full bg-charbon/[0.07]">
                <span className={`block h-full origin-left rounded-full transition-transform duration-[1400ms] ease-[var(--ease-cine)] ${c}`} style={{ width: `${l}%`, transform: actif ? "scaleX(1)" : "scaleX(0)", transitionDelay: `${500 + i * 200}ms` }} />
              </span>
            </div>
          ))}
        </div>
        <ul className="mt-6 border-t border-charbon/15">
          {lignes.map((l, i) => (
            <li key={l} className={`flex items-center justify-between border-b border-dashed border-charbon/15 py-2.5 text-[0.82rem] ${i === lignes.length - 1 ? "border-0 font-semibold" : ""}`}>
              {l}
              <span aria-hidden className={`h-2.5 rounded-full ${i === lignes.length - 1 ? "w-20 bg-bouton" : "w-14 bg-charbon/15"}`} />
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.7rem] leading-relaxed text-gris-fonce">Illustration de la mise en page. Les chiffres de votre rapport sont établis pour votre appartement.</p>
      </div>
    </div>
  );
}

export function Prix({ clair = false }: { clair?: boolean }) {
  return (
    <p className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 ${clair ? "text-charbon" : "text-papier"}`}>
      <span className={`text-[1.05rem] line-through ${clair ? "text-gris-fonce" : "text-papier/50"}`}>Valeur habituelle : {AUDIT.prixHabituel} MAD</span>
      <span className="titre text-[2.2rem] leading-none md:text-[2.8rem]">Offert actuellement : {AUDIT.prixActuel} MAD</span>
    </p>
  );
}

export function Audit() {
  const { ouvrirTunnel } = useExperience();
  return (
    <section id="audit" aria-labelledby="titre-audit" className="scroll-mt-20 bg-charbon py-20 md:py-28">
      <div className="mx-auto grid max-w-[88rem] items-center gap-14 px-5 md:px-10 lg:grid-cols-2">
        <Revele className="min-w-0">
          <Surtitre>{AUDIT.nom}</Surtitre>
          <h2 id="titre-audit" className="titre mt-5 text-[2.4rem] leading-[1.05] text-papier md:text-[3.6rem]">
            {AUDIT.titre}
          </h2>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-papier/70">{AUDIT.texte}</p>
          <ul className="mt-8 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {AUDIT.contenu.map((c) => (
              <li key={c} className="flex items-start gap-3 text-[0.94rem] text-papier/85">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-or" />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-9 rounded-[1.5rem] border border-or/30 bg-graphite p-6">
            <Prix />
            <button
              type="button"
              onClick={() => {
                track("CtaClicked", { cta: "audit-section" });
                ouvrirTunnel("audit-section");
              }}
              className={bouton("or", "lg", "mt-6 h-auto min-h-14 w-full py-3 text-center whitespace-normal sm:w-auto")}
            >
              {CTA.audit}
            </button>
          </div>
        </Revele>
        <Revele delai={150} className="min-w-0">
          <MaquetteRapport />
        </Revele>
      </div>
    </section>
  );
}
