"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui";
import { LIBELLES_SOURCE_LOYER, POSTES_CHARGES, type Charges, type LongueDuree, type ParametresFinanciers, type ResultatCalcul } from "@/lib/estimation/calcul";
import { pourcent } from "@/lib/estimation/format";
import type { Saisie } from "@/lib/estimation/snapshot";
import { ChampNombre } from "../marche/import/[id]/champs";
import { TableauResultat } from "./resultat";

type Offre = { id: string; titre: string; description: string; dureeMois: number | null; conditions: string };

type Props = {
  defaut: ParametresFinanciers;
  surcharges: Saisie["surcharges"];
  setSurcharges: (s: Saisie["surcharges"]) => void;
  charges: Charges;
  setCharges: (c: Charges) => void;
  longueDuree: LongueDuree;
  setLongueDuree: (l: LongueDuree) => void;
  offres: Offre[];
  offreId: string | null;
  setOffreId: (id: string | null) => void;
  baseInconnue: boolean;
  baseConfirmee: boolean;
  setBaseConfirmee: (v: boolean) => void;
  resultat: ResultatCalcul;
  devise: string;
};

const enPourcent = (t: number) => Math.round(t * 10000) / 100;

export function EtapeFinances(p: Props) {
  const [personnaliser, setPersonnaliser] = useState(Object.values(p.surcharges).some((v) => v !== null));
  const f = { tauxPlateforme: p.surcharges.tauxPlateforme ?? p.defaut.tauxPlateforme, tauxCommission: p.surcharges.tauxCommission ?? p.defaut.tauxCommission, tvaCommission: p.surcharges.tvaCommission ?? p.defaut.tvaCommission };
  const taux = (cle: "tauxPlateforme" | "tauxCommission" | "tvaCommission") => (v: number | null) => p.setSurcharges({ ...p.surcharges, [cle]: v === null ? null : Math.min(0.99, v / 100) });

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Formule</h3>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={personnaliser} onChange={(e) => (setPersonnaliser(e.target.checked), !e.target.checked && p.setSurcharges({ tauxPlateforme: null, tauxCommission: null, tvaCommission: null, methodeScenarios: null }))} />
            Adapter pour ce logement
          </label>
        </div>
        <p className="text-sm text-ink-2">
          Frais de plateforme {pourcent(enPourcent(f.tauxPlateforme), 2)} puis commission Perfect Stay {pourcent(enPourcent(f.tauxCommission), 2)}
          {f.tvaCommission ? ` + TVA ${pourcent(enPourcent(f.tvaCommission), 2)} sur la commission` : " (TVA sur commission : 0 % dans les paramètres)"}, calculée {p.defaut.baseCommission === "brut" ? "sur les revenus bruts" : "après frais de plateforme"}.
        </p>
        {personnaliser ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <ChampNombre id="f-plateforme" label="Frais de plateforme" unite="%" valeur={enPourcent(f.tauxPlateforme)} onChange={taux("tauxPlateforme")} />
            <ChampNombre id="f-commission" label="Commission" unite="%" valeur={enPourcent(f.tauxCommission)} onChange={taux("tauxCommission")} />
            <ChampNombre id="f-tva" label="TVA sur commission" unite="%" valeur={enPourcent(f.tvaCommission)} onChange={taux("tvaCommission")} />
            <div className="space-y-1">
              <label htmlFor="f-methode" className="block text-[0.82rem] font-medium">Scénarios</label>
              <Select id="f-methode" className="h-10" value={p.surcharges.methodeScenarios ?? p.defaut.methodeScenarios} onChange={(e) => p.setSurcharges({ ...p.surcharges, methodeScenarios: e.target.value as "fourchette" | "percentiles" })}>
                <option value="fourchette">Fourchette bas / haut</option>
                <option value="percentiles">Percentiles PriceLabs</option>
              </Select>
            </div>
          </div>
        ) : null}
        {p.baseInconnue ? (
          <label className="flex items-start gap-2 rounded-lg bg-warn-bg px-3 py-2 text-sm text-warn">
            <input type="checkbox" className="mt-0.5" checked={p.baseConfirmee} onChange={(e) => p.setBaseConfirmee(e.target.checked)} />
            La source ne dit pas si ses revenus incluent les frais de plateforme. Je confirme la base retenue : revenus considérés comme incluant ces frais (déduits une seule fois).
          </label>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border border-line p-4">
        <h3 className="text-sm font-semibold">Charges mensuelles du propriétaire (facultatif)</h3>
        <p className="text-xs text-ink-3">Laissez vide ce qui n&apos;est pas connu : un poste vide est signalé « non inclus », jamais compté à 0.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {POSTES_CHARGES.map((c) => (
            <ChampNombre key={c.cle} id={`ch-${c.cle}`} label={c.libelle} unite="MAD" valeur={p.charges[c.cle]} onChange={(v) => p.setCharges({ ...p.charges, [c.cle]: v })} />
          ))}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-line p-4">
        <h3 className="text-sm font-semibold">Comparaison avec la location longue durée</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="ld-source" className="block text-[0.82rem] font-medium">Source du loyer</label>
            <Select id="ld-source" className="h-10" value={p.longueDuree.source ?? ""} onChange={(e) => p.setLongueDuree({ ...p.longueDuree, source: (e.target.value || null) as LongueDuree["source"] })}>
              <option value="">Pas de comparaison</option>
              {Object.entries(LIBELLES_SOURCE_LOYER).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>
          {p.longueDuree.source === "fourchette" ? (
            <>
              <ChampNombre id="ld-bas" label="Loyer bas (MAD/mois)" valeur={p.longueDuree.loyerBas} onChange={(v) => p.setLongueDuree({ ...p.longueDuree, loyerBas: v })} />
              <ChampNombre id="ld-haut" label="Loyer haut (MAD/mois)" valeur={p.longueDuree.loyerHaut} onChange={(v) => p.setLongueDuree({ ...p.longueDuree, loyerHaut: v })} />
            </>
          ) : p.longueDuree.source ? (
            <ChampNombre id="ld-loyer" label="Loyer (MAD/mois)" valeur={p.longueDuree.loyer} onChange={(v) => p.setLongueDuree({ ...p.longueDuree, loyer: v })} />
          ) : null}
          {p.longueDuree.source ? (
            <>
              <ChampNombre id="ld-charges" label="Charges en longue durée (MAD/mois)" valeur={p.longueDuree.charges} onChange={(v) => p.setLongueDuree({ ...p.longueDuree, charges: v })} />
              <div className="space-y-1">
                <label htmlFor="ld-date" className="block text-[0.82rem] font-medium">Date de l&apos;information</label>
                <Input id="ld-date" type="date" className="h-10" value={p.longueDuree.date ?? ""} onChange={(e) => p.setLongueDuree({ ...p.longueDuree, date: e.target.value || null })} />
              </div>
            </>
          ) : null}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-line p-4">
        <h3 className="text-sm font-semibold">Offre commerciale</h3>
        {p.offres.length ? (
          <Select aria-label="Offre" className="h-10 max-w-md" value={p.offreId ?? ""} onChange={(e) => p.setOffreId(e.target.value || null)}>
            <option value="">Aucune offre</option>
            {p.offres.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titre}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm text-ink-3">Aucune offre active (Paramètres → Offres). Rien ne sera affiché.</p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-sunken/30 p-4">
        <h3 className="text-sm font-semibold">Résultat (détail interne)</h3>
        <TableauResultat r={p.resultat} devise={p.devise} />
      </section>
    </div>
  );
}
