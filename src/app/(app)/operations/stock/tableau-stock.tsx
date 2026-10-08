"use client";

import { ArrowDownToLine, ArrowRightLeft, ClipboardList, Minus, Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Badge, buttonClass, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { CATEGORIES_STOCK, type AlerteStock } from "@/lib/operations";
import { enregistrerArticle, enregistrerMouvement, type MouvementSaisi } from "./actions";

type Ligne = {
  id: string;
  nom: string;
  categorie: string;
  unite: string;
  seuil: number;
  actif: boolean;
  reserve: number;
  chezLesLogements: { logement: string; quantite: number }[];
  total: number;
  alerte: AlerteStock;
};

type Genre = MouvementSaisi["genre"];
const GENRES: { value: Genre; label: string; icone: typeof Plus; aide: string }[] = [
  { value: "entree", label: "Entrée", icone: ArrowDownToLine, aide: "Achat ou réception : s'ajoute à la réserve." },
  { value: "transfert", label: "Vers un logement", icone: ArrowRightLeft, aide: "Sort de la réserve pour aller dans un logement." },
  { value: "sortie", label: "Sortie", icone: Minus, aide: "Consommé, perdu ou jeté : retiré du stock." },
  { value: "inventaire", label: "Inventaire", icone: ClipboardList, aide: "Vous avez compté : indiquez la quantité réelle." },
];

type Fenetre = { type: "mouvement"; ligne: Ligne; genre: Genre } | { type: "article"; ligne?: Ligne } | null;

export function TableauStock({ lignes, logements, modifiable, aujourdhui }: { lignes: Ligne[]; logements: { id: string; nom: string }[]; modifiable: boolean; aujourdhui: string }) {
  const router = useRouter();
  const boite = useRef<HTMLDialogElement>(null);
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState("");
  const [genre, setGenre] = useState<Genre>("entree");

  const ouvrir = (f: Exclude<Fenetre, null>) => {
    setErreur("");
    setFenetre(f);
    if (f.type === "mouvement") setGenre(f.genre);
    boite.current?.showModal();
  };
  const fermer = () => boite.current?.close();

  function soumettreMouvement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fenetre?.type !== "mouvement") return;
    const f = new FormData(e.currentTarget);
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerMouvement({
        articleId: fenetre.ligne.id,
        genre,
        lieu: String(f.get("lieu") ?? ""),
        quantite: String(f.get("quantite") ?? ""),
        note: String(f.get("note") ?? ""),
        date: String(f.get("date") ?? aujourdhui),
      });
      if (r?.erreur) setErreur(r.erreur);
      else {
        fermer();
        router.refresh();
      }
    });
  }
  function soumettreArticle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const existante = fenetre?.type === "article" ? fenetre.ligne : undefined;
    setErreur("");
    demarrer(async () => {
      const r = await enregistrerArticle({
        id: existante?.id,
        nom: String(f.get("nom") ?? ""),
        categorie: String(f.get("categorie") ?? ""),
        unite: String(f.get("unite") ?? ""),
        seuil: String(f.get("seuil") ?? "0"),
        actif: f.get("actif") === "on",
      });
      if (r?.erreur) setErreur(r.erreur);
      else {
        fermer();
        router.refresh();
      }
    });
  }

  const categories = CATEGORIES_STOCK.filter((c) => lignes.some((l) => l.categorie === c.value));
  const mv = fenetre?.type === "mouvement" ? fenetre : null;
  const art = fenetre?.type === "article" ? fenetre : null;
  const lieuUtile = genre === "sortie" || genre === "inventaire";

  return (
    <div className="space-y-6">
      {modifiable ? (
        <div className="flex justify-end">
          <button type="button" onClick={() => ouvrir({ type: "article" })} className={buttonClass("secondary", "md")}>
            <Plus className="h-4 w-4" /> Nouvel article
          </button>
        </div>
      ) : null}

      {categories.map((c) => (
        <section key={c.value} aria-labelledby={`cat-${c.value}`} className="space-y-2">
          <h2 id={`cat-${c.value}`} className="text-sm font-medium tracking-wide text-ink-3 uppercase">
            {c.label}
          </h2>
          <ul className="space-y-2">
            {lignes
              .filter((l) => l.categorie === c.value)
              .map((l) => (
                <li key={l.id} className={cn("rounded-2xl border bg-surface p-4 shadow-card", l.alerte === "ok" ? "border-line" : "border-warn/40", !l.actif && "opacity-60")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex flex-wrap items-center gap-2 font-medium">
                        {l.nom}
                        {l.alerte === "rupture" ? <Badge ton="danger">Rupture</Badge> : l.alerte === "bas" ? <Badge ton="attention">Stock bas</Badge> : null}
                        {!l.actif ? <Badge>Désactivé</Badge> : null}
                      </h3>
                      <p className="text-sm text-ink-3">
                        {l.seuil > 0 ? `Alerte sous ${l.seuil} ${l.unite}` : "Pas d'alerte"}
                        {l.chezLesLogements.length ? ` · ${l.chezLesLogements.map((n) => `${n.logement} : ${n.quantite}`).join(", ")}` : ""}
                      </p>
                    </div>
                    <p className="num text-right">
                      <span className="block font-display text-2xl leading-none font-semibold tracking-tight">{l.total}</span>
                      <span className="text-xs text-ink-3">dont {l.reserve} en réserve</span>
                    </p>
                  </div>
                  {modifiable ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {GENRES.map((g) => (
                        <button key={g.value} type="button" onClick={() => ouvrir({ type: "mouvement", ligne: l, genre: g.value })} className="press inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-sm font-medium hover:bg-sunken">
                          <g.icone className="h-4 w-4 text-ink-3" /> {g.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => ouvrir({ type: "article", ligne: l })} aria-label={`Modifier l'article ${l.nom}`} className="press ml-auto grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}

      <dialog ref={boite} aria-label={mv ? `Mouvement : ${mv.ligne.nom}` : art?.ligne ? "Modifier l'article" : "Nouvel article"} onClick={(e) => e.target === boite.current && fermer()} className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 shadow-pop backdrop:bg-aub-950/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">{mv ? mv.ligne.nom : art?.ligne ? "Modifier l'article" : "Nouvel article"}</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="press grid h-10 w-10 place-items-center rounded-lg text-ink-3 hover:bg-sunken">
            <X className="h-5 w-5" />
          </button>
        </div>

        {mv ? (
          <form onSubmit={soumettreMouvement} className="space-y-4 p-5" key={`${mv.ligne.id}-${genre}`}>
            <div role="radiogroup" aria-label="Type de mouvement" className="grid grid-cols-2 gap-2">
              {GENRES.map((g) => (
                <button key={g.value} type="button" role="radio" aria-checked={genre === g.value} onClick={() => setGenre(g.value)} className={cn("press h-11 rounded-xl border text-sm font-medium", genre === g.value ? "border-wine-500 bg-wine-50 text-wine-800" : "border-line-strong text-ink-2 hover:bg-sunken")}>
                  {g.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-2">{GENRES.find((g) => g.value === genre)?.aide}</p>
            {genre === "transfert" || lieuUtile ? (
              <Field label={genre === "transfert" ? "Logement de destination" : "Où ?"} htmlFor="lieu">
                <Select id="lieu" name="lieu" defaultValue="" required={genre === "transfert"}>
                  {genre !== "transfert" ? <option value="">La réserve</option> : <option value="" disabled>Choisir…</option>}
                  {logements.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={genre === "inventaire" ? `Quantité comptée (${mv.ligne.unite})` : `Quantité (${mv.ligne.unite})`} htmlFor="quantite">
                <Input id="quantite" name="quantite" inputMode="numeric" autoComplete="off" required className="num" />
              </Field>
              <Field label="Date" htmlFor="date">
                <Input id="date" name="date" type="date" defaultValue={aujourdhui} required className="num" />
              </Field>
            </div>
            <Field label="Note (facultatif)" htmlFor="note">
              <Input id="note" name="note" maxLength={300} placeholder="Ex. commande Marjane" autoComplete="off" />
            </Field>
            {erreur ? <Notice ton="danger">{erreur}</Notice> : null}
            <button type="submit" disabled={enCours} aria-busy={enCours} className={buttonClass("primary", "md", "w-full")}>
              {enCours ? <Spinner /> : null} Enregistrer
            </button>
          </form>
        ) : null}

        {fenetre?.type === "article" ? (
          <form onSubmit={soumettreArticle} className="space-y-4 p-5" key={art?.ligne?.id ?? "nouveau"}>
            <Field label="Nom" htmlFor="nom">
              <Input id="nom" name="nom" defaultValue={art?.ligne?.nom} maxLength={120} autoComplete="off" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Catégorie" htmlFor="categorie">
                <Select id="categorie" name="categorie" defaultValue={art?.ligne?.categorie ?? "consommable"}>
                  {CATEGORIES_STOCK.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Unité" htmlFor="unite" hint="pièce, rouleau, jeu…">
                <Input id="unite" name="unite" defaultValue={art?.ligne?.unite ?? "pièce"} maxLength={30} autoComplete="off" />
              </Field>
            </div>
            <Field label="Seuil d'alerte" htmlFor="seuil" hint="Alerte quand le total passe sous ce nombre. 0 = pas d'alerte.">
              <Input id="seuil" name="seuil" defaultValue={String(art?.ligne?.seuil ?? 0)} inputMode="numeric" autoComplete="off" className="num sm:max-w-32" />
            </Field>
            <label className="flex items-center gap-3 text-[0.95rem]">
              <input type="checkbox" name="actif" defaultChecked={art?.ligne?.actif ?? true} className="h-5 w-5 rounded accent-[var(--color-wine-600)]" />
              Article suivi (décochez pour le masquer des alertes)
            </label>
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
