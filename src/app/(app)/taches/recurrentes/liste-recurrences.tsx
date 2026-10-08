"use client";

import { Pencil, Plus, Repeat, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { FREQUENCES, JOURS_SEMAINE } from "@/lib/recurrence";
import { POLES } from "@/lib/modules";
import { PRIORITES } from "@/lib/taches";
import { basculerRecurrence, enregistrerRecurrence, supprimerRecurrence } from "../actions";

type Regle = {
  id: string;
  titre: string;
  pole: string;
  priorite: string;
  responsable: string;
  logement: string;
  notes: string;
  frequence: string;
  jourSemaine: string;
  jourMois: string;
  actif: boolean;
  libelle: string;
  prochaine: string | null;
};

const VIDE: Omit<Regle, "id" | "actif" | "libelle" | "prochaine"> = { titre: "", pole: "Opérations", priorite: "normal", responsable: "", logement: "", notes: "", frequence: "semaine", jourSemaine: "0", jourMois: "1" };

export function ListeRecurrences({
  regles,
  logements,
  responsables,
  modifiable,
}: {
  regles: Regle[];
  logements: { id: string; nom: string }[];
  responsables: { id: string; nom: string; prestataire: boolean }[];
  modifiable: boolean;
}) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [enCours, demarrer] = useTransition();
  const [edition, setEdition] = useState<Regle | null>(null);
  const [v, setV] = useState({ ...VIDE });
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState<string | null>(null);

  const ouvrir = (r: Regle | null) => {
    setEdition(r);
    setV(r ? { titre: r.titre, pole: r.pole, priorite: r.priorite, responsable: r.responsable, logement: r.logement, notes: r.notes, frequence: r.frequence, jourSemaine: r.jourSemaine, jourMois: r.jourMois } : { ...VIDE });
    setErreur("");
    boite.current?.showModal();
  };
  const champ = (k: keyof typeof VIDE) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerRecurrence({ id: edition?.id, ...v });
      if (r?.erreur) setErreur(r.erreur);
      else {
        boite.current?.close();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {modifiable ? (
        <button type="button" onClick={() => ouvrir(null)} className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Nouvelle règle
        </button>
      ) : null}
      <ul className="space-y-2">
        {regles.map((r) => (
          <li key={r.id} className={cn("rounded-2xl border border-line bg-surface p-4 shadow-card", !r.actif && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex flex-wrap items-center gap-2 font-medium">
                  <Repeat className="h-4 w-4 shrink-0 text-ink-3" /> {r.titre} {!r.actif ? <Badge>En pause</Badge> : null}
                </h3>
                <p className="mt-0.5 text-sm text-ink-2">
                  {r.libelle} · pôle {r.pole}
                  {r.actif && r.prochaine ? <span className="num"> · prochaine : {r.prochaine}</span> : null}
                </p>
              </div>
              {modifiable ? (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => demarrer(async () => { await basculerRecurrence(r.id, !r.actif); router.refresh(); })} className="press h-10 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-sunken">
                    {r.actif ? "Mettre en pause" : "Reprendre"}
                  </button>
                  <button type="button" onClick={() => ouvrir(r)} aria-label={`Modifier ${r.titre}`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {suppression === r.id ? (
                    <button
                      type="button"
                      onClick={() => demarrer(async () => { await supprimerRecurrence(r.id); setSuppression(null); router.refresh(); })}
                      className="press h-10 rounded-lg bg-danger px-3 text-sm font-medium text-white"
                    >
                      Confirmer
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSuppression(r.id)} aria-label={`Supprimer ${r.titre}`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <dialog ref={boite} aria-label={edition ? "Modifier la règle" : "Nouvelle règle"} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{edition ? "Modifier la règle" : "Nouvelle règle"}</h2>
          <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={enregistrer} className="space-y-4 p-5">
          <Field label="Titre de la tâche" htmlFor="r-titre">
            <Input id="r-titre" value={v.titre} onChange={champ("titre")} maxLength={200} autoComplete="off" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fréquence" htmlFor="r-freq" className="sm:col-span-2">
              <Select id="r-freq" value={v.frequence} onChange={champ("frequence")}>
                {FREQUENCES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
            {v.frequence === "semaine" ? (
              <Field label="Jour de la semaine" htmlFor="r-js">
                <Select id="r-js" value={v.jourSemaine} onChange={champ("jourSemaine")}>
                  {JOURS_SEMAINE.map((j, i) => (
                    <option key={j} value={i}>
                      {j.charAt(0).toUpperCase() + j.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {v.frequence === "mois" ? (
              <Field label="Jour du mois" htmlFor="r-jm" hint="Le 31 tombe sur le dernier jour des mois plus courts.">
                <Input id="r-jm" value={v.jourMois} onChange={champ("jourMois")} inputMode="numeric" className="num" />
              </Field>
            ) : null}
            <Field label="Pôle" htmlFor="r-pole">
              <Select id="r-pole" value={v.pole} onChange={champ("pole")}>
                {POLES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priorité" htmlFor="r-prio">
              <Select id="r-prio" value={v.priorite} onChange={champ("priorite")}>
                {PRIORITES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable" htmlFor="r-resp">
              <Select id="r-resp" value={v.responsable} onChange={champ("responsable")}>
                <option value="">Non attribuée</option>
                {responsables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Logement" htmlFor="r-log">
              <Select id="r-log" value={v.logement} onChange={champ("logement")}>
                <option value="">Aucun</option>
                {logements.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nom}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes (facultatif)" htmlFor="r-notes">
            <Textarea id="r-notes" value={v.notes} onChange={champ("notes")} rows={2} />
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
