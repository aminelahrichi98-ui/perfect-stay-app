import { Coquille } from "@/components/coquille";
import { Audit } from "@/components/sections/audit";
import { Faq } from "@/components/sections/faq";
import { OuvertureAudit } from "@/components/sections/ouverture-audit";

export const metadata = { title: "Perfect Stay Revenue Audit offert", description: "Recevez une analyse personnalisée du potentiel locatif de votre appartement à Casablanca. Audit habituellement facturé 500 MAD, actuellement offert." };

/* Page d'atterrissage (Meta Ads) : l'audit d'abord, le formulaire à un clic. */
export default function PageAudit() {
  return (
    <Coquille>
      <div className="pt-16">
        <Audit />
      </div>
      <OuvertureAudit />
      <Faq />
    </Coquille>
  );
}
