import { Coquille } from "@/components/coquille";
import { TableauDeBord } from "@/components/dashboard/tableau-de-bord";
import { Parcours } from "@/components/journeys/parcours";
import { Audit } from "@/components/sections/audit";
import { Convergence } from "@/components/sections/convergence";
import { Faq } from "@/components/sections/faq";
import { Hero } from "@/components/sections/hero";
import { Methode } from "@/components/sections/methode";
import { Offre } from "@/components/sections/offre";
import { Preuves } from "@/components/sections/preuves";
import { Programme } from "@/components/sections/programme";

/* Hero cinéma, situation et parcours, révélation de la marque, Investor Program,
   technologie propriétaire, Revenue Audit, puis méthode, preuves, offre et questions. */
export default function Accueil() {
  return (
    <Coquille>
      <Hero />
      <Parcours />
      <Convergence />
      <Programme />
      <TableauDeBord />
      <Audit />
      <Methode />
      <Preuves />
      <Offre />
      <Faq />
    </Coquille>
  );
}
