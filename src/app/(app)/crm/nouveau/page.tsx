import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { lireResponsables } from "../../operations/donnees";
import { FormulaireLead } from "../formulaire-lead";

export const metadata = { title: "Nouveau lead" };

export default async function PageNouveauLead() {
  const u = await exigerAcces("crm", "modifier");
  const equipe = (await lireResponsables()).filter((r) => !r.prestataire);
  return (
    <div className="max-w-2xl">
      <Link href="/crm" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> CRM
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouveau lead</h2>
        <FormulaireLead valeurs={{ nom: "", telephone: "", email: "", ville: "", type_bien: "", source: "manuel", campagne: "", responsable: u.id, notes: "" }} responsables={equipe.map((r) => ({ id: r.id, nom: r.nom }))} />
      </Card>
    </div>
  );
}
