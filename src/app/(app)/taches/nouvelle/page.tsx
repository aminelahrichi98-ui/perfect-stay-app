import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { exigerAcces } from "@/lib/auth";
import { POLES } from "@/lib/modules";
import { PRIORITES, STATUTS_TACHE } from "@/lib/taches";
import { lireLogementsOps, lireResponsables } from "../../operations/donnees";
import { FormulaireTache } from "../formulaire-tache";

export const metadata = { title: "Nouvelle tâche" };

export default async function PageNouvelleTache({ searchParams }: { searchParams: Promise<{ statut?: string; echeance?: string; pole?: string; logement?: string }> }) {
  const u = await exigerAcces("taches", "modifier");
  const sp = await searchParams;
  const [logements, responsables] = await Promise.all([lireLogementsOps(), lireResponsables()]);
  return (
    <div className="max-w-2xl">
      <Link href="/taches" className="press mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Tâches
      </Link>
      <Card className="p-5 md:p-7">
        <h2 className="mb-6 font-display text-xl font-semibold tracking-tight">Nouvelle tâche</h2>
        <FormulaireTache
          valeurs={{
            titre: "",
            pole: (POLES as readonly string[]).includes(sp.pole ?? "") ? (sp.pole as string) : (u.poles.find((p) => (POLES as readonly string[]).includes(p)) ?? "Opérations"),
            priorite: PRIORITES[2].value,
            statut: STATUTS_TACHE.some((s) => s.value === sp.statut) ? (sp.statut as string) : "a_faire",
            echeance: /^\d{4}-\d{2}-\d{2}$/.test(sp.echeance ?? "") ? (sp.echeance as string) : "",
            responsable: u.id,
            logement: logements.some((l) => l.id === sp.logement) ? (sp.logement as string) : "",
            notes: "",
          }}
          logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
          responsables={responsables}
        />
      </Card>
    </div>
  );
}
