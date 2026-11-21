import { SectionAppartement } from "@/components/apartment/section-appartement";
import { Coquille } from "@/components/coquille";
import { TableauDeBord } from "@/components/dashboard/tableau-de-bord";
import { Audit } from "@/components/sections/audit";
import { EntetePage } from "@/components/sections/entete-page";
import { Methode } from "@/components/sections/methode";
import { Programme } from "@/components/sections/programme";
import { PROGRAMME } from "@/lib/content";

export const metadata = { title: "Notre méthode : Perfect Stay Investor Program", description: "Revenue Audit, Property Upgrade, Revenue Optimization, Performance Management : la méthode Perfect Stay pour exploiter le potentiel de votre appartement à Casablanca." };

export default function PageMethode() {
  return (
    <Coquille>
      <EntetePage surtitre={PROGRAMME.surtitre} titre="Comment fonctionne Perfect Stay ?" texte="Quatre piliers, appliqués à chaque appartement : comprendre son potentiel, le valoriser, optimiser ses revenus, puis gérer son exploitation au quotidien." />
      <Programme />
      <SectionAppartement />
      <Methode />
      <TableauDeBord />
      <Audit />
    </Coquille>
  );
}
