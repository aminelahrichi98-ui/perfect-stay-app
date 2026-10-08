import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { ETAPES_CRM, lienAppel, libelleResultat, libelleSource } from "@/lib/crm";
import { formatDateHeure } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../../operations/donnees";
import { FormulaireLead } from "../formulaire-lead";
import { BoutonOnboarding, PanneauAppels, PanneauEtape, SupprimerLead } from "./panneaux-lead";

export const metadata = { title: "Fiche lead" };

export default async function PageLead({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string }> }) {
  const u = await exigerAcces("crm");
  const { id } = await params;
  const sp = await searchParams;
  const modifiable = peutModifier(u, "crm");
  const supabase = await createClient();
  const { data: l } = await supabase.from("crm_leads").select("*").eq("id", id).maybeSingle();
  if (!l) notFound();
  const [{ data: appels }, equipe] = await Promise.all([
    supabase.from("crm_appels").select("id, date_appel, resultat, note, auteur_id").eq("lead_id", id).order("date_appel", { ascending: false }),
    lireResponsables(),
  ]);
  const noms = new Map(equipe.map((r) => [r.id, r.nom]));
  const etape = ETAPES_CRM.find((e) => e.value === l.etape);
  const appel = lienAppel(l.telephone);

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/crm" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> CRM
      </Link>
      {sp.cree ? <Notice ton="ok">Lead ajouté. Enregistrez votre premier appel ci-dessous.</Notice> : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight">{l.nom}</h2>
            <p className="mt-0.5 text-ink-2">
              {[l.ville, l.type_bien].filter(Boolean).join(" · ") || "—"} · {libelleSource(l.source)}
              {l.campagne ? ` · ${l.campagne}` : ""}
            </p>
            <p className="num mt-0.5 text-sm text-ink-3">Reçu le {formatDateHeure(l.created_at)}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge ton={etape?.ton}>{etape?.label}</Badge>
            {appel ? (
              <a href={appel} className="press inline-flex h-11 items-center gap-2 rounded-xl bg-ok-bg px-4 font-medium text-ok">
                <Phone className="h-4 w-4" /> <span className="num">{l.telephone}</span>
              </a>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <PanneauEtape id={l.id} etape={l.etape} motif={l.motif_perte} modifiable={modifiable} />
        </div>
      </Card>

      {modifiable && (l.etape === "signe" || l.logement_id) ? (
        <Card className="p-5">
          <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Onboarding</h3>
          <BoutonOnboarding leadId={l.id} signe={l.etape === "signe"} logementId={l.logement_id} />
        </Card>
      ) : null}

      <Card className="p-5">
        <h3 className="mb-3 font-display text-lg font-semibold tracking-tight">Appels</h3>
        <PanneauAppels
          leadId={l.id}
          modifiable={modifiable}
          appels={(appels ?? []).map((a) => ({ id: a.id, date: formatDateHeure(a.date_appel), resultat: a.resultat, libelle: libelleResultat(a.resultat), note: a.note, auteur: a.auteur_id ? (noms.get(a.auteur_id) ?? "—") : "—" }))}
        />
      </Card>

      <Card className="p-5 md:p-7">
        <h3 className="mb-5 font-display text-lg font-semibold tracking-tight">Informations</h3>
        {modifiable ? (
          <FormulaireLead
            id={l.id}
            valeurs={{ nom: l.nom, telephone: l.telephone, email: l.email, ville: l.ville, type_bien: l.type_bien, source: l.source, campagne: l.campagne, responsable: l.responsable_id ?? "", notes: l.notes }}
            responsables={equipe.filter((r) => !r.prestataire).map((r) => ({ id: r.id, nom: r.nom }))}
          />
        ) : (
          <p className="text-ink-2">Vous pouvez consulter cette fiche mais pas la modifier.</p>
        )}
      </Card>

      {modifiable ? <SupprimerLead id={l.id} /> : null}
    </div>
  );
}
