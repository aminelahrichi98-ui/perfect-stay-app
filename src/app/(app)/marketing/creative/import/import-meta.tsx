"use client";

import { FileUp, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Notice, Select, Spinner } from "@/components/ui";
import { analyserMeta, CHAMPS_META, formatDevise, formatEntier, indicateurs, totaliser, type ChampMeta, type Mapping } from "@/lib/creative";
import { associerAnnonce, importerPerformances, verifierImportMeta, type LigneVerifiee } from "../actions";

type Choix = { id: string; code: string; libelle: string };
export type NonAssociee = { metaAdId: string; nom: string; depenses: number; leads: number; debut: string; fin: string };
const jour = (d: string) => d.split("-").reverse().join("/");
const SORTS = { nouvelle: { label: "Nouvelle", ton: "ok" }, mise_a_jour: { label: "Mise à jour", ton: "marque" }, chevauchement: { label: "Refusée", ton: "danger" } } as const;

export function ImportMeta({ devise, creativesLibres, nonAssociees, modifiable }: { devise: string; creativesLibres: Choix[]; nonAssociees: NonAssociee[]; modifiable: boolean }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [texte, setTexte] = useState("");
  const [choix, setChoix] = useState<Partial<Mapping>>({});
  const [apercu, setApercu] = useState<LigneVerifiee[] | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "danger"; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const analyse = useMemo(() => (texte ? analyserMeta(texte, choix) : null), [texte, choix]);

  async function lire(f: File | undefined) {
    if (!f) return;
    setMessage(null);
    setApercu(null);
    setChoix({});
    if (f.size > 5 * 1024 * 1024) return setMessage({ ton: "danger", texte: "Fichier trop lourd (5 Mo au maximum)." });
    setNom(f.name);
    setTexte(await f.text());
  }
  const changerColonne = (cle: ChampMeta, v: string) => {
    setApercu(null);
    setChoix((c) => ({ ...c, [cle]: Number(v) }));
  };
  const deviseFichier = analyse?.ok ? analyse.devise : null;
  const deviseDifferente = Boolean(deviseFichier && deviseFichier !== devise);

  function verifier() {
    if (!analyse?.ok) return;
    setMessage(null);
    demarrer(async () => {
      const r = await verifierImportMeta(analyse.lignes);
      if ("erreur" in r) setMessage({ ton: "danger", texte: r.erreur });
      else setApercu(r.lignes);
    });
  }
  function importer() {
    if (!analyse?.ok) return;
    demarrer(async () => {
      const r = await importerPerformances({ nomFichier: nom, devise: deviseFichier ?? devise, lignes: analyse.lignes, erreurs: analyse.erreurs });
      if (r?.erreur) return setMessage({ ton: "danger", texte: r.erreur });
      setMessage({ ton: "ok", texte: `Import terminé : ${r?.creees ?? 0} ligne(s) ajoutée(s), ${r?.misesAJour ?? 0} mise(s) à jour, ${r?.refusees ?? 0} refusée(s).` });
      setTexte("");
      setApercu(null);
      router.refresh();
    });
  }

  const aImporter = apercu?.filter((l) => l.sort !== "chevauchement") ?? [];
  const sansImage = apercu ? [...new Map(apercu.filter((l) => !l.creative).map((l) => [l.adId, l])).values()] : [];
  const total = apercu ? indicateurs(totaliser(aImporter)) : null;

  return (
    <div className="space-y-6">
      {modifiable ? (
        <Card className="space-y-5 p-5 md:p-6">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">Importer un export Meta Ads Manager</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-2 text-pretty">
              Dans Meta Ads Manager, onglet <strong>Publicités</strong>, choisissez la répartition <strong>Par jour</strong>, affichez les colonnes « ID de la publicité », « Montant dépensé », « Impressions », « Clics sur un lien » et « Prospects », puis exportez en CSV. N&apos;ouvrez pas le fichier dans Excel avant de l&apos;importer : il abîme les identifiants.
            </p>
          </div>
          <label className={buttonClass("secondary", "md", "cursor-pointer")}>
            <FileUp className="h-4 w-4" /> {nom ? "Choisir un autre fichier" : "Choisir le fichier CSV"}
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => lire(e.target.files?.[0])} />
          </label>
          {nom && texte ? <p className="text-sm text-ink-2">Fichier : {nom}</p> : null}

          {analyse ? (
            <>
              <div>
                <h3 className="text-sm font-medium">Correspondance des colonnes</h3>
                <p className="mt-0.5 text-[0.82rem] text-ink-3">Les colonnes sont reconnues automatiquement. Corrigez-les si besoin.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CHAMPS_META.map((c) => (
                    <Field key={c.cle} label={`${c.label}${c.requis ? "" : " (facultatif)"}`} htmlFor={`col-${c.cle}`}>
                      <Select id={`col-${c.cle}`} value={String(analyse.mapping[c.cle])} onChange={(e) => changerColonne(c.cle, e.target.value)}>
                        <option value="-1">Aucune</option>
                        {analyse.entetes.map((e, i) => (
                          <option key={`${i}-${e}`} value={i}>
                            {e || `Colonne ${i + 1}`}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>
              </div>
              {!analyse.ok ? <Notice ton="danger">{analyse.erreur}</Notice> : null}
              {analyse.ok ? (
                <div className="space-y-3">
                  <p className="text-sm text-ink-2">
                    <span className="num font-medium text-ink">{analyse.lignes.length}</span> ligne(s) lisible(s)
                    {analyse.ignorees ? `, ${analyse.ignorees} ligne(s) de total ignorée(s)` : ""}
                    {analyse.regroupees ? `, ${analyse.regroupees} ligne(s) de répartition additionnée(s)` : ""}. Devise du fichier : <strong>{deviseFichier ?? `non indiquée, ${devise} supposée`}</strong>.
                  </p>
                  {deviseDifferente ? <Notice ton="danger">Ce fichier est en {deviseFichier}, alors que le module est réglé en {devise}. Les devises ne sont jamais mélangées : il ne sera pas importé.</Notice> : null}
                  {analyse.erreurs.length ? (
                    <details className="rounded-xl border border-danger/25 bg-danger-bg px-4 py-3 text-sm text-danger">
                      <summary className="cursor-pointer font-medium">{analyse.erreurs.length} ligne(s) illisible(s), qui ne seront pas importées</summary>
                      <ul className="mt-2 space-y-1">
                        {analyse.erreurs.slice(0, 50).map((e) => (
                          <li key={e.ligne}>
                            Ligne {e.ligne} : {e.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {!apercu && analyse.lignes.length && !deviseDifferente ? (
                    <button type="button" onClick={verifier} disabled={enCours} className={buttonClass("primary", "md")}>
                      {enCours ? <Spinner /> : null} Voir l&apos;aperçu avant import
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {apercu && total ? (
            <div className="space-y-4 border-t border-line pt-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">Aperçu avant import</h3>
              <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { t: "Lignes à importer", v: formatEntier(aImporter.length) },
                  { t: "Dépenses", v: formatDevise(total.depenses, deviseFichier ?? devise) },
                  { t: "Leads", v: formatEntier(total.leads) },
                  { t: "Annonces sans image", v: formatEntier(sansImage.length) },
                ].map((c) => (
                  <li key={c.t} className="rounded-xl border border-line bg-sunken px-4 py-3">
                    <p className="text-[0.82rem] text-ink-2">{c.t}</p>
                    <p className="num font-display text-xl font-semibold">{c.v}</p>
                  </li>
                ))}
              </ul>
              {sansImage.length ? (
                <Notice ton="info">
                  {sansImage.length} annonce(s) ne correspondent à aucune image. Elles seront importées et conservées, sans être attribuées à une image. Vous pourrez les associer vous-même plus bas : {sansImage.slice(0, 5).map((l) => l.nom || l.adId).join(", ")}
                  {sansImage.length > 5 ? "…" : ""}
                </Notice>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="bg-sunken text-left text-[0.8rem] text-ink-2">
                    <tr>
                      {["Période", "Annonce", "Image associée", "Dépenses", "Impr.", "Clics", "Leads", "Sort"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {apercu.slice(0, 100).map((l) => (
                      <tr key={`${l.adId}-${l.debut}-${l.fin}`}>
                        <td className="num px-3 py-2 whitespace-nowrap">{l.debut === l.fin ? jour(l.debut) : `${jour(l.debut)} au ${jour(l.fin)}`}</td>
                        <td className="max-w-[14rem] truncate px-3 py-2" title={l.adId}>
                          {l.nom || l.adId}
                        </td>
                        <td className="px-3 py-2">{l.creative ? <span className="num font-medium">{l.creative}</span> : <span className="text-ink-3">Non associée</span>}</td>
                        <td className="num px-3 py-2 whitespace-nowrap">{formatDevise(l.depenses, deviseFichier ?? devise)}</td>
                        <td className="num px-3 py-2">{formatEntier(l.impressions)}</td>
                        <td className="num px-3 py-2">{formatEntier(l.clics)}</td>
                        <td className="num px-3 py-2">{formatEntier(l.leads)}</td>
                        <td className="px-3 py-2">
                          <Badge ton={SORTS[l.sort].ton}>{SORTS[l.sort].label}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {apercu.length > 100 ? <p className="text-[0.82rem] text-ink-3">Seules les 100 premières lignes sont affichées ; toutes seront importées.</p> : null}
              {apercu.some((l) => l.sort === "chevauchement") ? <Notice ton="info">Les lignes « Refusée » couvrent une période qui recouvre des données déjà importées. Les importer compterait deux fois la même dépense.</Notice> : null}
              <button type="button" onClick={importer} disabled={enCours || !aImporter.length} className={buttonClass("primary", "md")}>
                {enCours ? <Spinner /> : null} Importer {aImporter.length} ligne(s)
              </button>
            </div>
          ) : null}
          {message ? <Notice ton={message.ton}>{message.texte}</Notice> : null}
        </Card>
      ) : null}

      <AnnoncesNonAssociees annonces={nonAssociees} creatives={creativesLibres} devise={devise} modifiable={modifiable} />
    </div>
  );
}

function AnnoncesNonAssociees({ annonces, creatives, devise, modifiable }: { annonces: NonAssociee[]; creatives: Choix[]; devise: string; modifiable: boolean }) {
  const router = useRouter();
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  if (!annonces.length) return null;
  return (
    <Card className="p-5 md:p-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">Annonces non associées</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-2 text-pretty">Ces annonces Meta ont des performances importées, mais aucune image ne porte leur identifiant. Elles ne sont comptées dans aucun angle tant que vous ne les avez pas associées vous-même.</p>
      <ul className="mt-4 divide-y divide-line">
        {annonces.map((a) => (
          <li key={a.metaAdId} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.nom || "Annonce sans nom"}</span>
              <span className="num block text-[0.82rem] text-ink-3">
                ID {a.metaAdId} · {jour(a.debut)} au {jour(a.fin)} · {formatDevise(a.depenses, devise)} · {a.leads} lead{a.leads > 1 ? "s" : ""}
              </span>
            </span>
            {modifiable ? (
              <span className="flex items-center gap-2">
                <Select aria-label={`Image à associer à l'annonce ${a.nom || a.metaAdId}`} value={choix[a.metaAdId] ?? ""} onChange={(e) => setChoix((c) => ({ ...c, [a.metaAdId]: e.target.value }))} className="max-w-56">
                  <option value="">Choisir une image</option>
                  {creatives.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.libelle}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  disabled={enCours || !choix[a.metaAdId]}
                  onClick={() =>
                    demarrer(async () => {
                      const r = await associerAnnonce(choix[a.metaAdId], a.metaAdId);
                      if (r?.erreur) setErreur(r.erreur);
                      else router.refresh();
                    })
                  }
                  className={buttonClass("secondary", "sm")}
                >
                  <Link2 className="h-4 w-4" /> Associer
                </button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </Card>
  );
}
