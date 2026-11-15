"use client";

import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, Loader2, Lock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { bouton } from "@/components/ui/bouton";
import { Monogramme } from "@/components/ui/logo";
import { lireAttribution, track } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { CONTACT, PROFILS, type Profil } from "@/lib/content";
import { useExperience } from "@/lib/experience";
import {
  AMEUBLEMENT,
  CHAMBRES,
  DEFIS,
  DISPONIBILITE,
  EQUIPEMENTS,
  erreursParChamp,
  ETAPES,
  GESTION_ACTUELLE,
  OBJECTIFS,
  OCCUPATION_LONGUE,
  QUARTIERS_CASABLANCA,
  schemaBien,
  schemaContact,
  schemaObjectif,
  schemaQuartier,
  schemaSituation,
  schemaVille,
  STRATEGIES,
  TYPES_BIEN,
  VILLES,
} from "@/lib/funnel";
import { Champ, Choix, ChoixMultiple, Erreur } from "./champs";

type Saisie = {
  ville: string;
  villeAutre: string;
  quartier: string;
  typeBien: string;
  surface: string;
  chambres: string;
  capacite: string;
  ameublement: string;
  equipements: string[];
  situation: Profil | "";
  loyer: string;
  occupation: string;
  disponibilite: string;
  revenuMensuel: string;
  tauxOccupation: string;
  gestionActuelle: string;
  defi: string;
  ameublementPrevu: string;
  strategie: string;
  objectifs: string[];
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
  consentement: boolean;
};

const VIDE: Saisie = {
  ville: "",
  villeAutre: "",
  quartier: "",
  typeBien: "",
  surface: "",
  chambres: "",
  capacite: "",
  ameublement: "",
  equipements: [],
  situation: "",
  loyer: "",
  occupation: "",
  disponibilite: "",
  revenuMensuel: "",
  tauxOccupation: "",
  gestionActuelle: "",
  defi: "",
  ameublementPrevu: "",
  strategie: "",
  objectifs: [],
  prenom: "",
  nom: "",
  telephone: "",
  email: "",
  consentement: false,
};

const CLE = "ps_tunnel";

/** Données de chaque étape, mises en forme pour leur schéma de validation */
function blocs(s: Saisie) {
  const situation =
    s.situation === "longue"
      ? { situation: "longue", loyer: s.loyer, occupation: s.occupation, disponibilite: s.disponibilite }
      : s.situation === "courte"
        ? { situation: "courte", revenuMensuel: s.revenuMensuel, tauxOccupation: s.tauxOccupation, gestionActuelle: s.gestionActuelle, defi: s.defi }
        : { situation: s.situation, disponibilite: s.disponibilite, ameublementPrevu: s.ameublementPrevu, strategie: s.strategie };
  return {
    ville: { ville: s.ville, villeAutre: s.villeAutre },
    quartier: { quartier: s.quartier },
    bien: { typeBien: s.typeBien, surface: s.surface, chambres: s.chambres, capacite: s.capacite, ameublement: s.ameublement, equipements: s.equipements },
    situation,
    objectif: { objectifs: s.objectifs },
    contact: { prenom: s.prenom, nom: s.nom, telephone: s.telephone, email: s.email, consentement: s.consentement },
  };
}

const SCHEMAS: z.ZodType[] = [schemaVille, schemaQuartier, schemaBien, schemaSituation, schemaObjectif, schemaContact];
const CLES_BLOCS = ["ville", "quartier", "bien", "situation", "objectif", "contact"] as const;

export function Tunnel() {
  const { tunnelOuvert, fermerTunnel, profil } = useExperience();
  const [s, setS] = useState<Saisie>(VIDE);
  const [etape, setEtape] = useState(0);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "erreur">("repos");
  const [messageErreur, setMessageErreur] = useState("");
  const [resultat, setResultat] = useState<{ mode: string; niveau?: string } | null>(null);
  const [piege, setPiege] = useState("");
  const debut = useRef<number>(0);
  const panneau = useRef<HTMLDivElement>(null);
  const titre = useRef<HTMLHeadingElement>(null);

  // Reprise d'une saisie interrompue, et profil choisi dans le hero
  useEffect(() => {
    if (!tunnelOuvert) return;
    debut.current = debut.current || Date.now();
    let reprise: Partial<Saisie> = {};
    try {
      reprise = JSON.parse(sessionStorage.getItem(CLE) ?? "{}");
    } catch {
      /* rien à reprendre */
    }
    queueMicrotask(() => setS((x) => ({ ...x, ...reprise, situation: (reprise.situation || x.situation || profil || "") as Saisie["situation"] })));
  }, [tunnelOuvert, profil]);

  useEffect(() => {
    if (!tunnelOuvert) return;
    try {
      const { consentement: _c, ...sansConsentement } = s;
      void _c;
      sessionStorage.setItem(CLE, JSON.stringify(sansConsentement));
    } catch {
      /* stockage indisponible */
    }
  }, [s, tunnelOuvert]);

  // Fenêtre modale : défilement bloqué, Échap pour fermer, focus gardé dans le tunnel
  useEffect(() => {
    if (!tunnelOuvert) return;
    const avant = document.activeElement as HTMLElement | null;
    document.documentElement.style.overflow = "hidden";
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermerTunnel();
      if (e.key !== "Tab" || !panneau.current) return;
      const focusables = panneau.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), a[href]');
      if (!focusables.length) return;
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };
    window.addEventListener("keydown", clavier);
    setTimeout(() => titre.current?.focus(), 50);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", clavier);
      avant?.focus?.();
    };
  }, [tunnelOuvert, fermerTunnel]);

  useEffect(() => {
    titre.current?.focus();
    panneau.current?.querySelector("[data-defile]")?.scrollTo({ top: 0 });
  }, [etape]);

  const maj = useCallback(<K extends keyof Saisie>(k: K, v: Saisie[K]) => {
    setS((x) => ({ ...x, [k]: v }));
    setErreurs((e) => ({ ...e, [k]: "" }));
  }, []);

  function valider(n: number) {
    if (n === 3 && !s.situation) {
      setErreurs({ situation: "Indiquez votre situation actuelle." });
      return false;
    }
    const r = SCHEMAS[n].safeParse(blocs(s)[CLES_BLOCS[n]]);
    if (r.success) {
      setErreurs({});
      return true;
    }
    setErreurs(erreursParChamp(r.error));
    return false;
  }

  async function suivant() {
    if (!valider(etape)) return;
    track("FunnelStepCompleted", { etape: etape + 1, nom: ETAPES[etape] });
    if (etape < 5) return setEtape(etape + 1);
    await envoyer();
  }

  async function envoyer() {
    setEnvoi("envoi");
    setMessageErreur("");
    const b = blocs(s);
    const corps = {
      ville: schemaVille.parse(b.ville),
      quartier: schemaQuartier.parse(b.quartier),
      bien: schemaBien.parse(b.bien),
      situation: schemaSituation.parse(b.situation),
      objectif: schemaObjectif.parse(b.objectif),
      contact: schemaContact.parse(b.contact),
      site: piege,
      dureeMs: Date.now() - debut.current,
      attribution: lireAttribution(),
    };
    try {
      const r = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
      const json = (await r.json()) as { ok: boolean; mode?: string; niveau?: string; erreur?: string };
      if (!r.ok || !json.ok) throw new Error(json.erreur ?? "Envoi impossible.");
      setResultat({ mode: json.mode ?? "demo", niveau: json.niveau });
      track("LeadSubmitted", { mode: json.mode ?? "demo", profil: s.situation });
      if (json.niveau === "prioritaire") track("QualifiedLead", { profil: s.situation });
      setEnvoi("repos");
      setEtape(6);
      try {
        sessionStorage.removeItem(CLE);
      } catch {
        /* rien */
      }
    } catch (e) {
      setEnvoi("erreur");
      setMessageErreur(e instanceof Error ? e.message : "Envoi impossible.");
    }
  }

  if (!tunnelOuvert) return null;
  const tel = CONTACT.whatsapp.replace(/\D/g, "");
  const progression = Math.min(etape, 6) / 6;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-charbon/70 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && fermerTunnel()}>
      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-tunnel"
        className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-graphite shadow-2xl [animation:entree-bas_0.5s_var(--ease-cine)_both] md:h-auto md:max-h-[92vh] md:rounded-[1.75rem] md:border md:border-white/[0.08]"
      >
        <header className="flex items-center gap-4 border-b border-white/[0.07] px-5 py-4 md:px-7">
          <Monogramme className="h-6 w-auto text-or" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.72rem] tracking-[0.16em] text-papier/45 uppercase">
              {etape < 6 ? `Étape ${etape + 1} sur 6 · ${ETAPES[etape]}` : "Demande reçue"}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={6} aria-valuenow={Math.min(etape, 6)} aria-label="Progression">
              <div className="h-full rounded-full bg-or transition-[width] duration-700 ease-[var(--ease-cine)]" style={{ width: `${Math.max(progression, 0.04) * 100}%` }} />
            </div>
          </div>
          <button type="button" onClick={fermerTunnel} aria-label="Fermer" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-papier/70 hover:text-papier">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div data-defile className="flex-1 overflow-y-auto px-5 py-7 md:px-7">
          <div key={etape} className="[animation:entree-bas_0.45s_var(--ease-cine)_both]">
            {etape === 0 ? (
              <Etape titre="Où se trouve votre bien ?" refTitre={titre}>
                <Choix label="Ville" options={VILLES} valeur={s.ville} onChange={(v) => maj("ville", v)} erreur={erreurs.ville} colonnes={2} />
                {s.ville === "Autre" ? <Champ label="Quelle ville ?" value={s.villeAutre} onChange={(e) => maj("villeAutre", e.target.value)} erreur={erreurs.villeAutre} autoComplete="address-level2" /> : null}
                {s.ville && s.ville !== "Casablanca" ? (
                  <p className="rounded-xl border border-white/10 bg-charbon/50 p-4 text-[0.86rem] text-papier/65">Nous opérons aujourd&apos;hui à Casablanca. Laissez-nous vos informations : nous étudions chaque demande pour nos prochaines villes.</p>
                ) : null}
              </Etape>
            ) : null}

            {etape === 1 ? (
              <Etape titre="Dans quel quartier ?" refTitre={titre}>
                <Champ label="Quartier" value={s.quartier} onChange={(e) => maj("quartier", e.target.value)} erreur={erreurs.quartier} list="quartiers" placeholder="Ex. Maarif, Gauthier…" autoComplete="off" />
                <datalist id="quartiers">
                  {QUARTIERS_CASABLANCA.map((q) => (
                    <option key={q} value={q} />
                  ))}
                </datalist>
                {s.ville === "Casablanca" ? (
                  <div className="flex flex-wrap gap-2">
                    {QUARTIERS_CASABLANCA.slice(0, 8).map((q) => (
                      <button key={q} type="button" onClick={() => maj("quartier", q)} className={cn("min-h-10 rounded-full border px-3.5 text-[0.84rem]", s.quartier === q ? "border-or bg-or/10 text-papier" : "border-white/12 text-papier/65 hover:border-white/30")}>
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Etape>
            ) : null}

            {etape === 2 ? (
              <Etape titre="Parlez-nous de votre bien." refTitre={titre}>
                <Choix label="Type de bien" options={TYPES_BIEN} valeur={s.typeBien} onChange={(v) => maj("typeBien", v)} erreur={erreurs.typeBien} colonnes={3} />
                <div className="grid grid-cols-2 gap-4">
                  <Champ label="Surface (m²)" inputMode="numeric" value={s.surface} onChange={(e) => maj("surface", e.target.value.replace(/\D/g, ""))} erreur={erreurs.surface} placeholder="85" />
                  <Champ label="Voyageurs (capacité)" inputMode="numeric" value={s.capacite} onChange={(e) => maj("capacite", e.target.value.replace(/\D/g, ""))} erreur={erreurs.capacite} placeholder="4" />
                </div>
                <Choix label="Chambres" options={CHAMBRES} valeur={s.chambres} onChange={(v) => maj("chambres", v)} erreur={erreurs.chambres} colonnes={3} />
                <Choix label="Ameublement" options={AMEUBLEMENT} valeur={s.ameublement} onChange={(v) => maj("ameublement", v)} erreur={erreurs.ameublement} colonnes={3} />
                <ChoixMultiple label="Principaux équipements" aide="Facultatif" options={EQUIPEMENTS} valeurs={s.equipements} onChange={(v) => maj("equipements", v)} />
              </Etape>
            ) : null}

            {etape === 3 ? (
              <Etape titre="Votre situation actuelle." refTitre={titre}>
                <fieldset>
                  <legend className="text-[0.86rem] font-medium text-papier/80">Comment est exploité votre bien aujourd&apos;hui ?</legend>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                    {(Object.keys(PROFILS) as Profil[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        role="radio"
                        aria-checked={s.situation === p}
                        onClick={() => maj("situation", p)}
                        className={cn("min-h-13 rounded-xl border px-4 py-3 text-left text-[0.9rem]", s.situation === p ? "border-or bg-or/10 text-papier" : "border-white/12 text-papier/75 hover:border-white/30")}
                      >
                        {PROFILS[p].court}
                      </button>
                    ))}
                  </div>
                  <Erreur id="erreur-situation" message={erreurs.situation} />
                </fieldset>
                {s.situation === "longue" ? (
                  <>
                    <Champ label="Loyer mensuel actuel ou prévu (MAD)" aide="Facultatif" inputMode="numeric" value={s.loyer} onChange={(e) => maj("loyer", e.target.value.replace(/\D/g, ""))} erreur={erreurs.loyer} placeholder="8 000" />
                    <Choix label="Le bien est-il occupé ?" options={OCCUPATION_LONGUE} valeur={s.occupation} onChange={(v) => maj("occupation", v)} erreur={erreurs.occupation} colonnes={3} />
                    <Choix label="Disponibilité prévue" options={DISPONIBILITE} valeur={s.disponibilite} onChange={(v) => maj("disponibilite", v)} erreur={erreurs.disponibilite} />
                  </>
                ) : null}
                {s.situation === "courte" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <Champ label="Revenu mensuel moyen (MAD)" aide="Si vous le connaissez" inputMode="numeric" value={s.revenuMensuel} onChange={(e) => maj("revenuMensuel", e.target.value.replace(/\D/g, ""))} erreur={erreurs.revenuMensuel} />
                      <Champ label="Taux d'occupation (%)" aide="Si vous le connaissez" inputMode="numeric" value={s.tauxOccupation} onChange={(e) => maj("tauxOccupation", e.target.value.replace(/\D/g, ""))} erreur={erreurs.tauxOccupation} />
                    </div>
                    <Choix label="Gestion actuelle" options={GESTION_ACTUELLE} valeur={s.gestionActuelle} onChange={(v) => maj("gestionActuelle", v)} erreur={erreurs.gestionActuelle} />
                    <Choix label="Votre principal défi" options={DEFIS} valeur={s.defi} onChange={(v) => maj("defi", v)} erreur={erreurs.defi} />
                  </>
                ) : null}
                {s.situation === "vacant" ? (
                  <>
                    <Choix label="Disponibilité prévue" options={DISPONIBILITE} valeur={s.disponibilite} onChange={(v) => maj("disponibilite", v)} erreur={erreurs.disponibilite} />
                    <Choix label="Ameublement prévu" options={AMEUBLEMENT} valeur={s.ameublementPrevu} onChange={(v) => maj("ameublementPrevu", v)} erreur={erreurs.ameublementPrevu} colonnes={3} />
                    <Choix label="Stratégie envisagée" options={STRATEGIES} valeur={s.strategie} onChange={(v) => maj("strategie", v)} erreur={erreurs.strategie} colonnes={3} />
                  </>
                ) : null}
              </Etape>
            ) : null}

            {etape === 4 ? (
              <Etape titre="Quel est votre objectif ?" refTitre={titre}>
                <ChoixMultiple label="Plusieurs choix possibles" options={OBJECTIFS} valeurs={s.objectifs} onChange={(v) => maj("objectifs", v)} erreur={erreurs.objectifs} />
              </Etape>
            ) : null}

            {etape === 5 ? (
              <Etape titre="Où vous envoyer votre évaluation ?" refTitre={titre}>
                <div className="grid grid-cols-2 gap-4">
                  <Champ label="Prénom" value={s.prenom} onChange={(e) => maj("prenom", e.target.value)} erreur={erreurs.prenom} autoComplete="given-name" />
                  <Champ label="Nom" value={s.nom} onChange={(e) => maj("nom", e.target.value)} erreur={erreurs.nom} autoComplete="family-name" />
                </div>
                <Champ label="Téléphone / WhatsApp" type="tel" inputMode="tel" value={s.telephone} onChange={(e) => maj("telephone", e.target.value)} erreur={erreurs.telephone} autoComplete="tel" placeholder="+212 6 00 00 00 00" />
                <Champ label="E-mail" type="email" inputMode="email" value={s.email} onChange={(e) => maj("email", e.target.value)} erreur={erreurs.email} autoComplete="email" />
                {/* Champ piège pour les robots : invisible et ignoré par les lecteurs d'écran */}
                <input type="text" name="site" value={piege} onChange={(e) => setPiege(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-charbon/40 p-4 text-[0.84rem] leading-relaxed text-papier/70">
                  <input type="checkbox" checked={s.consentement} onChange={(e) => maj("consentement", e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#230c1f]" />
                  <span>
                    J&apos;accepte que Perfect Stay utilise ces informations pour me recontacter au sujet de mon bien. Elles ne sont ni revendues ni partagées à des fins commerciales.{" "}
                    <a href="/confidentialite" target="_blank" className="underline underline-offset-4">
                      Politique de confidentialité
                    </a>
                  </span>
                </label>
                <Erreur id="erreur-consentement" message={erreurs.consentement} />
                <p className="flex items-center gap-2 text-[0.75rem] text-papier/40">
                  <Lock className="h-3.5 w-3.5" /> Connexion chiffrée. Aucun engagement.
                </p>
              </Etape>
            ) : null}

            {etape === 6 && resultat ? (
              <div className="py-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-or" />
                <h2 id="titre-tunnel" ref={titre} tabIndex={-1} className="titre mt-5 text-[2.3rem] text-papier outline-none">
                  Merci {s.prenom}.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-[1rem] leading-relaxed text-papier/70">
                  Votre demande d&apos;évaluation pour votre {s.typeBien.toLowerCase() || "bien"} {s.quartier ? `à ${s.quartier}` : ""} est bien préparée. Un conseiller Perfect Stay étudie votre situation et vous propose une
                  évaluation personnalisée de son potentiel locatif.
                </p>
                <p className="mx-auto mt-3 max-w-md text-[0.84rem] text-papier/45">Nous ne communiquons aucune projection chiffrée sans avoir étudié votre bien.</p>
                {resultat.mode === "demo" ? (
                  <p className="mx-auto mt-6 max-w-md rounded-xl border border-or/30 bg-or/10 p-3 text-[0.8rem] text-or-clair">
                    Mode démonstration : aucun outil de suivi des demandes n&apos;est encore branché, cette demande n&apos;a été transmise à personne.
                  </p>
                ) : null}
                <div className="mt-8 flex flex-col items-center gap-3">
                  {tel ? (
                    <a
                      href={`https://wa.me/${tel}?text=${encodeURIComponent(`Bonjour, je viens de demander une évaluation pour mon bien à ${s.quartier}. Je souhaite planifier un appel.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("AppointmentRequested", { canal: "whatsapp" })}
                      className={bouton("or", "lg")}
                    >
                      <CalendarClock className="h-4 w-4" /> Planifier un appel sur WhatsApp
                    </a>
                  ) : null}
                  <button type="button" onClick={fermerTunnel} className={bouton("contour", "md")}>
                    Revenir au site
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {etape < 6 ? (
          <footer className="border-t border-white/[0.07] px-5 py-4 md:px-7">
            {envoi === "erreur" ? (
              <p role="alert" className="mb-3 text-[0.86rem] text-alerte">
                {messageErreur}
              </p>
            ) : null}
            <div className="flex items-center gap-3">
              {etape > 0 ? (
                <button type="button" onClick={() => setEtape(etape - 1)} className={bouton("contour", "md", "!px-4")} aria-label="Étape précédente">
                  <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Précédent</span>
                </button>
              ) : null}
              <button type="button" onClick={suivant} disabled={envoi === "envoi"} className={bouton("or", "md", "ml-auto flex-1 sm:flex-none")}>
                {envoi === "envoi" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {etape === 5 ? "Recevoir mon évaluation" : "Continuer"}
                {etape < 5 ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function Etape({ titre, refTitre, children }: { titre: string; refTitre: React.RefObject<HTMLHeadingElement | null>; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h2 id="titre-tunnel" ref={refTitre} tabIndex={-1} className="titre text-[2rem] text-papier outline-none md:text-[2.4rem]">
        {titre}
      </h2>
      {children}
    </div>
  );
}
