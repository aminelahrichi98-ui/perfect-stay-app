import { Coquille } from "@/components/coquille";
import { Audit } from "@/components/sections/audit";
import { EntetePage } from "@/components/sections/entete-page";
import { Etudes } from "@/components/sections/etudes";

export const metadata = { title: "Études de cas", description: "Résultats d'appartements gérés par Perfect Stay à Casablanca : revenus, taux d'occupation, prix moyen par nuit et revenu net propriétaire." };

export default function PageEtudes() {
  return (
    <Coquille>
      <EntetePage surtitre="Études de cas" titre="Des appartements, des chiffres, une méthode." texte="Nous distinguons toujours ce qui a été observé de ce qui est estimé ou projeté." />
      <Etudes complet />
      <Audit />
    </Coquille>
  );
}
