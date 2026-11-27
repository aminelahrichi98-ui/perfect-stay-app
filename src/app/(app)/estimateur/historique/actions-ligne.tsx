"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import { Spinner } from "@/components/ui";
import { archiverEstimation, supprimerBrouillon } from "../estimation-actions";

/** Actions d'une ligne de l'historique. Une estimation validée ne se modifie pas : nouvelle version ou copie. */
export function ActionsLigne({ id, statut, v2, modifiable, admin }: { id: string; statut: string; v2: boolean; modifiable: boolean; admin: boolean }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const brouillon = statut === "brouillon" || statut === "a_valider";
  const lancer = (f: () => Promise<{ erreur?: string }>, question: string) => {
    if (!window.confirm(question)) return;
    demarrer(async () => {
      const r = await f();
      setErreur(r.erreur ?? "");
      if (!r.erreur) router.refresh();
    });
  };
  const lien = "block rounded-lg px-3 py-1.5 text-left text-sm hover:bg-sunken";
  return (
    <details className="relative">
      <summary className="press grid h-8 w-8 cursor-pointer list-none place-items-center rounded-lg hover:bg-sunken" aria-label="Actions">
        {enCours ? <Spinner /> : <MoreHorizontal className="h-4 w-4" />}
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-line bg-surface p-1 shadow-lg">
        <Link href={`/estimation/${id}`} className={lien}>
          Ouvrir / télécharger
        </Link>
        {modifiable && v2 && brouillon ? (
          <Link href={`/estimateur/nouvelle?brouillon=${id}`} className={lien}>
            Modifier le brouillon
          </Link>
        ) : null}
        {modifiable && v2 && !brouillon ? (
          <Link href={`/estimateur/nouvelle?version=${id}`} className={lien}>
            Nouvelle version
          </Link>
        ) : null}
        {modifiable && v2 ? (
          <Link href={`/estimateur/nouvelle?dupliquer=${id}`} className={lien}>
            Dupliquer
          </Link>
        ) : null}
        {modifiable && statut !== "archivee" ? (
          <button type="button" className={`${lien} w-full`} onClick={() => lancer(() => archiverEstimation(id), "Archiver cette estimation ?")}>
            Archiver
          </button>
        ) : null}
        {admin && statut === "brouillon" ? (
          <button type="button" className={`${lien} w-full text-danger`} onClick={() => lancer(() => supprimerBrouillon(id), "Supprimer définitivement ce brouillon ?")}>
            Supprimer le brouillon
          </button>
        ) : null}
        {erreur ? <p className="px-3 py-1 text-xs text-danger">{erreur}</p> : null}
      </div>
    </details>
  );
}
