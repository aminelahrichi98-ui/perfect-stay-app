"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonClass, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { analyserListe, LIGNES_MAX } from "@/lib/liste-taches";
import { POLES } from "@/lib/modules";
import { PRIORITES } from "@/lib/taches";
import { importerListe } from "../actions";

type Ligne = { cle: number; titre: string; sousTaches: string[]; garder: boolean };

export function ImporterListe({
  poleParDefaut,
  logements,
  responsables,
}: {
  poleParDefaut: string;
  logements: { id: string; nom: string }[];
  responsables: { id: string; nom: string; prestataire: boolean }[];
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [texte, setTexte] = useState("");
  const [pole, setPole] = useState(poleParDefaut);
  const [priorite, setPriorite] = useState("normal");
  const [responsable, setResponsable] = useState("");
  const [logement, setLogement] = useState("");
  const [echeance, setEcheance] = useState("");
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState("");

  function verifier() {
    setErreur("");
    const analyse = analyserListe(texte);
    if (!analyse.length) {
      setErreur("Collez au moins une ligne.");
      return;
    }
    setLignes(analyse.map((l, i) => ({ cle: i, ...l, garder: true })));
  }
  const maj = (cle: number, champs: Partial<Ligne>) => setLignes((l) => l?.map((x) => (x.cle === cle ? { ...x, ...champs } : x)) ?? null);
  const gardees = (lignes ?? []).filter((l) => l.garder && l.titre.trim());

  function creer() {
    setErreur("");
    demarrer(async () => {
      const r = await importerListe({ pole, priorite, responsable, logement, echeance, lignes: gardees.map(({ titre, sousTaches }) => ({ titre, sousTaches })) });
      if (r?.erreur) setErreur(r.erreur);
      else router.push(`/taches?pole=${encodeURIComponent(pole)}&vue=kanban`);
    });
  }

  if (lignes) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setLignes(null)} className="press inline-flex h-9 items-center gap-1.5 rounded-lg pr-2 text-sm text-ink-2 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Modifier le texte
          </button>
          <p className="text-sm text-ink-2">
            Pôle <strong>{pole}</strong> · {PRIORITES.find((p) => p.value === priorite)?.label}
            {echeance ? ` · échéance ${echeance.split("-").reverse().join("/")}` : ""}
          </p>
        </div>
        <ul className="space-y-2">
          {lignes.map((l, i) => (
            <li key={l.cle} className={cn("rounded-xl border bg-surface p-3 shadow-card", l.garder ? "border-line" : "border-dashed border-line-strong opacity-55")}>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={l.garder}
                  aria-label={`Créer la tâche ${i + 1}`}
                  onClick={() => maj(l.cle, { garder: !l.garder })}
                  className={cn("press relative grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 before:absolute before:-inset-1.5 before:content-['']", l.garder ? "border-wine-600 bg-wine-600 text-white" : "border-line-strong bg-surface")}
                >
                  {l.garder ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </button>
                <Input value={l.titre} onChange={(e) => maj(l.cle, { titre: e.target.value })} aria-label={`Titre de la tâche ${i + 1}`} maxLength={160} className="min-w-0 flex-1" autoComplete="off" />
                <button type="button" onClick={() => setLignes((x) => x?.filter((y) => y.cle !== l.cle) ?? null)} aria-label={`Retirer la ligne ${i + 1}`} className="press grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-danger-bg hover:text-danger">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {l.sousTaches.length ? (
                <ul className="mt-2 ml-9 space-y-1 text-sm text-ink-2">
                  {l.sousTaches.map((s, k) => (
                    <li key={k} className="before:mr-2 before:text-ink-3 before:content-['↳']">
                      {s}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
        {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
        <div className="flex justify-end">
          <button type="button" onClick={creer} disabled={enCours || !gardees.length} aria-busy={enCours} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
            {enCours ? <Spinner /> : null} Créer {gardees.length} tâche{gardees.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Field label="Votre liste" htmlFor="liste" hint={`Une action par ligne, ${LIGNES_MAX} au maximum. Une ligne décalée de quelques espaces devient une sous-tâche de la ligne du dessus.`}>
        <Textarea id="liste" value={texte} onChange={(e) => setTexte(e.target.value)} rows={9} placeholder={"- Appeler le plombier de la Villa Targa\n- Commander du linge\n- Préparer l'arrivée de jeudi\n    - Courses\n    - Linge"} className="font-mono text-[0.95rem]" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pôle" htmlFor="pole">
          <Select id="pole" value={pole} onChange={(e) => setPole(e.target.value)}>
            {POLES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorité" htmlFor="priorite">
          <Select id="priorite" value={priorite} onChange={(e) => setPriorite(e.target.value)}>
            {PRIORITES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Responsable" htmlFor="responsable">
          <Select id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
            <option value="">Non attribuées</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
                {r.prestataire ? " (prestataire)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Échéance (facultatif)" htmlFor="echeance">
          <Input id="echeance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className="num" />
        </Field>
        <Field label="Logement (facultatif)" htmlFor="logement" className="sm:col-span-2">
          <Select id="logement" value={logement} onChange={(e) => setLogement(e.target.value)}>
            <option value="">Aucun</option>
            {logements.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
      <div className="flex justify-end">
        <button type="button" onClick={verifier} className={buttonClass("primary", "md", "w-full sm:w-auto")}>
          Vérifier la liste
        </button>
      </div>
    </div>
  );
}
