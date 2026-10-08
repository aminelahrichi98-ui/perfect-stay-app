/*
  Montant en toutes lettres, pour la mention « Arrêtée la présente facture à la somme de … » :
  « neuf cent quarante dirhams et trente-trois centimes ».
*/
const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
  "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0 à 99 */
function moinsDeCent(n: number, finDeNombre: boolean): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d <= 6) {
    if (u === 0) return DIZAINES[d];
    return `${DIZAINES[d]}${u === 1 ? " et un" : `-${UNITES[u]}`}`;
  }
  if (d === 7) return u === 1 ? "soixante et onze" : `soixante-${UNITES[10 + u]}`;
  if (d === 8) return u === 0 ? (finDeNombre ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITES[u]}`;
  return `quatre-vingt-${UNITES[10 + u]}`;
}

/** 0 à 999 */
function moinsDeMille(n: number, finDeNombre: boolean): string {
  const c = Math.floor(n / 100);
  const reste = n % 100;
  let texte = "";
  if (c >= 1) {
    texte = c === 1 ? "cent" : `${UNITES[c]} cent${reste === 0 && finDeNombre ? "s" : ""}`;
  }
  if (reste > 0) texte += `${texte ? " " : ""}${moinsDeCent(reste, finDeNombre)}`;
  return texte;
}

export function entierEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new Error("Nombre hors limites.");
  if (n === 0) return "zéro";
  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1e3);
  const reste = n % 1e3;
  const parties: string[] = [];
  if (milliards) parties.push(`${moinsDeMille(milliards, false)} milliard${milliards > 1 ? "s" : ""}`);
  if (millions) parties.push(`${moinsDeMille(millions, false)} million${millions > 1 ? "s" : ""}`);
  if (milliers) parties.push(milliers === 1 ? "mille" : `${moinsDeMille(milliers, false)} mille`);
  if (reste) parties.push(moinsDeMille(reste, true));
  return parties.join(" ");
}

/** 940,5 → « neuf cent quarante dirhams et cinquante centimes » */
export function montantEnLettres(montant: number): string {
  const centimesTotal = Math.round(montant * 100);
  const dirhams = Math.floor(centimesTotal / 100);
  const centimes = centimesTotal % 100;
  const partieDirhams = `${entierEnLettres(dirhams)} dirham${dirhams > 1 ? "s" : ""}`;
  if (centimes === 0) return partieDirhams;
  return `${partieDirhams} et ${entierEnLettres(centimes)} centime${centimes > 1 ? "s" : ""}`;
}
