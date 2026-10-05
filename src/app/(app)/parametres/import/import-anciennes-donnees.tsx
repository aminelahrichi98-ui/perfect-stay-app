"use client";

import { CheckCircle2, FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDate, formatMad } from "@/lib/format";
import {
  construireApercu,
  HYPOTHESES,
  lireExport,
  type DonneesAnciennes,
  type Hypothese,
} from "@/lib/import-ancien";
import { TAUX_COMMISSION_DEFAUT } from "@/lib/logements";
import { etatImport, importerDonnees, importerPhoto, type ResultatImport } from "./actions";

type Deja = { logements: Set<string>; transactions: Set<string> };

const versTaux = (s: string) => Number(s.trim().replace(",", "."));

type Props = {
  /** Remplaçable pour tester l'écran sans base de données */
  verifierEtat?: typeof etatImport;
};

export function ImportAnciennesDonnees({ verifierEtat = etatImport }: Props) {
  const fichier = useRef<HTMLInputElement>(null);
  const [donnees, setDonnees] = useState<DonneesAnciennes | null>(null);
  const [deja, setDeja] = useState<Deja>({ logements: new Set(), transactions: new Set() });
  const [erreur, setErreur] = useState<string>();
  const [collage, setCollage] = useState("");
  const [hypothese, setHypothese] = useState<Hypothese>("recu");
  const [tauxSaisis, setTauxSaisis] = useState<Record<string, string>>({});
  const [verifie, setVerifie] = useState(false);
  const [phase, setPhase] = useState<"attente" | "import" | "photos" | "fini">("attente");
  const [resultat, setResultat] = useState<Extract<ResultatImport, { logementsCrees: number }> | null>(null);
  const [photosEnvoyees, setPhotosEnvoyees] = useState({ fait: 0, total: 0, echecs: 0 });

  const photosLocales = useRef<Map<string, string>>(new Map());

  async function charger(contenu: string) {
    setErreur(undefined);
    const r = lireExport(contenu);
    if (!r.ok) {
      setDonnees(null);
      setErreur(r.erreur);
      return;
    }
    // Les photos restent dans le navigateur : on les enverra une par une, après les chiffres.
    photosLocales.current = new Map(r.donnees.logements.filter((l) => l.photo).map((l) => [l.id, l.photo]));
    const sansPhotos = { ...r.donnees, logements: r.donnees.logements.map((l) => ({ ...l, photo: "" })) };

    const etat = await verifierEtat(
      sansPhotos.logements.map((l) => l.id),
      sansPhotos.transactions.map((t) => t.id),
    );
    if ("erreur" in etat) {
      setErreur(etat.erreur);
      return;
    }
    setDeja({ logements: new Set(etat.logements), transactions: new Set(etat.transactions) });
    setTauxSaisis(Object.fromEntries(sansPhotos.logements.map((l) => [l.id, String(TAUX_COMMISSION_DEFAUT)])));
    setVerifie(false);
    setPhase("attente");
    setResultat(null);
    setDonnees(sansPhotos);
  }

  const taux = useMemo(() => {
    const t: Record<string, number> = {};
    for (const [id, v] of Object.entries(tauxSaisis)) t[id] = versTaux(v);
    return t;
  }, [tauxSaisis]);
  const tauxInvalide = Object.entries(taux).some(([id, t]) => !deja.logements.has(id) && !(t >= 0 && t <= 100));

  const apercu = useMemo(() => {
    if (!donnees || tauxInvalide) return null;
    return construireApercu(donnees, hypothese, taux);
  }, [donnees, hypothese, taux, tauxInvalide]);

  async function lancer() {
    if (!donnees) return;
    setErreur(undefined);
    setPhase("import");
    const r = await importerDonnees({ donnees, hypothese, taux });
    if ("erreur" in r) {
      setErreur(r.erreur);
      setPhase("attente");
      return;
    }
    setResultat(r);
    const aEnvoyer = r.photos.filter((p) => photosLocales.current.has(p.ancienId));
    if (aEnvoyer.length) {
      setPhase("photos");
      setPhotosEnvoyees({ fait: 0, total: aEnvoyer.length, echecs: 0 });
      for (const p of aEnvoyer) {
        const res = await importerPhoto(p.logementId, photosLocales.current.get(p.ancienId)!);
        setPhotosEnvoyees((s) => ({ ...s, fait: s.fait + 1, echecs: s.echecs + (res.ok ? 0 : 1) }));
      }
    }
    setPhase("fini");
  }

  const nbDejaLogements = donnees ? donnees.logements.filter((l) => deja.logements.has(l.id)).length : 0;
  const nbDejaTransactions = donnees ? donnees.transactions.filter((t) => deja.transactions.has(t.id)).length : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-5 md:p-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Importer les anciennes données</h2>
        <p className="mt-1 text-ink-2 text-pretty">
          Reprenez vos logements et vos versements depuis l&apos;ancienne application de comptabilité. Vous pourrez tout vérifier avant de valider, et relancer l&apos;import sans créer de doublons.
        </p>

        <div className="mt-5 space-y-4">
          <input
            ref={fichier}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await charger(await f.text());
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fichier.current?.click()}
            className="press flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-sunken/50 px-6 py-8 text-center hover:border-wine-500 hover:bg-wine-50/50"
          >
            <FileUp className="h-7 w-7 text-wine-600" />
            <span className="font-medium">Choisir le fichier d&apos;export (.json)</span>
            <span className="text-sm text-ink-3">Le fichier téléchargé depuis l&apos;ancienne app avec « Exporter toutes les données »</span>
          </button>

          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-ink-2 hover:text-ink">Ou coller le contenu à la place</summary>
            <div className="mt-3 space-y-3">
              <textarea
                value={collage}
                onChange={(e) => setCollage(e.target.value)}
                rows={5}
                placeholder='{ "logements": [ … ], "transactions": [ … ] }'
                aria-label="Contenu de l'export"
                className="block w-full rounded-xl border border-line-strong bg-surface p-3 font-mono text-sm focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
              />
              <button type="button" onClick={() => charger(collage)} disabled={!collage.trim()} className={buttonClass("secondary", "sm")}>
                Analyser ce contenu
              </button>
            </div>
          </details>
        </div>
        {erreur ? (
          <div className="mt-4">
            <Notice ton="danger">{erreur}</Notice>
          </div>
        ) : null}
      </Card>

      {donnees && apercu && phase !== "fini" ? (
        <>
          <Card className="space-y-5 p-5 md:p-7">
            <h3 className="font-display text-lg font-semibold tracking-tight">1. Résumé de ce qui va être importé</h3>
            <dl className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Logements", valeur: String(apercu.nbLogements), note: nbDejaLogements ? `${nbDejaLogements} déjà importé(s)` : "" },
                { label: "Versements", valeur: String(apercu.nbTransactions), note: nbDejaTransactions ? `${nbDejaTransactions} déjà importé(s)` : "" },
                { label: "Total des montants reçus", valeur: formatMad(apercu.totalMontantRecu), note: "" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-line bg-sunken/50 p-4">
                  <dt className="text-sm text-ink-2">{c.label}</dt>
                  <dd className="num mt-0.5 font-display text-2xl font-semibold tracking-tight">{c.valeur}</dd>
                  {c.note ? <p className="mt-0.5 text-[0.8rem] text-ink-3">{c.note}</p> : null}
                </div>
              ))}
            </dl>
            {apercu.avertissements.map((w) => (
              <Notice key={w} ton="info">
                {w}
              </Notice>
            ))}
          </Card>

          <Card className="space-y-4 p-5 md:p-7">
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">2. Que représentait le « montant » dans l&apos;ancienne app ?</h3>
              <p className="mt-0.5 text-sm text-ink-2">Choisissez la bonne réponse : les calculs ci-dessous changent sous vos yeux.</p>
            </div>
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
              {HYPOTHESES.map((h) => (
                <label
                  key={h.value}
                  className={cn(
                    "press flex cursor-pointer flex-col gap-1 rounded-xl border bg-surface p-4 shadow-card has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-wine-500/15",
                    hypothese === h.value ? "border-wine-500 bg-wine-50" : "border-line-strong hover:border-aub-300",
                  )}
                >
                  <span className="flex items-center gap-2.5 font-medium">
                    <input type="radio" name="hypothese" checked={hypothese === h.value} onChange={() => setHypothese(h.value)} className="h-4 w-4" />
                    {h.titre}
                  </span>
                  <span className="pl-[1.65rem] text-[0.85rem] leading-snug text-ink-2">{h.detail}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-5 md:p-7">
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">3. Taux de commission de chaque logement</h3>
              <p className="mt-0.5 text-sm text-ink-2 text-pretty">
                Chaque logement a son propre taux. Indiquez-le ici : il sert à recalculer l&apos;historique et sera enregistré sur la fiche du logement.
              </p>
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {apercu.parLogement.map((l) => {
                const existant = deja.logements.has(l.id);
                return (
                  <li key={l.id} className="grid grid-cols-[1fr_6.5rem] items-center gap-x-4 gap-y-1 px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">{l.nom}</span>
                        {existant ? <Badge ton="ok">Déjà importé</Badge> : null}
                      </p>
                      <p className="num text-[0.82rem] text-ink-3">
                        {l.nbVersements} versement{l.nbVersements > 1 ? "s" : ""} · {formatMad(l.totalMontantRecu)}
                      </p>
                    </div>
                    <Field label="Taux (%)" htmlFor={`taux-${l.id}`} className="[&>label]:sr-only">
                      <Input
                        id={`taux-${l.id}`}
                        value={tauxSaisis[l.id] ?? ""}
                        onChange={(e) => setTauxSaisis((s) => ({ ...s, [l.id]: e.target.value }))}
                        inputMode="decimal"
                        disabled={existant}
                        aria-invalid={!existant && !(taux[l.id] >= 0 && taux[l.id] <= 100)}
                        className="num h-10 text-right"
                      />
                    </Field>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="space-y-4 p-5 md:p-7">
            <div>
              <h3 className="font-display text-lg font-semibold tracking-tight">4. Vérifiez quelques versements recalculés</h3>
              <p className="mt-0.5 text-sm text-ink-2 text-pretty">
                Voici les versements les plus récents, recalculés avec la formule de Perfect Stay. Si un chiffre vous semble faux, changez la réponse de l&apos;étape 2 ou un taux de l&apos;étape 3.
              </p>
            </div>
            <ul className="space-y-3">
              {apercu.echantillon.map((e) => (
                <li key={e.transactionId} className="rounded-xl border border-line p-4">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">{e.logement}</span>
                    <span className="num text-sm text-ink-3">{formatDate(e.date)}</span>
                  </p>
                  {e.note ? <p className="text-sm text-ink-3">{e.note}</p> : null}
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
                    {[
                      ["Montant reçu", e.calcul.montantRecu, false],
                      ["Ménage", e.calcul.fraisMenage, false],
                      ["Loyer hors ménage", e.calcul.loyerNetHorsMenage, false],
                      ["Revenu propriétaire", e.calcul.revenuProprietaire, true],
                      ["Encaissé Perfect Stay", e.calcul.encaisseParPerfectStay, true],
                    ].map(([label, valeur, fort]) => (
                      <div key={String(label)}>
                        <dt className="text-ink-3">{String(label)}</dt>
                        <dd className={cn("num", fort ? "font-semibold" : "")}>{formatMad(Number(valeur))}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-4 p-5 md:p-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={verifie} onChange={(e) => setVerifie(e.target.checked)} className="mt-1 h-5 w-5" />
              <span>J&apos;ai vérifié les chiffres ci-dessus : ils sont justes.</span>
            </label>
            <button
              type="button"
              disabled={!verifie || phase !== "attente"}
              onClick={lancer}
              className={buttonClass("primary", "md", "w-full sm:w-auto")}
            >
              {phase !== "attente" ? <Spinner /> : null}
              {phase === "import" ? "Import en cours…" : "Importer les données"}
            </button>
            {phase === "photos" ? (
              <p role="status" className="num text-sm text-ink-2">
                Envoi des photos : {photosEnvoyees.fait} sur {photosEnvoyees.total}…
              </p>
            ) : null}
          </Card>
        </>
      ) : null}

      {donnees && tauxInvalide ? <Notice ton="danger">Un taux de commission est invalide : il doit être compris entre 0 et 100.</Notice> : null}

      {phase === "fini" && resultat ? (
        <Card className="space-y-4 p-5 md:p-7">
          <p className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
            <CheckCircle2 className="h-6 w-6 text-ok" /> Import terminé
          </p>
          <ul className="space-y-1 text-ink-2">
            <li>
              <strong className="num text-ink">{resultat.logementsCrees}</strong> logement(s) créé(s)
              {resultat.logementsExistants ? ` (${resultat.logementsExistants} déjà présent(s), non modifié(s))` : ""}
            </li>
            <li>
              <strong className="num text-ink">{resultat.versementsCrees}</strong> versement(s) importé(s)
              {resultat.versementsIgnores ? ` (${resultat.versementsIgnores} ignoré(s) : déjà présents ou sans logement)` : ""}
            </li>
            {photosEnvoyees.total ? (
              <li>
                <strong className="num text-ink">{photosEnvoyees.total - photosEnvoyees.echecs}</strong> photo(s) reprise(s)
                {photosEnvoyees.echecs ? `, ${photosEnvoyees.echecs} non reprise(s) (à rajouter depuis la fiche)` : ""}
              </li>
            ) : null}
          </ul>
          <Link href="/logements" className={buttonClass("primary")}>
            Voir les logements
          </Link>
        </Card>
      ) : null}
    </div>
  );
}
