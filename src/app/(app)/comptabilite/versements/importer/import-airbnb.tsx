"use client";

import { CalendarCheck, FileUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Input, Notice, Select, Spinner } from "@/components/ui";
import { formatJour, libelleMois } from "@/lib/dates";
import { formatMontant } from "@/lib/format";
import { analyserAirbnb, decider, devinerLogement, type ContexteImport, type LigneAirbnb } from "@/lib/import-airbnb";
import { importerVersementsAirbnb, verifierImportAirbnb, type BilanImportAirbnb } from "../../actions";

type Logement = { id: string; nom: string; frais_menage: number };

const MEMOIRE = "ps-import-airbnb-annonces";

/** Correspondances annonce Airbnb → logement retenues lors des imports précédents (sur cet appareil). */
function lireMemoire(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MEMOIRE) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}
function ecrireMemoire(choix: Record<string, string>) {
  try {
    localStorage.setItem(MEMOIRE, JSON.stringify({ ...lireMemoire(), ...choix }));
  } catch {
    /* stockage indisponible : on redemandera la prochaine fois */
  }
}

const court = (j: string) => formatJour(j).slice(0, 5);

export function ImportAirbnb({ logements }: { logements: Logement[] }) {
  const entree = useRef<HTMLInputElement>(null);
  const [enCours, demarrer] = useTransition();
  const [nomFichier, setNomFichier] = useState("");
  const [lignes, setLignes] = useState<LigneAirbnb[] | null>(null);
  const [autres, setAutres] = useState(0);
  const [illisibles, setIllisibles] = useState<{ ligne: number; raison: string }[]>([]);
  const [ctx, setCtx] = useState<ContexteImport | null>(null);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [parCalendrier, setParCalendrier] = useState<Set<string>>(new Set());
  const [taux, setTaux] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState("");
  const [bilan, setBilan] = useState<BilanImportAirbnb | null>(null);

  const nomDe = useMemo(() => new Map(logements.map((l) => [l.id, l.nom])), [logements]);

  async function lire(f: File | undefined) {
    if (!f) return;
    setErreur("");
    setBilan(null);
    setLignes(null);
    setCtx(null);
    const a = analyserAirbnb(await f.text());
    if (!a.ok) return setErreur(a.erreur);
    if (!a.lignes.length) return setErreur("Aucune réservation dans ce fichier (seulement des virements ou des ajustements). Vérifiez la période exportée.");
    setNomFichier(f.name);
    demarrer(async () => {
      const r = await verifierImportAirbnb(a.lignes);
      if (r.erreur || !r.contexte) return setErreur(r.erreur ?? "Vérification impossible.");
      const contexte = r.contexte;
      // Logement de chaque annonce : d'abord les réservations du calendrier, puis le dernier choix, puis le nom
      const memoire = lireMemoire();
      const annonces = [...new Set(a.lignes.map((l) => l.annonce))];
      const calendrier = new Set<string>();
      const initial: Record<string, string> = {};
      for (const annonce of annonces) {
        const trouves = new Set(a.lignes.filter((l) => l.annonce === annonce).map((l) => contexte.reservations[l.code]?.logement_id).filter(Boolean));
        if (trouves.size === 1) {
          initial[annonce] = [...trouves][0] as string;
          calendrier.add(annonce);
        } else if (memoire[annonce] && nomDe.has(memoire[annonce])) initial[annonce] = memoire[annonce];
        else initial[annonce] = devinerLogement(annonce, logements);
      }
      setLignes([...a.lignes].sort((x, y) => (x.arrivee < y.arrivee ? 1 : -1)));
      setAutres(a.autres);
      setIllisibles(a.erreurs);
      setCtx(contexte);
      setChoix(initial);
      setParCalendrier(calendrier);
      setTaux({});
    });
  }

  const devises = useMemo(() => [...new Set((lignes ?? []).map((l) => l.devise))].filter((d) => d !== "MAD"), [lignes]);
  const conversion = (devise: string) => (devise === "MAD" ? 1 : Number((taux[devise] ?? "").replace(",", ".")));
  const decisions = useMemo(
    () => (lignes && ctx ? lignes.map((l) => ({ l, d: decider(l, choix[l.annonce] ?? "", conversion(l.devise), ctx) })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lignes, ctx, choix, taux],
  );
  const aImporter = decisions.filter((x) => x.d.statut === "ok");
  const dejaLa = decisions.filter((x) => x.d.statut === "deja").length;
  const annonces = useMemo(() => [...new Set((lignes ?? []).map((l) => l.annonce))], [lignes]);

  function importer() {
    setErreur("");
    demarrer(async () => {
      const t = Object.fromEntries(devises.map((d) => [d, conversion(d)]));
      const r = await importerVersementsAirbnb(
        aImporter.map(({ l }) => ({ ...l, logementChoisi: choix[l.annonce] ?? "" })),
        t,
      );
      if (r.erreur) return setErreur(r.erreur);
      ecrireMemoire(Object.fromEntries(Object.entries(choix).filter(([a, id]) => a && id && !parCalendrier.has(a))));
      setBilan(r);
    });
  }

  if (bilan) {
    const crees = bilan.crees ?? 0;
    return (
      <div className="space-y-4">
        <Notice ton="ok">
          {crees} versement{crees > 1 ? "s" : ""} importé{crees > 1 ? "s" : ""}
          {bilan.deja ? `, ${bilan.deja} déjà enregistré${bilan.deja > 1 ? "s" : ""}` : ""}.
        </Notice>
        {bilan.refuses?.length ? (
          <Notice ton="danger">
            Non importés : {bilan.refuses.map((r) => `${r.code} (${r.raison})`).join(" ; ")}.
          </Notice>
        ) : null}
        {bilan.factures?.length ? (
          <Notice ton="info">
            Les factures <strong>{bilan.factures.join(", ")}</strong> étaient déjà émises pour certains logements et mois importés : ces versements n&apos;y figurent pas. Les factures émises ne sont jamais
            modifiées.
          </Notice>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {(bilan.mois ?? []).map((m) => (
            <Link key={m} href={`/comptabilite/versements?mois=${m}`} className={buttonClass("secondary", "md", "capitalize")}>
              Versements de {libelleMois(m)}
            </Link>
          ))}
          <Link href="/comptabilite/versements" className={buttonClass("primary", "md")}>
            Retour aux versements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input ref={entree} type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => lire(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => {
          if (entree.current) entree.current.value = "";
          entree.current?.click();
        }}
        disabled={enCours}
        className="press inline-flex h-12 max-w-full items-center gap-2 rounded-xl border border-dashed border-line-strong px-5 font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700"
      >
        {enCours && !lignes ? <Spinner /> : <FileUp className="h-5 w-5 shrink-0" />} <span className="truncate">{nomFichier || "Choisir le fichier CSV d'Airbnb"}</span>
      </button>

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      {lignes && ctx ? (
        <>
          <p className="text-sm text-ink-2">
            <strong>{lignes.length}</strong> réservation{lignes.length > 1 ? "s" : ""} trouvée{lignes.length > 1 ? "s" : ""}
            {autres ? ` (${autres} autre${autres > 1 ? "s" : ""} ligne${autres > 1 ? "s" : ""} ignorée${autres > 1 ? "s" : ""} : virements, ajustements…)` : ""}.
          </p>
          {illisibles.length ? <Notice ton="danger">Lignes illisibles : {illisibles.map((e) => `ligne ${e.ligne} — ${e.raison}`).join(" ; ")}.</Notice> : null}

          <section>
            <h3 className="mb-1 font-display text-base font-semibold tracking-tight">Annonces Airbnb → logements</h3>
            <p className="mb-3 text-sm text-ink-3">Vérifiez à quel logement correspond chaque annonce. Votre choix est retenu pour les prochains imports.</p>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {annonces.map((a) => (
                <li key={a} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a || "Annonce sans nom"}</span>
                    {parCalendrier.has(a) ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[0.8rem] text-ok">
                        <CalendarCheck className="h-3.5 w-3.5" /> Reconnue grâce au calendrier
                      </span>
                    ) : null}
                  </span>
                  <Select
                    aria-label={`Logement pour l'annonce ${a}`}
                    value={choix[a] ?? ""}
                    onChange={(e) => setChoix((c) => ({ ...c, [a]: e.target.value }))}
                    className="h-11 sm:w-72"
                  >
                    <option value="">Choisir le logement…</option>
                    {logements.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nom}
                      </option>
                    ))}
                  </Select>
                </li>
              ))}
            </ul>
          </section>

          {devises.length ? (
            <section>
              <h3 className="mb-1 font-display text-base font-semibold tracking-tight">Conversion en dirhams</h3>
              <p className="mb-3 text-sm text-ink-3">Le fichier contient des montants en devise étrangère. Indiquez le taux appliqué par votre banque.</p>
              <div className="flex flex-wrap gap-4">
                {devises.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <span className="whitespace-nowrap">1 {d} =</span>
                    <span className="w-28">
                      <Input inputMode="decimal" value={taux[d] ?? ""} onChange={(e) => setTaux((t) => ({ ...t, [d]: e.target.value }))} placeholder="10,85" className="h-11" />
                    </span>
                    <span>MAD</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-3 font-display text-base font-semibold tracking-tight">Réservations</h3>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {decisions.map(({ l, d }) => (
                <li key={`${l.code}|${l.arrivee}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="num font-medium">
                        {court(l.arrivee)} → {court(l.depart)}
                      </span>
                      <span className="truncate text-ink-2">{d.statut === "ok" ? nomDe.get(d.logementId) : l.annonce}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.82rem] text-ink-3">
                      {l.code}
                      {l.voyageur ? ` · ${l.voyageur}` : ""}
                    </span>
                  </span>
                  <span className="num shrink-0 text-right">
                    <span className="block font-medium">{d.statut === "ok" ? `${formatMontant(d.montant)} MAD` : `${formatMontant(l.montant)} ${l.devise}`}</span>
                    {d.statut === "ok" ? (
                      <Badge ton="ok">À importer</Badge>
                    ) : d.statut === "deja" ? (
                      <Badge>{d.raison}</Badge>
                    ) : (
                      <Badge ton={d.statut === "refuse" ? "danger" : "attention"}>{d.raison}</Badge>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <button type="button" onClick={importer} disabled={enCours || !aImporter.length} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
              {enCours ? <Spinner /> : null} Importer {aImporter.length} versement{aImporter.length > 1 ? "s" : ""}
            </button>
            {dejaLa ? (
              <span className="text-sm text-ink-3">
                {dejaLa} déjà enregistré{dejaLa > 1 ? "s" : ""} : ignoré{dejaLa > 1 ? "s" : ""}.
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
