"use client";

import { ArrowDown, ArrowUp, Camera, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { TYPES_MODELE } from "@/lib/operations";
import { enregistrerModele, supprimerModele } from "../actions";

type Point = { cle: number; libelle: string; photo_requise: boolean };

export function EditeurModele({
  modele,
}: {
  modele?: { id: string; nom: string; type: string; actif: boolean; points: { libelle: string; photo_requise: boolean }[] };
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [nom, setNom] = useState(modele?.nom ?? "");
  const [type, setType] = useState(modele?.type ?? "menage");
  const [actif, setActif] = useState(modele?.actif ?? true);
  const [points, setPoints] = useState<Point[]>(modele?.points.map((p, i) => ({ cle: i, ...p })) ?? [{ cle: 0, libelle: "", photo_requise: false }]);
  const [prochaine, setProchaine] = useState(points.length);
  const [erreur, setErreur] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  const maj = (cle: number, champs: Partial<Point>) => setPoints((l) => l.map((p) => (p.cle === cle ? { ...p, ...champs } : p)));
  const deplacer = (i: number, d: number) =>
    setPoints((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  const ajouter = () => {
    setPoints((l) => [...l, { cle: prochaine, libelle: "", photo_requise: false }]);
    setProchaine((n) => n + 1);
  };

  function enregistrer() {
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerModele({ id: modele?.id, nom, type, actif, points: points.map(({ libelle, photo_requise }) => ({ libelle, photo_requise })) });
      if (r?.erreur) setErreur(r.erreur);
      else {
        router.push("/operations/check-lists");
        router.refresh();
      }
    });
  }
  function supprimer() {
    if (!modele) return;
    demarrer(async () => {
      const r = await supprimerModele(modele.id);
      if (r?.erreur) setErreur(r.erreur);
      else {
        router.push("/operations/check-lists");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nom du modèle" htmlFor="nom">
          <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Type" htmlFor="type" hint="Le premier modèle « Ménage » actif sert pour tous les ménages.">
          <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES_MODELE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Points à vérifier</h3>
        <ol className="space-y-2">
          {points.map((p, i) => (
            <li key={p.cle} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-card">
              <span className="num w-6 shrink-0 text-center text-sm text-ink-3">{i + 1}</span>
              <Input value={p.libelle} onChange={(e) => maj(p.cle, { libelle: e.target.value })} aria-label={`Point ${i + 1}`} placeholder="Ex. Faire les lits" className="min-w-0 flex-1" autoComplete="off" />
              <button
                type="button"
                onClick={() => maj(p.cle, { photo_requise: !p.photo_requise })}
                aria-pressed={p.photo_requise}
                title="Exiger une photo pour ce point"
                className={cn("press grid h-10 w-10 shrink-0 place-items-center rounded-lg border", p.photo_requise ? "border-wine-500 bg-wine-50 text-wine-700" : "border-line-strong text-ink-3 hover:bg-sunken")}
              >
                <Camera className="h-4 w-4" />
                <span className="sr-only">{p.photo_requise ? "Photo exigée" : "Photo non exigée"}</span>
              </button>
              <span className="hidden shrink-0 sm:flex">
                <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" className="press grid h-10 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => deplacer(i, 1)} disabled={i === points.length - 1} aria-label="Descendre" className="press grid h-10 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
              </span>
              <button type="button" onClick={() => setPoints((l) => l.filter((x) => x.cle !== p.cle))} aria-label={`Supprimer le point ${i + 1}`} className="press grid h-10 w-10 shrink-0 place-items-center rounded-lg text-danger hover:bg-danger-bg">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={ajouter} className={buttonClass("secondary", "sm")}>
          <Plus className="h-4 w-4" /> Ajouter un point
        </button>
      </div>

      <label className="flex items-center gap-3 text-[0.95rem]">
        <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} className="h-5 w-5 rounded accent-[var(--color-wine-600)]" />
        Modèle actif (proposé dans l&apos;app)
      </label>

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {modele ? (
          confirmation ? (
            <span className="flex items-center gap-2">
              <button type="button" onClick={supprimer} disabled={enCours} className="press h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60">
                Confirmer la suppression
              </button>
              <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
                Annuler
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmation(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg">
              <Trash2 className="h-4 w-4" /> Supprimer le modèle
            </button>
          )
        ) : (
          <span />
        )}
        <button type="button" onClick={enregistrer} disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
          {enCours ? <Spinner /> : null} Enregistrer le modèle
        </button>
      </div>
      <p className="text-sm text-ink-3 text-pretty">Modifier un modèle ne change pas les check-lists déjà remplies : elles gardent leur contenu d&apos;origine.</p>
    </div>
  );
}
