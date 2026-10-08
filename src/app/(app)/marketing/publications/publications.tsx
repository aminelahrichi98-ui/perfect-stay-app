"use client";

import { CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { libelleReseau, RESEAUX, STATUTS_PUBLICATION } from "@/lib/marketing";
import { changerStatutPublication, enregistrerPublication, supprimerPublication } from "../actions";

type Pub = { id: string; date: string; reseau: string; sujet: string; statut: string; notes: string; responsable: string; responsableNom: string };

export function Publications({ publications, responsables, modifiable, aujourdhui, mois }: { publications: Pub[]; responsables: { id: string; nom: string }[]; modifiable: boolean; aujourdhui: string; mois: string }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [enCours, demarrer] = useTransition();
  const [edition, setEdition] = useState<Pub | null>(null);
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState<string | null>(null);

  const ouvrir = (p: Pub | null) => {
    setEdition(p);
    setErreur("");
    boite.current?.showModal();
  };
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerPublication({ id: edition?.id, date: String(f.get("date")), reseau: String(f.get("reseau")), sujet: String(f.get("sujet") ?? ""), statut: String(f.get("statut")), notes: String(f.get("notes") ?? ""), responsable: String(f.get("responsable") ?? "") });
      if (r?.erreur) setErreur(r.erreur);
      else {
        boite.current?.close();
        router.refresh();
      }
    });
  }
  const dateParDefaut = mois === aujourdhui.slice(0, 7) ? aujourdhui : `${mois}-01`;

  return (
    <div className="space-y-4">
      {modifiable ? (
        <button type="button" onClick={() => ouvrir(null)} className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Nouvelle publication
        </button>
      ) : null}

      {publications.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {publications.map((p) => {
              const s = STATUTS_PUBLICATION.find((x) => x.value === p.statut);
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="w-14 shrink-0 text-center">
                    <span className="num block font-display text-xl leading-none font-semibold">{Number(p.date.slice(8))}</span>
                    <span className="num block text-[0.7rem] text-ink-3">{p.date.slice(5, 7)}/{p.date.slice(2, 4)}</span>
                  </span>
                  <span className="min-w-0 flex-1 basis-48">
                    <span className="block font-medium text-pretty">{p.sujet}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
                      <Badge>{libelleReseau(p.reseau)}</Badge>
                      {p.responsableNom ? <span>{p.responsableNom}</span> : null}
                    </span>
                  </span>
                  {modifiable ? (
                    <select
                      value={p.statut}
                      onChange={(e) => demarrer(async () => { await changerStatutPublication(p.id, e.target.value); router.refresh(); })}
                      aria-label={`Statut de « ${p.sujet} »`}
                      className="h-10 rounded-lg border border-line-strong bg-surface px-2.5 text-sm font-medium"
                    >
                      {STATUTS_PUBLICATION.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge ton={s?.ton}>{s?.label}</Badge>
                  )}
                  {modifiable ? (
                    <span className="flex shrink-0 items-center">
                      <button type="button" onClick={() => ouvrir(p)} aria-label="Modifier cette publication" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {suppression === p.id ? (
                        <button type="button" onClick={() => demarrer(async () => { await supprimerPublication(p.id); setSuppression(null); router.refresh(); })} className="press h-10 rounded-lg bg-danger px-3 text-sm font-medium text-white">
                          Confirmer
                        </button>
                      ) : (
                        <button type="button" onClick={() => setSuppression(p.id)} aria-label="Supprimer cette publication" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <CalendarClock className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-tight">Aucune publication prévue ce mois-ci</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Planifiez vos posts : date, réseau, sujet, et où vous en êtes (idée, à rédiger, prêt, publié).</p>
        </Card>
      )}

      <dialog ref={boite} aria-label={edition ? "Modifier la publication" : "Nouvelle publication"} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{edition ? "Modifier la publication" : "Nouvelle publication"}</h2>
          <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={soumettre} className="space-y-4 p-5" key={edition?.id ?? "nouvelle"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="p-date">
              <Input id="p-date" name="date" type="date" defaultValue={edition?.date ?? dateParDefaut} required className="num" />
            </Field>
            <Field label="Réseau" htmlFor="p-reseau">
              <Select id="p-reseau" name="reseau" defaultValue={edition?.reseau ?? "instagram"}>
                {RESEAUX.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sujet" htmlFor="p-sujet" className="sm:col-span-2">
              <Input id="p-sujet" name="sujet" defaultValue={edition?.sujet} maxLength={300} placeholder="Ex. Visite de la Villa Targa" autoComplete="off" required />
            </Field>
            <Field label="Statut" htmlFor="p-statut">
              <Select id="p-statut" name="statut" defaultValue={edition?.statut ?? "idee"}>
                {STATUTS_PUBLICATION.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Responsable" htmlFor="p-resp">
              <Select id="p-resp" name="responsable" defaultValue={edition?.responsable ?? ""}>
                <option value="">Non attribué</option>
                {responsables.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes (facultatif)" htmlFor="p-notes" className="sm:col-span-2">
              <Textarea id="p-notes" name="notes" defaultValue={edition?.notes} rows={2} />
            </Field>
          </div>
          {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
          <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
            {enCours ? <Spinner /> : null} Enregistrer
          </button>
        </form>
      </dialog>
    </div>
  );
}
