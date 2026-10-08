import { FileText } from "lucide-react";
import { NavMois } from "@/components/nav-mois";
import { Badge, Card, Notice } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, libelleMois, moisDe, moisPrecedent, moisValide, premierDuMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { chargerSynthese } from "../donnees";
import { ActionsLogement, BoutonTelecharger, BoutonTout } from "./boutons-documents";

export const metadata = { title: "Documents" };

export default async function PageDocuments({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const u = await exigerAcces("comptabilite");
  const sp = await searchParams;
  const courant = moisDe(aujourdhui());
  // Par défaut : le mois écoulé, celui dont on édite les documents
  const mois = moisValide(sp.mois) ? sp.mois : moisPrecedent(courant);
  const modifiable = peutModifier(u, "comptabilite");
  const supabase = await createClient();
  const premier = premierDuMois(mois);

  const [{ actuel }, { data: rapports }, { data: factures }] = await Promise.all([
    chargerSynthese(mois),
    supabase.from("rapports_mensuels").select("id, logement_id, version, chemin_pdf").eq("mois", premier),
    supabase.from("factures").select("id, numero, logement_id, total_ttc, chemin_pdf").eq("mois", premier).eq("statut", "emise"),
  ]);
  const lignes = actuel.lignes.filter((l) => l.totaux.nbVersements > 0);
  const rapportDe = new Map((rapports ?? []).map((r) => [r.logement_id, r]));
  const factureDe = new Map((factures ?? []).map((f) => [f.logement_id, f]));

  return (
    <div className="space-y-5">
      <div className="enter flex flex-wrap items-center gap-3">
        <NavMois mois={mois} moisCourant={moisPrecedent(courant)} lien={(m) => `/comptabilite/documents?mois=${m}`} />
        {modifiable && lignes.length ? (
          <div className="ml-auto">
            <BoutonTout mois={mois} />
          </div>
        ) : null}
      </div>

      <Notice ton="info">
        Les rapports et les factures du mois précédent sont créés automatiquement le 1<sup>er</sup> de chaque mois. Une facture émise ne peut plus être modifiée : son numéro et son contenu sont figés.
      </Notice>

      {lignes.length ? (
        <div className="space-y-4">
          {lignes.map((l, i) => {
            const rapport = rapportDe.get(l.logementId);
            const facture = factureDe.get(l.logementId);
            const ecart = facture ? Math.round((Number(facture.total_ttc) - l.totaux.commissionTTC) * 100) !== 0 : false;
            return (
              <Card key={l.logementId} className="enter p-5" style={{ "--i": i } as React.CSSProperties}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight">{l.nom}</h2>
                    <p className="num mt-0.5 text-sm text-ink-2">
                      {l.totaux.nbVersements} versement{l.totaux.nbVersements > 1 ? "s" : ""} · commission {formatMontant(l.totaux.commissionTTC)} MAD TTC
                    </p>
                  </div>
                  <span className="flex flex-wrap gap-2">
                    {rapport ? <Badge ton="ok">Rapport v{rapport.version}</Badge> : <Badge>Pas de rapport</Badge>}
                    {facture ? <Badge ton="marque">{facture.numero}</Badge> : <Badge>Pas de facture</Badge>}
                  </span>
                </div>
                {ecart && facture ? (
                  <p className="mt-3 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn text-pretty">
                    La facture {facture.numero} ({formatMontant(Number(facture.total_ttc))} MAD TTC) ne correspond plus aux versements actuels ({formatMontant(l.totaux.commissionTTC)} MAD). Elle reste valable telle qu&apos;émise.
                  </p>
                ) : null}
                <div className="mt-4">
                  {modifiable ? (
                    <ActionsLogement logementId={l.logementId} mois={mois} rapportId={rapport?.chemin_pdf ? rapport.id : null} facture={facture ? { id: facture.id, avecPdf: Boolean(facture.chemin_pdf) } : null} />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {rapport?.chemin_pdf ? <BoutonTelecharger type="rapport" id={rapport.id} libelle="Rapport PDF" /> : null}
                      {facture?.chemin_pdf ? <BoutonTelecharger type="facture" id={facture.id} libelle="Facture PDF" /> : null}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="enter flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <FileText className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight capitalize">Aucun versement en {libelleMois(mois)}</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Dès qu&apos;un versement est saisi pour ce mois, le rapport propriétaire et la facture de commission peuvent être générés ici.</p>
        </Card>
      )}
    </div>
  );
}
