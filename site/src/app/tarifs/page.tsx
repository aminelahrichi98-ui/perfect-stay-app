import { Coquille } from "@/components/coquille";
import { EntetePage } from "@/components/sections/entete-page";
import { Offre } from "@/components/sections/offre";
import { Tarifs } from "@/components/sections/tarifs";

export const metadata = { title: "Tarifs", description: "Commission de gestion Perfect Stay, Revenue Audit offert et premier mois de gestion offert : nos tarifs, présentés clairement." };

export default function PageTarifs() {
  return (
    <Coquille>
      <EntetePage surtitre="Tarifs" titre="Des tarifs clairs, annoncés avant de commencer." texte="Notre rémunération dépend des revenus de votre appartement : nous gagnons quand vous gagnez." />
      <Tarifs />
      <Offre />
    </Coquille>
  );
}
