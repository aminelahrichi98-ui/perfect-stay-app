import Link from "next/link";
import { FileText, Home, Plus } from "lucide-react";
import { Badge, buttonClass, Card } from "@/components/ui";
import { jour, montant, typologie } from "@/lib/estimation/format";
import { manquantsBien, type Bien } from "@/lib/estimation/snapshot";
import { libelleStatut, tonStatut } from "@/lib/estimation/statuts";
import { nombreOuNull } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";

const EVENEMENTS: Record<string, string> = { creee: "créée", soumise: "soumise à validation", validee: "validée", envoyee: "envoyée", nouvelle_version: "nouvelle version", dupliquee: "dupliquée", archivee: "archivée" };

/** Fiche prospect : logements (CRM) et estimations locatives liées. Lecture seule : rien n'est modifié ici. */
export async function SectionsEstimation({ leadId, voirEstimations, creerEstimation }: { leadId: string; voirEstimations: boolean; creerEstimation: boolean }) {
  const supabase = await createClient();
  const [{ data: biens, error: errBiens }, { data: estimations }, { data: evenements }] = await Promise.all([
    supabase.from("crm_biens").select("id, libelle, ville, quartier, type_logement, chambres, surface, capacite, loyer_longue_duree").eq("lead_id", leadId).order("created_at"),
    voirEstimations ? supabase.from("estimations").select("id, created_at, statut, numero_version, bien_id, net_bas, net_haut, modele_document, envoyee_le").eq("lead_id", leadId).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    voirEstimations ? supabase.from("estimation_evenements").select("estimation_id, type, cree_le").eq("lead_id", leadId).order("cree_le", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ]);
  if (errBiens) return null; // migration 0015 pas encore appliquée
  const nomBien = new Map((biens ?? []).map((b) => [b.id, b.libelle || `${b.type_logement ? typologie(b.type_logement, b.chambres) : "Logement"} · ${b.quartier || "?"}`]));

  return (
    <>
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-semibold tracking-tight">Logements</h3>
          {creerEstimation ? (
            <Link href={`/estimateur/nouvelle?lead=${leadId}`} className={buttonClass("secondary", "sm")}>
              <Plus className="h-4 w-4" /> Nouvelle estimation
            </Link>
          ) : null}
        </div>
        {biens?.length ? (
          <ul className="divide-y divide-line">
            {biens.map((b) => {
              const m = manquantsBien({ ville: b.ville, quartier: b.quartier, type_logement: b.type_logement, chambres: b.chambres } as Bien);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <Home className="h-4 w-4 text-ink-3" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium">{nomBien.get(b.id)}</span>
                    <span className="block text-xs text-ink-3">
                      {[b.ville, b.surface ? `${b.surface} m²` : null, b.capacite ? `${b.capacite} voyageurs` : null, b.loyer_longue_duree !== null ? `loyer ${montant(nombreOuNull(b.loyer_longue_duree))}/mois` : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {m.length ? <Badge ton="attention">à compléter : {m.join(", ")}</Badge> : null}
                  {creerEstimation ? (
                    <Link href={`/estimateur/nouvelle?lead=${leadId}&bien=${b.id}`} className={buttonClass("ghost", "sm")}>
                      Estimer
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Aucun logement enregistré. Il sera ajouté depuis l&apos;estimateur (« Enregistrer dans la fiche CRM »).</p>
        )}
      </Card>

      {voirEstimations ? (
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Estimations locatives</h3>
          {estimations?.length ? (
            <ul className="divide-y divide-line">
              {estimations.map((e) => {
                const dernier = (evenements ?? []).find((x) => x.estimation_id === e.id);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <FileText className="h-4 w-4 text-ink-3" />
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-medium">
                        {jour(e.created_at)} · {e.bien_id ? (nomBien.get(e.bien_id) ?? "Logement") : "Logement"}
                        {e.numero_version > 1 ? ` · version ${e.numero_version}` : ""}
                      </span>
                      <span className="block text-xs text-ink-3">
                        {nombreOuNull(e.net_bas) !== null ? `${montant(nombreOuNull(e.net_bas)! / 12)} – ${montant(nombreOuNull(e.net_haut)! / 12)} par mois après commissions` : "chiffres à compléter"}
                        {dernier ? ` · ${EVENEMENTS[dernier.type] ?? dernier.type} le ${jour(dernier.cree_le)}` : ""}
                      </span>
                    </span>
                    <Badge ton={tonStatut(e.statut)}>{libelleStatut(e.statut)}</Badge>
                    <Link href={`/estimation/${e.id}`} className={buttonClass("ghost", "sm")}>
                      Voir / télécharger
                    </Link>
                    {creerEstimation && e.modele_document === "v2" && e.statut !== "brouillon" && e.statut !== "a_valider" ? (
                      <Link href={`/estimateur/nouvelle?version=${e.id}`} className={buttonClass("ghost", "sm")}>
                        Nouvelle version
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Aucune estimation pour ce prospect.</p>
          )}
        </Card>
      ) : null}
    </>
  );
}
