"use client";

import { Gavel, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { POLES } from "@/lib/modules";
import { enregistrerNoteStrategie, supprimerNoteStrategie } from "./actions";

type Note = { id: string; type: string; titre: string; date: string; contenu: string; pole: string; auteur: string };

export function Journal({ notes, modifiable, aujourdhui }: { notes: Note[]; modifiable: boolean; aujourdhui: string }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [enCours, demarrer] = useTransition();
  const [filtre, setFiltre] = useState<"tout" | "decision" | "note">("tout");
  const [edition, setEdition] = useState<Note | null>(null);
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState<string | null>(null);
  const affichees = notes.filter((n) => filtre === "tout" || n.type === filtre);

  const ouvrir = (n: Note | null) => {
    setEdition(n);
    setErreur("");
    boite.current?.showModal();
  };
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerNoteStrategie({ id: edition?.id, type: String(f.get("type")), titre: String(f.get("titre") ?? ""), date: String(f.get("date")), contenu: String(f.get("contenu") ?? ""), pole: String(f.get("pole") ?? "") });
      if (r?.erreur) setErreur(r.erreur);
      else {
        boite.current?.close();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Type de note" className="flex gap-2">
          {([["tout", "Tout"], ["decision", "Décisions"], ["note", "Notes"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={filtre === v} onClick={() => setFiltre(v)} className={cn("press h-10 rounded-full border px-4 text-sm font-medium", filtre === v ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken")}>
              {l}
            </button>
          ))}
        </div>
        {modifiable ? (
          <button type="button" onClick={() => ouvrir(null)} className={buttonClass("primary", "md", "ml-auto")}>
            <Plus className="h-4 w-4" /> Nouvelle entrée
          </button>
        ) : null}
      </div>

      {affichees.length ? (
        <ul className="space-y-3">
          {affichees.map((n) => (
            <li key={n.id}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl", n.type === "decision" ? "bg-wine-50 text-wine-600" : "bg-sunken text-ink-3")}>
                    {n.type === "decision" ? <Gavel className="h-4 w-4" /> : <NotebookPen className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-pretty">{n.titre}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-3">
                      <span className="num">{n.date.split("-").reverse().join("/")}</span>
                      {n.pole ? <Badge>{n.pole}</Badge> : null}
                      {n.auteur ? <span>{n.auteur}</span> : null}
                    </p>
                    {n.contenu ? <p className="mt-2 text-pretty whitespace-pre-line text-ink-2">{n.contenu}</p> : null}
                  </div>
                  {modifiable ? (
                    <span className="flex shrink-0 items-center">
                      <button type="button" onClick={() => ouvrir(n)} aria-label={`Modifier « ${n.titre} »`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {suppression === n.id ? (
                        <button type="button" onClick={() => demarrer(async () => { await supprimerNoteStrategie(n.id); setSuppression(null); router.refresh(); })} className="press h-10 rounded-lg bg-danger px-3 text-sm font-medium text-white">
                          Confirmer
                        </button>
                      ) : (
                        <button type="button" onClick={() => setSuppression(n.id)} aria-label={`Supprimer « ${n.titre} »`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Gavel className="h-7 w-7" />
          </span>
          <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Le journal est vide</h3>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Notez ici les décisions importantes (date, raison, pôle concerné) pour ne pas les oublier.</p>
        </Card>
      )}

      <dialog ref={boite} aria-label={edition ? "Modifier l'entrée" : "Nouvelle entrée"} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{edition ? "Modifier l'entrée" : "Nouvelle entrée"}</h2>
          <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={soumettre} className="space-y-4 p-5" key={edition?.id ?? "nouvelle"}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" htmlFor="s-type">
              <Select id="s-type" name="type" defaultValue={edition?.type ?? "decision"}>
                <option value="decision">Décision</option>
                <option value="note">Note</option>
              </Select>
            </Field>
            <Field label="Date" htmlFor="s-date">
              <Input id="s-date" name="date" type="date" defaultValue={edition?.date ?? aujourdhui} required className="num" />
            </Field>
            <Field label="Pôle" htmlFor="s-pole">
              <Select id="s-pole" name="pole" defaultValue={edition?.pole ?? ""}>
                <option value="">Aucun</option>
                {POLES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Titre" htmlFor="s-titre">
            <Input id="s-titre" name="titre" defaultValue={edition?.titre} maxLength={200} placeholder="Ex. Ouvrir Casablanca en 2027" autoComplete="off" required />
          </Field>
          <Field label="Contenu" htmlFor="s-contenu" hint="Pourquoi cette décision, ce qui a été envisagé, la suite.">
            <Textarea id="s-contenu" name="contenu" defaultValue={edition?.contenu} rows={6} />
          </Field>
          {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
          <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
            {enCours ? <Spinner /> : null} Enregistrer
          </button>
        </form>
      </dialog>
    </div>
  );
}
