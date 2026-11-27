"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Archive, ArchiveRestore, Camera, CheckCircle2 } from "lucide-react";
import { buttonClass, Spinner, Textarea } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { activerVersion, afficherComparable, archiverVersion, changerStatutSegment, enregistrerPhotoComparable, noterVersion, preparerPhotoComparable } from "../actions";

function useAction() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const lancer = (f: () => Promise<{ erreur?: string }>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    demarrer(async () => {
      const r = await f();
      setErreur(r.erreur ?? "");
      if (!r.erreur) router.refresh();
    });
  };
  return { enCours, erreur, lancer };
}

const Erreur = ({ texte }: { texte: string }) => (texte ? <span role="alert" className="block text-xs text-danger">{texte}</span> : null);

export function BoutonStatutSegment({ segmentId, statut }: { segmentId: string; statut: "actif" | "archive" }) {
  const { enCours, erreur, lancer } = useAction();
  return (
    <span>
      <button
        type="button"
        disabled={enCours}
        className={buttonClass("ghost", "sm")}
        onClick={() => lancer(() => changerStatutSegment(segmentId, statut === "actif" ? "archive" : "actif"), statut === "actif" ? "Archiver ce segment ? Il ne sera plus proposé dans les nouvelles estimations (les estimations existantes ne changent pas)." : undefined)}
      >
        {enCours ? <Spinner /> : statut === "actif" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
        {statut === "actif" ? "Archiver" : "Restaurer"}
      </button>
      <Erreur texte={erreur} />
    </span>
  );
}

export function BoutonsVersion({ versionId, active, statut }: { versionId: string; active: boolean; statut: string }) {
  const { enCours, erreur, lancer } = useAction();
  if (statut === "archivee") return <span className="text-xs text-ink-3">archivée</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {!active ? (
        <button type="button" disabled={enCours} className={buttonClass("secondary", "sm", "h-8")} onClick={() => lancer(() => activerVersion(versionId), "Utiliser cette version pour les nouvelles estimations ? Les estimations déjà faites gardent leurs chiffres.")}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Rendre active
        </button>
      ) : null}
      <button type="button" disabled={enCours} className={buttonClass("ghost", "sm", "h-8")} onClick={() => lancer(() => archiverVersion(versionId), "Archiver cette version ? Elle reste consultable mais ne pourra plus être utilisée.")}>
        <Archive className="h-3.5 w-3.5" /> Archiver
      </button>
      <Erreur texte={erreur} />
    </span>
  );
}

export function NotesVersion({ versionId, notes }: { versionId: string; notes: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [texte, setTexte] = useState(notes);
  return (
    <div className="space-y-1.5">
      <Textarea aria-label="Notes sur la version" className="min-h-14 text-sm" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Notes internes (vérifications, réserves)…" />
      {texte !== notes ? (
        <button type="button" disabled={enCours} className={buttonClass("secondary", "sm")} onClick={() => lancer(() => noterVersion(versionId, texte))}>
          {enCours ? <Spinner /> : null} Enregistrer la note
        </button>
      ) : null}
      <Erreur texte={erreur} />
    </div>
  );
}

export function OptionsComparable({ comparableId, affichable }: { comparableId: string; affichable: boolean }) {
  const { enCours, erreur, lancer } = useAction();
  const entree = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const router = useRouter();
  const [erreurPhoto, setErreurPhoto] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" disabled={enCours} checked={affichable} onChange={(e) => lancer(() => afficherComparable(comparableId, e.target.checked))} /> Proposée dans les estimations
      </label>
      <button type="button" disabled={envoi} className={buttonClass("ghost", "sm", "h-8")} onClick={() => entree.current?.click()}>
        {envoi ? <Spinner /> : <Camera className="h-3.5 w-3.5" />} Photo réelle
      </button>
      <input
        ref={entree}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setEnvoi(true);
          setErreurPhoto("");
          try {
            const prep = await preparerPhotoComparable(comparableId, { nom: f.name, taille: f.size, type: f.type });
            if (prep.erreur !== undefined) throw new Error(prep.erreur);
            await envoyerVersStockage("marche", prep.chemin, prep.token, f);
            const r = await enregistrerPhotoComparable(comparableId, prep.chemin);
            if (r.erreur !== undefined) throw new Error(r.erreur);
            router.refresh();
          } catch (err) {
            setErreurPhoto(err instanceof Error ? err.message : "Envoi impossible.");
          } finally {
            setEnvoi(false);
          }
        }}
      />
      <Erreur texte={erreur || erreurPhoto} />
    </div>
  );
}
