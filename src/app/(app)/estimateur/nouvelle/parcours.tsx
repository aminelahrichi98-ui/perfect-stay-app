"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, Save, Search, Send, UserPlus } from "lucide-react";
import { Badge, buttonClass, Card, Input, Notice, Spinner } from "@/components/ui";
import { calculer, chargesVides, mensuel, arrondir, type Charges, type LongueDuree } from "@/lib/estimation/calcul";
import { entier, montant, periode, typologie } from "@/lib/estimation/format";
import type { ParametresEstimateur } from "@/lib/estimation/parametres";
import { bienVide, LIBELLES_LOGEMENT, manquantsBien, saisonnaliteFiable, type Bien, type Saisie } from "@/lib/estimation/snapshot";
import { libelleEtape, libelleSource } from "@/lib/crm";
import { cn } from "@/lib/cn";
import { chargerLead, chargerVersionMarche, chercherDonneesMarche, creerLead, enregistrerBien, enregistrerEstimation, journaliserDuplication, rechercherLeads, type ActionEstimation, type LeadComplet, type LeadResume, type VersionAffichee } from "../estimation-actions";
import { EtapeCommercial } from "./etape-commercial";
import { EtapeFinances } from "./etape-finances";
import { EtapeLogement } from "./etape-logement";
import { EtapeMarche, type Recherche } from "./etape-marche";
import { TableauResultat } from "./resultat";

type Offre = { id: string; titre: string; description: string; dureeMois: number | null; conditions: string };
type Props = {
  params: ParametresEstimateur;
  offres: Offre[];
  temoignages: { id: string; auteur: string; contexte: string; texte: string }[];
  commerciaux: { id: string; nom: string }[];
  leadInitial: string | null;
  bienInitial: string | null;
  reprise: { saisie: Saisie; existanteId: string | null; racineId: string | null; titre: string } | null;
  sourceDuplication: string | null;
};

const ETAPES = ["Propriétaire", "Logement", "Données de marché", "Finances", "Personnalisation", "Aperçu"] as const;
const ldVide = (): LongueDuree => ({ source: null, loyer: null, loyerBas: null, loyerHaut: null, charges: null, date: null });
const sansId = (b: Bien & { id: string }): Bien => {
  const copie: Partial<Bien & { id: string }> = { ...b };
  delete copie.id;
  return copie as Bien;
};
const memeBien = (a: Bien, b: Bien | null) => b !== null && JSON.stringify(a) === JSON.stringify(b);

export function Parcours(p: Props) {
  const router = useRouter();
  const r = p.reprise?.saisie;
  const debut = useRef(0);
  const [etape, setEtape] = useState(0);
  const [lead, setLead] = useState<LeadComplet | null>(null);
  const [bienId, setBienId] = useState<string | null>(r?.bienId ?? null);
  const [bien, setBienEtat] = useState<Bien>(r?.bien ?? bienVide());
  const [bienCrm, setBienCrm] = useState<Bien | null>(null);
  const [prenom, setPrenom] = useState(r?.prenom ?? "");
  const [recherche, setRecherche] = useState<Recherche | null>(null);
  const [version, setVersion] = useState<VersionAffichee | null>(null);
  const [approximation, setApproximation] = useState(false);
  const [approximationConfirmee, setApproximationConfirmee] = useState(r?.approximationConfirmee ?? false);
  const [surcharges, setSurcharges] = useState<Saisie["surcharges"]>(r?.surcharges ?? { tauxPlateforme: null, tauxCommission: null, tvaCommission: null, methodeScenarios: null });
  const [charges, setCharges] = useState<Charges>(r?.charges ?? chargesVides());
  const [longueDuree, setLongueDuree] = useState<LongueDuree>(r?.longueDuree ?? ldVide());
  const [offreId, setOffreId] = useState<string | null>(r?.offreId && p.offres.some((o) => o.id === r.offreId) ? r.offreId : null);
  const [baseConfirmee, setBaseConfirmee] = useState(r?.baseConfirmee ?? false);
  const [comparableIds, setComparableIds] = useState<string[]>(r?.comparableIds ?? []);
  const [recommandations, setRecommandations] = useState<string[]>(r?.recommandations ?? []);
  const [temoignageIds, setTemoignageIds] = useState<string[]>((r?.temoignageIds ?? []).filter((id) => p.temoignages.some((t) => t.id === id)));
  const [photoBien, setPhotoBien] = useState<string | null>(r?.photoBien ?? null);
  const [sections, setSections] = useState<Saisie["sections"]>(r?.sections ?? { saisonnalite: true, comparaisonLongueDuree: true });
  const [commercialId, setCommercialId] = useState<string | null>(r?.commercialId ?? null);
  const [message, setMessage] = useState<{ ton: "ok" | "danger" | "info"; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();
  const setBien = (f: (b: Bien) => Bien) => setBienEtat(f);

  // Chargements initiaux (prospect, logement, données de marché d'une reprise)
  useEffect(() => {
    debut.current = Date.now();
    const leadId = r?.leadId ?? p.leadInitial;
    if (!leadId) return;
    void (async () => {
      const l = await chargerLead(leadId);
      if (l.erreur !== undefined) return setMessage({ ton: "danger", texte: l.erreur });
      setLead(l.lead);
      if (!r) {
        setPrenom(l.lead.nom.split(" ")[0] ?? "");
        const b = l.lead.biens.find((x) => x.id === p.bienInitial) ?? (l.lead.biens.length === 1 ? l.lead.biens[0] : null);
        if (b) choisirBien(b, l.lead);
      } else {
        const b = l.lead.biens.find((x) => x.id === r.bienId);
        setBienCrm(b ? { ...b } : null);
        if (r.versionId) {
          const [rech, v] = await Promise.all([chercherDonneesMarche(r.bien), chargerVersionMarche(r.versionId)]);
          if (rech.erreur === undefined) setRecherche(rech.recherche);
          if (v.erreur === undefined) {
            setVersion(v.donnees);
            setApproximation(rech.erreur === undefined && ![rech.recherche.choix, ...rech.recherche.autresExacts].some((c) => c?.versionId === r.versionId));
          } else setMessage({ ton: "danger", texte: `${v.erreur} Les données de marché doivent être choisies à nouveau.` });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choisirBien(b: (Bien & { id: string }) | null, l: LeadComplet | null = lead) {
    const base: Bien = b ? sansId(b) : { ...bienVide(), ville: l?.ville || "Casablanca" };
    setBienId(b?.id ?? null);
    setBienEtat(base);
    setBienCrm(b ? base : null);
    setPhotoBien(base.photos[0] ?? null);
    setRecherche(null);
    setVersion(null);
    setComparableIds([]);
    if (base.loyer_longue_duree !== null) setLongueDuree({ ...ldVide(), source: "crm", loyer: base.loyer_longue_duree });
    if (b && !manquantsBien(base).length) {
      // Parcours rapide : recherche immédiate des données de marché
      void (async () => {
        const rech = await chercherDonneesMarche(base);
        if (rech.erreur !== undefined) return;
        setRecherche(rech.recherche);
        if (rech.recherche.choix) {
          const v = await chargerVersionMarche(rech.recherche.choix.versionId);
          if (v.erreur === undefined) choisirVersion(v.donnees, false);
        }
      })();
    }
  }

  function choisirVersion(v: VersionAffichee | null, approx: boolean) {
    setVersion(v);
    setApproximation(approx);
    setApproximationConfirmee(false);
    setBaseConfirmee(false);
    // Comparables proposés : affichables, avec photo réelle et revenu, dans la limite
    setComparableIds(v ? v.comparables.filter((c) => c.photo_chemin && (c.revenu_annuel !== null || (c.revenu_annuel_bas !== null && c.revenu_annuel_haut !== null))).slice(0, p.params.document.maxComparables).map((c) => c.id) : []);
  }

  const financier = useMemo(
    () => ({
      ...p.params.financier,
      tauxPlateforme: surcharges.tauxPlateforme ?? p.params.financier.tauxPlateforme,
      tauxCommission: surcharges.tauxCommission ?? p.params.financier.tauxCommission,
      tvaCommission: surcharges.tvaCommission ?? p.params.financier.tvaCommission,
      methodeScenarios: surcharges.methodeScenarios ?? p.params.financier.methodeScenarios,
    }),
    [p.params.financier, surcharges],
  );
  const offre = p.offres.find((o) => o.id === offreId) ?? null;
  const v = version?.version ?? null;
  const resultat = useMemo(
    () =>
      calculer({
        params: financier,
        marche: v
          ? { revenuAnnuelBas: v.revenu_annuel_bas, revenuAnnuelCentral: v.revenu_annuel_central, revenuAnnuelHaut: v.revenu_annuel_haut, natureCentral: v.central_nature, percentiles: v.percentiles ?? [], basePlateformeIncluse: v.base_plateforme_incluse, baseMenageInclus: v.base_menage_inclus, baseTaxesIncluses: v.base_taxes_incluses, devise: v.devise }
          : { revenuAnnuelBas: null, revenuAnnuelCentral: null, revenuAnnuelHaut: null, natureCentral: "inconnu", percentiles: [], basePlateformeIncluse: null, baseMenageInclus: null, baseTaxesIncluses: null, devise: financier.devise },
        charges,
        longueDuree,
        offre: offre ? { titre: offre.titre, description: offre.description, dureeMois: offre.dureeMois, conditions: offre.conditions } : null,
        baseConfirmee,
      }),
    [financier, v, charges, longueDuree, offre, baseConfirmee],
  );

  const manquants = manquantsBien(bien);
  const pret = Boolean(lead && prenom.trim() && !manquants.length && version && (!approximation || approximationConfirmee) && !resultat.bloquants.length && comparableIds.length !== 1);
  const problemes = [
    !lead && "sélectionnez le propriétaire dans le CRM",
    !prenom.trim() && "indiquez le prénom affiché",
    manquants.length && `logement incomplet (${manquants.join(", ")})`,
    !version && "choisissez les données de marché",
    approximation && !approximationConfirmee && "confirmez l'approximation des données de marché",
    comparableIds.length === 1 && "choisissez au moins 2 annonces comparables, ou aucune",
    ...resultat.bloquants,
  ].filter(Boolean) as string[];

  function saisie(): Saisie {
    return {
      leadId: lead?.id ?? "",
      bienId,
      prenom: prenom.trim(),
      bien,
      versionId: version?.version.id ?? null,
      approximationConfirmee,
      surcharges,
      charges,
      longueDuree,
      offreId,
      baseConfirmee,
      comparableIds,
      recommandations,
      temoignageIds,
      photoBien: photoBien && bien.photos.includes(photoBien) ? photoBien : null,
      sections,
      commercialId,
      dureeCreationS: Math.round((Date.now() - debut.current) / 1000) + (r?.dureeCreationS ?? 0),
    };
  }

  function enregistrer(action: ActionEstimation) {
    if (!lead) return setMessage({ ton: "danger", texte: "Sélectionnez d'abord le propriétaire." });
    if (action === "valider" && !window.confirm("Valider cette estimation ? Elle ne pourra plus être modifiée (une nouvelle version restera possible).")) return;
    demarrer(async () => {
      const res = await enregistrerEstimation(saisie(), action, p.reprise?.existanteId ?? null, p.reprise?.racineId ?? null);
      if ("confirmation" in res) return setMessage({ ton: "danger", texte: res.confirmation });
      if (res.erreur !== undefined) return setMessage({ ton: "danger", texte: res.erreur });
      if (p.sourceDuplication) await journaliserDuplication(p.sourceDuplication, res.id);
      router.push(action === "brouillon" ? `/estimateur/historique?enregistre=${res.id}` : `/estimation/${res.id}`);
    });
  }

  function majCrm() {
    if (!lead) return;
    demarrer(async () => {
      const res = await enregistrerBien(lead.id, bienId, bien);
      if (res.erreur !== undefined) return setMessage({ ton: "danger", texte: res.erreur });
      setBienId(res.bienId);
      setBienCrm(bien);
      setMessage({ ton: "ok", texte: "Fiche logement du CRM mise à jour." });
    });
  }

  const devise = v?.devise ?? financier.devise;
  const central = resultat.central;

  return (
    <div className="space-y-4">
      {p.reprise ? <Notice ton="info">{p.reprise.titre}</Notice> : null}
      <nav aria-label="Étapes" className="flex gap-1 overflow-x-auto">
        {ETAPES.map((nom, i) => (
          <button key={nom} type="button" onClick={() => setEtape(i)} aria-current={etape === i ? "step" : undefined} className={cn("press flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm", etape === i ? "bg-wine-600 text-white" : "bg-sunken text-ink-2 hover:text-ink")}>
            <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[0.7rem]", etape === i ? "bg-white/25" : "bg-surface")}>{i + 1}</span>
            {nom}
          </button>
        ))}
      </nav>
      {message ? <Notice ton={message.ton}>{message.texte}</Notice> : null}

      <Card className="p-5 md:p-6">
        {etape === 0 ? <EtapeProprietaire lead={lead} setLead={(l) => (setLead(l), l && !prenom && setPrenom(l.nom.split(" ")[0] ?? ""), l && choisirBien(l.biens.length === 1 ? l.biens[0] : null, l))} bienId={bienId} choisirBien={(b) => choisirBien(b)} /> : null}
        {etape === 1 ? (
          <div className="space-y-4">
            {lead ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sunken/60 px-3 py-2 text-sm">
                <span>{bienId ? (memeBien(bien, bienCrm) ? "Identique à la fiche CRM." : "Modifié par rapport à la fiche CRM (non enregistré).") : "Nouveau logement : pas encore dans la fiche CRM."}</span>
                {lead.crmModifiable && (!bienId || !memeBien(bien, bienCrm)) ? (
                  <button type="button" disabled={enCours} onClick={majCrm} className={buttonClass("secondary", "sm")}>
                    {enCours ? <Spinner /> : <Save className="h-4 w-4" />} Enregistrer dans la fiche CRM
                  </button>
                ) : null}
              </div>
            ) : null}
            <EtapeLogement bien={bien} setBien={setBien} photoBien={photoBien} setPhotoBien={setPhotoBien} />
          </div>
        ) : null}
        {etape === 2 ? (
          <EtapeMarche bien={bien} recherche={recherche} setRecherche={setRecherche} version={version} choisir={choisirVersion} approximation={approximation} approximationConfirmee={approximationConfirmee} setApproximationConfirmee={setApproximationConfirmee} comparableIds={comparableIds} setComparableIds={setComparableIds} maxComparables={p.params.document.maxComparables} />
        ) : null}
        {etape === 3 ? (
          <EtapeFinances defaut={p.params.financier} surcharges={surcharges} setSurcharges={setSurcharges} charges={charges} setCharges={setCharges} longueDuree={longueDuree} setLongueDuree={setLongueDuree} offres={p.offres} offreId={offreId} setOffreId={setOffreId} baseInconnue={v?.base_plateforme_incluse === null} baseConfirmee={baseConfirmee} setBaseConfirmee={setBaseConfirmee} resultat={resultat} devise={devise} />
        ) : null}
        {etape === 4 ? (
          <EtapeCommercial bien={bien} prenom={prenom} setPrenom={setPrenom} commerciaux={p.commerciaux} commercialId={commercialId} setCommercialId={setCommercialId} recommandations={recommandations} setRecommandations={setRecommandations} temoignages={p.temoignages} temoignageIds={temoignageIds} setTemoignageIds={setTemoignageIds} sections={sections} setSections={setSections} saisonnaliteDisponible={Boolean(v && saisonnaliteFiable(v.mensuels ?? []) && p.params.document.sectionSaisonnalite)} comparaisonDisponible={resultat.comparaison !== null} />
        ) : null}
        {etape === 5 ? (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Resume t="Propriétaire" v={lead ? `${prenom || "—"} (${lead.nom})` : "non sélectionné"} />
              <Resume t="Logement" v={`${bien.type_logement ? LIBELLES_LOGEMENT[bien.type_logement] : "?"}${bien.type_logement !== "studio" && bien.chambres !== null ? ` ${bien.chambres} ch.` : ""} · ${bien.quartier || "?"}, ${bien.ville}`} />
              <Resume t="Données de marché" v={version ? `${version.segment.quartier} · ${version.segment.typologie} · v${version.version.numero} · ${periode(version.version.periode_debut, version.version.periode_fin)}${approximation ? " · approximation" : ""}` : "non choisies"} />
              <Resume t="Revenu propriétaire après commissions (central)" v={central ? `${entier(arrondir(mensuel(central.apresCommissions), financier.arrondiMensuel))} ${devise}/mois · ${montant(arrondir(central.apresCommissions), devise)}/an` : "—"} />
              <Resume t="Comparables · recommandations" v={`${comparableIds.length} annonce(s) · ${recommandations.length} recommandation(s)`} />
              <Resume t="Offre" v={offre?.titre ?? "aucune"} />
            </div>
            <TableauResultat r={resultat} devise={devise} />
            {problemes.length ? (
              <Notice ton="danger">Avant de valider : {problemes.join(" · ")}.</Notice>
            ) : (
              <Notice ton="ok">Tout est prêt. La validation fige les chiffres et ouvre le document à imprimer ou partager.</Notice>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={enCours || !pret} onClick={() => enregistrer("valider")} className={buttonClass("primary", "md")}>
                {enCours ? <Spinner /> : <FileCheck2 className="h-4 w-4" />} Valider et générer le document
              </button>
              <button type="button" disabled={enCours || !pret} onClick={() => enregistrer("soumettre")} className={buttonClass("secondary", "md")}>
                <Send className="h-4 w-4" /> Soumettre à validation
              </button>
              <button type="button" disabled={enCours || !lead} onClick={() => enregistrer("brouillon")} className={buttonClass("ghost", "md")}>
                <Save className="h-4 w-4" /> Enregistrer le brouillon
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" disabled={etape === 0} onClick={() => setEtape((e) => e - 1)} className={buttonClass("ghost", "md")}>
          <ArrowLeft className="h-4 w-4" /> Précédent
        </button>
        <div className="flex flex-wrap gap-2">
          {pret && etape < 5 ? (
            <button type="button" onClick={() => setEtape(5)} className={buttonClass("secondary", "md")}>
              <CheckCircle2 className="h-4 w-4" /> Aller à l&apos;aperçu
            </button>
          ) : null}
          {etape < 5 ? (
            <button type="button" onClick={() => setEtape((e) => e + 1)} className={buttonClass("primary", "md")}>
              Suivant <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Resume({ t, v }: { t: string; v: string }) {
  return (
    <div className="rounded-lg bg-sunken/60 px-3 py-2">
      <p className="text-xs text-ink-3">{t}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

function EtapeProprietaire({ lead, setLead, bienId, choisirBien }: { lead: LeadComplet | null; setLead: (l: LeadComplet | null) => void; bienId: string | null; choisirBien: (b: (Bien & { id: string }) | null) => void }) {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<LeadResume[]>([]);
  const [erreur, setErreur] = useState("");
  const [cherche, setCherche] = useState(false);
  const [creation, setCreation] = useState(false);
  const [nouveau, setNouveau] = useState({ nom: "", telephone: "", email: "", ville: "Casablanca" });
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => {
      setCherche(true);
      void rechercherLeads(q).then((r) => {
        setCherche(false);
        if (r.erreur !== undefined) return setErreur(r.erreur);
        setErreur("");
        setResultats(r.leads);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const ouvrir = (id: string) =>
    demarrer(async () => {
      const r = await chargerLead(id);
      if (r.erreur !== undefined) return setErreur(r.erreur);
      setLead(r.lead);
    });

  if (lead)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4">
          <div className="min-w-0 text-sm">
            <p className="font-display text-lg font-semibold">{lead.nom}</p>
            <p className="text-ink-2">{[lead.telephone, lead.email, lead.ville].filter(Boolean).join(" · ") || "Coordonnées non renseignées"}</p>
            <p className="text-xs text-ink-3">
              {libelleSource(lead.source)} · responsable : {lead.responsable?.nom ?? "non attribué"} · {lead.estimations} estimation(s)
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge ton="marque">{libelleEtape(lead.etape)}</Badge>
            <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setLead(null)}>
              Changer de prospect
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-3">L&apos;étape commerciale du prospect n&apos;est jamais modifiée par l&apos;estimateur.</p>
        <div className="space-y-2">
          <p className="text-sm font-medium">Logement à estimer</p>
          {lead.biens.map((b) => {
            const m = manquantsBien(b);
            return (
              <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 text-sm">
                <input type="radio" name="bien" checked={bienId === b.id} onChange={() => choisirBien(b)} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{b.libelle || `${b.type_logement ? typologie(b.type_logement, b.chambres) : "Logement"} · ${b.quartier || "quartier ?"}`}</span>
                  <span className="block text-xs text-ink-3">{[b.ville, b.quartier, b.surface ? `${b.surface} m²` : null].filter(Boolean).join(" · ")}</span>
                </span>
                {m.length ? <Badge ton="attention">à compléter : {m.join(", ")}</Badge> : <Badge ton="ok">complet</Badge>}
              </label>
            );
          })}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong p-3 text-sm">
            <input type="radio" name="bien" checked={bienId === null} onChange={() => choisirBien(null)} /> Nouveau logement
          </label>
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Input autoFocus aria-label="Rechercher un prospect" className="pl-10" placeholder="Nom, téléphone, e-mail, quartier ou identifiant du prospect" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
      {cherche || enCours ? <Spinner /> : null}
      {resultats.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {resultats.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => ouvrir(l.id)} className="press flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-sunken/60">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{l.nom}</span>
                  <span className="block truncate text-xs text-ink-3">{[l.telephone, l.email, l.ville, ...l.quartiers].filter(Boolean).join(" · ")}</span>
                </span>
                <Badge>{libelleEtape(l.etape)}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : q.trim().length >= 2 && !cherche ? (
        <p className="text-sm text-ink-3">Aucun prospect trouvé.</p>
      ) : null}
      {creation ? (
        <form
          className="grid gap-2 rounded-xl border border-line p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            demarrer(async () => {
              const r = await creerLead(nouveau);
              if (r.erreur !== undefined) return setErreur(r.erreur);
              const l = await chargerLead(r.leadId);
              if (l.erreur === undefined) setLead(l.lead);
            });
          }}
        >
          <Input aria-label="Nom" placeholder="Nom du propriétaire *" value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} />
          <Input aria-label="Téléphone" placeholder="Téléphone" value={nouveau.telephone} onChange={(e) => setNouveau({ ...nouveau, telephone: e.target.value })} />
          <Input aria-label="E-mail" placeholder="E-mail" value={nouveau.email} onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} />
          <Input aria-label="Ville" placeholder="Ville" value={nouveau.ville} onChange={(e) => setNouveau({ ...nouveau, ville: e.target.value })} />
          <button disabled={enCours || !nouveau.nom.trim()} className={buttonClass("primary", "md", "sm:col-span-2")}>
            Créer le prospect dans le CRM
          </button>
        </form>
      ) : (
        <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setCreation(true)}>
          <UserPlus className="h-4 w-4" /> Le propriétaire n&apos;est pas dans le CRM
        </button>
      )}
    </div>
  );
}
