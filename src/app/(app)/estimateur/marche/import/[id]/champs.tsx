"use client";

import { useState } from "react";
import { Badge, Input } from "@/components/ui";
import { nombre } from "@/lib/estimation/format";
import { lireEntier, lireNombre, lirePourcentage } from "@/lib/marche/nombres";
import type { Preuve } from "@/lib/marche/schema";
import { cn } from "@/lib/cn";

type Props = {
  id: string;
  label: string;
  valeur: number | null;
  onChange: (v: number | null) => void;
  preuve?: Preuve;
  mode?: "nombre" | "pourcentage" | "entier";
  unite?: string;
  disabled?: boolean;
  compact?: boolean;
  requis?: boolean;
};

/** Champ numérique : accepte « 139 076 », « 139,076 », « 65,6 % »… ; vide = non renseigné (jamais 0). */
export function ChampNombre(p: Props) {
  return <ChampNombreInterne key={String(p.valeur)} {...p} />;
}

function ChampNombreInterne({ id, label, valeur, onChange, preuve, mode = "nombre", unite, disabled, compact, requis }: Props) {
  const [texte, setTexte] = useState(valeur === null ? "" : nombre(valeur, 2));
  const [erreur, setErreur] = useState("");
  const lire = mode === "pourcentage" ? lirePourcentage : mode === "entier" ? lireEntier : lireNombre;
  const lu = preuve?.texte ? lire(preuve.texte).valeur : null;
  const corrige = preuve?.texte && lu !== valeur;

  function valider() {
    const l = lire(texte);
    if (l.probleme) return setErreur(l.probleme);
    if (l.valeur !== null && l.valeur < 0) return setErreur("Valeur négative impossible.");
    setErreur("");
    if (l.valeur !== valeur) onChange(l.valeur);
  }

  return (
    <div className={cn("space-y-1", compact && "text-sm")}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[0.82rem] font-medium text-ink">
        {label}
        {requis && valeur === null ? <Badge ton="danger">requis</Badge> : null}
        {corrige ? <Badge ton="marque">corrigé</Badge> : null}
      </label>
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          value={texte}
          disabled={disabled}
          placeholder="non renseigné"
          aria-invalid={erreur ? true : undefined}
          onChange={(e) => setTexte(e.target.value)}
          onBlur={valider}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), valider())}
          className={cn(compact ? "h-9 text-sm" : "h-10", unite && "pr-12")}
        />
        {unite ? <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-ink-3">{unite}</span> : null}
      </div>
      {erreur ? <p role="alert" className="text-xs text-danger">{erreur}</p> : null}
      {preuve && (preuve.texte || preuve.libelle) ? <PreuveLigne preuve={preuve} /> : null}
    </div>
  );
}

export function PreuveLigne({ preuve }: { preuve: Preuve }) {
  return (
    <p className={cn("text-[0.75rem] leading-snug", preuve.confiance === "basse" ? "text-warn" : "text-ink-3")}>
      Lu : « {preuve.texte ?? "—"} »{preuve.libelle ? ` (${preuve.libelle})` : ""}
      {preuve.capture ? ` · capture ${preuve.capture}` : ""}
      {preuve.confiance ? ` · confiance ${preuve.confiance}` : ""}
    </p>
  );
}

export function ChampTexte({ id, label, valeur, onChange, disabled, placeholder, preuve, requis }: { id: string; label: string; valeur: string; onChange: (v: string) => void; disabled?: boolean; placeholder?: string; preuve?: Preuve; requis?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[0.82rem] font-medium text-ink">
        {label}
        {requis && !valeur.trim() ? <Badge ton="danger">requis</Badge> : null}
      </label>
      <Input id={id} value={valeur} disabled={disabled} placeholder={placeholder ?? "non renseigné"} onChange={(e) => onChange(e.target.value)} className="h-10" />
      {preuve && (preuve.texte || preuve.libelle) ? <PreuveLigne preuve={preuve} /> : null}
    </div>
  );
}

/** Oui / Non / Inconnu, pour la définition des revenus. */
export function TroisEtats({ id, label, valeur, onChange, disabled }: { id: string; label: string; valeur: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[0.82rem] font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        disabled={disabled}
        value={valeur === null ? "" : valeur ? "oui" : "non"}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "oui")}
        className="block h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-[0.95rem] shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
      >
        <option value="">Inconnu (non indiqué)</option>
        <option value="oui">Oui, inclus</option>
        <option value="non">Non, exclus</option>
      </select>
    </div>
  );
}
