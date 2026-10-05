"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Notice, Spinner } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { enregistrerPhoto, preparerEnvoi, supprimerPhoto } from "./actions";

type Photo = { id: string; url: string; vignette: string };

export function PhotosLogement({ logementId, photos, modifiable }: { logementId: string; photos: Photo[]; modifiable: boolean }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const entree = useRef<HTMLInputElement>(null);
  const feuille = useRef<HTMLDialogElement>(null);
  const [courante, setCourante] = useState(0);
  const [envoi, setEnvoi] = useState<{ total: number; fait: number } | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [suppression, setSuppression] = useState(false);

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    const liste = Array.from(fichiers);
    setErreurs([]);
    setEnvoi({ total: liste.length, fait: 0 });
    const problemes: string[] = [];
    for (const f of liste) {
      try {
        const prep = await preparerEnvoi({ logementId, nature: "photo", nomFichier: f.name, taille: f.size });
        if ("erreur" in prep) throw new Error(prep.erreur);
        await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, f);
        const r = await enregistrerPhoto(logementId, prep.chemin);
        if (r?.erreur) throw new Error(r.erreur);
      } catch (e) {
        problemes.push(`${f.name} : ${e instanceof Error ? e.message : "échec de l'envoi"}`);
      }
      setEnvoi((p) => (p ? { ...p, fait: p.fait + 1 } : p));
    }
    setErreurs(problemes);
    setEnvoi(null);
    if (entree.current) entree.current.value = "";
    demarrer(() => router.refresh());
  }

  const ouvrir = (i: number) => {
    setCourante(i);
    feuille.current?.showModal();
  };
  const aller = (delta: number) => setCourante((c) => (c + delta + photos.length) % photos.length);

  async function retirer() {
    const photo = photos[courante];
    if (!photo) return;
    setSuppression(true);
    const r = await supprimerPhoto(photo.id);
    setSuppression(false);
    if (r?.erreur) {
      setErreurs([r.erreur]);
      return;
    }
    feuille.current?.close();
    demarrer(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => ouvrir(i)}
                className="press group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-sunken"
                aria-label={`Agrandir la photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.vignette} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-out)] group-hover:scale-[1.03]" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-3">
          Aucune photo pour le moment.{modifiable ? " Ajoutez-en depuis votre téléphone ou votre ordinateur." : ""}
        </p>
      )}

      {modifiable ? (
        <div>
          <input ref={entree} type="file" accept="image/*" multiple hidden onChange={(e) => envoyer(e.target.files)} />
          <button
            type="button"
            disabled={!!envoi}
            onClick={() => entree.current?.click()}
            className="press inline-flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 font-medium shadow-card hover:bg-sunken disabled:opacity-60"
          >
            {envoi ? <Spinner /> : <ImagePlus className="h-4 w-4" />}
            {envoi ? `Envoi ${Math.min(envoi.fait + 1, envoi.total)} sur ${envoi.total}…` : "Ajouter des photos"}
          </button>
        </div>
      ) : null}
      {erreurs.length ? (
        <Notice ton="danger">
          {erreurs.map((e) => (
            <span key={e} className="block">
              {e}
            </span>
          ))}
        </Notice>
      ) : null}

      <dialog
        ref={feuille}
        aria-label="Photo du logement"
        onClick={(e) => e.target === feuille.current && feuille.current?.close()}
        className="visionneuse m-auto max-h-[100dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-aub-950/90 md:max-w-5xl"
      >
        {photos[courante] ? (
          <div className="relative flex h-[100dvh] flex-col items-center justify-center md:h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[courante].url} alt={`Photo ${courante + 1} sur ${photos.length}`} className="max-h-[80dvh] w-auto max-w-full rounded-none object-contain md:rounded-xl" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 text-white">
              <span className="num rounded-full bg-black/40 px-3 py-1 text-sm">
                {courante + 1} / {photos.length}
              </span>
              <div className="flex gap-2">
                {modifiable ? (
                  <button
                    type="button"
                    onClick={retirer}
                    disabled={suppression}
                    aria-label="Supprimer cette photo"
                    className="press grid h-11 w-11 place-items-center rounded-full bg-black/40 hover:bg-danger"
                  >
                    {suppression ? <Spinner /> : <Trash2 className="h-5 w-5" />}
                  </button>
                ) : null}
                <button type="button" onClick={() => feuille.current?.close()} aria-label="Fermer" className="press grid h-11 w-11 place-items-center rounded-full bg-black/40 hover:bg-white/20">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {photos.length > 1 ? (
              <>
                <button type="button" onClick={() => aller(-1)} aria-label="Photo précédente" className="press absolute top-1/2 left-2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-white/20">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button type="button" onClick={() => aller(1)} aria-label="Photo suivante" className="press absolute top-1/2 right-2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-white/20">
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
