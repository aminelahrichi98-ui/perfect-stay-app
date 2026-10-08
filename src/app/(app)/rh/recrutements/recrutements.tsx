"use client";

import { Briefcase, Pencil, Phone, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { lienAppel } from "@/lib/crm";
import { ETAPES_CANDIDAT, STATUTS_POSTE } from "@/lib/rh";
import { changerEtapeCandidat, enregistrerCandidat, enregistrerPoste, supprimerCandidat, supprimerPoste } from "../actions";

type Candidat = { id: string; nom: string; telephone: string; email: string; etape: string; notes: string };
type Poste = { id: string; poste: string; statut: string; notes: string; candidats: Candidat[] };
type Fenetre = { type: "poste"; poste?: Poste } | { type: "candidat"; recrutementId: string; candidat?: Candidat } | null;

export function Recrutements({ postes, modifiable }: { postes: Poste[]; modifiable: boolean }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [enCours, demarrer] = useTransition();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [erreur, setErreur] = useState("");
  const [suppression, setSuppression] = useState<string | null>(null);

  const ouvrir = (f: Exclude<Fenetre, null>) => {
    setFenetre(f);
    setErreur("");
    boite.current?.showModal();
  };
  const fermer = () => boite.current?.close();
  const terminer = (r: { erreur?: string } | undefined) => {
    if (r?.erreur) setErreur(r.erreur);
    else {
      fermer();
      router.refresh();
    }
  };

  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setErreur("");
    if (fenetre?.type === "poste") demarrer(async () => terminer(await enregistrerPoste({ id: fenetre.poste?.id, poste: v("poste"), statut: v("statut"), notes: v("notes") })));
    else if (fenetre?.type === "candidat") {
      demarrer(async () => terminer(await enregistrerCandidat({ id: fenetre.candidat?.id, recrutementId: fenetre.recrutementId, nom: v("nom"), telephone: v("telephone"), email: v("email"), etape: v("etape"), notes: v("notes") })));
    }
  }
  const poste = fenetre?.type === "poste" ? fenetre.poste : undefined;
  const cand = fenetre?.type === "candidat" ? fenetre.candidat : undefined;

  return (
    <div className="space-y-4">
      {modifiable ? (
        <button type="button" onClick={() => ouvrir({ type: "poste" })} className={buttonClass("primary", "md")}>
          <Plus className="h-4 w-4" /> Nouveau poste
        </button>
      ) : null}

      {postes.length ? (
        <ul className="space-y-4">
          {postes.map((p) => {
            const s = STATUTS_POSTE.find((x) => x.value === p.statut);
            return (
              <li key={p.id}>
                <Card className="overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <h2 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold tracking-tight">
                        {p.poste} <Badge ton={s?.ton}>{s?.label}</Badge>
                      </h2>
                      <p className="text-sm text-ink-3">
                        {p.candidats.length} candidat{p.candidats.length > 1 ? "s" : ""}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </p>
                    </div>
                    {modifiable ? (
                      <span className="flex items-center gap-1">
                        <button type="button" onClick={() => ouvrir({ type: "candidat", recrutementId: p.id })} className={buttonClass("secondary", "sm")}>
                          <UserPlus className="h-4 w-4" /> Candidat
                        </button>
                        <button type="button" onClick={() => ouvrir({ type: "poste", poste: p })} aria-label={`Modifier le poste ${p.poste}`} className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                          <Pencil className="h-4 w-4" />
                        </button>
                        {suppression === p.id ? (
                          <button type="button" onClick={() => demarrer(async () => { await supprimerPoste(p.id); setSuppression(null); router.refresh(); })} className="press h-9 rounded-lg bg-danger px-3 text-sm font-medium text-white">
                            Confirmer
                          </button>
                        ) : (
                          <button type="button" onClick={() => setSuppression(p.id)} aria-label={`Supprimer le poste ${p.poste}`} className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </span>
                    ) : null}
                  </div>
                  {p.candidats.length ? (
                    <ul className="divide-y divide-line border-t border-line">
                      {p.candidats.map((c) => {
                        const appel = lienAppel(c.telephone);
                        return (
                          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            <span className="min-w-0 flex-1 basis-44">
                              <span className="block truncate font-medium">{c.nom}</span>
                              <span className="block truncate text-sm text-ink-3">{[c.telephone, c.email].filter(Boolean).join(" · ") || "Pas de coordonnées"}</span>
                              {c.notes ? <span className="block text-sm text-ink-2 text-pretty">{c.notes}</span> : null}
                            </span>
                            {appel ? (
                              <a href={appel} aria-label={`Appeler ${c.nom}`} className="press grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ok-bg text-ok">
                                <Phone className="h-4 w-4" />
                              </a>
                            ) : null}
                            {modifiable ? (
                              <select value={c.etape} onChange={(e) => demarrer(async () => { await changerEtapeCandidat(c.id, e.target.value); router.refresh(); })} aria-label={`Étape de ${c.nom}`} className="h-10 rounded-lg border border-line-strong bg-surface px-2.5 text-sm font-medium">
                                {ETAPES_CANDIDAT.map((x) => (
                                  <option key={x.value} value={x.value}>
                                    {x.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Badge ton={ETAPES_CANDIDAT.find((x) => x.value === c.etape)?.ton}>{ETAPES_CANDIDAT.find((x) => x.value === c.etape)?.label}</Badge>
                            )}
                            {modifiable ? (
                              <span className="flex shrink-0 items-center">
                                <button type="button" onClick={() => ouvrir({ type: "candidat", recrutementId: p.id, candidat: c })} aria-label={`Modifier ${c.nom}`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => demarrer(async () => { await supprimerCandidat(c.id); router.refresh(); })} aria-label={`Supprimer ${c.nom}`} className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wine-50 text-wine-600">
            <Briefcase className="h-7 w-7" />
          </span>
          <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Aucun recrutement en cours</h2>
          <p className="mt-1 max-w-md text-ink-2 text-pretty">Ouvrez un poste, puis ajoutez les candidats et faites-les avancer : nouveau, entretien, test, offre, embauché.</p>
        </Card>
      )}

      <dialog ref={boite} aria-label={fenetre?.type === "poste" ? "Poste" : "Candidat"} onClick={(e) => e.target === boite.current && fermer()} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{fenetre?.type === "poste" ? (poste ? "Modifier le poste" : "Nouveau poste") : cand ? "Modifier le candidat" : "Nouveau candidat"}</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>
        {fenetre?.type === "poste" ? (
          <form onSubmit={soumettre} className="space-y-4 p-5" key={poste?.id ?? "nouveau-poste"}>
            <Field label="Intitulé du poste" htmlFor="poste">
              <Input id="poste" name="poste" defaultValue={poste?.poste} maxLength={160} autoComplete="off" required />
            </Field>
            <Field label="Statut" htmlFor="statut-poste">
              <Select id="statut-poste" name="statut" defaultValue={poste?.statut ?? "ouvert"}>
                {STATUTS_POSTE.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" htmlFor="notes-poste">
              <Textarea id="notes-poste" name="notes" defaultValue={poste?.notes} rows={3} />
            </Field>
            {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
            <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
              {enCours ? <Spinner /> : null} Enregistrer
            </button>
          </form>
        ) : fenetre?.type === "candidat" ? (
          <form onSubmit={soumettre} className="space-y-4 p-5" key={cand?.id ?? "nouveau-candidat"}>
            <Field label="Nom" htmlFor="nom-c">
              <Input id="nom-c" name="nom" defaultValue={cand?.nom} maxLength={160} autoComplete="off" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Téléphone" htmlFor="tel-c">
                <Input id="tel-c" name="telephone" type="tel" defaultValue={cand?.telephone} autoComplete="off" className="num" />
              </Field>
              <Field label="E-mail" htmlFor="mail-c">
                <Input id="mail-c" name="email" type="email" defaultValue={cand?.email} autoComplete="off" />
              </Field>
            </div>
            <Field label="Étape" htmlFor="etape-c">
              <Select id="etape-c" name="etape" defaultValue={cand?.etape ?? "nouveau"}>
                {ETAPES_CANDIDAT.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Notes" htmlFor="notes-c">
              <Textarea id="notes-c" name="notes" defaultValue={cand?.notes} rows={3} />
            </Field>
            {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
            <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
              {enCours ? <Spinner /> : null} Enregistrer
            </button>
          </form>
        ) : null}
      </dialog>
    </div>
  );
}
