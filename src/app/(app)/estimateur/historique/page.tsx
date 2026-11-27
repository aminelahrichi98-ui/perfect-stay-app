import Link from "next/link";
import { Badge, buttonClass, Card, Input, Notice, Select } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { jour, montant } from "@/lib/estimation/format";
import type { Snapshot } from "@/lib/estimation/snapshot";
import { libelleStatut, STATUTS, tonStatut } from "@/lib/estimation/statuts";
import { cle } from "@/lib/marche/nombres";
import { nombreOuNull } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";
import { lireResponsables } from "../../operations/donnees";
import { ActionsLigne } from "./actions-ligne";

export const metadata = { title: "Historique des estimations" };

type Filtres = { q?: string; statut?: string; commercial?: string; modele?: string; enregistre?: string };

export default async function PageHistorique({ searchParams }: { searchParams: Promise<Filtres> }) {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const f = await searchParams;
  const supabase = await createClient();
  const [{ data }, equipe] = await Promise.all([
    supabase.from("estimations").select("id, created_at, created_by, prenom, quartier, ville, type_bien, statut, modele_document, numero_version, racine_id, lead_id, net_bas, net_haut, envoyee_le, snapshot").order("created_at", { ascending: false }).limit(500),
    lireResponsables(),
  ]);
  const noms = new Map(equipe.map((r) => [r.id, r.nom]));
  const lignes = (data ?? []).filter((e) => {
    if (f.statut === "en_cours" ? !["brouillon", "a_valider"].includes(e.statut) : f.statut && e.statut !== f.statut) return false;
    if (f.commercial && e.created_by !== f.commercial) return false;
    if (f.modele && e.modele_document !== f.modele) return false;
    if (f.q && !cle(`${e.prenom} ${e.quartier} ${e.ville}`).includes(cle(f.q))) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {f.enregistre ? <Notice ton="ok">Brouillon enregistré. Il reste modifiable jusqu&apos;à sa validation.</Notice> : null}
      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" role="search">
        <Input name="q" defaultValue={f.q} placeholder="Propriétaire ou quartier" aria-label="Rechercher" className="lg:col-span-2" />
        <Select name="statut" defaultValue={f.statut ?? ""} aria-label="Statut">
          <option value="">Tous les statuts</option>
          <option value="en_cours">Brouillons et à valider</option>
          {STATUTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select name="commercial" defaultValue={f.commercial ?? ""} aria-label="Créée par">
          <option value="">Toute l&apos;équipe</option>
          {equipe
            .filter((r) => !r.prestataire)
            .map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
        </Select>
        <div className="flex gap-2">
          <Select name="modele" defaultValue={f.modele ?? ""} aria-label="Modèle">
            <option value="">Tous modèles</option>
            <option value="v2">Nouveau modèle</option>
            <option value="v1">Ancien modèle</option>
          </Select>
          <button className={buttonClass("secondary", "md")}>Filtrer</button>
        </div>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-3">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Propriétaire</th>
              <th className="px-3 py-3 font-medium">Logement</th>
              <th className="px-3 py-3 font-medium">Revenu après commissions / mois</th>
              <th className="px-3 py-3 font-medium">Données</th>
              <th className="px-3 py-3 font-medium">Créée par</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lignes.map((e) => {
              const s = e.snapshot as Snapshot | null;
              const bas = nombreOuNull(e.net_bas);
              const haut = nombreOuNull(e.net_haut);
              return (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {jour(e.created_at)}
                    {e.numero_version > 1 ? <span className="block text-xs text-ink-3">version {e.numero_version}</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/estimation/${e.id}`} className="font-medium hover:underline">
                      {e.prenom}
                    </Link>
                    {e.lead_id ? (
                      <Link href={`/crm/${e.lead_id}`} className="block text-xs text-wine-700">
                        fiche CRM
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {e.quartier}
                    <span className="block text-xs text-ink-3">{s?.bien ? `${s.bien.type_logement ?? ""}${s.bien.type_logement !== "studio" && s.bien.chambres !== null ? ` ${s.bien.chambres} ch.` : ""}` : e.type_bien}</span>
                  </td>
                  <td className="num px-3 py-3 whitespace-nowrap">{bas !== null && haut !== null ? `${montant(bas / 12)} – ${montant(haut / 12)}` : "—"}</td>
                  <td className="px-3 py-3 text-xs text-ink-3">
                    {s?.marche ? `v${s.marche.numero} · ${jour(s.marche.dateImport)}${s.marche.correspondance === "approximation" ? " · approx." : ""}` : e.modele_document === "v1" ? "ancien modèle" : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs">{noms.get(e.created_by ?? "") ?? "—"}</td>
                  <td className="px-3 py-3">
                    <Badge ton={tonStatut(e.statut)}>{libelleStatut(e.statut)}</Badge>
                    {e.envoyee_le ? <span className="block text-xs text-ink-3">le {jour(e.envoyee_le)}</span> : null}
                  </td>
                  <td className="px-3 py-3">
                    <ActionsLigne id={e.id} statut={e.statut} v2={e.modele_document === "v2"} modifiable={modifiable} admin={u.admin} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!lignes.length ? <p className="px-5 py-10 text-center text-ink-2">Aucune estimation ne correspond.</p> : null}
      </Card>
    </div>
  );
}
