"use client";

import { arrondir, mensuel, type ResultatCalcul } from "@/lib/estimation/calcul";
import { entier, montant, pourcent } from "@/lib/estimation/format";

const NOMS = { prudent: "Prudent", central: "Central", haut: "Haut" } as const;

/** Résultat du calcul, détaillé (au dirham) pour l'équipe ; le document client arrondit. */
export function TableauResultat({ r, devise }: { r: ResultatCalcul; devise: string }) {
  if (!r.scenarios.length) return <p className="text-sm text-ink-3">Aucun scénario : données de marché manquantes.</p>;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs text-ink-3">
            <tr>
              <th className="py-1.5 pr-3 font-medium">Annuel</th>
              {r.scenarios.map((s) => (
                <th key={s.cle} className="py-1.5 pr-3 font-medium">
                  {NOMS[s.cle]}
                  <span className="block font-normal">{s.source}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="num divide-y divide-line">
            <Ligne libelle="Revenus bruts (marché)" valeurs={r.scenarios.map((s) => s.brut)} devise={devise} />
            {r.deductionPlateforme ? <Ligne libelle="− Frais de plateforme" valeurs={r.scenarios.map((s) => -s.fraisPlateforme)} devise={devise} /> : null}
            {r.scenarios.some((s) => s.menage > 0) ? <Ligne libelle="− Part ménage" valeurs={r.scenarios.map((s) => -s.menage)} devise={devise} /> : null}
            <Ligne libelle="− Commission Perfect Stay" valeurs={r.scenarios.map((s) => -s.commission)} devise={devise} />
            <Ligne libelle="Revenu propriétaire après commissions" valeurs={r.scenarios.map((s) => s.apresCommissions)} devise={devise} fort />
            <Ligne libelle="Soit par mois" valeurs={r.scenarios.map((s) => mensuel(s.apresCommissions))} devise={devise} />
            {r.chargesMensuelles !== null ? <Ligne libelle="Résultat après charges (avant fiscalité) / mois" valeurs={r.scenarios.map((s) => (s.resultat === null ? null : mensuel(s.resultat)))} devise={devise} /> : null}
          </tbody>
        </table>
      </div>
      {r.partProprietaire !== null ? <p className="text-xs text-ink-3">Part conservée par le propriétaire : {pourcent(r.partProprietaire * 100, 1)} des revenus bruts.</p> : null}
      {r.comparaison ? (
        <p className="text-sm">
          Longue durée : {montant(r.comparaison.loyerMensuel, devise)}/mois{r.comparaison.loyerDerive ? " (milieu de fourchette)" : ""} · courte durée (central) : {montant(r.comparaison.courteMensuelle, devise)}/mois ·{" "}
          <span className={r.comparaison.differenceMensuelle >= 0 ? "font-medium text-ok" : "font-medium text-danger"}>
            {r.comparaison.differenceMensuelle >= 0 ? "+" : "−"}
            {entier(Math.abs(r.comparaison.differenceMensuelle))} {devise}/mois
            {r.comparaison.pourcentage !== null ? ` (${r.comparaison.pourcentage >= 0 ? "+" : ""}${pourcent(r.comparaison.pourcentage)})` : ""}
          </span>
        </p>
      ) : null}
      {r.offre?.valeurPonctuelle ? <p className="text-xs text-ink-3">Offre « {r.offre.titre} » : avantage ponctuel estimé à {montant(arrondir(r.offre.valeurPonctuelle), devise)}, présenté séparément du revenu récurrent.</p> : null}
      {r.bloquants.map((b) => (
        <p key={b} className="text-sm text-danger">
          {b}
        </p>
      ))}
      {r.avertissements.map((a) => (
        <p key={a} className="text-xs text-warn">
          {a}
        </p>
      ))}
    </div>
  );
}

function Ligne({ libelle, valeurs, devise, fort }: { libelle: string; valeurs: (number | null)[]; devise: string; fort?: boolean }) {
  return (
    <tr className={fort ? "font-semibold" : undefined}>
      <td className="py-1.5 pr-3 font-sans">{libelle}</td>
      {valeurs.map((v, i) => (
        <td key={i} className="py-1.5 pr-3">
          {v === null ? "—" : `${v < 0 ? "−" : ""}${entier(Math.abs(v))} ${devise}`}
        </td>
      ))}
    </tr>
  );
}
