import Link from "next/link";
import { Database, FileText, Plus, Upload } from "lucide-react";
import { Badge, buttonClass, Card } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui, moisDe, premierDuMois } from "@/lib/dates";
import { jour, montant, typologie } from "@/lib/estimation/format";
import { libelleStatut, tonStatut } from "@/lib/estimation/statuts";
import { fraicheur } from "@/lib/marche/matching";
import { chargerParametres, nombreOuNull } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Estimateur" };

export default async function PageTableauDeBord() {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const supabase = await createClient();
  const debutMois = premierDuMois(moisDe(aujourdhui()));
  const [params, { data: estimations }, { data: segments }, { data: versions }, { data: imports }] = await Promise.all([
    chargerParametres(supabase),
    supabase.from("estimations").select("id, created_at, prenom, quartier, statut, modele_document, net_bas, net_haut, numero_version").order("created_at", { ascending: false }).limit(500),
    supabase.from("marche_segments").select("id, statut"),
    supabase.from("marche_versions").select("segment_id, date_import").eq("active", true),
    supabase.from("marche_imports").select("id", { count: "exact" }).in("statut", ["brouillon", "extrait"]),
  ]);
  const liste = estimations ?? [];
  const duMois = liste.filter((e) => e.created_at >= `${debutMois}T00:00:00`);
  const actifs = new Set((segments ?? []).filter((s) => s.statut === "actif").map((s) => s.id));
  const seuils = { recente: params.donnees.fraicheurRecente, alerte: params.donnees.fraicheurAlerte };
  const today = aujourdhui();
  const avecVersion = (versions ?? []).filter((v) => actifs.has(v.segment_id));
  const aActualiser = avecVersion.filter((v) => fraicheur(v.date_import, today, seuils).niveau === "actualiser").length;
  const aSurveiller = avecVersion.filter((v) => fraicheur(v.date_import, today, seuils).niveau === "surveiller").length;

  const tuiles = [
    { t: "Créées ce mois-ci", v: duMois.length },
    { t: "Envoyées ce mois-ci", v: duMois.filter((e) => e.statut === "envoyee").length },
    { t: "Brouillons et à valider", v: liste.filter((e) => e.statut === "brouillon" || e.statut === "a_valider").length, lien: "/estimateur/historique?statut=en_cours" },
    { t: "Segments de marché disponibles", v: avecVersion.length, lien: "/estimateur/marche" },
    { t: "Segments à actualiser", v: aActualiser, detail: aSurveiller ? `+ ${aSurveiller} à surveiller` : undefined, lien: "/estimateur/marche?fraicheur=actualiser", alerte: aActualiser > 0 },
    { t: "Imports à valider", v: imports?.length ?? 0, lien: "/estimateur/marche", alerte: (imports?.length ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      {modifiable ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/estimateur/nouvelle" className={buttonClass("primary", "md")}>
            <Plus className="h-4 w-4" /> Nouvelle estimation
          </Link>
          <Link href="/estimateur/marche/import" className={buttonClass("secondary", "md")}>
            <Upload className="h-4 w-4" /> Importer des données PriceLabs
          </Link>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tuiles.map((x) => {
          const contenu = (
            <>
              <p className="text-[0.82rem] text-ink-3">{x.t}</p>
              <p className={x.alerte ? "num font-display text-3xl font-semibold text-warn" : "num font-display text-3xl font-semibold"}>{x.v}</p>
              {x.detail ? <p className="text-xs text-ink-3">{x.detail}</p> : null}
            </>
          );
          return x.lien ? (
            <Link key={x.t} href={x.lien} className="press rounded-2xl border border-line bg-surface p-4 shadow-card hover:bg-sunken/40">
              {contenu}
            </Link>
          ) : (
            <Card key={x.t} className="p-4">
              {contenu}
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-display text-base font-semibold tracking-tight">Dernières estimations</h2>
          <Link href="/estimateur/historique" className="text-sm text-wine-700">
            Tout l&apos;historique
          </Link>
        </div>
        {liste.length ? (
          <ul className="divide-y divide-line">
            {liste.slice(0, 8).map((e) => (
              <li key={e.id}>
                <Link href={`/estimation/${e.id}`} className="press flex items-center gap-4 px-5 py-3 hover:bg-sunken/60">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-wine-50 text-wine-700">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {e.prenom} · {e.quartier}
                      {e.numero_version > 1 ? ` · v${e.numero_version}` : ""}
                    </span>
                    <span className="block text-[0.82rem] text-ink-3">
                      {jour(e.created_at)} · {e.modele_document === "v1" ? "ancien modèle" : "nouveau modèle"}
                    </span>
                  </span>
                  <span className="num hidden text-right text-sm sm:block">
                    {nombreOuNull(e.net_bas) !== null ? `${montant(nombreOuNull(e.net_bas)! / 12)} – ${montant(nombreOuNull(e.net_haut)! / 12)}` : "—"}
                    <span className="block text-[0.72rem] text-ink-3">par mois, après commissions</span>
                  </span>
                  <Badge ton={tonStatut(e.statut)}>{libelleStatut(e.statut)}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid place-items-center gap-3 px-6 py-12 text-center">
            <Database className="h-8 w-8 text-ink-3" />
            <p className="max-w-md text-ink-2">Aucune estimation pour l&apos;instant. Commencez par importer des données de marché, puis créez une estimation depuis un prospect du CRM.</p>
          </div>
        )}
      </Card>
      <p className="text-xs text-ink-3">Typologies suivies : {typologie("studio", 0)}, {typologie("appartement", 1)}, {typologie("appartement", 2)}… Les segments se créent à la validation des imports.</p>
    </div>
  );
}
