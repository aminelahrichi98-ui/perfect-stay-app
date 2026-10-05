"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/** Code d'accès ou mot de passe wifi : masqué par défaut, affichable et copiable d'un geste. */
export function SecretCopiable({ valeur, libelle }: { valeur: string; libelle: string }) {
  const [visible, setVisible] = useState(false);
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      setVisible(true); // pas de presse-papiers disponible : on affiche pour recopier à la main
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="num min-w-[4ch] font-mono text-[0.95rem] tracking-wider">{visible ? valeur : "••••••"}</span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? `Masquer ${libelle}` : `Afficher ${libelle}`}
        className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={copier}
        aria-label={`Copier ${libelle}`}
        className="press grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-sunken hover:text-ink"
      >
        {copie ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
      </button>
    </span>
  );
}
