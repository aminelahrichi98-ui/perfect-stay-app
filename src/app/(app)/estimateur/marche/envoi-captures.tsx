"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";
import { buttonClass, Notice, Spinner } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { cn } from "@/lib/cn";
import { enregistrerCaptures, preparerEnvoiCaptures } from "./actions";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX = 10;
const TAILLE = 15 * 1024 * 1024;

type Choisie = { id: string; fichier: File; apercu: string };

/**
 * Choix des captures avant envoi : glisser-déposer, sélection de fichiers ou collage (Ctrl+V / ⌘V),
 * aperçu, retrait et remplacement. Les fichiers partent directement vers le stockage privé.
 */
export function EnvoiCaptures({ importId, segmentId, dejaPresentes = 0, libelle = "Envoyer et lire les captures", onTermine }: { importId?: string; segmentId?: string; dejaPresentes?: number; libelle?: string; onTermine: (importId: string, refusees: string[]) => void }) {
  const [choisies, setChoisies] = useState<Choisie[]>([]);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const entree = useRef<HTMLInputElement>(null);
  const remplacement = useRef<HTMLInputElement>(null);
  const aRemplacer = useRef<string | null>(null);
  const place = MAX - dejaPresentes;

  const ajouter = useCallback(
    (fichiers: File[]) => {
      setErreur("");
      const refus: string[] = [];
      const ok = fichiers.filter((f) => {
        if (!TYPES.includes(f.type)) refus.push(`${f.name || "image collée"} : format non accepté (PNG, JPEG ou WEBP)`);
        else if (f.size > TAILLE) refus.push(`${f.name} : plus de 15 Mo`);
        else return true;
        return false;
      });
      setChoisies((avant) => {
        const libres = Math.max(0, place - avant.length);
        if (ok.length > libres) refus.push(`${MAX} captures au maximum par import`);
        return [...avant, ...ok.slice(0, libres).map((fichier) => ({ id: crypto.randomUUID(), fichier, apercu: URL.createObjectURL(fichier) }))];
      });
      if (refus.length) setErreur(refus.join(" · "));
    },
    [place],
  );

  // Coller une capture depuis le presse-papiers, n'importe où sur la page
  useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const images = [...(e.clipboardData?.items ?? [])].filter((i) => i.kind === "file" && i.type.startsWith("image/")).map((i) => i.getAsFile()).filter((f): f is File => f !== null);
      if (!images.length) return;
      e.preventDefault();
      ajouter(images.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `capture-collee-${Date.now()}-${i + 1}.${f.type.split("/")[1] ?? "png"}`, { type: f.type }))));
    };
    window.addEventListener("paste", coller);
    return () => window.removeEventListener("paste", coller);
  }, [ajouter]);

  useEffect(() => () => choisies.forEach((c) => URL.revokeObjectURL(c.apercu)), [choisies]);

  async function envoyer() {
    if (!choisies.length) return;
    setEnvoi(true);
    setErreur("");
    try {
      const prep = await preparerEnvoiCaptures({ importId, segmentId, fichiers: choisies.map((c) => ({ nom: c.fichier.name, taille: c.fichier.size, type: c.fichier.type })) });
      if (prep.erreur !== undefined) throw new Error(prep.erreur);
      await Promise.all(prep.envois.map((e, i) => envoyerVersStockage("marche", e.chemin, e.token, choisies[i].fichier)));
      const r = await enregistrerCaptures(prep.importId, prep.envois.map((e, i) => ({ chemin: e.chemin, nom: choisies[i].fichier.name })));
      if (r.erreur !== undefined) throw new Error(r.erreur);
      setChoisies([]);
      onTermine(prep.importId, r.refusees);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          ajouter([...e.dataTransfer.files]);
        }}
        className={cn("grid place-items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors", survol ? "border-wine-500 bg-wine-50" : "border-line-strong bg-sunken/40")}
      >
        <ImagePlus className="h-7 w-7 text-ink-3" />
        <p className="text-sm text-ink-2">
          Glissez vos captures PriceLabs ici, <button type="button" className="font-medium text-wine-700 underline underline-offset-2" onClick={() => entree.current?.click()}>choisissez des fichiers</button> ou collez-les
          <span className="inline-flex items-center gap-1 px-1 align-middle text-ink-3">
            <ClipboardPaste className="h-3.5 w-3.5" /> Ctrl+V
          </span>
        </p>
        <p className="text-xs text-ink-3">PNG, JPEG ou WEBP · 15 Mo par capture · {place} capture(s) possible(s)</p>
        <input ref={entree} type="file" accept={TYPES.join(",")} multiple hidden onChange={(e) => (ajouter([...(e.target.files ?? [])]), (e.target.value = ""))} />
        <input
          ref={remplacement}
          type="file"
          accept={TYPES.join(",")}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f || !aRemplacer.current) return;
            if (!TYPES.includes(f.type) || f.size > TAILLE) return setErreur("Format non accepté ou fichier trop lourd.");
            const id = aRemplacer.current;
            setChoisies((l) => l.map((c) => (c.id === id ? { id, fichier: f, apercu: URL.createObjectURL(f) } : c)));
          }}
        />
      </div>

      {choisies.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {choisies.map((c, i) => (
            <li key={c.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.apercu} alt={`Capture ${dejaPresentes + i + 1}`} className="aspect-[4/3] w-full bg-sunken object-contain" />
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-xs text-ink-2">
                  {dejaPresentes + i + 1}. {c.fichier.name}
                </span>
                <button type="button" title="Remplacer" aria-label="Remplacer la capture" className={buttonClass("ghost", "sm", "h-8 px-2")} onClick={() => ((aRemplacer.current = c.id), remplacement.current?.click())}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button type="button" title="Retirer" aria-label="Retirer la capture" className={buttonClass("ghost", "sm", "h-8 px-2")} onClick={() => setChoisies((l) => l.filter((x) => x.id !== c.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
      <button type="button" disabled={!choisies.length || envoi} onClick={envoyer} className={buttonClass("primary", "md")}>
        {envoi ? <Spinner /> : <Upload className="h-4 w-4" />} {libelle}
      </button>
    </div>
  );
}
