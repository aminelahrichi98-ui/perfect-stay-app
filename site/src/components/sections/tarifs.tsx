"use client";

import { ArrowDown } from "lucide-react";
import { bouton } from "@/components/ui/bouton";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { AUDIT, TARIFS } from "@/lib/content";
import { track } from "@/lib/analytics";
import { useExperience } from "@/lib/experience";
import { Prix } from "./audit";

const CASCADE = [
  { nom: "Chiffre d'affaires généré", texte: "Ce que paient les voyageurs. Il dépend du prix par nuit et du taux d'occupation.", l: 100 },
  { nom: "Frais de plateforme", texte: "Prélevés par Airbnb ou Booking.", l: 86 },
  { nom: "Commission de gestion", texte: "Notre rémunération, calculée après les frais de plateforme.", l: 70 },
  { nom: "Charges d'exploitation", texte: "Ménage, consommables, maintenance : détaillés sur votre relevé.", l: 60 },
  { nom: "Revenu net du propriétaire", texte: "Ce qui vous revient. C'est le seul chiffre qui compte pour comparer.", l: 60, net: true },
];

export function Tarifs() {
  const { ouvrirTunnel } = useExperience();
  return (
    <>
      <section aria-labelledby="titre-prestations" className="zone-contraste bg-papier-2 py-20 text-charbon md:py-24">
        <div className="mx-auto max-w-[88rem] px-5 md:px-10">
          <Revele>
            <Surtitre className="text-or-fonce">Nos prestations</Surtitre>
            <h2 id="titre-prestations" className="titre mt-5 text-[2.2rem] md:text-[3rem]">
              Commission de gestion
            </h2>
          </Revele>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {TARIFS.commissions.map((c, i) => (
              <Revele key={c.bien} delai={i * 100} className="rounded-[1.75rem] border border-charbon/15 bg-eclat/60 p-8 md:p-10">
                <p className="text-[0.95rem] text-gris-fonce">{c.bien}</p>
                <p className="titre mt-3 text-[4rem] leading-none text-or-fonce md:text-[5rem]">{c.taux}</p>
                <p className="mt-4 text-[0.92rem] text-gris-fonce">des revenus locatifs, après frais de plateforme</p>
              </Revele>
            ))}
          </div>
          <p className="mt-5 max-w-3xl text-[0.95rem] leading-relaxed text-gris-fonce">{TARIFS.base}</p>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {TARIFS.autresPostes.map((p, i) => (
              <li key={p.titre}>
                <Revele delai={i * 90} className="h-full rounded-[1.5rem] border border-charbon/15 p-6">
                  <h3 className="font-semibold">{p.titre}</h3>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-gris-fonce">{p.texte}</p>
                </Revele>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="titre-carte-audit" className="bg-charbon py-20 md:py-24">
        <div className="mx-auto max-w-[88rem] px-5 md:px-10">
          <Revele className="grain relative overflow-hidden rounded-[2rem] border border-or/30 bg-graphite p-8 md:p-14">
            <Surtitre>Offert actuellement aux propriétaires éligibles</Surtitre>
            <h2 id="titre-carte-audit" className="titre mt-5 text-[2.4rem] text-papier md:text-[3.4rem]">
              {AUDIT.nom}
            </h2>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-papier/70">{AUDIT.description}</p>
            <div className="mt-8">
              <Prix />
            </div>
            <button
              type="button"
              onClick={() => {
                track("CtaClicked", { cta: "tarifs-audit" });
                ouvrirTunnel("tarifs-audit");
              }}
              className={bouton("or", "lg", "mt-8")}
            >
              Obtenir mon audit offert
            </button>
          </Revele>
        </div>
      </section>

      <section aria-labelledby="titre-valeur" className="zone-contraste bg-papier py-20 text-charbon md:py-28">
        <div className="mx-auto grid max-w-[88rem] gap-12 px-5 md:px-10 lg:grid-cols-2">
          <Revele>
            <Surtitre className="text-or-fonce">Comprendre</Surtitre>
            <h2 id="titre-valeur" className="titre mt-5 text-[2.2rem] md:text-[3.2rem]">
              Pourquoi investir dans une gestion professionnelle ?
            </h2>
            <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-gris-fonce">
              Une commission ne se juge pas seule. Elle se compare à ce que la gestion fait gagner : un meilleur prix par nuit, plus de nuits louées, moins d&apos;incidents et aucun temps passé de votre côté.
            </p>
            <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-gris-fonce">La bonne question est donc simple : avec quelle solution votre revenu net est-il le plus élevé, pour le moins d&apos;effort ?</p>
          </Revele>
          <ol className="space-y-3">
            {CASCADE.map((c, i) => (
              <li key={c.nom}>
                <Revele delai={i * 110}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className={c.net ? "font-semibold" : "font-medium"}>{c.nom}</p>
                    {i < CASCADE.length - 1 && !CASCADE[i + 1].net ? <ArrowDown aria-hidden className="h-3.5 w-3.5 text-gris-fonce" /> : null}
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-charbon/[0.07]">
                    <div className={`h-full rounded-full ${c.net ? "bg-bouton" : "bg-or-fonce/45"}`} style={{ width: `${c.l}%` }} />
                  </div>
                  <p className="mt-2 text-[0.88rem] leading-relaxed text-gris-fonce">{c.texte}</p>
                </Revele>
              </li>
            ))}
            <li className="pt-2 text-[0.78rem] text-gris-fonce">Schéma de principe : les longueurs ne représentent pas des montants.</li>
          </ol>
        </div>
      </section>
    </>
  );
}
