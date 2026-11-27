"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import { buttonClass, Card, Input, Spinner } from "@/components/ui";
import { ajouterAlias, ajouterQuartier, changerQuartier, supprimerAlias } from "../actions";

function useAction() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const lancer = (f: () => Promise<{ erreur?: string }>, apres?: () => void) =>
    demarrer(async () => {
      const r = await f();
      setErreur(r.erreur ?? "");
      if (!r.erreur) {
        apres?.();
        router.refresh();
      }
    });
  return { enCours, erreur, lancer };
}

export function AjoutQuartier({ villes }: { villes: string[] }) {
  const { enCours, erreur, lancer } = useAction();
  const [ville, setVille] = useState(villes[0] ?? "Casablanca");
  const [nom, setNom] = useState("");
  return (
    <Card className="p-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          lancer(() => ajouterQuartier(ville, nom), () => setNom(""));
        }}
      >
        <div className="space-y-1">
          <label htmlFor="ville-q" className="block text-[0.82rem] font-medium">Ville</label>
          <Input id="ville-q" list="villes-connues" value={ville} onChange={(e) => setVille(e.target.value)} className="h-10 w-44" />
          <datalist id="villes-connues">
            {villes.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <label htmlFor="nom-q" className="block text-[0.82rem] font-medium">Nouveau quartier</label>
          <Input id="nom-q" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex. Racine" className="h-10" />
        </div>
        <button disabled={enCours || !nom.trim()} className={buttonClass("primary", "md", "h-10")}>
          {enCours ? <Spinner /> : <Plus className="h-4 w-4" />} Ajouter
        </button>
      </form>
      {erreur ? <p role="alert" className="mt-2 text-sm text-danger">{erreur}</p> : null}
    </Card>
  );
}

export function AjoutAlias({ quartierId }: { quartierId: string }) {
  const { enCours, erreur, lancer } = useAction();
  const [ouvert, setOuvert] = useState(false);
  const [alias, setAlias] = useState("");
  if (!ouvert)
    return (
      <button type="button" className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-xs text-ink-2 hover:text-ink" onClick={() => setOuvert(true)}>
        <Plus className="h-3 w-3" /> alias
      </button>
    );
  return (
    <form
      className="inline-flex flex-wrap items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        lancer(() => ajouterAlias(quartierId, alias), () => (setAlias(""), setOuvert(false)));
      }}
    >
      <Input autoFocus aria-label="Nouvel alias" value={alias} onChange={(e) => setAlias(e.target.value)} className="h-8 w-40 text-sm" placeholder="ex. CFC" />
      <button disabled={enCours || !alias.trim()} className={buttonClass("secondary", "sm", "h-8")}>
        {enCours ? <Spinner /> : "Ajouter"}
      </button>
      <button type="button" className={buttonClass("ghost", "sm", "h-8 px-2")} onClick={() => setOuvert(false)} aria-label="Annuler">
        <X className="h-3.5 w-3.5" />
      </button>
      {erreur ? <span role="alert" className="w-full text-xs text-danger">{erreur}</span> : null}
    </form>
  );
}

export function RetraitAlias({ aliasId }: { aliasId: string }) {
  const { enCours, lancer } = useAction();
  return (
    <button type="button" disabled={enCours} aria-label="Supprimer l'alias" className="text-ink-3 hover:text-danger" onClick={() => window.confirm("Supprimer cet alias ?") && lancer(() => supprimerAlias(aliasId))}>
      <X className="h-3 w-3" />
    </button>
  );
}

export function BasculeQuartier({ quartierId, actif }: { quartierId: string; actif: boolean }) {
  const { enCours, lancer } = useAction();
  return (
    <button type="button" disabled={enCours} className={buttonClass("ghost", "sm", "ml-auto h-8")} onClick={() => lancer(() => changerQuartier(quartierId, !actif))}>
      {actif ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {actif ? "Masquer" : "Réactiver"}
    </button>
  );
}
