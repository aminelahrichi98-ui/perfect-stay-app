"use client";

import { ExternalLink, FileText, Paperclip, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { envoyerVersStockage } from "@/lib/envoi-client";
import { formatMontant } from "@/lib/format";
import { REMBOURSEMENTS, STATUTS_INCIDENT } from "@/lib/operations";
import { ajouterFrais, changerStatutIncident, definirRemboursement, ouvrirFacture, preparerFacture, supprimerFrais, supprimerIncident } from "../actions";

/** Avancement de l'incident : Signalé → En cours → Résolu (la tâche de maintenance suit). */
export function PanneauStatut({ id, statut }: { id: string; statut: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Statut de l'incident" className="flex flex-wrap gap-2">
        {STATUTS_INCIDENT.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={statut === s.value}
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                setErreur("");
                const r = await changerStatutIncident(id, s.value);
                if (r?.erreur) setErreur(r.erreur);
                else router.refresh();
              })
            }
            className={cn(
              "press inline-flex h-11 items-center rounded-xl border px-4 font-medium disabled:opacity-60",
              statut === s.value ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}

type Frais = { id: string; date: string; description: string; montant: number; justificatifNom: string | null };

export function FraisIncident({ incidentId, frais, total, verrouille, aujourdhui }: { incidentId: string; frais: Frais[]; total: number; verrouille: boolean; aujourdhui: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const entree = useRef<HTMLInputElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState("");

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulaire = e.currentTarget;
    const f = new FormData(formulaire);
    setErreur("");
    demarrer(async () => {
      try {
        let justificatif: { chemin: string; nom: string } | null = null;
        if (fichier) {
          const prep = await preparerFacture({ incidentId, nomFichier: fichier.name, taille: fichier.size });
          if ("erreur" in prep) throw new Error(prep.erreur);
          await envoyerVersStockage(prep.bucket, prep.chemin, prep.token, fichier);
          justificatif = { chemin: prep.chemin, nom: fichier.name };
        }
        const r = await ajouterFrais({ incidentId, date: String(f.get("date")), description: String(f.get("description") ?? ""), montant: String(f.get("montant")), justificatif });
        if (r?.erreur) throw new Error(r.erreur);
        formulaire.reset();
        setFichier(null);
        setOuvert(false);
        router.refresh();
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "L'enregistrement a échoué.");
      }
    });
  }

  async function voir(id: string) {
    const r = await ouvrirFacture(id);
    if (r.url) window.open(r.url, "_blank", "noopener");
    else setErreur(r.erreur ?? "Impossible d'ouvrir la facture.");
  }
  function retirer(id: string) {
    demarrer(async () => {
      const r = await supprimerFrais(id);
      if (r?.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {frais.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {frais.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.description || "Frais"}</span>
                <span className="num block text-sm text-ink-3">{f.date.split("-").reverse().join("/")}</span>
              </span>
              {f.justificatifNom ? (
                <button type="button" onClick={() => voir(f.id)} className="press inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-sm hover:bg-sunken" title={f.justificatifNom}>
                  <FileText className="h-4 w-4" /> Facture <ExternalLink className="h-3 w-3 text-ink-3" />
                </button>
              ) : (
                <span className="text-xs text-warn">sans facture</span>
              )}
              <span className="num w-28 shrink-0 text-right font-medium">{formatMontant(f.montant)} MAD</span>
              {!verrouille ? (
                <button type="button" onClick={() => retirer(f.id)} disabled={enCours} aria-label="Supprimer ces frais" className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg text-danger hover:bg-danger-bg">
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
          <li className="flex items-center justify-between bg-sunken/60 px-4 py-3">
            <span className="font-medium">Total avancé par Perfect Stay</span>
            <span className="num font-display text-lg font-semibold">{formatMontant(total)} MAD</span>
          </li>
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-ink-3">Aucun frais enregistré pour cet incident.</p>
      )}

      {!verrouille ? (
        ouvert ? (
          <form onSubmit={soumettre} className="space-y-4 rounded-xl border border-line-strong bg-sunken/40 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Date" htmlFor="frais-date">
                <Input id="frais-date" name="date" type="date" defaultValue={aujourdhui} required className="num" />
              </Field>
              <Field label="Montant (MAD)" htmlFor="frais-montant">
                <Input id="frais-montant" name="montant" inputMode="decimal" placeholder="450" autoComplete="off" required className="num" />
              </Field>
              <Field label="Description" htmlFor="frais-desc">
                <Input id="frais-desc" name="description" placeholder="Pièce, main d'œuvre…" maxLength={300} autoComplete="off" />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input ref={entree} type="file" hidden accept="image/*,application/pdf" onChange={(e) => setFichier(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => entree.current?.click()} className="press inline-flex h-11 items-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface px-4 text-sm font-medium text-ink-2 hover:border-wine-500">
                <Paperclip className="h-4 w-4" /> {fichier ? "Changer la facture" : "Joindre la facture"}
              </button>
              {fichier ? (
                <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                  <span className="truncate">{fichier.name}</span>
                  <button type="button" onClick={() => { setFichier(null); if (entree.current) entree.current.value = ""; }} aria-label="Retirer le fichier" className="press grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOuvert(false)} className={buttonClass("ghost", "md")}>
                Annuler
              </button>
              <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
                {enCours ? <Spinner /> : null} Ajouter les frais
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setOuvert(true)} className={buttonClass("secondary", "md")}>
            <Plus className="h-4 w-4" /> Ajouter des frais
          </button>
        )
      ) : null}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}

export function PanneauRemboursement({ id, statut, date, note, aujourdhui, total }: { id: string; statut: string; date: string; note: string; aujourdhui: string; total: number }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [valeur, setValeur] = useState(statut);
  const [jour, setJour] = useState(date || aujourdhui);
  const [remarque, setRemarque] = useState(note);
  const [retour, setRetour] = useState<{ ok?: boolean; texte: string }>();

  function enregistrer() {
    setRetour(undefined);
    demarrer(async () => {
      const r = await definirRemboursement(id, valeur, jour, remarque);
      if (r?.erreur) setRetour({ texte: r.erreur });
      else {
        setRetour({ ok: true, texte: "Enregistré." });
        router.refresh();
      }
    });
  }
  return (
    <div className="space-y-4">
      <p className="text-ink-2 text-pretty">
        Perfect Stay avance <strong className="num text-ink">{formatMontant(total)} MAD</strong> ; le propriétaire les rembourse ensuite.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Statut" htmlFor="remb-statut">
          <Select id="remb-statut" value={valeur} onChange={(e) => setValeur(e.target.value)}>
            {REMBOURSEMENTS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        {valeur === "rembourse" ? (
          <Field label="Date du remboursement" htmlFor="remb-date">
            <Input id="remb-date" type="date" value={jour} onChange={(e) => setJour(e.target.value)} className="num" />
          </Field>
        ) : null}
        <Field label="Remarque" htmlFor="remb-note" className={valeur === "rembourse" ? "" : "sm:col-span-2"}>
          <Input id="remb-note" value={remarque} onChange={(e) => setRemarque(e.target.value)} maxLength={300} placeholder="Virement, accord du propriétaire…" autoComplete="off" />
        </Field>
      </div>
      {retour ? <Notice ton={retour.ok ? "ok" : "danger"}>{retour.texte}</Notice> : null}
      <button type="button" onClick={enregistrer} disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md")}>
        {enCours ? <Spinner /> : null} Enregistrer
      </button>
    </div>
  );
}

export function SupprimerIncident({ id }: { id: string }) {
  const [enCours, demarrer] = useTransition();
  const [confirmation, setConfirmation] = useState(false);
  const [erreur, setErreur] = useState("");
  return (
    <div className="space-y-2">
      {confirmation ? (
        <span className="flex items-center gap-2">
          <button
            type="button"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                const r = await supprimerIncident(id);
                if (r?.erreur) setErreur(r.erreur);
              })
            }
            className="press h-10 rounded-xl bg-danger px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            Confirmer la suppression
          </button>
          <button type="button" onClick={() => setConfirmation(false)} className="press h-10 rounded-xl px-4 text-sm text-ink-2 hover:bg-sunken">
            Annuler
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmation(true)} className="press inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-danger hover:bg-danger-bg">
          <Trash2 className="h-4 w-4" /> Supprimer l&apos;incident
        </button>
      )}
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
    </div>
  );
}
