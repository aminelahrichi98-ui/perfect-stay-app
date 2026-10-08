import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatDateHeure } from "@/lib/format";
import { ChecklistVue } from "../../checklist-vue";
import { lireChecklist, lireLogementsOps } from "../../donnees";

export const metadata = { title: "Check-list" };

export default async function PageChecklist({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigerAcces("checklists");
  const { id } = await params;
  const c = await lireChecklist(id);
  if (!c) notFound();
  if (c.checklist.tache_id) redirect(`/operations/menage/${c.checklist.tache_id}`);
  const logements = await lireLogementsOps();
  const logement = logements.find((l) => l.id === c.checklist.logement_id);
  const modifiable = peutModifier(u, "checklists") || u.type === "prestataire";
  const terminee = c.checklist.statut === "terminee";

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/operations/check-lists" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Check-lists
      </Link>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{c.checklist.nom}</h2>
            <p className="mt-0.5 text-ink-2">
              {logement?.nom ?? "Logement"} · lancée le {formatDateHeure(c.checklist.created_at)}
            </p>
          </div>
          <Badge ton={terminee ? "ok" : "attention"}>{terminee ? "Terminée" : "En cours"}</Badge>
        </div>
      </Card>
      <ChecklistVue checklistId={c.checklist.id} points={c.points} photosGenerales={c.photosGenerales} modifiable={modifiable && !terminee} terminee={terminee} peutTerminer />
    </div>
  );
}
