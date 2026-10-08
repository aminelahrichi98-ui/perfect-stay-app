"use client";

import { ExternalLink, FileText, Paperclip, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Notice, Spinner } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { enregistrerDocumentRh, ouvrirDocumentRh, preparerDocumentRh, supprimerDocumentRh } from "../actions";

type Doc = { id: string; nom: string; taille: number; date: string };
const taille = (o: number) => (o > 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

export function DocumentsRh({ membreId, documents, modifiable }: { membreId: string; documents: Doc[]; modifiable: boolean }) {
  const router = useRouter();
  const [, demarrer] = useTransition();
  const entree = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return;
    setErreur("");
    setEnvoi(true);
    for (const f of Array.from(fichiers)) {
      try {
        const prep = await preparerDocumentRh({ membreId, nomFichier: f.name, taille: f.size });
        if ("erreur" in prep) throw new Error(prep.erreur);
        await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, f);
        const r = await enregistrerDocumentRh({ membreId, chemin: prep.chemin, nom: f.name, type: f.type, taille: f.size });
        if (r?.erreur) throw new Error(r.erreur);
      } catch (e) {
        setErreur(`${f.name} : ${e instanceof Error ? e.message : "l'envoi a échoué"}`);
      }
    }
    setEnvoi(false);
    if (entree.current) entree.current.value = "";
    demarrer(() => router.refresh());
  }
  async function voir(id: string) {
    const r = await ouvrirDocumentRh(id);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreur(r.erreur ?? "Impossible d'ouvrir le document.");
  }

  return (
    <div className="space-y-3">
      {documents.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="h-5 w-5 shrink-0 text-ink-3" />
              <button type="button" onClick={() => voir(d.id)} className="press min-w-0 flex-1 text-left">
                <span className="block truncate font-medium">{d.nom}</span>
                <span className="num text-xs text-ink-3">
                  {taille(d.taille)} · ajouté le {d.date}
                </span>
              </button>
              <ExternalLink className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              {modifiable ? (
                <button type="button" onClick={async () => { const r = await supprimerDocumentRh(d.id); if (r?.erreur) setErreur(r.erreur); else demarrer(() => router.refresh()); }} aria-label={`Supprimer ${d.nom}`} className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Aucun document (contrat, pièce d&apos;identité, attestation…).</p>
      )}
      {modifiable ? (
        <>
          <input ref={entree} type="file" multiple hidden onChange={(e) => envoyer(e.target.files)} />
          <button type="button" disabled={envoi} onClick={() => entree.current?.click()} className="press inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-sm font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700 disabled:opacity-60">
            {envoi ? <Spinner /> : <Paperclip className="h-4 w-4" />} {envoi ? "Envoi…" : "Ajouter un document"}
          </button>
        </>
      ) : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
