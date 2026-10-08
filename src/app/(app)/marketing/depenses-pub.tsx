"use client";

import { Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { formatMontant } from "@/lib/format";
import { CANAUX, libelleCanal } from "@/lib/marketing";
import { enregistrerDepensePub, supprimerDepensePub } from "./actions";

type Depense = { id: string; date: string; canal: string; campagne: string; montant: number; note: string };

export function DepensesPub({ depenses, modifiable, aujourdhui, mois }: { depenses: Depense[]; modifiable: boolean; aujourdhui: string; mois: string }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [enCours, demarrer] = useTransition();
  const [edition, setEdition] = useState<Depense | null>(null);
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState<string | null>(null);

  const ouvrir = (d: Depense | null) => {
    setEdition(d);
    setErreur("");
    boite.current?.showModal();
  };
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerDepensePub({ id: edition?.id, date: String(f.get("date")), canal: String(f.get("canal")), campagne: String(f.get("campagne") ?? ""), montant: String(f.get("montant")), note: String(f.get("note") ?? "") });
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
          <Plus className="h-4 w-4" /> Nouvelle dépense
        </button>
      ) : null}

      {depenses.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {depenses.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="num font-medium">{d.date.split("-").reverse().join("/")}</span>
                    <Badge ton={d.canal === "meta" ? "marque" : "neutre"}>{libelleCanal(d.canal)}</Badge>
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-2">{d.campagne || "Sans campagne"}{d.note ? ` · ${d.note}` : ""}</span>
                </span>
                <span className="num shrink-0 font-display text-lg font-semibold">{formatMontant(d.montant)} <span className="text-xs font-medium text-ink-3">MAD</span></span>
                {modifiable ? (
                  <span className="flex shrink-0 items-center">
                    <button type="button" onClick={() => ouvrir(d)} aria-label="Modifier cette dépense" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {suppression === d.id ? (
                      <button type="button" onClick={() => demarrer(async () => { await supprimerDepensePub(d.id); setSuppression(null); router.refresh(); })} className="press h-10 rounded-lg bg-danger px-3 text-sm font-medium text-white">
                        Confirmer
                      </button>
                    ) : (
                      <button type="button" onClick={() => setSuppression(d.id)} aria-label="Supprimer cette dépense" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="flex flex-col items-center px-6 py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Megaphone className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-tight">Aucune dépense ce mois-ci</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Saisissez vos dépenses Meta, Google ou autres : le coût par lead se calcule tout seul à partir des leads du CRM.</p>
        </Card>
      )}

      <dialog ref={boite} aria-label={edition ? "Modifier la dépense" : "Nouvelle dépense"} onClick={(e) => e.target === boite.current && boite.current?.close()} className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{edition ? "Modifier la dépense" : "Nouvelle dépense"}</h2>
          <button type="button" onClick={() => boite.current?.close()} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={soumettre} className="space-y-4 p-5" key={edition?.id ?? "nouveau"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" htmlFor="m-date">
              <Input id="m-date" name="date" type="date" defaultValue={edition?.date ?? dateParDefaut} required className="num" />
            </Field>
            <Field label="Canal" htmlFor="m-canal">
              <Select id="m-canal" name="canal" defaultValue={edition?.canal ?? "meta"}>
                {CANAUX.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Campagne" htmlFor="m-camp" className="sm:col-span-2">
              <Input id="m-camp" name="campagne" defaultValue={edition?.campagne} maxLength={200} placeholder="Ex. Propriétaires Marrakech" autoComplete="off" />
            </Field>
            <Field label="Montant (MAD)" htmlFor="m-montant">
              <Input id="m-montant" name="montant" defaultValue={edition ? String(edition.montant).replace(".", ",") : ""} inputMode="decimal" placeholder="1500" autoComplete="off" required className="num" />
            </Field>
            <Field label="Note (facultatif)" htmlFor="m-note">
              <Input id="m-note" name="note" defaultValue={edition?.note} maxLength={500} autoComplete="off" />
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
