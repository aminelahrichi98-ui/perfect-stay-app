"use client";

import { FileText, Paperclip, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { buttonClass } from "@/components/ui";
import { enregistrerDepense, preparerJustificatif, supprimerDepense } from "./actions";
import { CATEGORIES_DEPENSE } from "./categories";

type Props = {
  logements: { id: string; nom: string }[];
  aujourdhui: string;
  edition?: {
    id: string;
    date: string;
    logementId: string;
    categorie: string;
    description: string;
    montant: string;
    justificatifNom: string | null;
  };
  peutSupprimer: boolean;
};

export function FormulaireDepense({ logements, aujourdhui, edition, peutSupprimer }: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const entree = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [retirer, setRetirer] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [confirmation, setConfirmation] = useState(false);
  const [etape, setEtape] = useState<"" | "envoi" | "enregistrement">("");

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur(undefined);
    demarrer(async () => {
      try {
        let justificatif: { chemin: string; nom: string } | null = null;
        if (fichier) {
          setEtape("envoi");
          const prep = await preparerJustificatif({ nomFichier: fichier.name, taille: fichier.size });
          if ("erreur" in prep) throw new Error(prep.erreur);
          await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, fichier);
          justificatif = { chemin: prep.chemin, nom: fichier.name };
        }
        setEtape("enregistrement");
        const r = await enregistrerDepense({
          id: edition?.id,
          date: String(f.get("date")),
          logementId: String(f.get("logement") ?? ""),
          categorie: String(f.get("categorie")),
          description: String(f.get("description") ?? ""),
          montant: String(f.get("montant")),
          justificatif,
          retirerJustificatif: retirer,
        });
        if (r?.erreur) throw new Error(r.erreur);
        router.push(`/comptabilite/depenses?mois=${r?.mois ?? aujourdhui.slice(0, 7)}&${edition ? "modifie" : "cree"}=1`);
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "L'enregistrement a échoué.");
        setEtape("");
      }
    });
  }

  function supprimer() {
    if (!edition) return;
    demarrer(async () => {
      const r = await supprimerDepense(edition.id);
      if (r?.erreur) {
        setErreur(r.erreur);
        return;
      }
      router.push(`/comptabilite/depenses?mois=${r?.mois ?? aujourdhui.slice(0, 7)}&supprime=1`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={soumettre} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date" htmlFor="date">
          <Input id="date" name="date" type="date" defaultValue={edition?.date ?? aujourdhui} required className="num" />
        </Field>
        <Field label="Montant (MAD)" htmlFor="montant">
          <Input id="montant" name="montant" defaultValue={edition?.montant} inputMode="decimal" placeholder="450" autoComplete="off" required className="num" />
        </Field>
        <Field label="Catégorie" htmlFor="categorie">
          <Select id="categorie" name="categorie" defaultValue={edition?.categorie ?? ""} required>
            <option value="" disabled>
              Choisir…
            </option>
            {CATEGORIES_DEPENSE.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Logement concerné" htmlFor="logement" hint="Laissez « Général » pour une dépense de l'entreprise (salaires, marketing…).">
          <Select id="logement" name="logement" defaultValue={edition?.logementId ?? ""}>
            <option value="">Général (aucun logement)</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2">
          <Input id="description" name="description" defaultValue={edition?.description} maxLength={300} placeholder="Ex. réparation du chauffe-eau" autoComplete="off" />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Justificatif (facture, reçu, photo)</p>
        <input ref={entree} type="file" hidden accept="image/*,application/pdf" onChange={(e) => { setFichier(e.target.files?.[0] ?? null); setRetirer(false); }} />
        {fichier ? (
          <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface p-3 shadow-card">
            <FileText className="h-5 w-5 shrink-0 text-wine-600" />
            <span className="min-w-0 flex-1 truncate text-sm">{fichier.name}</span>
            <button type="button" onClick={() => { setFichier(null); if (entree.current) entree.current.value = ""; }} aria-label="Retirer le fichier choisi" className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : edition?.justificatifNom && !retirer ? (
          <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface p-3 shadow-card">
            <FileText className="h-5 w-5 shrink-0 text-ink-3" />
            <span className="min-w-0 flex-1 truncate text-sm">{edition.justificatifNom}</span>
            <button type="button" onClick={() => setRetirer(true)} className="press h-9 rounded-lg px-3 text-sm text-danger hover:bg-danger-bg">
              Retirer
            </button>
          </div>
        ) : null}
        <button type="button" onClick={() => entree.current?.click()} className="press inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 text-sm font-medium text-ink-2 hover:border-wine-500 hover:text-wine-700">
          <Paperclip className="h-4 w-4" /> {fichier || (edition?.justificatifNom && !retirer) ? "Remplacer le fichier" : "Joindre un fichier"}
        </button>
      </div>

      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {edition && peutSupprimer ? (
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
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          )
        ) : (
          <span />
        )}
        <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
          {enCours ? <Spinner /> : null}
          {etape === "envoi" ? "Envoi du justificatif…" : edition ? "Enregistrer les modifications" : "Enregistrer la dépense"}
        </button>
      </div>
    </form>
  );
}
