import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import { Badge, buttonClass, Card, Notice, Select } from "@/components/ui";
import { exigerAcces, peutModifier } from "@/lib/auth";
import { aujourdhui } from "@/lib/dates";
import { UUID } from "@/lib/estimation/acces";
import { jour, montant, nombre, NON_RENSEIGNE, periode, pourcent, typologie } from "@/lib/estimation/format";
import { fraicheur } from "@/lib/marche/matching";
import { LIBELLES_NATURE_CENTRAL, LIBELLES_STANDING, type Standing } from "@/lib/marche/schema";
import { BUCKET_MARCHE, chargerParametres, COLONNES_COMPARABLE, COLONNES_VERSION, normaliserComparable, normaliserVersion } from "@/lib/marche/serveur";
import { comparerVersions } from "@/lib/marche/versions";
import { urlsLecture } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { SaisieManuelle } from "../saisie-manuelle";
import { BoutonStatutSegment, BoutonsVersion, NotesVersion, OptionsComparable } from "./boutons";

export const metadata = { title: "Segment de marché" };

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const ouiNon = (v: boolean | null) => (v === null ? "inconnu" : v ? "oui" : "non");
const STATUT_VERSION: Record<string, string> = { validee: "validée", remplacee: "remplacée", archivee: "archivée" };

export default async function PageSegment({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ valide?: string; a?: string; b?: string }> }) {
  const u = await exigerAcces("estimateur");
  const modifiable = peutModifier(u, "estimateur");
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("marche_segments").select("id, quartier_id, type_logement, chambres, chambres_max, capacite, standing, statut, created_at").eq("id", id).maybeSingle();
  if (!s) notFound();
  const [{ data: q }, { data: lignesVersions }, parametres] = await Promise.all([
    supabase.from("marche_quartiers").select("id, ville, nom").eq("id", s.quartier_id).maybeSingle(),
    supabase.from("marche_versions").select(COLONNES_VERSION).eq("segment_id", id).order("numero", { ascending: false }),
    chargerParametres(supabase),
  ]);
  const versions = (lignesVersions ?? []).map(normaliserVersion);
  const active = versions.find((v) => v.active) ?? null;
  const ids = versions.map((v) => v.id);
  const [{ data: lignesComp }, { data: captures }, { data: usages }, { data: auteurs }] = await Promise.all([
    active ? supabase.from("marche_comparables").select(COLONNES_COMPARABLE).eq("version_id", active.id).order("ordre") : Promise.resolve({ data: [] }),
    active?.import_id ? supabase.from("marche_captures").select("id, chemin, nom, ordre").eq("import_id", active.import_id).order("ordre") : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("estimations").select("segment_version_id").in("segment_version_id", ids) : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, prenom, nom"),
  ]);
  const comparables = (lignesComp ?? []).map((c) => normaliserComparable(c as Record<string, unknown>));
  const urls = await urlsLecture(BUCKET_MARCHE, [...(captures ?? []).map((c) => c.chemin), ...comparables.map((c) => c.photo_chemin).filter(Boolean)]);
  const utilisations = new Map<string, number>();
  for (const e of usages ?? []) utilisations.set(e.segment_version_id, (utilisations.get(e.segment_version_id) ?? 0) + 1);
  const nomAuteur = new Map((auteurs ?? []).map((a) => [a.id, `${a.prenom} ${a.nom}`.trim()]));
  const fr = active ? fraicheur(active.date_import, aujourdhui(), { recente: parametres.donnees.fraicheurRecente, alerte: parametres.donnees.fraicheurAlerte }) : null;
  const va = versions.find((v) => v.id === sp.a);
  const vb = versions.find((v) => v.id === sp.b);
  const differences = va && vb ? comparerVersions(va, vb) : null;
  const titre = `${q?.nom ?? "Quartier"} · ${typologie(s.type_logement, s.chambres, s.chambres_max)}`;

  return (
    <div className="space-y-5">
      <Link href="/estimateur/marche" className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Base marché
      </Link>
      {sp.valide ? <Notice ton="ok">Version n° {sp.valide} validée et active : elle sera utilisée par les nouvelles estimations.</Notice> : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight">{titre}</h2>
          <p className="text-sm text-ink-2">
            {q?.ville}
            {s.standing ? ` · Standing ${LIBELLES_STANDING[s.standing as Standing].toLowerCase()}` : " · Tous standings"}
            {s.capacite ? ` · ${s.capacite} voyageurs` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.statut === "archive" ? <Badge>Archivé</Badge> : <Badge ton="ok">Actif</Badge>}
            {fr ? <Badge ton={fr.niveau === "recente" ? "ok" : fr.niveau === "surveiller" ? "attention" : "danger"}>Importée il y a {fr.jours} j</Badge> : <Badge ton="attention">Aucune version active</Badge>}
          </div>
        </div>
        {modifiable ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/estimateur/marche/import?segment=${s.id}`} className={buttonClass("primary", "sm")}>
              <RefreshCw className="h-4 w-4" /> Actualiser (nouvelles captures)
            </Link>
            {active ? <SaisieManuelle segmentId={s.id} libelle="Compléter / corriger" /> : null}
            <BoutonStatutSegment segmentId={s.id} statut={s.statut} />
          </div>
        ) : null}
      </div>

      {active ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Card className="space-y-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">Version active n° {active.numero}</h3>
              <p className="text-xs text-ink-3">
                {active.source} · importée le {jour(active.date_import)} · validée par {nomAuteur.get(active.validee_par ?? "") || "—"}
              </p>
            </div>
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Info terme="Période analysée" valeur={periode(active.periode_debut, active.periode_fin, active.type_periode)} />
              <Info terme="Devise" valeur={active.devise} />
              <Info terme="Revenu annuel bas" valeur={montant(active.revenu_annuel_bas, active.devise)} />
              <Info terme="Revenu annuel haut" valeur={montant(active.revenu_annuel_haut, active.devise)} />
              <Info terme="Revenu annuel central" valeur={active.revenu_annuel_central === null ? `${NON_RENSEIGNE} (calculé dans les estimations)` : `${montant(active.revenu_annuel_central, active.devise)} (${LIBELLES_NATURE_CENTRAL[active.central_nature] ?? "valeur centrale"})`} />
              <Info terme="Revenu mensuel moyen" valeur={montant(active.revenu_mensuel_moyen, active.devise)} />
              <Info terme="Prix moyen par nuit" valeur={montant(active.adr, active.devise)} />
              <Info terme="Taux d'occupation" valeur={pourcent(active.occupation, 1)} />
              <Info terme="Nuits réservées" valeur={nombre(active.nuits_reservees)} />
              <Info terme="Logements analysés" valeur={nombre(active.echantillon)} />
              <Info terme="Frais de plateforme inclus" valeur={ouiNon(active.base_plateforme_incluse)} alerte={active.base_plateforme_incluse === null} />
              <Info terme="Ménage inclus · taxes incluses" valeur={`${ouiNon(active.base_menage_inclus)} · ${ouiNon(active.base_taxes_incluses)}`} />
            </dl>
            {active.definition_source ? <p className="text-xs text-ink-3">Définition selon la source : {active.definition_source}</p> : null}
            {active.percentiles?.length ? (
              <div>
                <p className="mb-1 text-sm font-medium">Percentiles</p>
                <ul className="flex flex-wrap gap-2 text-sm">
                  {active.percentiles.map((p, i) => (
                    <li key={i} className="rounded-lg bg-sunken px-2.5 py-1">
                      {p.libelle} : <span className="num font-medium">{p.metrique === "taux_occupation" ? pourcent(p.valeur, 1) : montant(p.valeur, active.devise)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {active.mensuels?.length ? (
              <div>
                <p className="mb-1 text-sm font-medium">Revenus mensuels lus</p>
                <ul className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-6">
                  {[...active.mensuels].sort((a, b) => (a.annee ?? 0) - (b.annee ?? 0) || a.mois - b.mois).map((m, i) => (
                    <li key={i} className="rounded-lg bg-sunken px-2 py-1">
                      <span className="block text-ink-3">
                        {MOIS[m.mois - 1]} {m.annee ?? ""} {m.nature === "prevision" ? "(prév.)" : ""}
                      </span>
                      <span className="num font-medium">{montant(m.valeur, active.devise)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {active.parametres_recherche?.length ? <p className="text-xs text-ink-3">Paramètres PriceLabs : {active.parametres_recherche.map((p) => `${p.libelle} : ${p.valeur}`).join(" · ")}</p> : null}
            {active.avertissements?.length ? (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-warn">
                {active.avertissements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {modifiable ? <NotesVersion versionId={active.id} notes={active.notes} /> : active.notes ? <p className="text-sm">{active.notes}</p> : null}
          </Card>

          <Card className="space-y-3 p-5">
            <h3 className="font-display text-lg font-semibold">Sources ({captures?.length ?? 0})</h3>
            {captures?.length ? (
              <ul className="grid grid-cols-2 gap-2">
                {captures.map((c, i) => (
                  <li key={c.id}>
                    <a href={urls.get(c.chemin)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urls.get(c.chemin)} alt={`Capture ${i + 1}`} className="aspect-[4/3] w-full bg-sunken object-cover object-top" />
                      <span className="block truncate px-2 py-1 text-xs text-ink-2">
                        {i + 1}. {c.nom}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Saisie manuelle, sans capture enregistrée.</p>
            )}
            {active.import_id ? (
              <Link href={`/estimateur/marche/import/${active.import_id}`} className="text-sm text-wine-700 underline underline-offset-2">
                Voir l&apos;import et les preuves de lecture
              </Link>
            ) : null}
          </Card>
        </div>
      ) : (
        <Notice ton="info">Aucune version active : importez des captures pour ce segment, ou rendez active une version de l&apos;historique.</Notice>
      )}

      {active ? (
        <Card className="space-y-3 p-5">
          <h3 className="font-display text-lg font-semibold">Annonces comparables ({comparables.length})</h3>
          <p className="text-xs text-ink-3">Seules les annonces cochées et dotées d&apos;une photo réelle (ajoutée à la main) peuvent apparaître dans le document envoyé au propriétaire. Elles ne sont jamais présentées comme gérées par Perfect Stay.</p>
          {comparables.length ? (
            <ul className="divide-y divide-line">
              {comparables.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  {c.photo_chemin && urls.get(c.photo_chemin) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls.get(c.photo_chemin)} alt="" className="h-14 w-20 rounded-lg object-cover" />
                  ) : (
                    <span className="grid h-14 w-20 place-items-center rounded-lg bg-sunken text-[0.65rem] text-ink-3">sans photo</span>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="truncate font-medium">{c.nom || "Annonce sans titre"}</p>
                    <p className="text-xs text-ink-3">
                      {[c.quartier, c.type_logement, c.chambres !== null ? `${c.chambres} ch.` : null, c.revenu_annuel !== null ? `${montant(c.revenu_annuel, active.devise)}/an` : c.revenu_annuel_bas !== null ? `${montant(c.revenu_annuel_bas, active.devise)} – ${montant(c.revenu_annuel_haut, active.devise)}/an` : null, c.adr !== null ? `${montant(c.adr, active.devise)}/nuit` : null, c.occupation !== null ? pourcent(c.occupation) : null].filter(Boolean).join(" · ")}
                    </p>
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-wine-700">
                        Annonce <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                  {modifiable ? <OptionsComparable comparableId={c.id} affichable={c.affichable} /> : c.affichable ? <Badge ton="ok">proposée</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Aucune annonce comparable dans cette version.</p>
          )}
        </Card>
      ) : null}

      <Card className="space-y-3 p-5">
        <h3 className="font-display text-lg font-semibold">Historique des versions</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-ink-3">
              <tr>
                <th className="py-2 pr-3 font-medium">N°</th>
                <th className="py-2 pr-3 font-medium">Période</th>
                <th className="py-2 pr-3 font-medium">Import</th>
                <th className="py-2 pr-3 font-medium">Revenus annuels</th>
                <th className="py-2 pr-3 font-medium">Estimations</th>
                <th className="py-2 pr-3 font-medium">Statut</th>
                {modifiable ? <th className="py-2 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="py-2 pr-3 font-medium">{v.numero}</td>
                  <td className="py-2 pr-3">{periode(v.periode_debut, v.periode_fin)}</td>
                  <td className="py-2 pr-3">{jour(v.date_import)}</td>
                  <td className="num py-2 pr-3">
                    {montant(v.revenu_annuel_bas, v.devise)} – {montant(v.revenu_annuel_haut, v.devise)}
                  </td>
                  <td className="py-2 pr-3">{utilisations.get(v.id) ?? 0}</td>
                  <td className="py-2 pr-3">{v.active ? <Badge ton="ok">active</Badge> : <Badge>{STATUT_VERSION[v.statut] ?? v.statut}</Badge>}</td>
                  {modifiable ? (
                    <td className="py-2">
                      <BoutonsVersion versionId={v.id} active={v.active} statut={v.statut} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {versions.length >= 2 ? (
          <form className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
            <span className="text-sm text-ink-2">Comparer</span>
            <Select name="a" defaultValue={sp.a ?? versions[1].id} aria-label="Version de référence" className="h-9 w-auto text-sm">
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  n° {v.numero}
                </option>
              ))}
            </Select>
            <span className="text-sm text-ink-2">avec</span>
            <Select name="b" defaultValue={sp.b ?? versions[0].id} aria-label="Version comparée" className="h-9 w-auto text-sm">
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  n° {v.numero}
                </option>
              ))}
            </Select>
            <button className={buttonClass("secondary", "sm")}>Comparer</button>
          </form>
        ) : null}
        {differences ? (
          differences.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-3">
                <tr>
                  <th className="py-1.5 font-medium">Indicateur</th>
                  <th className="py-1.5 font-medium">n° {va!.numero}</th>
                  <th className="py-1.5 font-medium">n° {vb!.numero}</th>
                  <th className="py-1.5 font-medium">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {differences.map((x) => (
                  <tr key={x.champ}>
                    <td className="py-1.5">{x.libelle}</td>
                    <td className="num py-1.5">{typeof x.avant === "number" ? nombre(x.avant, 2) : (x.avant ?? NON_RENSEIGNE)}</td>
                    <td className="num py-1.5">{typeof x.apres === "number" ? nombre(x.apres, 2) : (x.apres ?? NON_RENSEIGNE)}</td>
                    <td className="num py-1.5">{x.ecart === null ? "—" : `${x.ecart > 0 ? "+" : ""}${nombre(x.ecart, 1)} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-ink-3">Ces deux versions ont les mêmes chiffres.</p>
          )
        ) : null}
      </Card>
    </div>
  );
}

function Info({ terme, valeur, alerte }: { terme: string; valeur: string; alerte?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{terme}</dt>
      <dd className={alerte ? "font-medium text-warn" : "num font-medium"}>{valeur}</dd>
    </div>
  );
}
