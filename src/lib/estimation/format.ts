/* Formats d'affichage de l'estimateur : montants en MAD sans décimales, valeurs absentes « non renseigné ». */

export const NON_RENSEIGNE = "non renseigné";

export function entier(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)).replace(/\s/g, " ");
}

export function montant(n: number | null | undefined, devise = "MAD"): string {
  return n === null || n === undefined || !Number.isFinite(n) ? NON_RENSEIGNE : `${entier(n)} ${devise}`;
}

export function pourcent(n: number | null | undefined, decimales = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NON_RENSEIGNE;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimales, minimumFractionDigits: 0 }).format(n).replace(/\s/g, " ")} %`;
}

export function nombre(n: number | null | undefined, decimales = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return NON_RENSEIGNE;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimales }).format(n).replace(/\s/g, " ");
}

/** AAAA-MM-JJ → JJ/MM/AAAA (ou « non renseigné ») */
export function jour(iso: string | null | undefined): string {
  if (!iso) return NON_RENSEIGNE;
  const [a, m, j] = iso.slice(0, 10).split("-");
  return a && m && j ? `${j}/${m}/${a}` : NON_RENSEIGNE;
}

export function periode(debut: string | null, fin: string | null, type = ""): string {
  if (!debut && !fin) return type || NON_RENSEIGNE;
  return `${debut ? jour(debut) : "?"} → ${fin ? jour(fin) : "?"}${type ? ` (${type})` : ""}`;
}

export function typologie(type: string, chambres: number | null, chambresMax: number | null = null): string {
  if (type === "studio") return "Studio";
  const t = { appartement: "Appartement", villa: "Villa", riad: "Riad", duplex: "Duplex", penthouse: "Penthouse" }[type] ?? (type || "Logement");
  if (chambres === null) return t;
  return `${t} ${chambresMax ? `${chambres} à ${chambresMax}` : chambres} ch.`;
}
