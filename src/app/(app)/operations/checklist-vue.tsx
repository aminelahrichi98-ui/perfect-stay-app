"use client";

import { Camera, Check, MessageSquare, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClass, Notice, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { formatDateHeure } from "@/lib/format";
import { progression } from "@/lib/operations";
import { cocherPoint, noterPoint, terminerChecklist } from "./check-lists/actions";
import { enregistrerPhotoOps, preparerPhotoOps, supprimerPhotoOps } from "./photos-actions";

export type PhotoVue = { id: string; url: string; vignette: string; pris_le: string };
export type PointVue = { id: string; libelle: string; photo_requise: boolean; fait: boolean; fait_le: string | null; note: string; photos: PhotoVue[] };

/** Boutons « prendre une photo » + vignettes ; envoie vers le stockage privé puis grave la date et l'heure sur l'image. */
function Photos({
  cible,
  id,
  pointId,
  photos,
  modifiable,
  libelle,
  onErreur,
}: {
  cible: "checklist" | "incident";
  id: string;
  pointId?: string;
  photos: PhotoVue[];
  modifiable: boolean;
  libelle: string;
  onErreur: (m: string) => void;
}) {
  const router = useRouter();
  const entree = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(0);
  const [, demarrer] = useTransition();

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    onErreur("");
    for (const f of Array.from(fichiers)) {
      setEnvoi((n) => n + 1);
      try {
        const prep = await preparerPhotoOps({ cible, id, nomFichier: f.name, taille: f.size });
        if ("erreur" in prep) throw new Error(prep.erreur);
        await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, f);
        const r = await enregistrerPhotoOps({ cible, id, chemin: prep.chemin, pointId });
        if (r?.erreur) throw new Error(r.erreur);
      } catch (e) {
        onErreur(e instanceof Error ? e.message : "L'envoi de la photo a échoué.");
      }
      setEnvoi((n) => n - 1);
    }
    if (entree.current) entree.current.value = "";
    demarrer(() => router.refresh());
  }

  async function retirer(photoId: string) {
    const r = await supprimerPhotoOps(cible, photoId);
    if (r?.erreur) onErreur(r.erreur);
    demarrer(() => router.refresh());
  }

  return (
    <div className="space-y-2">
      {photos.length ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <li key={p.id} className="group relative">
              <a href={p.url} target="_blank" rel="noopener" className="press block h-16 w-16 overflow-hidden rounded-lg bg-sunken" title={`Prise le ${formatDateHeure(p.pris_le)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.vignette} alt={`Photo prise le ${formatDateHeure(p.pris_le)}`} loading="lazy" className="h-full w-full object-cover" />
              </a>
              {modifiable ? (
                <button type="button" onClick={() => retirer(p.id)} aria-label="Supprimer cette photo" className="press absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink text-white opacity-90 shadow-card">
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {modifiable ? (
        <>
          <input ref={entree} type="file" accept="image/*" multiple hidden onChange={(e) => envoyer(e.target.files)} />
          <button
            type="button"
            disabled={envoi > 0}
            onClick={() => entree.current?.click()}
            className="press inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-line-strong px-3.5 text-sm font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700 disabled:opacity-60"
          >
            {envoi > 0 ? <Spinner /> : <Camera className="h-4 w-4" />} {envoi > 0 ? "Envoi…" : libelle}
          </button>
        </>
      ) : null}
    </div>
  );
}

export { Photos as PhotosOps };

export function ChecklistVue({
  checklistId,
  points,
  photosGenerales,
  modifiable,
  terminee,
  peutTerminer,
}: {
  checklistId: string;
  points: PointVue[];
  photosGenerales: PhotoVue[];
  modifiable: boolean;
  terminee: boolean;
  /** Bouton « Terminer » (check-lists libres) ; pour un ménage, on termine depuis le ménage lui-même */
  peutTerminer: boolean;
}) {
  const router = useRouter();
  const [etat, setEtat] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  const [erreur, setErreur] = useState("");
  const [enCours, demarrer] = useTransition();

  const faitDe = (p: PointVue) => etat[p.id] ?? p.fait;
  const faits = points.filter(faitDe).length;
  const pct = progression(faits, points.length);

  async function basculer(p: PointVue) {
    if (!modifiable) return;
    const nouveau = !faitDe(p);
    setEtat((e) => ({ ...e, [p.id]: nouveau })); // réponse immédiate, annulée si la base refuse
    setErreur("");
    const r = await cocherPoint(p.id, nouveau);
    if (r?.erreur) {
      setEtat((e) => ({ ...e, [p.id]: !nouveau }));
      setErreur(r.erreur);
    } else demarrer(() => router.refresh());
  }

  async function enregistrerNote(p: PointVue) {
    const texte = notes[p.id];
    if (texte === undefined || texte === p.note) return;
    const r = await noterPoint(p.id, texte);
    if (r?.erreur) setErreur(r.erreur);
    else demarrer(() => router.refresh());
  }

  function terminer() {
    demarrer(async () => {
      const r = await terminerChecklist(checklistId);
      if (r?.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {faits} sur {points.length} points
          </span>
          <span className="num text-ink-3">{pct} %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement de la check-list">
          <div className="h-full rounded-full bg-wine-600 transition-[width] duration-300 ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        {points.map((p) => {
          const fait = faitDe(p);
          const noteOuverte = ouvertes[p.id] || p.note !== "";
          return (
            <li key={p.id} className="p-4">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={fait}
                  aria-label={p.libelle}
                  disabled={!modifiable}
                  onClick={() => basculer(p)}
                  className={cn(
                    "press mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-150",
                    fait ? "border-wine-600 bg-wine-600 text-white" : "border-line-strong bg-surface",
                    !modifiable && "opacity-70",
                  )}
                >
                  {fait ? <Check className="h-5 w-5" strokeWidth={3} /> : null}
                </button>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <p className={cn("text-[1rem] leading-snug text-pretty", fait && "text-ink-2")}>
                    {p.libelle}
                    {p.photo_requise ? <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-wine-50 px-2 py-0.5 align-middle text-xs font-medium text-wine-700"><Camera className="h-3 w-3" /> photo demandée</span> : null}
                  </p>
                  {fait && p.fait_le ? <p className="text-[0.8rem] text-ink-3">Fait le {formatDateHeure(p.fait_le)}</p> : null}
                  <Photos cible="checklist" id={checklistId} pointId={p.id} photos={p.photos} modifiable={modifiable} libelle={p.photos.length ? "Ajouter une photo" : "Prendre une photo"} onErreur={setErreur} />
                  {noteOuverte ? (
                    <textarea
                      defaultValue={p.note}
                      onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                      onBlur={() => enregistrerNote(p)}
                      disabled={!modifiable}
                      rows={2}
                      placeholder="Remarque (facultatif)"
                      aria-label={`Remarque pour : ${p.libelle}`}
                      className="block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
                    />
                  ) : modifiable ? (
                    <button type="button" onClick={() => setOuvertes((o) => ({ ...o, [p.id]: true }))} className="press inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
                      <MessageSquare className="h-3.5 w-3.5" /> Ajouter une remarque
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Photos générales (après ménage, état des lieux…)</h3>
        <Photos cible="checklist" id={checklistId} photos={photosGenerales} modifiable={modifiable} libelle="Ajouter une photo" onErreur={setErreur} />
      </div>

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      {peutTerminer && modifiable && !terminee ? (
        <button type="button" onClick={terminer} disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
          {enCours ? <Spinner /> : <Check className="h-4 w-4" />} Terminer la check-list
        </button>
      ) : null}
      {terminee ? <Notice ton="ok">Check-list terminée.</Notice> : null}
    </div>
  );
}
