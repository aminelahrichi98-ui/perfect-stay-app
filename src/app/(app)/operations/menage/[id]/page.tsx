import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, KeyRound, MapPin } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { formatJour } from "@/lib/dates";
import { formatDateHeure } from "@/lib/format";
import { lienMaps } from "@/lib/maps";
import { etatMenage } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { checklistDuMenage } from "../../checklist-serveur";
import { ChecklistVue } from "../../checklist-vue";
import { lireChecklist, lireLogementsOps, lireResponsables } from "../../donnees";
import { PanneauMenage } from "../panneau-menage";

export const metadata = { title: "Ménage" };

export default async function PageMenageDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const u = await exigerAcces("menage");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("taches")
    .select("id, logement_id, statut, controle, controle_note, controle_le, echeance, responsable_id, notes, termine_le")
    .eq("id", id)
    .eq("type", "menage")
    .maybeSingle();
  if (!t) notFound();

  const estPrestataire = u.type === "prestataire";
  const gere = peutModifier(u, "menage") && !estPrestataire;
  const etat = etatMenage(t);
  const [logements, responsables] = await Promise.all([lireLogementsOps(), gere ? lireResponsables() : Promise.resolve([])]);
  const logement = logements.find((l) => l.id === t.logement_id);
  const lien = logement ? lienMaps({ mapsUrl: logement.maps_url, adresse: logement.adresse, ville: logement.ville }) : null;
  const peutAvancer = (t.responsable_id === u.id || gere) && etat.cle !== "annule" && etat.cle !== "valide";

  // La check-list est créée à la première ouverture par la personne qui fait le ménage
  let { data: existante } = await supabase.from("checklists").select("id").eq("tache_id", id).order("created_at").limit(1);
  let erreurChecklist = "";
  if (!existante?.length && (t.responsable_id === u.id || gere) && etat.cle !== "annule") {
    const r = await checklistDuMenage(id);
    if ("erreur" in r) erreurChecklist = r.erreur;
    else existante = [{ id: r.id }];
  }
  const checklist = existante?.[0] ? await lireChecklist(existante[0].id) : null;
  const modifiableChecklist = peutAvancer && (etat.cle === "en_cours" || etat.cle === "a_faire" || etat.cle === "a_refaire" || etat.cle === "bloque");

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/operations/menage" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Ménages
      </Link>
      {sp.cree ? <Notice ton="ok">Ménage créé.</Notice> : null}

      <Card className="enter p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{logement?.nom ?? "Ménage"}</h2>
            <p className="mt-0.5 text-ink-2">
              {t.echeance ? `Ménage du ${formatJour(t.echeance)}` : "Sans date"}
              {t.termine_le ? <span className="text-ink-3"> · terminé le {formatDateHeure(t.termine_le)}</span> : null}
            </p>
          </div>
          <Badge ton={etat.ton}>{etat.libelle}</Badge>
        </div>

        {logement ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {logement.adresse || logement.ville ? (
              <div className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                <div>
                  <dt className="sr-only">Adresse</dt>
                  <dd>
                    {[logement.adresse, logement.ville].filter(Boolean).join(", ")}
                    {lien ? (
                      <a href={lien} target="_blank" rel="noopener" className="ml-2 inline-flex items-center gap-1 font-medium text-wine-700 hover:underline">
                        Itinéraire <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </dd>
                </div>
              </div>
            ) : null}
            {logement.code_acces ? (
              <div className="flex items-start gap-2.5">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
                <div>
                  <dt className="sr-only">Code d&apos;accès</dt>
                  <dd className="num font-medium select-all">{logement.code_acces}</dd>
                </div>
              </div>
            ) : null}
          </dl>
        ) : null}
        {t.notes ? <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-sm text-pretty">{t.notes}</p> : null}

        <div className="mt-5">
          <PanneauMenage
            id={t.id}
            cle={etat.cle}
            peutAvancer={peutAvancer}
            peutControler={gere}
            responsableId={t.responsable_id ?? ""}
            responsables={responsables}
            noteControle={t.controle_note}
          />
        </div>
      </Card>

      <section aria-labelledby="cl" className="space-y-3">
        <h2 id="cl" className="font-display text-lg font-semibold tracking-tight">
          Check-list du ménage
        </h2>
        {checklist ? (
          <ChecklistVue
            checklistId={checklist.checklist.id}
            points={checklist.points}
            photosGenerales={checklist.photosGenerales}
            modifiable={modifiableChecklist}
            terminee={checklist.checklist.statut === "terminee"}
            peutTerminer={false}
          />
        ) : erreurChecklist ? (
          <Notice ton="danger">{erreurChecklist}</Notice>
        ) : (
          <Card className="p-5 text-ink-2">La check-list sera créée dès que la personne qui fait le ménage ouvrira cette page.</Card>
        )}
      </section>
    </div>
  );
}
