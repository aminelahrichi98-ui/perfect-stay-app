"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  buttonClass,
  Card,
  Input,
  Notice,
  Select,
  Spinner,
  Textarea,
} from "@/components/ui";
import {
  champsBloquants,
  champsManquants,
  controlerDonnees,
} from "@/lib/marche/extraction";
import {
  resoudreQuartier,
  type AliasRef,
  type QuartierRef,
} from "@/lib/marche/matching";
import { cle, lireMois } from "@/lib/marche/nombres";
import {
  LIBELLES_CHAMPS,
  METRIQUES_PERCENTILE,
  NATURES_CENTRAL,
  LIBELLES_NATURE_CENTRAL,
  type ComparableMarche,
  type DonneesMarche,
  type Preuve,
} from "@/lib/marche/schema";
import {
  abandonnerImport,
  enregistrerBrouillon,
  retirerCapture,
  validerImport,
} from "../../actions";
import { EnvoiCaptures } from "../../envoi-captures";
import { ChampNombre, ChampTexte, PreuveLigne, TroisEtats } from "./champs";

type Capture = { id: string; numero: number; nom: string; url: string };
type Props = {
  importId: string;
  statut: string;
  creeLe: string;
  modele: string;
  erreurPrecedente: string;
  initiales: DonneesMarche;
  aDesDonnees: boolean;
  captures: Capture[];
  ia: { disponible: boolean; raison: string; modele: string };
  quartiers: QuartierRef[];
  alias: AliasRef[];
  extraireAuto: boolean;
};

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];
const LIBELLE_METRIQUE: Record<(typeof METRIQUES_PERCENTILE)[number], string> =
  {
    revenu_annuel: "Revenu annuel",
    revenu_mensuel: "Revenu mensuel",
    prix_moyen_nuit: "Prix moyen par nuit",
    taux_occupation: "Taux d'occupation",
    autre: "Autre",
  };

const comparableVide = (): ComparableMarche => ({
  nom: "",
  quartier: "",
  type_logement: "",
  chambres: null,
  capacite: null,
  revenu_annuel: null,
  revenu_annuel_bas: null,
  revenu_annuel_haut: null,
  adr: null,
  occupation: null,
  note: null,
  nb_avis: null,
  equipements: [],
  url: "",
  identifiant: "",
  capture: null,
  affichable: true,
});

/** Ajout d'une valeur mensuelle lue sur la capture : le mois n'est ajouté qu'avec une valeur chiffrée. */
function AjoutMois({
  onAjout,
}: {
  onAjout: (m: DonneesMarche["mensuels"][number]) => void;
}) {
  const [mois, setMois] = useState(1);
  const [annee, setAnnee] = useState("");
  const [valeur, setValeur] = useState<number | null>(null);
  const [nature, setNature] = useState<"historique" | "prevision" | "inconnu">(
    "historique",
  );
  return (
    <div className="flex flex-wrap items-end gap-1.5 rounded-lg bg-sunken/60 p-2">
      <div className="w-24">
        <Select
          aria-label="Mois à ajouter"
          className="h-9 text-sm"
          value={mois}
          onChange={(e) => setMois(Number(e.target.value))}
        >
          {MOIS.map((nom, k) => (
            <option key={nom} value={k + 1}>
              {nom}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-20">
        <Input
          aria-label="Année"
          inputMode="numeric"
          placeholder="année"
          className="h-9 text-sm"
          value={annee}
          onChange={(e) =>
            setAnnee(e.target.value.replace(/\D/g, "").slice(0, 4))
          }
        />
      </div>
      <div className="w-32">
        <ChampNombre
          id="ajout-mois"
          label=""
          compact
          valeur={valeur}
          onChange={setValeur}
        />
      </div>
      <div className="w-32">
        <Select
          aria-label="Nature"
          className="h-9 text-sm"
          value={nature}
          onChange={(e) => setNature(e.target.value as typeof nature)}
        >
          <option value="historique">historique</option>
          <option value="prevision">prévision</option>
          <option value="inconnu">inconnue</option>
        </Select>
      </div>
      <button
        type="button"
        disabled={valeur === null}
        className={buttonClass("secondary", "sm")}
        onClick={() => {
          if (valeur === null) return;
          onAjout({
            mois,
            annee: /^\d{4}$/.test(annee) ? Number(annee) : null,
            valeur,
            nature,
          });
          setValeur(null);
          setMois((m) => (m % 12) + 1);
        }}
      >
        <Plus className="h-4 w-4" /> Ajouter
      </button>
    </div>
  );
}

export function Validation(p: Props) {
  const router = useRouter();
  const [d, setD] = useState<DonneesMarche>(p.initiales);
  const [extraitIci, setExtraitIci] = useState(p.aDesDonnees);
  const [extraction, setExtraction] = useState(false);
  const [message, setMessage] = useState<{
    ton: "ok" | "danger" | "info";
    texte: string;
  } | null>(
    p.erreurPrecedente
      ? { ton: "danger", texte: `Dernière extraction : ${p.erreurPrecedente}` }
      : null,
  );
  const [enCours, demarrer] = useTransition();
  const [creerQuartier, setCreerQuartier] = useState(false);
  const [notes, setNotes] = useState("");
  const [bas, setBas] = useState("");
  const [haut, setHaut] = useState("");
  const lance = useRef(false);
  const lecture = p.statut === "valide";

  const maj = (f: (x: DonneesMarche) => void) =>
    setD((avant) => {
      const copie = structuredClone(avant);
      f(copie);
      return copie;
    });
  const preuve = (champ: string): Preuve | undefined =>
    d.preuves.find((x) => x.champ === champ);

  async function extraire() {
    if (
      extraitIci &&
      !window.confirm(
        "Relancer la lecture remplacera les valeurs actuelles, y compris vos corrections. Continuer ?",
      )
    )
      return;
    setExtraction(true);
    setMessage(null);
    try {
      const r = await fetch("/api/estimateur/extraction", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId: p.importId }),
      });
      const j = (await r.json()) as {
        erreur?: string;
        donnees?: DonneesMarche;
        repli?: boolean;
      };
      if (!r.ok || !j.donnees)
        throw new Error(j.erreur ?? "L'extraction a échoué.");
      setD(j.donnees);
      setExtraitIci(true);
      setMessage({
        ton: "info",
        texte:
          "Lecture terminée. Vérifiez chaque valeur avec les captures, corrigez si besoin, puis validez.",
      });
    } catch (e) {
      setMessage({
        ton: "danger",
        texte: `${e instanceof Error ? e.message : "L'extraction a échoué."} Vous pouvez saisir les valeurs à la main.`,
      });
    } finally {
      setExtraction(false);
    }
  }

  useEffect(() => {
    if (p.extraireAuto && !lance.current) {
      lance.current = true;
      void extraire();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contrôles en direct
  const bloquants = champsBloquants(d);
  const manquants = champsManquants(d).filter((c) => !bloquants.includes(c));
  const incoherences = controlerDonnees(d);
  const villeCle = cle(d.segment.ville);
  const quartierResolu = resoudreQuartier(
    d.segment.ville,
    d.segment.quartier,
    p.quartiers,
    p.alias,
  );
  const quartiersVille = p.quartiers.filter((q) => q.villeCle === villeCle);
  const quartierOk =
    Boolean(quartierResolu) ||
    (creerQuartier && cle(d.segment.quartier) !== "");
  const peutValider =
    !lecture &&
    !bloquants.length &&
    !incoherences.some((i) => i.niveau === "bloquant") &&
    quartierOk;

  function brouillon() {
    demarrer(async () => {
      const r = await enregistrerBrouillon(p.importId, d);
      setMessage(
        r.erreur !== undefined
          ? { ton: "danger", texte: r.erreur }
          : { ton: "ok", texte: "Brouillon enregistré." },
      );
    });
  }

  function valider(
    confirmations = { memePeriode: false, baseInconnue: false },
  ) {
    demarrer(async () => {
      const r = await validerImport(p.importId, d, {
        quartierId: quartierResolu?.id ?? null,
        creerQuartier: !quartierResolu && creerQuartier,
        confirmerMemePeriode: confirmations.memePeriode,
        confirmerBaseInconnue: confirmations.baseInconnue,
        notes,
      });
      if ("confirmation" in r) {
        if (!window.confirm(r.confirmation)) return;
        const base = r.confirmation.includes("frais de plateforme");
        return valider({
          memePeriode: confirmations.memePeriode || !base,
          baseInconnue: confirmations.baseInconnue || base,
        });
      }
      if (r.erreur !== undefined)
        return setMessage({ ton: "danger", texte: r.erreur });
      router.push(`/estimateur/marche/${r.segmentId}?valide=${r.numero}`);
    });
  }

  function abandonner() {
    if (
      !window.confirm(
        "Supprimer cet import et ses captures ? Rien n'a encore été enregistré dans la base marché.",
      )
    )
      return;
    demarrer(async () => {
      const r = await abandonnerImport(p.importId);
      if (r.erreur !== undefined)
        return setMessage({ ton: "danger", texte: r.erreur });
      router.push("/estimateur/marche");
    });
  }

  function utiliserPercentiles() {
    const b = d.percentiles[Number(bas)];
    const h = d.percentiles[Number(haut)];
    if (!b || !h || b.valeur === null || h.valeur === null)
      return setMessage({
        ton: "danger",
        texte: "Choisissez deux percentiles chiffrés.",
      });
    if (b.valeur > h.valeur)
      return setMessage({
        ton: "danger",
        texte: "Le percentile bas doit être inférieur au percentile haut.",
      });
    maj((x) => {
      x.metriques.revenu_annuel_bas = b.valeur;
      x.metriques.revenu_annuel_haut = h.valeur;
      x.avertissements = [
        ...x.avertissements.filter(
          (a) => !a.startsWith("Fourchette reprise des percentiles"),
        ),
        `Fourchette reprise des percentiles « ${b.libelle} » et « ${h.libelle} » (choix de l'utilisateur).`,
      ];
    });
  }

  const dis = lecture;
  const typeStudio = d.segment.type_logement === "studio";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Captures (sources) */}
      <section
        aria-label="Captures"
        className="space-y-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Captures ({p.captures.length})
          </h2>
          <span className="text-xs text-ink-3">
            Import du {p.creeLe}
            {p.modele ? ` · ${p.modele}` : ""}
          </span>
        </div>
        {p.captures.map((c) => (
          <figure
            key={c.id}
            className="overflow-hidden rounded-xl border border-line bg-surface"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.url}
              alt={`Capture ${c.numero}`}
              className="w-full bg-sunken"
            />
            <figcaption className="flex items-center gap-2 px-3 py-2 text-xs text-ink-2">
              <span className="min-w-0 flex-1 truncate">
                {c.numero}. {c.nom}
              </span>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("ghost", "sm", "h-8 px-2")}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Agrandir
              </a>
              {!lecture ? (
                <button
                  type="button"
                  className={buttonClass("ghost", "sm", "h-8 px-2")}
                  aria-label="Retirer la capture"
                  onClick={() =>
                    window.confirm("Retirer cette capture ?") &&
                    demarrer(async () => {
                      const r = await retirerCapture(c.id);
                      if (r.erreur !== undefined)
                        setMessage({ ton: "danger", texte: r.erreur });
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </figcaption>
          </figure>
        ))}
        {!p.captures.length ? (
          <Notice ton="info">
            Aucune capture : saisie manuelle. Ajoutez des captures pour garder
            la source des chiffres.
          </Notice>
        ) : null}
        {!lecture ? (
          <details className="rounded-xl border border-line bg-surface p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Ajouter des captures
            </summary>
            <div className="mt-3">
              <EnvoiCaptures
                importId={p.importId}
                dejaPresentes={p.captures.length}
                libelle="Ajouter ces captures"
                onTermine={(_, refusees) => (
                  refusees.length &&
                    setMessage({
                      ton: "danger",
                      texte: `Refusées : ${refusees.join(" · ")}`,
                    }),
                  router.refresh()
                )}
              />
            </div>
          </details>
        ) : null}
      </section>

      {/* Données */}
      <section aria-label="Données extraites" className="space-y-4">
        {!lecture ? (
          <Card className="flex flex-wrap items-center gap-3 p-4">
            {p.ia.disponible ? (
              <button
                type="button"
                disabled={extraction || !p.captures.length}
                onClick={extraire}
                className={buttonClass(
                  extraitIci ? "secondary" : "primary",
                  "sm",
                )}
              >
                {extraction ? (
                  <Spinner />
                ) : extraitIci ? (
                  <RotateCw className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {extraction
                  ? "Lecture des captures… (30 s à 1 min)"
                  : extraitIci
                    ? "Relancer la lecture"
                    : "Lire les captures avec l'IA"}
              </button>
            ) : (
              <p className="text-sm text-ink-2">{p.ia.raison}</p>
            )}
            <p className="text-xs text-ink-3">
              L&apos;IA recopie les valeurs ; les nombres sont convertis par
              l&apos;application. Aucune valeur n&apos;est inventée : ce qui
              manque reste « non renseigné ».
            </p>
          </Card>
        ) : null}
        {message ? <Notice ton={message.ton}>{message.texte}</Notice> : null}

        {/* Contrôles */}
        <Card className="space-y-2 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {peutValider ? (
              <CheckCircle2 className="h-4 w-4 text-ok" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warn" />
            )}{" "}
            Contrôles
          </h3>
          {bloquants.length ? (
            <p className="text-sm text-danger">
              À compléter avant validation :{" "}
              {bloquants.map((c) => LIBELLES_CHAMPS[c] ?? c).join(", ")}.
            </p>
          ) : null}
          {!quartierOk && d.segment.quartier ? (
            <p className="text-sm text-danger">
              Quartier non reconnu : choisissez un quartier existant ou
              confirmez sa création.
            </p>
          ) : null}
          {incoherences.map((i) => (
            <p
              key={i.message}
              className={
                i.niveau === "bloquant"
                  ? "text-sm text-danger"
                  : "text-sm text-warn"
              }
            >
              {i.niveau === "bloquant" ? "Bloquant : " : "À vérifier : "}
              {i.message}
            </p>
          ))}
          {manquants.length ? (
            <p className="text-sm text-ink-2">
              Non renseignés (n&apos;empêchent pas la validation) :{" "}
              {manquants.map((c) => LIBELLES_CHAMPS[c] ?? c).join(", ")}.
            </p>
          ) : null}
          {d.avertissements.length ? (
            <ul className="list-disc space-y-0.5 pl-5 text-[0.82rem] text-ink-2">
              {d.avertissements.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
          {peutValider && !incoherences.length && !d.avertissements.length ? (
            <p className="text-sm text-ok">Aucune incohérence détectée.</p>
          ) : null}
        </Card>

        {/* Segment */}
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Segment</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChampTexte
              id="ville"
              label="Ville"
              valeur={d.segment.ville}
              disabled={dis}
              requis
              preuve={preuve("ville")}
              onChange={(v) => maj((x) => void (x.segment.ville = v))}
            />
            <div className="space-y-1">
              <ChampTexte
                id="quartier"
                label="Quartier"
                valeur={d.segment.quartier}
                disabled={dis}
                requis
                preuve={preuve("quartier")}
                onChange={(v) => (
                  setCreerQuartier(false),
                  maj((x) => void (x.segment.quartier = v))
                )}
              />
              {d.segment.quartier ? (
                quartierResolu ? (
                  <p className="text-xs text-ok">
                    Reconnu : {quartierResolu.nom}
                    {quartierResolu.cle !== cle(d.segment.quartier)
                      ? " (alias)"
                      : ""}
                  </p>
                ) : !dis ? (
                  <div className="space-y-1.5 rounded-lg bg-warn-bg/60 p-2 text-xs">
                    <p className="text-warn">
                      Ce quartier n&apos;existe pas dans la base de{" "}
                      {d.segment.ville || "cette ville"}.
                    </p>
                    {quartiersVille.length ? (
                      <Select
                        aria-label="Choisir un quartier existant"
                        className="h-9 text-sm"
                        value=""
                        onChange={(e) =>
                          maj(
                            (x) =>
                              void (x.segment.quartier =
                                quartiersVille.find(
                                  (q) => q.id === e.target.value,
                                )?.nom ?? x.segment.quartier),
                          )
                        }
                      >
                        <option value="">
                          C&apos;est un quartier existant…
                        </option>
                        {quartiersVille.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.nom}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={creerQuartier}
                        onChange={(e) => setCreerQuartier(e.target.checked)}
                      />{" "}
                      Créer le quartier « {d.segment.quartier} »
                    </label>
                  </div>
                ) : null
              ) : null}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="type"
                className="block text-[0.82rem] font-medium"
              >
                Type de logement{" "}
                {!d.segment.type_logement ? (
                  <Badge ton="danger">requis</Badge>
                ) : null}
              </label>
              <Select
                id="type"
                className="h-10"
                disabled={dis}
                value={d.segment.type_logement ?? ""}
                onChange={(e) =>
                  maj((x) => {
                    x.segment.type_logement = (e.target.value ||
                      null) as DonneesMarche["segment"]["type_logement"];
                    if (x.segment.type_logement === "studio") {
                      x.segment.chambres = 0;
                      x.segment.chambres_max = null;
                    }
                  })
                }
              >
                <option value="">non renseigné</option>
                <option value="studio">Studio (0 chambre)</option>
                <option value="appartement">Appartement</option>
                <option value="villa">Villa</option>
                <option value="riad">Riad</option>
              </Select>
              {preuve("type_logement") ? (
                <PreuveLigne preuve={preuve("type_logement")!} />
              ) : null}
            </div>
            <ChampNombre
              id="chambres"
              label="Chambres"
              mode="entier"
              requis
              valeur={d.segment.chambres}
              disabled={dis || typeStudio}
              preuve={preuve("chambres")}
              onChange={(v) => maj((x) => void (x.segment.chambres = v))}
            />
            {!typeStudio ? (
              <div className="space-y-1 sm:col-span-2">
                <label className="flex items-center gap-2 text-[0.82rem]">
                  <input
                    type="checkbox"
                    disabled={dis}
                    checked={d.segment.chambres_max !== null}
                    onChange={(e) =>
                      maj(
                        (x) =>
                          void (x.segment.chambres_max = e.target.checked
                            ? (x.segment.chambres ?? 0) + 1
                            : null),
                      )
                    }
                  />
                  Regroupement affiché par PriceLabs (ex. 2 à 3 chambres)
                </label>
                {d.segment.chambres_max !== null ? (
                  <ChampNombre
                    id="chambres_max"
                    label="Jusqu'à (chambres)"
                    mode="entier"
                    valeur={d.segment.chambres_max}
                    disabled={dis}
                    onChange={(v) =>
                      maj((x) => void (x.segment.chambres_max = v))
                    }
                  />
                ) : null}
              </div>
            ) : null}
            <ChampNombre
              id="capacite"
              label="Capacité (voyageurs)"
              mode="entier"
              valeur={d.segment.capacite}
              disabled={dis}
              preuve={preuve("capacite")}
              onChange={(v) => maj((x) => void (x.segment.capacite = v))}
            />
            <div className="space-y-1">
              <label
                htmlFor="standing"
                className="block text-[0.82rem] font-medium"
              >
                Standing
              </label>
              <Select
                id="standing"
                className="h-10"
                disabled={dis}
                value={d.segment.standing ?? ""}
                onChange={(e) =>
                  maj(
                    (x) =>
                      void (x.segment.standing = (e.target.value ||
                        null) as DonneesMarche["segment"]["standing"]),
                  )
                }
              >
                <option value="">non renseigné (tous standings)</option>
                <option value="standard">Standard</option>
                <option value="superieur">Supérieur</option>
                <option value="premium">Premium</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Période, devise, base */}
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">
            Période, devise et définition des revenus
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor="debut"
                className="block text-[0.82rem] font-medium"
              >
                Début de la période
              </label>
              <Input
                id="debut"
                type="date"
                className="h-10"
                disabled={dis}
                value={d.periode.debut ?? ""}
                onChange={(e) =>
                  maj((x) => void (x.periode.debut = e.target.value || null))
                }
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="fin" className="block text-[0.82rem] font-medium">
                Fin de la période
              </label>
              <Input
                id="fin"
                type="date"
                className="h-10"
                disabled={dis}
                value={d.periode.fin ?? ""}
                onChange={(e) =>
                  maj((x) => void (x.periode.fin = e.target.value || null))
                }
              />
            </div>
            <ChampTexte
              id="type_periode"
              label="Nature de la période"
              placeholder="ex. 12 derniers mois"
              valeur={d.periode.type}
              disabled={dis}
              onChange={(v) => maj((x) => void (x.periode.type = v))}
            />
          </div>
          {preuve("periode") ? (
            <PreuveLigne preuve={preuve("periode")!} />
          ) : null}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <label
                htmlFor="devise"
                className="block text-[0.82rem] font-medium"
              >
                Devise {!d.devise ? <Badge ton="danger">requis</Badge> : null}
              </label>
              <Select
                id="devise"
                className="h-10"
                disabled={dis}
                value={d.devise ?? ""}
                onChange={(e) =>
                  maj((x) => void (x.devise = e.target.value || null))
                }
              >
                <option value="">non renseigné</option>
                <option value="MAD">MAD</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </div>
            <TroisEtats
              id="plateforme"
              label="Frais de plateforme inclus ?"
              valeur={d.base.plateforme_incluse}
              disabled={dis}
              onChange={(v) => maj((x) => void (x.base.plateforme_incluse = v))}
            />
            <TroisEtats
              id="menage"
              label="Frais de ménage inclus ?"
              valeur={d.base.menage_inclus}
              disabled={dis}
              onChange={(v) => maj((x) => void (x.base.menage_inclus = v))}
            />
            <TroisEtats
              id="taxes"
              label="Taxes incluses ?"
              valeur={d.base.taxes_incluses}
              disabled={dis}
              onChange={(v) => maj((x) => void (x.base.taxes_incluses = v))}
            />
          </div>
          <Textarea
            aria-label="Définition des revenus selon la source"
            placeholder="Définition des revenus selon PriceLabs (infobulle, note)…"
            className="min-h-16 text-sm"
            disabled={dis}
            value={d.base.definition}
            onChange={(e) =>
              maj(
                (x) => void (x.base.definition = e.target.value.slice(0, 600)),
              )
            }
          />
        </Card>

        {/* Métriques */}
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Indicateurs</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <ChampNombre
              id="bas"
              label="Revenu annuel bas"
              unite={d.devise ?? ""}
              valeur={d.metriques.revenu_annuel_bas}
              disabled={dis}
              preuve={preuve("revenu_annuel_bas")}
              onChange={(v) =>
                maj((x) => void (x.metriques.revenu_annuel_bas = v))
              }
            />
            <ChampNombre
              id="central"
              label="Revenu annuel central"
              unite={d.devise ?? ""}
              valeur={d.metriques.revenu_annuel_central}
              disabled={dis}
              preuve={preuve("revenu_annuel_central")}
              onChange={(v) =>
                maj((x) => {
                  x.metriques.revenu_annuel_central = v;
                  if (v === null) x.central_nature = "inconnu";
                })
              }
            />
            <ChampNombre
              id="haut"
              label="Revenu annuel haut"
              unite={d.devise ?? ""}
              valeur={d.metriques.revenu_annuel_haut}
              disabled={dis}
              preuve={preuve("revenu_annuel_haut")}
              onChange={(v) =>
                maj((x) => void (x.metriques.revenu_annuel_haut = v))
              }
            />
          </div>
          {d.metriques.revenu_annuel_central !== null ? (
            <div className="max-w-xs space-y-1">
              <label
                htmlFor="nature"
                className="block text-[0.82rem] font-medium"
              >
                Nature de la valeur centrale
              </label>
              <Select
                id="nature"
                className="h-10"
                disabled={dis}
                value={d.central_nature}
                onChange={(e) =>
                  maj(
                    (x) =>
                      void (x.central_nature = e.target
                        .value as DonneesMarche["central_nature"]),
                  )
                }
              >
                {NATURES_CENTRAL.map((n) => (
                  <option key={n} value={n}>
                    {LIBELLES_NATURE_CENTRAL[n]}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <p className="text-xs text-ink-3">
              Sans valeur centrale affichée par la source, le scénario central
              des estimations sera calculé (moyenne du bas et du haut) et
              signalé comme tel.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <ChampNombre
              id="mensuel"
              label="Revenu mensuel moyen"
              unite={d.devise ?? ""}
              valeur={d.metriques.revenu_mensuel_moyen}
              disabled={dis}
              preuve={preuve("revenu_mensuel_moyen")}
              onChange={(v) =>
                maj((x) => void (x.metriques.revenu_mensuel_moyen = v))
              }
            />
            <ChampNombre
              id="adr"
              label="Prix moyen par nuit (ADR)"
              unite={d.devise ?? ""}
              valeur={d.metriques.adr}
              disabled={dis}
              preuve={preuve("adr")}
              onChange={(v) => maj((x) => void (x.metriques.adr = v))}
            />
            <ChampNombre
              id="occupation"
              label="Taux d'occupation"
              mode="pourcentage"
              unite="%"
              valeur={d.metriques.occupation}
              disabled={dis}
              preuve={preuve("occupation")}
              onChange={(v) => maj((x) => void (x.metriques.occupation = v))}
            />
            <ChampNombre
              id="nuits"
              label="Nuits réservées (par an)"
              valeur={d.metriques.nuits_reservees}
              disabled={dis}
              preuve={preuve("nuits_reservees")}
              onChange={(v) =>
                maj((x) => void (x.metriques.nuits_reservees = v))
              }
            />
            <ChampNombre
              id="echantillon"
              label="Logements analysés"
              mode="entier"
              valeur={d.metriques.echantillon}
              disabled={dis}
              preuve={preuve("echantillon")}
              onChange={(v) => maj((x) => void (x.metriques.echantillon = v))}
            />
          </div>
        </Card>

        {/* Percentiles */}
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Percentiles (libellés d&apos;origine conservés)
            </h3>
            {!dis ? (
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() =>
                  maj(
                    (x) =>
                      void x.percentiles.push({
                        libelle: "",
                        rang: null,
                        metrique: "revenu_annuel",
                        valeur: null,
                      }),
                  )
                }
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            ) : null}
          </div>
          {d.percentiles.length ? (
            <div className="space-y-2">
              {d.percentiles.map((pc, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1.2fr)_4.5rem_minmax(0,1.3fr)_minmax(0,1fr)_auto] items-end gap-2"
                >
                  <ChampTexte
                    id={`pl${i}`}
                    label="Libellé"
                    valeur={pc.libelle}
                    disabled={dis}
                    onChange={(v) =>
                      maj(
                        (x) => void (x.percentiles[i].libelle = v.slice(0, 80)),
                      )
                    }
                  />
                  <ChampNombre
                    id={`pr${i}`}
                    label="Rang"
                    mode="entier"
                    compact
                    valeur={pc.rang}
                    disabled={dis}
                    onChange={(v) =>
                      maj(
                        (x) =>
                          void (x.percentiles[i].rang =
                            v !== null && v >= 1 && v <= 99 ? v : null),
                      )
                    }
                  />
                  <div className="space-y-1">
                    <label
                      htmlFor={`pm${i}`}
                      className="block text-[0.82rem] font-medium"
                    >
                      Métrique
                    </label>
                    <Select
                      id={`pm${i}`}
                      className="h-10 text-sm"
                      disabled={dis}
                      value={pc.metrique}
                      onChange={(e) =>
                        maj(
                          (x) =>
                            void (x.percentiles[i].metrique = e.target
                              .value as (typeof METRIQUES_PERCENTILE)[number]),
                        )
                      }
                    >
                      {METRIQUES_PERCENTILE.map((m) => (
                        <option key={m} value={m}>
                          {LIBELLE_METRIQUE[m]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <ChampNombre
                    id={`pv${i}`}
                    label="Valeur"
                    compact
                    valeur={pc.valeur}
                    disabled={dis}
                    onChange={(v) =>
                      maj((x) => void (x.percentiles[i].valeur = v))
                    }
                  />
                  {!dis ? (
                    <button
                      type="button"
                      aria-label="Retirer"
                      className={buttonClass("ghost", "sm", "mb-0.5 h-9 px-2")}
                      onClick={() =>
                        maj((x) => void x.percentiles.splice(i, 1))
                      }
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              {!dis &&
              d.percentiles.filter(
                (x) => x.valeur !== null && x.metrique === "revenu_annuel",
              ).length >= 2 ? (
                <div className="flex flex-wrap items-end gap-2 rounded-lg bg-sunken/60 p-2 text-sm">
                  <span className="text-ink-2">
                    Utiliser comme fourchette :
                  </span>
                  <div className="w-40">
                    <Select
                      aria-label="Percentile bas"
                      className="h-9 text-sm"
                      value={bas}
                      onChange={(e) => setBas(e.target.value)}
                    >
                      <option value="">bas…</option>
                      {d.percentiles.map((x, i) =>
                        x.metrique === "revenu_annuel" && x.valeur !== null ? (
                          <option key={i} value={i}>
                            {x.libelle || `#${i + 1}`}
                          </option>
                        ) : null,
                      )}
                    </Select>
                  </div>
                  <div className="w-40">
                    <Select
                      aria-label="Percentile haut"
                      className="h-9 text-sm"
                      value={haut}
                      onChange={(e) => setHaut(e.target.value)}
                    >
                      <option value="">haut…</option>
                      {d.percentiles.map((x, i) =>
                        x.metrique === "revenu_annuel" && x.valeur !== null ? (
                          <option key={i} value={i}>
                            {x.libelle || `#${i + 1}`}
                          </option>
                        ) : null,
                      )}
                    </Select>
                  </div>
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={utiliserPercentiles}
                  >
                    Appliquer
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-ink-3">Aucun percentile.</p>
          )}
        </Card>

        {/* Revenus mensuels */}
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Revenus mensuels (valeurs écrites uniquement)
            </h3>
          </div>
          {d.mensuels.length ? (
            <div className="space-y-2">
              {d.mensuels.map((m, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[6rem_5rem_minmax(0,1fr)_8rem_auto] items-end gap-1.5"
                >
                  <Select
                    aria-label="Mois"
                    className="h-9 text-sm"
                    disabled={dis}
                    value={m.mois}
                    onChange={(e) =>
                      maj(
                        (x) =>
                          void (x.mensuels[i].mois =
                            lireMois(e.target.value) ?? x.mensuels[i].mois),
                      )
                    }
                  >
                    {MOIS.map((nom, k) => (
                      <option key={nom} value={k + 1}>
                        {nom}
                      </option>
                    ))}
                  </Select>
                  <Input
                    aria-label="Année"
                    inputMode="numeric"
                    className="h-9 text-sm"
                    disabled={dis}
                    value={m.annee ?? ""}
                    placeholder="année"
                    onChange={(e) =>
                      maj(
                        (x) =>
                          void (x.mensuels[i].annee = /^\d{4}$/.test(
                            e.target.value,
                          )
                            ? Number(e.target.value)
                            : null),
                      )
                    }
                  />
                  <ChampNombre
                    id={`mv${i}`}
                    label=""
                    compact
                    valeur={m.valeur}
                    disabled={dis}
                    onChange={(v) =>
                      maj((x) =>
                        v === null
                          ? void x.mensuels.splice(i, 1)
                          : void (x.mensuels[i].valeur = v),
                      )
                    }
                  />
                  <Select
                    aria-label="Nature"
                    className="h-9 text-sm"
                    disabled={dis}
                    value={m.nature}
                    onChange={(e) =>
                      maj(
                        (x) =>
                          void (x.mensuels[i].nature = e.target.value as
                            | "historique"
                            | "prevision"
                            | "inconnu"),
                      )
                    }
                  >
                    <option value="historique">historique</option>
                    <option value="prevision">prévision</option>
                    <option value="inconnu">inconnue</option>
                  </Select>
                  {!dis ? (
                    <button
                      type="button"
                      aria-label="Retirer"
                      className={buttonClass("ghost", "sm", "h-9 px-2")}
                      onClick={() => maj((x) => void x.mensuels.splice(i, 1))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-3">
              Aucune valeur mensuelle lisible : la saisonnalité ne sera pas
              affichée dans les estimations.
            </p>
          )}
          {!dis ? (
            <AjoutMois onAjout={(m) => maj((x) => void x.mensuels.push(m))} />
          ) : null}
        </Card>

        {/* Comparables */}
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Annonces comparables ({d.comparables.length})
            </h3>
            {!dis ? (
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() =>
                  maj((x) => void x.comparables.push(comparableVide()))
                }
              >
                <Plus className="h-4 w-4" /> Ajouter
              </button>
            ) : null}
          </div>
          {d.comparables.map((c, i) => (
            <details
              key={i}
              className="rounded-xl border border-line p-3"
              open={!c.nom}
            >
              <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {c.nom || `Annonce ${i + 1}`}
                </span>
                {c.capture ? <Badge>capture {c.capture}</Badge> : null}
                {!c.affichable ? (
                  <Badge ton="attention">non affichée</Badge>
                ) : null}
                {c.chambres !== null &&
                d.segment.chambres !== null &&
                c.chambres !== d.segment.chambres ? (
                  <Badge ton="attention">{c.chambres} ch.</Badge>
                ) : null}
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <ChampTexte
                  id={`cn${i}`}
                  label="Titre"
                  valeur={c.nom}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].nom = v.slice(0, 200)))
                  }
                />
                <ChampTexte
                  id={`cq${i}`}
                  label="Quartier"
                  valeur={c.quartier}
                  disabled={dis}
                  onChange={(v) =>
                    maj(
                      (x) => void (x.comparables[i].quartier = v.slice(0, 120)),
                    )
                  }
                />
                <ChampTexte
                  id={`ct${i}`}
                  label="Type"
                  valeur={c.type_logement}
                  disabled={dis}
                  onChange={(v) =>
                    maj(
                      (x) =>
                        void (x.comparables[i].type_logement = v.slice(0, 60)),
                    )
                  }
                />
                <ChampNombre
                  id={`cc${i}`}
                  label="Chambres"
                  mode="entier"
                  compact
                  valeur={c.chambres}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].chambres = v))
                  }
                />
                <ChampNombre
                  id={`ck${i}`}
                  label="Capacité"
                  mode="entier"
                  compact
                  valeur={c.capacite}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].capacite = v))
                  }
                />
                <ChampNombre
                  id={`ca${i}`}
                  label="Revenu annuel"
                  compact
                  valeur={c.revenu_annuel}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].revenu_annuel = v))
                  }
                />
                <ChampNombre
                  id={`cb${i}`}
                  label="Revenu annuel bas"
                  compact
                  valeur={c.revenu_annuel_bas}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].revenu_annuel_bas = v))
                  }
                />
                <ChampNombre
                  id={`ch${i}`}
                  label="Revenu annuel haut"
                  compact
                  valeur={c.revenu_annuel_haut}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].revenu_annuel_haut = v))
                  }
                />
                <ChampNombre
                  id={`cd${i}`}
                  label="Prix moyen / nuit"
                  compact
                  valeur={c.adr}
                  disabled={dis}
                  onChange={(v) => maj((x) => void (x.comparables[i].adr = v))}
                />
                <ChampNombre
                  id={`co${i}`}
                  label="Occupation"
                  mode="pourcentage"
                  unite="%"
                  compact
                  valeur={c.occupation}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].occupation = v))
                  }
                />
                <ChampNombre
                  id={`cr${i}`}
                  label="Note (sur 5)"
                  compact
                  valeur={c.note}
                  disabled={dis}
                  onChange={(v) =>
                    maj(
                      (x) =>
                        void (x.comparables[i].note =
                          v !== null && v <= 5 ? v : null),
                    )
                  }
                />
                <ChampNombre
                  id={`cv${i}`}
                  label="Nombre d'avis"
                  mode="entier"
                  compact
                  valeur={c.nb_avis}
                  disabled={dis}
                  onChange={(v) =>
                    maj((x) => void (x.comparables[i].nb_avis = v))
                  }
                />
                <div className="sm:col-span-2">
                  <ChampTexte
                    id={`cu${i}`}
                    label="Lien de l'annonce (https)"
                    valeur={c.url}
                    disabled={dis}
                    placeholder="https://www.airbnb.com/rooms/…"
                    onChange={(v) =>
                      maj(
                        (x) =>
                          void (x.comparables[i].url = v.trim().slice(0, 500)),
                      )
                    }
                  />
                  {c.url && !/^https:\/\/[^\s]+$/.test(c.url) ? (
                    <p className="text-xs text-danger">
                      Adresse https complète attendue.
                    </p>
                  ) : null}
                </div>
                <ChampTexte
                  id={`ci${i}`}
                  label="Identifiant"
                  valeur={c.identifiant}
                  disabled={dis}
                  onChange={(v) =>
                    maj(
                      (x) =>
                        void (x.comparables[i].identifiant = v.slice(0, 100)),
                    )
                  }
                />
                <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={dis}
                      checked={c.affichable}
                      onChange={(e) =>
                        maj(
                          (x) =>
                            void (x.comparables[i].affichable =
                              e.target.checked),
                        )
                      }
                    />{" "}
                    Peut être montrée dans les estimations
                  </label>
                  {!dis ? (
                    <button
                      type="button"
                      className={buttonClass("danger", "sm")}
                      onClick={() =>
                        maj((x) => void x.comparables.splice(i, 1))
                      }
                    >
                      <Trash2 className="h-4 w-4" /> Retirer
                    </button>
                  ) : null}
                </div>
              </div>
            </details>
          ))}
          {!d.comparables.length ? (
            <p className="text-sm text-ink-3">Aucune annonce comparable.</p>
          ) : null}
        </Card>

        {d.parametres_recherche.length || d.infos_frais || d.autres.length ? (
          <Card className="space-y-2 p-4 text-sm">
            <h3 className="font-semibold">Autres informations lues</h3>
            {d.parametres_recherche.length ? (
              <p className="text-ink-2">
                Paramètres de recherche :{" "}
                {d.parametres_recherche
                  .map((x) => `${x.libelle} : ${x.valeur}`)
                  .join(" · ")}
              </p>
            ) : null}
            {d.infos_frais ? (
              <p className="text-ink-2">Frais : {d.infos_frais}</p>
            ) : null}
            {d.autres.length ? (
              <p className="text-ink-2">
                Autres indicateurs :{" "}
                {d.autres
                  .map(
                    (x) =>
                      `${x.libelle} : ${x.valeur ?? "illisible"} ${x.unite}`,
                  )
                  .join(" · ")}
              </p>
            ) : null}
          </Card>
        ) : null}

        {!lecture ? (
          <Card className="sticky bottom-3 z-10 space-y-3 p-4 shadow-lg">
            <Textarea
              aria-label="Note de validation"
              placeholder="Note interne (facultatif) : vérifications faites, réserves…"
              className="min-h-12 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={enCours || !peutValider}
                onClick={() => valider()}
                className={buttonClass("primary", "md")}
              >
                {enCours ? <Spinner /> : <CheckCircle2 className="h-4 w-4" />}{" "}
                Valider ces données
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={brouillon}
                className={buttonClass("secondary", "md")}
              >
                <Save className="h-4 w-4" /> Enregistrer le brouillon
              </button>
              <button
                type="button"
                disabled={enCours}
                onClick={abandonner}
                className={buttonClass("ghost", "md")}
              >
                Abandonner
              </button>
            </div>
            {!peutValider ? (
              <p className="text-xs text-ink-3">
                La validation s&apos;active quand les champs requis sont
                remplis, le quartier reconnu et aucune incohérence bloquante.
              </p>
            ) : null}
          </Card>
        ) : null}
      </section>
    </div>
  );
}
