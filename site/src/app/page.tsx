import { Coquille } from "@/components/coquille";
import { Parcours } from "@/components/journeys/parcours";
import { Audit } from "@/components/sections/audit";
import { Etudes } from "@/components/sections/etudes";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Offre } from "@/components/sections/offre";
import { Programme } from "@/components/sections/programme";

/* Parcours : situation, problèmes, accroche, solution, méthode, preuves, audit, formulaire. */
export default function Accueil() {
  return (
    <Coquille>
      <Hero />
      <Parcours />
      <Programme />
      <Etudes />
      <Audit />
      <Offre />
      <Faq />
    </Coquille>
  );
}
