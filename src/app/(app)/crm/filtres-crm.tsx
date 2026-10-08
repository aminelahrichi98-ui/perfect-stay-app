"use client";

import { useRouter } from "next/navigation";
import { SOURCES } from "@/lib/crm";

export function FiltresCrm({ responsable, source, responsables }: { responsable: string; source: string; responsables: { id: string; nom: string }[] }) {
  const router = useRouter();
  const aller = (c: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ responsable, source, ...c })) if (v) p.set(k, v);
    router.push(`/crm?${p}`);
  };
  const SELECT = "h-11 max-w-full min-w-0 rounded-xl border border-line-strong bg-surface px-3 pr-8 text-[0.95rem] font-medium shadow-card focus:border-wine-500 focus:ring-4 focus:ring-wine-500/15 focus:outline-none";
  return (
    <div className="flex flex-wrap gap-2">
      <label>
        <span className="sr-only">Filtrer par responsable</span>
        <select value={responsable} onChange={(e) => aller({ responsable: e.target.value })} className={SELECT}>
          <option value="">Tous les responsables</option>
          <option value="moi">Mes leads</option>
          <option value="aucun">Non attribués</option>
          {responsables.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nom}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Filtrer par source</span>
        <select value={source} onChange={(e) => aller({ source: e.target.value })} className={SELECT}>
          <option value="">Toutes les sources</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
