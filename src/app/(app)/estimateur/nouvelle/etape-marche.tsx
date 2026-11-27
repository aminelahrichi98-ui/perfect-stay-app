"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Search, Upload } from "lucide-react";
import { Badge, buttonClass, Notice, Spinner } from "@/components/ui";
import { jour, montant, nombre, NON_RENSEIGNE, periode, pourcent } from "@/lib/estimation/format";
import { manquantsBien, type Bien } from "@/lib/estimation/snapshot";
import { LIBELLES_NATURE_CENTRAL } from "@/lib/marche/schema";
import { chargerVersionMarche, chercherDonneesMarche, type CandidatAffiche, type VersionAffichee } from "../estimation-actions";

export type Recherche = Extract<Awaited<ReturnType<typeof chercherDonneesMarche>>, { recherche: unknown }>["recherche"];

const TON = { recente: "ok", surveiller: "attention", actualiser: "danger" } as const;
const LIBELLE = { exacte: "Correspondance exacte", regroupement: "Regroupement PriceLabs", approximation: "Approximation" } as const;

type Props = {
  bien: Bien;
  recherche: Recherche | null;
  setRecherche: (r: Recherche | null) => void;
  version: VersionAffichee | null;
  choisir: (v: VersionAffichee | null, approximation: boolean) => void;
  approximation: boolean;
  approximationConfirmee: boolean;
  setApproximationConfirmee: (v: boolean) => void;
  comparableIds: string[];
  setComparableIds: (ids: string[]) => void;
  maxComparables: number;
};

export function EtapeMarche(p: Props) {
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const manquants = manquantsBien(p.bien);

  function chercher() {
    setErreur("");
    demarrer(async () => {
      const r = await chercherDonneesMarche(p.bien);
      if (r.erreur !== undefined) return setErreur(r.erreur);
      p.setRecherche(r.recherche);
      if (r.recherche.choix) await utiliser(r.recherche.choix, false);
      else p.choisir(null, false);
    });
  }

  async function utiliser(c: CandidatAffiche, approximation: boolean) {
    const r = await chargerVersionMarche(c.versionId);
    if (r.erreur !== undefined) return setErreur(r.erreur);
    p.choisir(r.donnees, approximation);
  }

  const v = p.version?.version;
  return (
    <div className="space-y-4">
      {manquants.length ? (
        <Notice ton="danger">Complétez d&apos;abord le logement : {manquants.join(", ")}.</Notice>
      ) : (
        <button type="button" disabled={enCours} onClick={chercher} className={buttonClass(p.recherche ? "secondary" : "primary", "sm")}>
          {enCours ? <Spinner /> : <Search className="h-4 w-4" />} {p.recherche ? "Relancer la recherche" : "Chercher les données de marché"}
        </button>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      {p.recherche && p.recherche.statut !== "trouve" ? (
        <div className="space-y-3 rounded-xl border border-warn/30 bg-warn-bg/50 p-4">
          <p className="text-sm text-warn">{p.recherche.message}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/estimateur/marche/import" target="_blank" className={buttonClass("secondary", "sm")}>
              <Upload className="h-4 w-4" /> Importer des données PriceLabs
            </Link>
            <Link href="/estimateur/marche/quartiers" target="_blank" className={buttonClass("ghost", "sm")}>
              Ajouter un alias de quartier
            </Link>
          </div>
          {p.recherche.alternatives.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Alternatives (à choisir explicitement, signalées dans le document) :</p>
              {p.recherche.alternatives.map((c) => (
                <Candidat key={c.versionId} c={c} actif={p.version?.version.id === c.versionId} onUtiliser={() => demarrer(() => utiliser(c, true))} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-2">Aucune alternative dans la base. Aucune estimation n&apos;est possible sans données réelles.</p>
          )}
        </div>
      ) : null}

      {p.recherche?.statut === "trouve" && p.recherche.autresExacts.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-2">Autres segments correspondants ({p.recherche.autresExacts.length})</summary>
          <div className="mt-2 space-y-2">
            {[p.recherche.choix!, ...p.recherche.autresExacts].map((c) => (
              <Candidat key={c.versionId} c={c} actif={p.version?.version.id === c.versionId} onUtiliser={() => demarrer(() => utiliser(c, false))} />
            ))}
          </div>
        </details>
      ) : null}

      {p.version && v ? (
        <div className="space-y-3 rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">
              {p.version.segment.quartier} · {p.version.segment.typologie}
            </p>
            <Badge ton="marque">version {v.numero}</Badge>
            {p.approximation ? <Badge ton="attention">approximation</Badge> : <Badge ton="ok">{LIBELLE[p.recherche?.choix?.correspondance ?? "exacte"]}</Badge>}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Info t="Période analysée" v={periode(v.periode_debut, v.periode_fin, v.type_periode)} />
            <Info t="Date d'import" v={jour(v.date_import)} />
            <Info t="Source" v={v.source} />
            <Info t="Revenu annuel bas" v={montant(v.revenu_annuel_bas, v.devise)} />
            <Info t="Revenu annuel haut" v={montant(v.revenu_annuel_haut, v.devise)} />
            <Info t="Valeur centrale" v={v.revenu_annuel_central === null ? `${NON_RENSEIGNE} (calculée)` : `${montant(v.revenu_annuel_central, v.devise)} · ${LIBELLES_NATURE_CENTRAL[v.central_nature]}`} />
            <Info t="Prix moyen par nuit" v={montant(v.adr, v.devise)} />
            <Info t="Taux d'occupation" v={pourcent(v.occupation, 1)} />
            <Info t="Logements analysés" v={nombre(v.echantillon)} />
          </dl>
          {v.base_plateforme_incluse === null ? <p className="text-xs text-warn">La source ne précise pas si les revenus incluent les frais de plateforme : vous devrez confirmer la base de calcul.</p> : null}
          {p.approximation ? (
            <label className="flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
              <input type="checkbox" className="mt-0.5" checked={p.approximationConfirmee} onChange={(e) => p.setApproximationConfirmee(e.target.checked)} />
              J&apos;utilise ces données en connaissance de cause : elles ne correspondent pas exactement au logement ({p.recherche?.alternatives.find((c) => c.versionId === v.id)?.ecarts.join(", ") || "segment différent"}). L&apos;écart sera indiqué dans la méthodologie.
            </label>
          ) : null}

          <div>
            <p className="mb-1 text-sm font-medium">
              Annonces comparables à montrer ({p.comparableIds.length}/{p.maxComparables})
            </p>
            {p.version.comparables.length ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.version.comparables.map((c) => {
                  const coche = p.comparableIds.includes(c.id);
                  const possible = Boolean(c.photo_chemin) && (c.revenu_annuel !== null || (c.revenu_annuel_bas !== null && c.revenu_annuel_haut !== null));
                  return (
                    <li key={c.id}>
                      <label className={possible ? "flex cursor-pointer items-center gap-3 rounded-lg border border-line p-2" : "flex items-center gap-3 rounded-lg border border-line p-2 opacity-60"}>
                        <input
                          type="checkbox"
                          disabled={!possible || (!coche && p.comparableIds.length >= p.maxComparables)}
                          checked={coche}
                          onChange={(e) => p.setComparableIds(e.target.checked ? [...p.comparableIds, c.id] : p.comparableIds.filter((x) => x !== c.id))}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.photoUrl ? <img src={c.photoUrl} alt="" className="h-12 w-16 rounded object-cover" /> : <span className="grid h-12 w-16 place-items-center rounded bg-sunken text-[0.6rem] text-ink-3">sans photo</span>}
                        <span className="min-w-0 text-xs">
                          <span className="block truncate font-medium text-ink">{c.nom || "Annonce"}</span>
                          <span className="block text-ink-3">{c.revenu_annuel !== null ? `${montant(c.revenu_annuel, v.devise)}/an` : c.revenu_annuel_bas !== null ? `${montant(c.revenu_annuel_bas, v.devise)} – ${montant(c.revenu_annuel_haut, v.devise)}/an` : "revenu non renseigné"}</span>
                          {!possible ? <span className="block text-warn">photo réelle ou revenu manquant</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Aucune annonce comparable proposée pour cette version : la section sera adaptée.</p>
            )}
            {p.comparableIds.length === 1 ? <p className="mt-1 text-xs text-warn">Choisissez au moins 2 annonces, ou aucune (la page des preuves s&apos;adaptera).</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Candidat({ c, actif, onUtiliser }: { c: CandidatAffiche; actif: boolean; onUtiliser: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{c.libelle}</span>
        <span className="block text-xs text-ink-3">
          {LIBELLE[c.correspondance]}
          {c.ecarts.length ? ` · ${c.ecarts.join(", ")}` : ""}
        </span>
      </span>
      {c.fraicheur ? <Badge ton={TON[c.fraicheur.niveau]}>{c.fraicheur.jours} j</Badge> : null}
      {actif ? <Badge ton="marque">utilisé</Badge> : <button type="button" className={buttonClass("secondary", "sm", "h-8")} onClick={onUtiliser}>Utiliser</button>}
    </div>
  );
}

function Info({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{t}</dt>
      <dd className="num font-medium">{v}</dd>
    </div>
  );
}
