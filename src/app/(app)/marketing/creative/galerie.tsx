"use client";

import { Download, ImageOff, ImagePlus, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { libelleType, statutCreative, STATUTS_CREATIVE, TYPES_IMAGE } from "@/lib/creative";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { enregistrerCreative, preparerEnvoiImage } from "./actions";
import { lienAngle } from "./elements";
import type { Creative } from "./donnees";

type Choix = { id: string; code: string; nom: string };
const FORMATS = "image/png,image/jpeg,image/webp";

/** Lien de téléchargement : l'adresse temporaire, avec le nom de fichier voulu. */
const telechargement = (c: Creative) => (c.imageUrl ? `${c.imageUrl}&download=${encodeURIComponent(`${c.code}.${c.imageChemin.split(".").pop() || "png"}`)}` : "#");

/** Galerie d'images publicitaires : aperçu, téléchargement, métadonnées, archivage, ajout. */
export function Galerie({ creatives, angles, modifiable, angleFixe, vide }: { creatives: Creative[]; angles: Choix[]; modifiable: boolean; angleFixe?: string; vide?: React.ReactNode }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [courante, setCourante] = useState<Creative | null>(null);
  const [cle, setCle] = useState(0);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const ouvrir = (c: Creative | null) => {
    setCourante(c);
    setFichier(null);
    setErreur("");
    setCle((k) => k + 1);
    boite.current?.showModal();
  };

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const t = (n: string) => String(f.get(n) ?? "");
    setErreur("");
    demarrer(async () => {
      try {
        let imageChemin: string | undefined;
        if (fichier) {
          const prep = await preparerEnvoiImage({ nomFichier: fichier.name, taille: fichier.size, type: fichier.type });
          if ("erreur" in prep) return setErreur(prep.erreur);
          await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, fichier);
          imageChemin = prep.chemin;
        }
        const r = await enregistrerCreative({ id: courante?.id, angleId: angleFixe ?? t("angle"), type: t("type"), hook: t("hook"), prompt: t("prompt"), statut: t("statut"), metaAdId: t("meta"), notes: t("notes"), imageChemin });
        if (r?.erreur) return setErreur(r.erreur);
        boite.current?.close();
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "L'image n'a pas pu être enregistrée.");
      }
    });
  }

  const titre = courante ? courante.code : "Nouvelle image";
  const lecture = !modifiable;
  return (
    <div className="space-y-4">
      {modifiable ? (
        <button type="button" onClick={() => ouvrir(null)} disabled={!angles.length} className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Nouvelle image
        </button>
      ) : null}
      {modifiable && !angles.length ? <Notice ton="info">Créez d&apos;abord un angle : chaque image appartient à un angle.</Notice> : null}

      {creatives.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {creatives.map((c, i) => {
            const s = statutCreative(c.statut);
            return (
              <li key={c.id} className="enter" style={{ "--i": i } as React.CSSProperties}>
                <button type="button" onClick={() => ouvrir(c)} className="press block w-full rounded-2xl text-left focus-visible:outline-2" aria-label={`Ouvrir ${c.code}`}>
                  <Card className={cn("overflow-hidden transition-shadow hover:shadow-pop", c.statut === "archivee" && "opacity-60")}>
                    <div className="relative aspect-square bg-sunken">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire du stockage privé
                        <img src={c.imageUrl} alt={c.hook || c.code} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span className="grid h-full place-items-center text-ink-3">
                          <ImageOff className="h-8 w-8" />
                        </span>
                      )}
                      <Badge ton={s.ton} className="absolute top-2 left-2 shadow-card">
                        {s.label}
                      </Badge>
                    </div>
                    <div className="p-3">
                      <p className="num truncate text-xs font-medium tracking-wide text-ink-3">{c.code}</p>
                      <p className="mt-0.5 truncate text-sm font-medium">{libelleType(c.type)}</p>
                      <p className="mt-0.5 truncate text-[0.8rem] text-ink-3">{c.metaAdId ? "Annonce Meta associée" : "Pas encore d'annonce Meta"}</p>
                    </div>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        vide
      )}

      <dialog ref={boite} aria-label={titre} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{titre}</h2>
          <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={soumettre} key={cle} className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-line bg-sunken">
              {fichier ? (
                <p className="px-4 text-center text-sm text-ink-2">Nouvelle image prête : {fichier.name}</p>
              ) : courante?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- adresse temporaire du stockage privé
                <img src={courante.imageUrl} alt={courante.hook || courante.code} className="h-full w-full object-contain" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-ink-3">
                  <ImageOff className="h-8 w-8" />
                  <span className="text-sm">Aucune image</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {courante?.imageUrl ? (
                <a href={telechargement(courante)} className={buttonClass("secondary", "sm")}>
                  <Download className="h-4 w-4" /> Télécharger
                </a>
              ) : null}
              {modifiable ? (
                <label className={cn(buttonClass("secondary", "sm"), "cursor-pointer")}>
                  <ImagePlus className="h-4 w-4" /> {courante?.imageUrl ? "Remplacer l'image" : "Choisir l'image"}
                  <input type="file" accept={FORMATS} className="sr-only" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
                </label>
              ) : null}
            </div>
            <p className="text-[0.82rem] text-ink-3">Image fixe uniquement : PNG, JPG ou WebP, 15 Mo au maximum.</p>
            {courante ? (
              <p className="text-sm text-ink-2">
                Angle :{" "}
                <Link href={lienAngle(courante.angleId)} className="font-medium text-wine-700 underline underline-offset-4">
                  {courante.angleCode} · {courante.angleNom}
                </Link>
                <br />
                Créée le {new Date(courante.creeLe).toLocaleDateString("fr-FR", { timeZone: "Africa/Casablanca" })} · version {courante.version}
              </p>
            ) : null}
          </div>

          <fieldset disabled={lecture} className="min-w-0 space-y-4">
            {courante ? (
              <Field label="Type d'image" htmlFor="c-type-lu">
                <Input id="c-type-lu" value={libelleType(courante.type)} readOnly disabled />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {angleFixe ? null : (
                  <Field label="Angle" htmlFor="c-angle">
                    <Select id="c-angle" name="angle" required defaultValue="">
                      <option value="" disabled>
                        Choisir
                      </option>
                      {angles.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} · {a.nom}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Type d'image" htmlFor="c-type" className={angleFixe ? "sm:col-span-2" : undefined}>
                  <Select id="c-type" name="type" required defaultValue="">
                    <option value="" disabled>
                      Choisir
                    </option>
                    {TYPES_IMAGE.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}
            <Field label="Hook affiché sur l'image" htmlFor="c-hook">
              <Input id="c-hook" name="hook" defaultValue={courante?.hook} maxLength={300} autoComplete="off" />
            </Field>
            <Field label="Prompt de génération" htmlFor="c-prompt" hint="Le texte donné à Higgsfield pour produire cette image.">
              <Textarea id="c-prompt" name="prompt" defaultValue={courante?.prompt} maxLength={6000} className="min-h-32 text-sm" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Statut" htmlFor="c-statut">
                <Select id="c-statut" name="statut" defaultValue={courante?.statut ?? "brouillon"}>
                  {STATUTS_CREATIVE.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Meta Ad ID" htmlFor="c-meta" hint="À copier depuis Meta Ads Manager une fois l'annonce publiée.">
                <Input id="c-meta" name="meta" defaultValue={courante?.metaAdId ?? ""} inputMode="numeric" autoComplete="off" placeholder="120210000000000000" className="num" />
              </Field>
            </div>
            <Field label="Notes (facultatif)" htmlFor="c-notes">
              <Input id="c-notes" name="notes" defaultValue={courante?.notes} maxLength={1000} autoComplete="off" />
            </Field>
            {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
            {modifiable ? (
              <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
                {enCours ? <Spinner /> : null} {courante ? "Enregistrer" : "Créer l'image"}
              </button>
            ) : null}
          </fieldset>
        </form>
      </dialog>
    </div>
  );
}
