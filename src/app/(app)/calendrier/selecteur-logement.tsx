"use client";

import { useRouter } from "next/navigation";

export function SelecteurLogement({ logements, valeur, mois }: { logements: { id: string; nom: string }[]; valeur: string; mois: string }) {
  const router = useRouter();
  return (
    <label className="block">
      <span className="sr-only">Logement affiché</span>
      <select
        value={valeur}
        onChange={(e) => router.push(`/calendrier?vue=mois&logement=${e.target.value}&mois=${mois}`)}
        className="block h-11 min-w-0 max-w-full rounded-xl border border-line-strong bg-surface px-3.5 pr-9 font-medium shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none"
      >
        {logements.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nom}
          </option>
        ))}
      </select>
    </label>
  );
}
