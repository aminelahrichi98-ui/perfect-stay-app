"use client";

import { ArrowLeft, ArrowRight, Check, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { envoyerVersStockage } from "@/lib/envoi-client";
import {
  BUCKET_ESTIMATIONS,
  brutDepuisNet,
  brutMoyen,
  CONSEILS,
  formatMad0,
  MAX_COMPARABLES,
  MAX_CONSEILS,
  MAX_PHOTOS,
  netDepuisBrut,
  parMois,
  QUARTIERS,
  STANDINGS,
  TYPES_BIEN,
  VILLES,
} from "@/lib/estimateur";
import { enregistrerEstimation, preparerPhotos } from "../actions";

type Photo = { fichier: File; apercu: string };
type ComparableSaisi = { cle: number; titre: string; quartier: string; chambres: string; brutBas: string; brutHaut: string; photo: Photo | null };

const ETAPES = ["Propriétaire", "Le bien", "Photos", "Annonces similaires", "Conseils", "Estimation"] as const;

const versNombre = (s: string) => {
  const n = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

/** Allège une photo dans le navigateur (1800 px, JPEG) : envoi rapide même en 4G, PDF léger. */
async function alleger(f: File): Promise<File> {
  const image = await createImageBitmap(f);
  const echelle = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("photo");
  return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

async function lirePhotos(fichiers: FileList | null): Promise<{ photos: Photo[]; illisibles: number }> {
  const photos: Photo[] = [];
  let illisibles = 0;
  for (const f of Array.from(fichiers ?? [])) {
    try {
      const leger = await alleger(f);
      photos.push({ fichier: leger, apercu: URL.createObjectURL(leger) });
    } catch {
      illisibles++;
    }
  }
  return { photos, illisibles };
}

function ChoixBoutons<T extends string>({ options, valeur, onChange, nom }: { options: readonly { value: T; label: string }[]; valeur: T | ""; onChange: (v: T) => void; nom: string }) {
  return (
    <div role="radiogroup" aria-label={nom} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={valeur === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press min-h-11 rounded-xl border px-4 py-2 text-sm font-medium",
            valeur === o.value ? "border-wine-600 bg-wine-50 text-wine-800" : "border-line bg-surface text-ink-2 hover:border-line-strong",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AssistantEstimation({ whatsapp }: { whatsapp: string }) {
  const [etape, setEtape] = useState(0);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();
  const [progression, setProgression] = useState("");

  // 1. Propriétaire
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  // 2. Bien
  const [ville] = useState<string>(VILLES[0]);
  const [quartier, setQuartier] = useState("");
  const [typeBien, setTypeBien] = useState<(typeof TYPES_BIEN)[number]["value"] | "">("");
  const [piscine, setPiscine] = useState<"oui" | "non" | "">("");
  const [capacite, setCapacite] = useState("");
  const [standing, setStanding] = useState<(typeof STANDINGS)[number]["value"] | "">("");
  // 3. Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const entreePhotos = useRef<HTMLInputElement>(null);
  // 4. Comparables
  const [cle, setCle] = useState(1);
  const [comparables, setComparables] = useState<ComparableSaisi[]>([{ cle: 0, titre: "", quartier: "", chambres: "", brutBas: "", brutHaut: "", photo: null }]);
  // 5. Conseils
  const [conseils, setConseils] = useState<string[]>([]);
  const [perso, setPerso] = useState("");
  const [persos, setPersos] = useState<string[]>([]);
  // 6. Ajustement
  const [netBas, setNetBas] = useState("");
  const [netHaut, setNetHaut] = useState("");
  const [ajuste, setAjuste] = useState(false);

  // Libère les aperçus des photos en quittant la page
  const apercus = useRef<string[]>([]);
  useEffect(() => {
    apercus.current = [...photos.map((p) => p.apercu), ...comparables.flatMap((c) => (c.photo ? [c.photo.apercu] : []))];
  }, [photos, comparables]);
  useEffect(() => () => apercus.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const brut = useMemo(
    () => brutMoyen(comparables.map((c) => ({ brutBas: versNombre(c.brutBas) || 0, brutHaut: versNombre(c.brutHaut) || 0 }))),
    [comparables],
  );

  // Tant qu'Amine n'a pas ajusté la fourchette, elle suit le calcul automatique
  const valeurBas = ajuste ? netBas : brut ? String(netDepuisBrut(brut.bas)) : "";
  const valeurHaut = ajuste ? netHaut : brut ? String(netDepuisBrut(brut.haut)) : "";
  function ajuster(borne: "bas" | "haut", v: string) {
    if (!ajuste) {
      setNetBas(valeurBas);
      setNetHaut(valeurHaut);
      setAjuste(true);
    }
    (borne === "bas" ? setNetBas : setNetHaut)(v);
  }

  const tousConseils = [...conseils, ...persos];

  function verifier(n: number): string {
    if (n === 0 && !prenom.trim()) return "Indiquez le prénom du propriétaire.";
    if (n === 1) {
      if (!quartier) return "Choisissez le quartier.";
      if (!typeBien) return "Choisissez le type de bien.";
      if (typeBien === "villa" && !piscine) return "Indiquez si la villa a une piscine.";
      if (capacite && !(Number.isInteger(Number(capacite)) && Number(capacite) > 0)) return "La capacité doit être un nombre de voyageurs.";
      if (!standing) return "Choisissez le standing.";
    }
    if (n === 2 && !photos.length) return "Ajoutez au moins une photo du bien.";
    if (n === 3) {
      for (const [i, c] of comparables.entries()) {
        const bas = versNombre(c.brutBas);
        const haut = versNombre(c.brutHaut);
        if (!c.titre.trim()) return `Annonce ${i + 1} : indiquez son titre.`;
        if (!(bas > 0) || !(haut > 0)) return `Annonce ${i + 1} : indiquez les revenus annuels bruts bas et haut.`;
        if (haut < bas) return `Annonce ${i + 1} : le revenu haut doit être supérieur ou égal au revenu bas.`;
      }
    }
    if (n === 4 && tousConseils.length > MAX_CONSEILS) return `Retenez ${MAX_CONSEILS} conseils au maximum.`;
    if (n === 5) {
      const b = versNombre(valeurBas);
      const h = versNombre(valeurHaut);
      if (!(b > 0) || !(h > 0)) return "Indiquez les deux bornes de la fourchette nette.";
      if (h < b) return "La borne haute doit être supérieure ou égale à la borne basse.";
    }
    return "";
  }

  function suivant() {
    const e = verifier(etape);
    setErreur(e);
    if (!e) {
      setEtape((x) => Math.min(x + 1, ETAPES.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function precedent() {
    setErreur("");
    setEtape((x) => Math.max(x - 1, 0));
  }

  async function ajouterPhotos(fichiers: FileList | null) {
    const { photos: nouvelles, illisibles } = await lirePhotos(fichiers);
    setPhotos((p) => [...p, ...nouvelles].slice(0, MAX_PHOTOS));
    setErreur(illisibles ? "Une photo n'a pas pu être lue. Utilisez une photo JPEG ou PNG." : "");
  }

  const majComparable = (k: number, champ: Partial<ComparableSaisi>) => setComparables((cs) => cs.map((c) => (c.cle === k ? { ...c, ...champ } : c)));

  function basculerConseil(texte: string) {
    setConseils((cs) => (cs.includes(texte) ? cs.filter((c) => c !== texte) : cs.length + persos.length >= MAX_CONSEILS ? cs : [...cs, texte]));
  }

  function ajouterPerso() {
    const t = perso.trim();
    if (!t || tousConseils.includes(t) || tousConseils.length >= MAX_CONSEILS) return;
    setPersos((p) => [...p, t]);
    setPerso("");
  }

  function generer() {
    for (let n = 0; n < ETAPES.length; n++) {
      const e = verifier(n);
      if (e) {
        setEtape(n);
        setErreur(e);
        return;
      }
    }
    setErreur("");
    demarrer(async () => {
      // 1. Envoi des photos (bien + annonces) dans le stockage privé
      const fichiers = [...photos.map((p) => p.fichier), ...comparables.flatMap((c) => (c.photo ? [c.photo.fichier] : []))];
      setProgression("Envoi des photos…");
      const prep = await preparerPhotos(fichiers.map((f) => ({ nom: f.name, taille: f.size })));
      if (prep.erreur || !prep.envois) {
        setProgression("");
        return setErreur(prep.erreur ?? "L'envoi des photos n'a pas pu être préparé.");
      }
      try {
        await Promise.all(prep.envois.map((e, i) => envoyerVersStockage(BUCKET_ESTIMATIONS, e.chemin, e.token, fichiers[i])));
      } catch (e) {
        setProgression("");
        return setErreur(e instanceof Error ? e.message : "L'envoi des photos a échoué.");
      }
      const chemins = prep.envois.map((e) => e.chemin);
      const cheminsBien = chemins.slice(0, photos.length);
      let k = photos.length;
      const comps = comparables.map((c) => ({
        titre: c.titre.trim(),
        quartier: c.quartier.trim(),
        chambres: Math.round(versNombre(c.chambres) || 0),
        brutBas: versNombre(c.brutBas),
        brutHaut: versNombre(c.brutHaut),
        photo: c.photo ? chemins[k++] : null,
      }));

      // 2. Enregistrement : la page d'aperçu du PDF s'ouvre ensuite
      setProgression("Préparation du PDF…");
      const nb = versNombre(valeurBas);
      const nh = versNombre(valeurHaut);
      const r = await enregistrerEstimation({
        prenom,
        telephone,
        ville,
        quartier,
        typeBien: typeBien as string,
        piscine: piscine === "oui",
        capacite: capacite ? Number(capacite) : null,
        standing: standing as string,
        photos: cheminsBien,
        comparables: comps,
        conseils: tousConseils,
        brutBas: ajuste || !brut ? brutDepuisNet(nb) : brut.bas,
        brutHaut: ajuste || !brut ? brutDepuisNet(nh) : brut.haut,
        netBas: nb,
        netHaut: nh,
      });
      if (r?.erreur) {
        setProgression("");
        setErreur(r.erreur);
      }
    });
  }

  const nb = versNombre(valeurBas);
  const nh = versNombre(valeurHaut);

  return (
    <div className="space-y-6">
      {/* Fil des étapes */}
      <ol className="flex gap-1.5" aria-label="Étapes">
        {ETAPES.map((e, i) => (
          <li key={e} className="min-w-0 flex-1">
            <span className={cn("block h-1.5 rounded-full", i <= etape ? "bg-wine-600" : "bg-line")} />
            <span className={cn("mt-1.5 hidden truncate text-[0.75rem] sm:block", i === etape ? "font-medium text-ink" : "text-ink-3")}>{e}</span>
          </li>
        ))}
      </ol>
      <h2 className="font-display text-xl font-semibold tracking-tight">
        <span className="text-ink-3">
          {etape + 1}/{ETAPES.length} ·
        </span>{" "}
        {ETAPES[etape]}
      </h2>

      {etape === 0 ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prénom du propriétaire" htmlFor="prenom">
            <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="off" autoFocus />
          </Field>
          <Field label="Téléphone (facultatif)" htmlFor="telephone" hint="Pour retrouver le contact dans l'historique.">
            <Input id="telephone" type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
          </Field>
        </div>
      ) : null}

      {etape === 1 ? (
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ville" htmlFor="ville">
              <Select id="ville" value={ville} disabled>
                {VILLES.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Quartier" htmlFor="quartier">
              <Select id="quartier" value={quartier} onChange={(e) => setQuartier(e.target.value)}>
                <option value="">Choisir…</option>
                {QUARTIERS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Type de bien</p>
            <ChoixBoutons nom="Type de bien" options={TYPES_BIEN} valeur={typeBien} onChange={setTypeBien} />
          </div>
          {typeBien === "villa" ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Piscine</p>
              <ChoixBoutons
                nom="Piscine"
                options={[
                  { value: "oui", label: "Oui" },
                  { value: "non", label: "Non" },
                ]}
                valeur={piscine}
                onChange={setPiscine}
              />
            </div>
          ) : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Capacité (voyageurs)" htmlFor="capacite">
              <Input id="capacite" inputMode="numeric" pattern="[0-9]*" value={capacite} onChange={(e) => setCapacite(e.target.value)} placeholder="4" className="num" />
            </Field>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Standing</p>
            <ChoixBoutons nom="Standing" options={STANDINGS} valeur={standing} onChange={setStanding} />
          </div>
        </div>
      ) : null}

      {etape === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">De 1 à {MAX_PHOTOS} photos. La première sert de couverture au PDF : touchez une autre photo pour la mettre en premier.</p>
          <input ref={entreePhotos} type="file" accept="image/*" multiple hidden onChange={(e) => ajouterPhotos(e.target.files).then(() => (e.target.value = ""))} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={p.apercu} className="relative">
                <button
                  type="button"
                  onClick={() => setPhotos((ps) => [ps[i], ...ps.filter((_, j) => j !== i)])}
                  className={cn("block aspect-[4/3] w-full overflow-hidden rounded-xl border-2", i === 0 ? "border-wine-600" : "border-transparent")}
                  aria-label={i === 0 ? "Photo de couverture" : "Utiliser comme couverture"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.apercu} alt="" className="h-full w-full object-cover" />
                </button>
                {i === 0 ? <span className="absolute bottom-2 left-2 rounded-full bg-wine-700 px-2 py-0.5 text-[0.7rem] font-medium text-white">Couverture</span> : null}
                <button
                  type="button"
                  onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                  aria-label="Retirer la photo"
                  className="press absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                onClick={() => entreePhotos.current?.click()}
                className="press grid aspect-[4/3] place-items-center rounded-xl border border-dashed border-line-strong text-sm text-ink-2 hover:border-wine-500 hover:text-wine-700"
              >
                <span className="flex flex-col items-center gap-1.5">
                  <ImagePlus className="h-6 w-6" /> Ajouter
                </span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {etape === 3 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">De 1 à {MAX_COMPARABLES} annonces relevées sur PriceLabs Estimator Pro. Revenus annuels bruts, en MAD.</p>
          {comparables.map((c, i) => (
            <fieldset key={c.cle} className="space-y-4 rounded-2xl border border-line p-4">
              <legend className="flex w-full items-center justify-between px-1 text-sm font-medium">
                Annonce {i + 1}
                {comparables.length > 1 ? (
                  <button type="button" onClick={() => setComparables((cs) => cs.filter((x) => x.cle !== c.cle))} className="press inline-flex h-9 items-center gap-1 rounded-lg px-2 text-ink-3 hover:text-danger">
                    <Trash2 className="h-4 w-4" /> Retirer
                  </button>
                ) : null}
              </legend>
              <Field label="Titre de l'annonce" htmlFor={`titre-${c.cle}`}>
                <Input id={`titre-${c.cle}`} value={c.titre} onChange={(e) => majComparable(c.cle, { titre: e.target.value })} placeholder="Appartement lumineux avec terrasse" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Quartier" htmlFor={`quartier-${c.cle}`}>
                  <Input id={`quartier-${c.cle}`} value={c.quartier} onChange={(e) => majComparable(c.cle, { quartier: e.target.value })} placeholder={quartier || "Maarif"} />
                </Field>
                <Field label="Chambres" htmlFor={`chambres-${c.cle}`}>
                  <Input id={`chambres-${c.cle}`} inputMode="numeric" pattern="[0-9]*" value={c.chambres} onChange={(e) => majComparable(c.cle, { chambres: e.target.value })} placeholder="2" className="num" />
                </Field>
                <Field label="Revenu annuel brut bas (MAD)" htmlFor={`bas-${c.cle}`}>
                  <Input id={`bas-${c.cle}`} inputMode="decimal" value={c.brutBas} onChange={(e) => majComparable(c.cle, { brutBas: e.target.value })} placeholder="120 000" className="num" />
                </Field>
                <Field label="Revenu annuel brut haut (MAD)" htmlFor={`haut-${c.cle}`}>
                  <Input id={`haut-${c.cle}`} inputMode="decimal" value={c.brutHaut} onChange={(e) => majComparable(c.cle, { brutHaut: e.target.value })} placeholder="160 000" className="num" />
                </Field>
              </div>
              <div className="flex items-center gap-3">
                {c.photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.photo.apercu} alt="" className="h-16 w-24 rounded-lg object-cover" />
                    <button type="button" onClick={() => majComparable(c.cle, { photo: null })} className="press text-sm text-ink-3 hover:text-danger">
                      Retirer la photo
                    </button>
                  </>
                ) : (
                  <label className="press inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-sm text-ink-2 hover:border-wine-500 hover:text-wine-700">
                    <ImagePlus className="h-4 w-4" /> Photo de l&apos;annonce (facultatif)
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={async (e) => {
                        const { photos: p } = await lirePhotos(e.target.files);
                        if (p[0]) majComparable(c.cle, { photo: p[0] });
                        else setErreur("Cette photo n'a pas pu être lue. Utilisez une photo JPEG ou PNG.");
                      }}
                    />
                  </label>
                )}
              </div>
            </fieldset>
          ))}
          {comparables.length < MAX_COMPARABLES ? (
            <button
              type="button"
              onClick={() => {
                setComparables((cs) => [...cs, { cle, titre: "", quartier: "", chambres: "", brutBas: "", brutHaut: "", photo: null }]);
                setCle((k) => k + 1);
              }}
              className={buttonClass("secondary", "md")}
            >
              <Plus className="h-4 w-4" /> Ajouter une annonce
            </button>
          ) : null}
        </div>
      ) : null}

      {etape === 4 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">
            Cochez jusqu&apos;à {MAX_CONSEILS} conseils pour le PDF ({tousConseils.length}/{MAX_CONSEILS}).
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {CONSEILS.map((c) => {
              const coche = conseils.includes(c.texte);
              const plein = !coche && tousConseils.length >= MAX_CONSEILS;
              return (
                <li key={c.id}>
                  <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm", coche ? "border-wine-600 bg-wine-50" : "border-line", plein && "opacity-50")}>
                    <input type="checkbox" checked={coche} disabled={plein} onChange={() => basculerConseil(c.texte)} className="h-5 w-5 shrink-0" />
                    {c.texte}
                  </label>
                </li>
              );
            })}
            {persos.map((p) => (
              <li key={p}>
                <span className="flex min-h-12 items-center gap-3 rounded-xl border border-wine-600 bg-wine-50 px-3.5 py-2.5 text-sm">
                  <Check className="h-5 w-5 shrink-0 text-wine-700" />
                  <span className="flex-1">{p}</span>
                  <button type="button" onClick={() => setPersos((ps) => ps.filter((x) => x !== p))} aria-label="Retirer ce conseil" className="press grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:text-danger">
                    <X className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input
              value={perso}
              onChange={(e) => setPerso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouterPerso();
                }
              }}
              placeholder="Conseil personnalisé…"
              aria-label="Conseil personnalisé"
              disabled={tousConseils.length >= MAX_CONSEILS}
            />
            <button type="button" onClick={ajouterPerso} disabled={!perso.trim() || tousConseils.length >= MAX_CONSEILS} className={buttonClass("secondary", "md", "shrink-0")}>
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
        </div>
      ) : null}

      {etape === 5 ? (
        <div className="space-y-5">
          {brut ? (
            <div className="rounded-2xl border border-line bg-sunken/60 p-4 text-sm">
              <p className="text-ink-2">{comparables.length > 1 ? `Moyenne des ${comparables.length} annonces` : "Annonce comparable"} : revenus bruts annuels</p>
              <p className="num mt-1 font-display text-lg font-semibold">
                {formatMad0(brut.bas)} – {formatMad0(brut.haut)} MAD
              </p>
              <p className="mt-2 text-[0.82rem] text-ink-3">Net propriétaire = brut × 0,82 (frais plateforme et TVA) × 0,80 (commission Perfect Stay 20 %).</p>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Net propriétaire bas (MAD/an)" htmlFor="net-bas">
              <Input
                id="net-bas"
                inputMode="decimal"
                value={valeurBas}
                onChange={(e) => ajuster("bas", e.target.value)}
                className="num"
              />
            </Field>
            <Field label="Net propriétaire haut (MAD/an)" htmlFor="net-haut">
              <Input
                id="net-haut"
                inputMode="decimal"
                value={valeurHaut}
                onChange={(e) => ajuster("haut", e.target.value)}
                className="num"
              />
            </Field>
          </div>
          {ajuste && brut ? (
            <button type="button" onClick={() => setAjuste(false)} className="press text-sm text-wine-700 underline underline-offset-4">
              Revenir au calcul automatique
            </button>
          ) : null}
          {nb > 0 && nh >= nb ? (
            <div className="rounded-2xl bg-aub-900 p-5 text-white">
              <p className="text-sm text-aub-200">Fourchette nette pour {prenom || "le propriétaire"}</p>
              <p className="num mt-1 font-display text-3xl font-semibold tracking-tight">
                {formatMad0(parMois(nb))} – {formatMad0(parMois(nh))} <span className="text-lg font-medium text-aub-200">MAD/mois</span>
              </p>
              <p className="num mt-1 text-aub-200">
                soit {formatMad0(nb)} – {formatMad0(nh)} MAD/an
              </p>
            </div>
          ) : null}
          {!whatsapp ? (
            <Notice ton="info">
              Le numéro WhatsApp du PDF vient de <strong>Paramètres › Entreprise › Téléphone</strong>, qui est vide pour l&apos;instant. Renseignez-le pour qu&apos;il apparaisse dans le bloc final.
            </Notice>
          ) : null}
        </div>
      ) : null}

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-between">
        {etape > 0 ? (
          <button type="button" onClick={precedent} disabled={enCours} className={buttonClass("ghost", "md")}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        ) : (
          <span />
        )}
        {etape < ETAPES.length - 1 ? (
          <button type="button" onClick={suivant} className={buttonClass("primary", "md")}>
            Continuer <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={generer} disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
            {enCours ? <Spinner /> : null} {enCours ? progression || "Patientez…" : "Générer le PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
