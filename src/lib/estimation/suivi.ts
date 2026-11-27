/*
  Suivi commercial des estimations. Les conversions viennent des étapes du CRM franchies APRÈS l'envoi
  (rendez-vous, signature). L'ouverture du PDF n'est pas mesurée (impossible de façon fiable) : pas de faux suivi.
*/

export type EstimationSuivi = { id: string; createdBy: string | null; createdAt: string; statut: string; modele: string; dureeS: number | null; quartier: string; leadId: string | null; envoyeeLe: string | null };
export type EtapeCrm = { leadId: string; etape: string; date: string };

export type Indicateurs = {
  creees: number;
  validees: number;
  envoyees: number;
  tempsMedianS: number | null;
  tauxEnvoi: number | null;
  /** Envoyées liées à un prospect : base des conversions */
  mesurables: number;
  rdv: number;
  signes: number;
  tauxRdv: number | null;
  tauxSigne: number | null;
};

const VALIDEES = new Set(["validee", "envoyee", "archivee"]);
const taux = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);

function mediane(v: number[]): number | null {
  if (!v.length) return null;
  const t = [...v].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
}

export function indicateurs(estimations: EstimationSuivi[], etapes: EtapeCrm[]): Indicateurs {
  const parLead = new Map<string, EtapeCrm[]>();
  for (const e of etapes) parLead.set(e.leadId, [...(parLead.get(e.leadId) ?? []), e]);
  const envoyees = estimations.filter((e) => e.envoyeeLe);
  const mesurables = envoyees.filter((e) => e.leadId);
  const apres = (e: EstimationSuivi, etapesCibles: string[]) => (parLead.get(e.leadId!) ?? []).some((x) => etapesCibles.includes(x.etape) && x.date >= e.envoyeeLe!);
  const rdv = mesurables.filter((e) => apres(e, ["rdv", "proposition", "signe"])).length;
  const signes = mesurables.filter((e) => apres(e, ["signe"])).length;
  const validees = estimations.filter((e) => VALIDEES.has(e.statut) || e.envoyeeLe).length;
  return {
    creees: estimations.length,
    validees,
    envoyees: envoyees.length,
    tempsMedianS: mediane(estimations.map((e) => e.dureeS).filter((d): d is number => d !== null && d > 0)),
    tauxEnvoi: taux(envoyees.length, validees),
    mesurables: mesurables.length,
    rdv,
    signes,
    tauxRdv: taux(rdv, mesurables.length),
    tauxSigne: taux(signes, mesurables.length),
  };
}

export function parGroupe(estimations: EstimationSuivi[], etapes: EtapeCrm[], cle: (e: EstimationSuivi) => string): { groupe: string; ind: Indicateurs }[] {
  const groupes = new Map<string, EstimationSuivi[]>();
  for (const e of estimations) groupes.set(cle(e), [...(groupes.get(cle(e)) ?? []), e]);
  return [...groupes.entries()].map(([groupe, liste]) => ({ groupe, ind: indicateurs(liste, etapes) })).sort((a, b) => b.ind.creees - a.ind.creees);
}
