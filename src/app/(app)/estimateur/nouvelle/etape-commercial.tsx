"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { buttonClass, Input, Select } from "@/components/ui";
import { recommandationsProposees, type Bien, type Saisie } from "@/lib/estimation/snapshot";

type Props = {
  bien: Bien;
  prenom: string;
  setPrenom: (v: string) => void;
  commerciaux: { id: string; nom: string }[];
  commercialId: string | null;
  setCommercialId: (v: string | null) => void;
  recommandations: string[];
  setRecommandations: (r: string[]) => void;
  temoignages: { id: string; auteur: string; contexte: string; texte: string }[];
  temoignageIds: string[];
  setTemoignageIds: (ids: string[]) => void;
  sections: Saisie["sections"];
  setSections: (s: Saisie["sections"]) => void;
  saisonnaliteDisponible: boolean;
  comparaisonDisponible: boolean;
};

export function EtapeCommercial(p: Props) {
  const [libre, setLibre] = useState("");
  const proposees = recommandationsProposees(p.bien.equipements);
  const basculer = (r: string) => p.setRecommandations(p.recommandations.includes(r) ? p.recommandations.filter((x) => x !== r) : p.recommandations.length < 3 ? [...p.recommandations, r] : p.recommandations);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="c-prenom" className="block text-[0.82rem] font-medium">Prénom affiché dans le document *</label>
          <Input id="c-prenom" className="h-10" value={p.prenom} onChange={(e) => p.setPrenom(e.target.value.slice(0, 80))} />
        </div>
        <div className="space-y-1">
          <label htmlFor="c-commercial" className="block text-[0.82rem] font-medium">Commercial</label>
          <Select id="c-commercial" className="h-10" value={p.commercialId ?? ""} onChange={(e) => p.setCommercialId(e.target.value || null)}>
            <option value="">Responsable du prospect (par défaut)</option>
            {p.commerciaux.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Recommandations personnalisées ({p.recommandations.length}/3)</h3>
        <p className="text-xs text-ink-3">Cochées = validées par vous. Les équipements déjà présents ne sont pas proposés.</p>
        <ul className="space-y-1.5">
          {[...new Set([...p.recommandations, ...proposees])].map((r) => (
            <li key={r}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={p.recommandations.includes(r)} disabled={!p.recommandations.includes(r) && p.recommandations.length >= 3} onChange={() => basculer(r)} />
                {r}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input aria-label="Recommandation libre" className="h-9 text-sm" placeholder="Autre recommandation (validée par vous)…" value={libre} onChange={(e) => setLibre(e.target.value.slice(0, 200))} />
          <button type="button" disabled={libre.trim().length < 3 || p.recommandations.length >= 3} className={buttonClass("secondary", "sm")} onClick={() => (p.setRecommandations([...p.recommandations, libre.trim()]), setLibre(""))}>
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Témoignages vérifiés</h3>
        {p.temoignages.length ? (
          <ul className="space-y-1.5">
            {p.temoignages.map((t) => (
              <li key={t.id}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5" checked={p.temoignageIds.includes(t.id)} disabled={!p.temoignageIds.includes(t.id) && p.temoignageIds.length >= 2} onChange={(e) => p.setTemoignageIds(e.target.checked ? [...p.temoignageIds, t.id] : p.temoignageIds.filter((x) => x !== t.id))} />
                  <span>
                    « {t.texte} » — {t.auteur}
                    {t.contexte ? `, ${t.contexte}` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">Aucun témoignage vérifié (Paramètres → Témoignages) : aucune preuve sociale ne sera affichée.</p>
        )}
      </section>

      <section className="space-y-1.5">
        <h3 className="text-sm font-semibold">Sections du document</h3>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!p.comparaisonDisponible} checked={p.sections.comparaisonLongueDuree && p.comparaisonDisponible} onChange={(e) => p.setSections({ ...p.sections, comparaisonLongueDuree: e.target.checked })} />
          Comparaison avec la longue durée {!p.comparaisonDisponible ? "(loyer non renseigné)" : ""}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!p.saisonnaliteDisponible} checked={p.sections.saisonnalite && p.saisonnaliteDisponible} onChange={(e) => p.setSections({ ...p.sections, saisonnalite: e.target.checked })} />
          Saisonnalité sur 12 mois {!p.saisonnaliteDisponible ? "(12 mois chiffrés non disponibles)" : ""}
        </label>
      </section>
    </div>
  );
}
