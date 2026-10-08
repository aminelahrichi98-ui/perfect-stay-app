"use client";

import { useRouter } from "next/navigation";

/** Liste déroulante « tous les logements / un logement » qui garde le mois et les autres filtres. */
export function FiltreLogement({
  chemin,
  logements,
  valeur,
  autres,
}: {
  chemin: string;
  logements: { id: string; nom: string }[];
  valeur: string;
  autres: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <label className="block">
      <span className="sr-only">Filtrer par logement</span>
      <select
        value={valeur}
        onChange={(e) => {
          const p = new URLSearchParams(autres);
          if (e.target.value) p.set("logement", e.target.value);
          router.push(`${chemin}?${p}`);
        }}
        className="block h-11 max-w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3.5 pr-9 font-medium shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
      >
        <option value="">Tous les logements</option>
        {logements.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nom}
          </option>
        ))}
      </select>
    </label>
  );
}
