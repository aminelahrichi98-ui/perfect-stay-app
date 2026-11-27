import Link from "next/link";
import { Database, MapPinned, Upload } from "lucide-react";
import { Badge, buttonClass, Card, Input, Select } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { jour, montant, periode, pourcent, typologie } from "@/lib/estimation/format";
import { fraicheur } from "@/lib/marche/matching";
import { cle } from "@/lib/marche/nombres";
import { LIBELLES_STANDING, type Standing } from "@/lib/marche/schema";
import { chargerParametres, nombreOuNull } from "@/lib/marche/serveur";
import { createClient } from "@/lib/supabase/server";
import { SaisieManuelle } from "./saisie-manuelle";

export const metadata = { title: "Base marché" };

const TON_FRAICHEUR = { recente: "ok", surveiller: "attention", actualiser: "danger" } as const;
const LIBELLE_FRAICHEUR = { recente: "Récente", surveiller: "À surveiller", actualiser: "À actualiser" } as const;

type Filtres = { q?: string; ville?: string; type?: string; chambres?: string; fraicheur?: string; statut?: string };

export default async function PageBaseMarche({ searchParams }: { searchParams: Promise<Filtres> }) {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const f = await searchParams;
  const supabase = await createClient();
  const [params, { data: segments }, { data: versions }, { data: quartiers }, { data: brouillons }] = await Promise.all([
    chargerParametres(supabase),
    supabase.from("marche_segments").select("id, quartier_id, type_logement, chambres, chambres_max, capacite, standing, statut"),
    supabase.from("marche_versions").select("id, segment_id, numero, date_import, periode_debut, periode_fin, type_periode, devise, revenu_annuel_bas, revenu_annuel_central, revenu_annuel_haut, adr, occupation, source").eq("active", true),
    supabase.from("marche_quartiers").select("id, ville, nom"),
    supabase.from("marche_imports").select("id, statut, created_at").in("statut", ["brouillon", "extrait"]).order("created_at", { ascending: false }).limit(10),
  ]);
  const parQuartier = new Map((quartiers ?? []).map((q) => [q.id, q]));
  const parSegment = new Map((versions ?? []).map((v) => [v.segment_id, v]));
  const seuils = { recente: params.donnees.fraicheurRecente, alerte: params.donnees.fraicheurAlerte };
  const today = aujourdhui();

  const lignes = (segments ?? [])
    .map((s) => {
      const q = parQuartier.get(s.quartier_id);
      const v = parSegment.get(s.id);
      return { s, q, v, fr: v ? fraicheur(v.date_import, today, seuils) : null };
    })
    .filter(({ s, q, fr }) => {
      if ((f.statut ?? "actif") !== "tous" && s.statut !== (f.statut ?? "actif")) return false;
      if (f.ville && cle(q?.ville ?? "") !== cle(f.ville)) return false;
      if (f.type && s.type_logement !== f.type) return false;
      if (f.chambres && String(s.chambres) !== f.chambres) return false;
      if (f.fraicheur === "sans" ? fr !== null : f.fraicheur && fr?.niveau !== f.fraicheur) return false;
      if (f.q && !cle(`${q?.nom ?? ""} ${q?.ville ?? ""}`).includes(cle(f.q))) return false;
      return true;
    })
    .sort((a, b) => (a.q?.ville ?? "").localeCompare(b.q?.ville ?? "") || (a.q?.nom ?? "").localeCompare(b.q?.nom ?? "") || a.s.chambres - b.s.chambres);
  const villes = [...new Set((quartiers ?? []).map((q) => q.ville))].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-ink-2">
          Données PriceLabs validées, par quartier et typologie. Une donnée n&apos;est utilisée dans une estimation qu&apos;après validation humaine ; chaque actualisation crée une nouvelle version.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/estimateur/marche/quartiers" className={buttonClass("ghost", "sm")}>
            <MapPinned className="h-4 w-4" /> Quartiers et alias
          </Link>
          {modifiable ? <SaisieManuelle /> : null}
          {modifiable ? (
            <Link href="/estimateur/marche/import" className={buttonClass("primary", "sm")}>
              <Upload className="h-4 w-4" /> Importer des captures
            </Link>
          ) : null}
        </div>
      </div>

      {brouillons?.length ? (
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium">Imports en attente de validation</p>
          <ul className="flex flex-wrap gap-2">
            {brouillons.map((b) => (
              <li key={b.id}>
                <Link href={`/estimateur/marche/import/${b.id}`} className={buttonClass("secondary", "sm")}>
                  {b.statut === "extrait" ? "À valider" : "Brouillon"} du {jour(b.created_at)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <Input name="q" defaultValue={f.q} placeholder="Quartier ou ville" aria-label="Rechercher" className="lg:col-span-2" />
        <Select name="ville" defaultValue={f.ville ?? ""} aria-label="Ville">
          <option value="">Toutes les villes</option>
          {villes.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Select>
        <Select name="type" defaultValue={f.type ?? ""} aria-label="Type">
          <option value="">Tous les types</option>
          <option value="studio">Studio</option>
          <option value="appartement">Appartement</option>
          <option value="villa">Villa</option>
          <option value="riad">Riad</option>
        </Select>
        <Select name="fraicheur" defaultValue={f.fraicheur ?? ""} aria-label="Fraîcheur">
          <option value="">Toute fraîcheur</option>
          <option value="recente">Récentes</option>
          <option value="surveiller">À surveiller</option>
          <option value="actualiser">À actualiser</option>
          <option value="sans">Sans version validée</option>
        </Select>
        <div className="flex gap-2">
          <Select name="statut" defaultValue={f.statut ?? "actif"} aria-label="Statut">
            <option value="actif">Actifs</option>
            <option value="archive">Archivés</option>
            <option value="tous">Tous</option>
          </Select>
          <button className={buttonClass("secondary", "md")}>Filtrer</button>
        </div>
      </form>

      {lignes.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {lignes.map(({ s, q, v, fr }) => (
              <li key={s.id}>
                <Link href={`/estimateur/marche/${s.id}`} className="press grid gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-sunken/60 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {q?.nom ?? "Quartier inconnu"} · {typologie(s.type_logement, s.chambres, s.chambres_max)}
                    </span>
                    <span className="block truncate text-[0.82rem] text-ink-3">
                      {q?.ville}
                      {s.standing ? ` · ${LIBELLES_STANDING[s.standing as Standing]}` : ""}
                      {s.capacite ? ` · ${s.capacite} voyageurs` : ""}
                      {v ? ` · v${v.numero} · ${v.source}` : ""}
                    </span>
                  </span>
                  <span className="text-[0.82rem] text-ink-2">
                    {v ? (
                      <>
                        <span className="block">Période : {periode(v.periode_debut, v.periode_fin)}</span>
                        <span className="block text-ink-3">Importée le {jour(v.date_import)}</span>
                      </>
                    ) : (
                      "Aucune version validée"
                    )}
                  </span>
                  <span className="num text-[0.82rem]">
                    {v ? (
                      <>
                        <span className="block font-medium">
                          {nombreOuNull(v.revenu_annuel_bas) !== null || nombreOuNull(v.revenu_annuel_haut) !== null
                            ? `${montant(nombreOuNull(v.revenu_annuel_bas), v.devise)} – ${montant(nombreOuNull(v.revenu_annuel_haut), v.devise)}`
                            : `Central : ${montant(nombreOuNull(v.revenu_annuel_central), v.devise)}`}
                        </span>
                        <span className="block text-ink-3">
                          Prix/nuit {montant(nombreOuNull(v.adr), v.devise)} · Occupation {pourcent(nombreOuNull(v.occupation))}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="flex gap-1.5">
                    {s.statut === "archive" ? <Badge>Archivé</Badge> : null}
                    {fr ? <Badge ton={TON_FRAICHEUR[fr.niveau]}>{LIBELLE_FRAICHEUR[fr.niveau]}</Badge> : <Badge ton="attention">Sans données</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="grid place-items-center gap-3 px-6 py-14 text-center">
          <Database className="h-8 w-8 text-ink-3" />
          <p className="max-w-md text-ink-2">
            {segments?.length ? "Aucun segment ne correspond à ces filtres." : "La base marché est vide. Importez des captures PriceLabs pour créer le premier segment."}
          </p>
        </Card>
      )}
    </div>
  );
}
