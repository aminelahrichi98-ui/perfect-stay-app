/** Transforme une liste collée (une action par ligne, avec ou sans puces) en tâches et sous-tâches. */

export type LigneListe = { titre: string; sousTaches: string[] };

const PUCE = /^(?:[-–—•*·▪◦●○▸►→]+|\d{1,3}[.)]|\[[ xX]?\]|[☐☑☒✅✔✓❑□■])\s*/u;
export const LONGUEUR_MAX = 160;
export const LIGNES_MAX = 100;

const nettoyer = (s: string) => {
  let t = s.trim();
  // Une puce peut être suivie d'une case à cocher : « - [ ] Appeler »
  for (let i = 0; i < 2 && PUCE.test(t); i++) t = t.replace(PUCE, "").trim();
  return t.replace(/\s+/g, " ").slice(0, LONGUEUR_MAX);
};

/**
 * Une ligne en retrait (au moins 2 espaces ou une tabulation) sous une ligne principale devient sa sous-tâche.
 * Les lignes vides et les puces seules sont ignorées.
 */
export function analyserListe(texte: string): LigneListe[] {
  const resultat: LigneListe[] = [];
  for (const brute of texte.replace(/\r/g, "").split("\n")) {
    const titre = nettoyer(brute);
    if (!titre) continue;
    const retrait = /^(?: {2,}|\t)/.test(brute);
    const derniere = resultat[resultat.length - 1];
    if (retrait && derniere) derniere.sousTaches.push(titre);
    else resultat.push({ titre, sousTaches: [] });
    if (resultat.length >= LIGNES_MAX) break;
  }
  return resultat;
}
