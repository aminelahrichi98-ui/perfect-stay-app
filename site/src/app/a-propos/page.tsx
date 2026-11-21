import { Coquille } from "@/components/coquille";
import { Audit } from "@/components/sections/audit";
import { EntetePage } from "@/components/sections/entete-page";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { MARQUE } from "@/lib/content";

export const metadata = { title: "Notre expertise", description: "Perfect Stay, expert en performance et rentabilité immobilière à Casablanca : analyse, valorisation, pricing dynamique et gestion complète en location courte durée." };

const EXPERTISES = [
  { titre: "Analyse de rentabilité", texte: "Nous étudions votre appartement, son quartier et la demande avant de vous recommander une stratégie." },
  { titre: "Valorisation du logement", texte: "Design d'intérieur, équipements et photographie professionnelle : ce qui fait la différence sur une annonce." },
  { titre: "Pricing dynamique", texte: "Le prix de chaque nuit suit la saison, les événements et la concurrence à Casablanca." },
  { titre: "Annonces Airbnb et OTA", texte: "Création et optimisation des annonces sur les plateformes de réservation." },
  { titre: "Voyageurs et réservations", texte: "Sélection, accueil et assistance des voyageurs, du premier message au départ." },
  { titre: "Ménage, qualité, maintenance", texte: "Ménage professionnel, contrôles après chaque séjour et interventions coordonnées." },
  { titre: "Rapports propriétaires", texte: "Vos performances et vos revenus, détaillés chaque mois." },
  { titre: "Marché de Casablanca", texte: "Une connaissance de terrain des quartiers et de leur demande locative." },
];

export default function PageAPropos() {
  return (
    <Coquille>
      <EntetePage surtitre="Notre expertise" titre="Plus qu'une conciergerie : un expert de la rentabilité immobilière." texte={MARQUE.promesse} />
      <section aria-labelledby="titre-expertises" className="bg-papier-2 py-20 text-charbon md:py-28">
        <div className="mx-auto max-w-[88rem] px-5 md:px-10">
          <Revele className="max-w-3xl">
            <Surtitre className="text-or-fonce">Ce que nous faisons</Surtitre>
            <h2 id="titre-expertises" className="titre mt-5 text-[2.2rem] md:text-[3.2rem]">
              Nous aidons les propriétaires à exploiter le potentiel économique de leur appartement.
            </h2>
          </Revele>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[1.75rem] border border-charbon/10 bg-charbon/10 sm:grid-cols-2 lg:grid-cols-4">
            {EXPERTISES.map((e, i) => (
              <li key={e.titre} className="bg-papier-2 p-6 md:p-7">
                <Revele delai={(i % 4) * 80}>
                  <span className="num font-display text-[1.6rem] leading-none text-or-fonce">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-4 font-semibold">{e.titre}</h3>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-gris-fonce">{e.texte}</p>
                </Revele>
              </li>
            ))}
          </ul>
          <Revele className="mt-14 max-w-3xl">
            <p className="titre text-[1.9rem] leading-snug md:text-[2.4rem]">{MARQUE.signature}</p>
            <p className="mt-4 text-[1rem] leading-relaxed text-gris-fonce">Perfect Stay est une société de gestion immobilière spécialisée dans la location courte durée à {MARQUE.ville}. Notre métier : la performance de votre investissement, avec une gestion transparente et professionnelle.</p>
          </Revele>
        </div>
      </section>
      <Audit />
    </Coquille>
  );
}
