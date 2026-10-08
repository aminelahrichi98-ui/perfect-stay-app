import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, formatJour } from "@/lib/dates";
import { REMBOURSEMENTS, sommeMad, STATUTS_INCIDENT } from "@/lib/operations";
import { urlsOperations } from "@/lib/operations-serveur";
import { createClient } from "@/lib/supabase/server";
import type { PhotoVue } from "../../checklist-vue";
import { PhotosIncident } from "../../photos-incident";
import { lireLogementsOps, lireResponsables } from "../../donnees";
import { FormulaireIncident } from "../formulaire-incident";
import { FraisIncident, PanneauRemboursement, PanneauStatut, SupprimerIncident } from "./panneaux";

export const metadata = { title: "Incident" };

export default async function PageIncident({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const u = await exigerAcces("maintenance");
  const { id } = await params;
  const sp = await searchParams;
  const modifiable = peutModifier(u, "maintenance");
  const supabase = await createClient();
  const { data: i } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
  if (!i) notFound();

  const [{ data: frais }, { data: photos }, logements, responsables] = await Promise.all([
    supabase.from("incident_frais").select("id, date_frais, description, montant, justificatif_nom").eq("incident_id", id).order("date_frais"),
    supabase.from("incident_photos").select("id, chemin, chemin_vignette, pris_le").eq("incident_id", id).order("pris_le"),
    lireLogementsOps(),
    modifiable ? lireResponsables() : Promise.resolve([]),
  ]);
  const urls = await urlsOperations((photos ?? []).flatMap((p) => [p.chemin, p.chemin_vignette]));
  const photosVue: PhotoVue[] = (photos ?? []).map((p) => ({ id: p.id, url: urls.get(p.chemin) ?? "", vignette: urls.get(p.chemin_vignette) ?? "", pris_le: p.pris_le }));
  const fraisVue = (frais ?? []).map((f) => ({ id: f.id, date: f.date_frais, description: f.description, montant: Number(f.montant), justificatifNom: f.justificatif_nom }));
  const total = sommeMad(fraisVue.map((f) => f.montant));
  const statut = STATUTS_INCIDENT.find((s) => s.value === i.statut);
  const remb = REMBOURSEMENTS.find((r) => r.value === i.remboursement);
  const logement = logements.find((l) => l.id === i.logement_id);

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/operations/maintenance" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Maintenance
      </Link>
      {sp.cree ? <Notice ton="ok">Incident déclaré. Une tâche de maintenance a été créée.</Notice> : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{i.titre}</h2>
            <p className="mt-0.5 text-ink-2">
              {logement?.nom ?? "Logement"} · <span className="num">{formatJour(i.date_incident)}</span>
              {i.intervenant ? ` · ${i.intervenant}` : ""}
            </p>
          </div>
          <span className="flex gap-2">
            <Badge ton={statut?.ton}>{statut?.label}</Badge>
            {remb && total > 0 ? <Badge ton={remb.ton}>{remb.label}</Badge> : null}
          </span>
        </div>
        {i.description ? <p className="mt-3 text-pretty whitespace-pre-line">{i.description}</p> : null}
        {modifiable ? (
          <div className="mt-5">
            <PanneauStatut id={i.id} statut={i.statut} />
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Photos</h3>
        <PhotosIncident id={i.id} photos={photosVue} modifiable={modifiable} />
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Frais engagés</h3>
        <FraisIncident incidentId={i.id} frais={fraisVue} total={total} verrouille={!modifiable || i.remboursement === "rembourse"} aujourdhui={aujourdhui()} />
      </Card>

      {modifiable ? (
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Remboursement par le propriétaire</h3>
          <PanneauRemboursement id={i.id} statut={i.remboursement} date={i.rembourse_le ?? ""} note={i.remboursement_note} aujourdhui={aujourdhui()} total={total} />
        </Card>
      ) : null}

      {modifiable ? (
        <details className="group rounded-2xl border border-line bg-surface shadow-card">
          <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between px-5 font-medium">Modifier les informations de l&apos;incident</summary>
          <div className="border-t border-line p-5">
            <FormulaireIncident
              id={i.id}
              valeurs={{ logement: i.logement_id, type: i.type, titre: i.titre, description: i.description, date: i.date_incident, intervenant: i.intervenant, responsable: i.responsable_id ?? "" }}
              logements={logements.map((l) => ({ id: l.id, nom: l.nom }))}
              responsables={responsables.filter((r) => !r.prestataire).map((r) => ({ id: r.id, nom: r.nom }))}
            />
            <div className="mt-6 border-t border-line pt-4">
              <SupprimerIncident id={i.id} />
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
