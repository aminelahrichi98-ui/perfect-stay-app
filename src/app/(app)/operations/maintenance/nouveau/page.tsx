import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { lireLogementsOps, lireResponsables } from "../../donnees";
import { FormulaireIncident } from "../formulaire-incident";

export const metadata = { title: "Nouvel incident" };

export default async function PageNouvelIncident({ searchParams }: { searchParams: Promise<{ logement?: string }> }) {
  const u = await exigerAcces("maintenance", "modifier");
  const sp = await searchParams;
  const [logements, responsables] = await Promise.all([lireLogementsOps(), lireResponsables()]);
  return (
    <div className="max-w-2xl">
      <Link href="/operations/maintenance" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Maintenance
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouvel incident</h2>
        <FormulaireIncident
          valeurs={{ logement: logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "", type: "panne", titre: "", description: "", date: aujourdhui(), intervenant: "", responsable: u.id }}
          logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
          responsables={responsables.filter((r) => !r.prestataire).map((r) => ({ id: r.id, nom: r.nom }))}
        />
      </Card>
    </div>
  );
}
