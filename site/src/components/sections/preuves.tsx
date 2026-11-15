import { Camera, FileBarChart, MessageSquareQuote, ScrollText } from "lucide-react";
import { Revele } from "@/components/ui/revele";
import { Surtitre } from "@/components/ui/surtitre";
import { PREUVES } from "@/lib/content";

/*
  Emplacements réservés aux preuves RÉELLES (témoignages vérifiés, photos de logements gérés,
  études de cas, rapports anonymisés). Rien n'est inventé : chaque carte indique ce qu'elle attend.
*/
const EMPLACEMENTS = [
  { icone: MessageSquareQuote, titre: "Témoignages vérifiés", attendu: "Citations de propriétaires, avec leur accord écrit." },
  { icone: Camera, titre: "Photographies réelles", attendu: "Logements gérés, photographiés par notre équipe." },
  { icone: ScrollText, titre: "Études de cas", attendu: "Avant / après d'un bien, chiffres validés par le propriétaire." },
  { icone: FileBarChart, titre: "Exemple de rapport", attendu: "Rapport mensuel anonymisé issu de notre application." },
];

export function Preuves() {
  return (
    <section aria-labelledby="titre-preuves" className="bg-papier-2 py-20 text-charbon md:py-24">
      <div className="mx-auto max-w-[88rem] px-5 md:px-10">
        <Revele className="max-w-2xl">
          <Surtitre className="text-or-fonce">Preuves</Surtitre>
          <h2 id="titre-preuves" className="titre mt-5 text-[2.2rem] md:text-[3rem]">
            {PREUVES.titre}
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-gris-fonce">{PREUVES.texte}</p>
        </Revele>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EMPLACEMENTS.map((e, i) => {
            const Icone = e.icone;
            return (
              <li key={e.titre}>
                <Revele delai={i * 100} className="h-full rounded-[1.5rem] border border-dashed border-charbon/20 p-6">
                  <Icone className="h-6 w-6 text-or-fonce" />
                  <h3 className="mt-5 font-semibold">{e.titre}</h3>
                  <p className="mt-1.5 text-[0.88rem] leading-relaxed text-gris-fonce">{e.attendu}</p>
                  <p className="mt-5 inline-block rounded-full bg-charbon/[0.06] px-3 py-1 text-[0.7rem] tracking-wide text-gris-fonce uppercase">Emplacement à compléter</p>
                </Revele>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
