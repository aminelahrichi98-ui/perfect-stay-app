import { Card, Notice } from "@/components/ui";
import { exigerAcces, peutVoir } from "@/lib/auth";
import { pourcent } from "@/lib/estimation/format";
import { indicateurs, parGroupe, type EstimationSuivi, type Indicateurs } from "@/lib/estimation/suivi";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../../operations/donnees";

export const metadata = { title: "Suivi des estimations" };

const duree = (s: number | null) => (s === null ? "—" : s < 90 ? `${Math.round(s)} s` : `${Math.round(s / 60)} min`);
const tx = (v: number | null) => (v === null ? "—" : pourcent(v, 1));

export default async function PageSuivi() {
  const u = await exigerAcces("estimateur");
  const supabase = await createClient();
  const [{ data }, equipe] = await Promise.all([
    supabase.from("estimations").select("id, created_by, created_at, statut, modele_document, duree_creation_s, quartier, lead_id, envoyee_le").limit(2000),
    lireResponsables(),
  ]);
  const liste: EstimationSuivi[] = (data ?? []).map((e) => ({ id: e.id, createdBy: e.created_by, createdAt: e.created_at, statut: e.statut, modele: e.modele_document, dureeS: e.duree_creation_s, quartier: e.quartier, leadId: e.lead_id, envoyeeLe: e.envoyee_le }));
  const leads = [...new Set(liste.map((e) => e.leadId).filter((x): x is string => Boolean(x)))];
  const crm = peutVoir(u, "crm");
  const { data: etapes } = crm && leads.length ? await supabase.from("crm_etapes").select("lead_id, etape, date_etape").in("lead_id", leads) : { data: [] };
  const lesEtapes = (etapes ?? []).map((x) => ({ leadId: x.lead_id, etape: x.etape, date: x.date_etape }));
  const global = indicateurs(liste, lesEtapes);
  const noms = new Map(equipe.map((r) => [r.id, r.nom]));

  return (
    <div className="space-y-5">
      {!crm ? <Notice ton="info">Les conversions (rendez-vous, mandats) viennent du CRM : le droit « CRM – voir » est nécessaire pour les afficher.</Notice> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tuile t="Estimations créées" v={String(global.creees)} />
        <Tuile t="Temps médian de création" v={duree(global.tempsMedianS)} />
        <Tuile t="Taux d'envoi (envoyées / validées)" v={tx(global.tauxEnvoi)} />
        <Tuile t="Envoyées → rendez-vous / mandat" v={`${tx(global.tauxRdv)} / ${tx(global.tauxSigne)}`} d={`sur ${global.mesurables} envoi(s) liés à un prospect`} />
      </div>
      <Tableau titre="Ancien modèle / nouveau modèle" lignes={parGroupe(liste, lesEtapes, (e) => (e.modele === "v2" ? "Nouveau modèle (v2)" : "Ancien modèle (v1)"))} />
      <Tableau titre="Par commercial" lignes={parGroupe(liste, lesEtapes, (e) => noms.get(e.createdBy ?? "") ?? "Inconnu")} />
      <Tableau titre="Par quartier" lignes={parGroupe(liste, lesEtapes, (e) => e.quartier || "—")} />
      <p className="text-xs text-ink-3">
        Une estimation compte comme « envoyée » uniquement quand quelqu&apos;un l&apos;a marquée comme telle. Les conversions comptent les étapes du CRM franchies après l&apos;envoi. L&apos;ouverture du PDF par le propriétaire n&apos;est pas mesurée. Les estimations de l&apos;ancien modèle ne sont pas liées à un prospect : leurs conversions ne sont pas mesurables.
      </p>
    </div>
  );
}

function Tuile({ t, v, d }: { t: string; v: string; d?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[0.82rem] text-ink-3">{t}</p>
      <p className="num font-display text-2xl font-semibold">{v}</p>
      {d ? <p className="text-xs text-ink-3">{d}</p> : null}
    </Card>
  );
}

function Tableau({ titre, lignes }: { titre: string; lignes: { groupe: string; ind: Indicateurs }[] }) {
  return (
    <Card className="overflow-x-auto">
      <h2 className="border-b border-line px-5 py-3 font-display font-semibold">{titre}</h2>
      {lignes.length ? (
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr>
              <th className="px-5 py-2 font-medium">Groupe</th>
              <th className="px-3 py-2 font-medium">Créées</th>
              <th className="px-3 py-2 font-medium">Envoyées</th>
              <th className="px-3 py-2 font-medium">Temps médian</th>
              <th className="px-3 py-2 font-medium">Taux d&apos;envoi</th>
              <th className="px-3 py-2 font-medium">→ Rendez-vous</th>
              <th className="px-3 py-2 font-medium">→ Mandat</th>
            </tr>
          </thead>
          <tbody className="num divide-y divide-line">
            {lignes.map(({ groupe, ind }) => (
              <tr key={groupe}>
                <td className="px-5 py-2 font-sans">{groupe}</td>
                <td className="px-3 py-2">{ind.creees}</td>
                <td className="px-3 py-2">{ind.envoyees}</td>
                <td className="px-3 py-2">{duree(ind.tempsMedianS)}</td>
                <td className="px-3 py-2">{tx(ind.tauxEnvoi)}</td>
                <td className="px-3 py-2">{tx(ind.tauxRdv)}</td>
                <td className="px-3 py-2">{tx(ind.tauxSigne)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="px-5 py-6 text-sm text-ink-3">Pas encore de données.</p>
      )}
    </Card>
  );
}
