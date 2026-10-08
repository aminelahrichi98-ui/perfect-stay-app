import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Repeat } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatJour } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { libelleStatut } from "@/lib/taches";
import { lireLogementsOps, lireResponsables } from "../../operations/donnees";
import { FormulaireTache } from "../formulaire-tache";
import { PiecesJointes } from "./pieces-jointes";
import { SousTaches } from "./sous-taches";
import { SupprimerTache } from "./supprimer-tache";

export const metadata = { title: "Tâche" };

export default async function PageTache({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const u = await exigerAcces("taches");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: t } = await supabase.from("taches").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();

  const [{ data: sous }, { data: pieces }, { data: incident }, logements, responsables] = await Promise.all([
    supabase.from("tache_sous_taches").select("id, libelle, fait, ordre").eq("tache_id", id).order("ordre"),
    supabase.from("tache_pieces").select("id, nom, taille").eq("tache_id", id).order("created_at"),
    t.type === "maintenance" ? supabase.from("incidents").select("id").eq("tache_id", id).maybeSingle() : Promise.resolve({ data: null }),
    lireLogementsOps(),
    lireResponsables(),
  ]);
  const modifiable = peutModifier(u, "taches") || t.responsable_id === u.id;
  const editable = t.type === "tache" && modifiable;
  const logement = logements.find((l) => l.id === t.logement_id);

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/taches" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Tâches
      </Link>
      {sp.cree ? <Notice ton="ok">Tâche créée. Vous pouvez y ajouter des sous-tâches et des pièces jointes.</Notice> : null}

      {t.type !== "tache" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Badge ton="marque">{t.type === "menage" ? "Ménage" : "Maintenance"}</Badge>
              <h2 className="mt-2 font-display text-xl font-semibold tracking-tight">{t.titre}</h2>
              <p className="mt-1 text-ink-2">
                {logement?.nom ?? "Logement"} · {libelleStatut(t.statut)}
                {t.echeance ? ` · ${formatJour(t.echeance)}` : ""}
              </p>
            </div>
            <Link
              href={t.type === "menage" ? `/operations/menage/${t.id}` : incident ? `/operations/maintenance/${incident.id}` : "/operations/maintenance"}
              className="press inline-flex h-11 items-center gap-2 rounded-xl bg-wine-600 px-5 font-medium text-white shadow-card hover:bg-wine-700"
            >
              Ouvrir dans Opérations <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-sm text-ink-3 text-pretty">Cette tâche est gérée depuis Opérations (check-list, photos, contrôle ou frais).</p>
        </Card>
      ) : (
        <Card className="p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold tracking-tight">Détail de la tâche</h2>
            {t.recurrence_id ? (
              <Link href="/taches/recurrentes" className="press inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
                <Repeat className="h-4 w-4" /> Tâche récurrente
              </Link>
            ) : null}
          </div>
          {editable ? (
            <FormulaireTache
              id={t.id}
              valeurs={{ titre: t.titre, pole: t.pole, priorite: t.priorite, statut: t.statut, echeance: t.echeance ?? "", responsable: t.responsable_id ?? "", logement: t.logement_id ?? "", notes: t.notes }}
              logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
              responsables={responsables}
            />
          ) : (
            <p className="text-ink-2">Vous pouvez consulter cette tâche mais pas la modifier.</p>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Sous-tâches</h3>
        <SousTaches tacheId={t.id} sous={(sous ?? []).map((s) => ({ id: s.id, libelle: s.libelle, fait: s.fait }))} modifiable={modifiable} />
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Pièces jointes</h3>
        <PiecesJointes tacheId={t.id} pieces={(pieces ?? []).map((p) => ({ id: p.id, nom: p.nom, taille: Number(p.taille) }))} modifiable={modifiable} />
      </Card>

      {editable && peutModifier(u, "taches") ? (
        <div>
          <SupprimerTache id={t.id} />
        </div>
      ) : null}
    </div>
  );
}
