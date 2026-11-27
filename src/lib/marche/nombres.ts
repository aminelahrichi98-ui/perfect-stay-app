/*
  Lecture des nombres tels qu'ils apparaissent sur une capture ou dans un champ saisi :
  « 139 076 », « 139,076 », « 1 234,50 », « 1.234,50 », « 65,6 % », « MAD 9 500 », « 12,5k ».
  Rien n'est deviné : une écriture ambiguë ou illisible renvoie null avec la raison.
*/

export type Lecture = { valeur: number | null; pourcentage: boolean; probleme: string | null };

const VIDES = new Set(["", "-", "—", "–", "n/a", "na", "nd", "n.d.", "null", "none", "aucun", "aucune", "inconnu"]);

/** Clé de comparaison : minuscules, sans accents, sans ponctuation, espaces simples. */
export function cle(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function lireNombre(entree: string | number | null | undefined): Lecture {
  if (typeof entree === "number") return Number.isFinite(entree) ? { valeur: entree, pourcentage: false, probleme: null } : { valeur: null, pourcentage: false, probleme: "Nombre invalide." };
  const brut = (entree ?? "").trim();
  if (VIDES.has(brut.toLowerCase())) return { valeur: null, pourcentage: false, probleme: null };
  const pourcentage = brut.includes("%");
  // Multiplicateur « k » collé au nombre (12,5k ; 139K) : seul suffixe accepté
  const milliers = /\d\s*[kK](?![a-zA-Z])/.test(brut);
  let t = brut.replace(/[\s  ']/g, "");
  if (/\d[-–]\d/.test(t)) return { valeur: null, pourcentage, probleme: "Fourchette : saisissez le bas et le haut séparément." };
  if (/[~≈?]|\benv(iron)?\b|\babout\b/i.test(brut)) return { valeur: null, pourcentage, probleme: `« ${brut} » est approximatif ou incertain : saisissez la valeur exacte.` };
  // Un seul nombre attendu : « 1?9 0?6 » ou « 139 076 (2025) » sont illisibles
  if ((t.match(/\d[\d.,]*/g) ?? []).length > 1) return { valeur: null, pourcentage, probleme: `« ${brut} » contient plusieurs nombres : illisible.` };
  const negatif = /^[^0-9]*-/.test(t);
  t = t.replace(/[^0-9.,]/g, "");
  if (!/\d/.test(t)) return { valeur: null, pourcentage, probleme: `« ${brut} » n'est pas un nombre lisible.` };

  const virgule = t.lastIndexOf(",");
  const point = t.lastIndexOf(".");
  if (virgule >= 0 && point >= 0) {
    // Les deux : le dernier séparateur porte les décimales
    t = virgule > point ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (virgule >= 0 || point >= 0) {
    const sep = virgule >= 0 ? "," : ".";
    const morceaux = t.split(sep);
    const milliersReguliers = morceaux.length > 1 && /^\d{1,3}$/.test(morceaux[0]) && morceaux.slice(1).every((m) => /^\d{3}$/.test(m)) && morceaux[0] !== "0";
    if (morceaux.length > 2) {
      if (!milliersReguliers) return { valeur: null, pourcentage, probleme: `« ${brut} » est illisible.` };
      t = morceaux.join("");
    } else if (milliersReguliers && !pourcentage && !milliers) {
      // « 139,076 » ou « 139.076 » : séparateur de milliers (un montant ne s'écrit pas avec 3 décimales)
      t = morceaux.join("");
    } else t = morceaux.join(".");
  }
  let valeur = Number(t);
  if (!Number.isFinite(valeur)) return { valeur: null, pourcentage, probleme: `« ${brut} » est illisible.` };
  if (milliers) valeur *= 1000;
  if (negatif) valeur = -valeur;
  return { valeur: Math.round(valeur * 10000) / 10000, pourcentage, probleme: null };
}

/** Taux d'occupation en % (0 à 100). « 0,68 » sans signe % est ambigu : il n'est pas converti. */
export function lirePourcentage(entree: string | number | null | undefined): Lecture {
  const l = lireNombre(entree);
  if (l.valeur === null) return l;
  if (!l.pourcentage && typeof entree !== "number" && l.valeur > 0 && l.valeur <= 1) {
    return { valeur: null, pourcentage: false, probleme: `« ${entree} » est ambigu (fraction ou pourcentage ?) : saisissez une valeur en %.` };
  }
  if (l.valeur < 0 || l.valeur > 100) return { valeur: null, pourcentage: true, probleme: `Un pourcentage doit être compris entre 0 et 100 (lu : ${l.valeur}).` };
  return l;
}

export function lireEntier(entree: string | number | null | undefined): Lecture {
  const l = lireNombre(entree);
  if (l.valeur === null) return l;
  if (!Number.isInteger(l.valeur)) return { valeur: null, pourcentage: false, probleme: `« ${entree} » devrait être un nombre entier.` };
  return l;
}

const MOIS: Record<string, number> = {
  jan: 1, janv: 1, janvier: 1, january: 1, feb: 2, fev: 2, fevr: 2, fevrier: 2, february: 2, mar: 3, mars: 3, march: 3, apr: 4, avr: 4, avril: 4, april: 4,
  may: 5, mai: 5, jun: 6, juin: 6, june: 6, jul: 7, juil: 7, juillet: 7, july: 7, aug: 8, aou: 8, aout: 8, august: 8, sep: 9, sept: 9, septembre: 9, september: 9,
  oct: 10, octobre: 10, october: 10, nov: 11, novembre: 11, november: 11, dec: 12, decembre: 12, december: 12,
};

/** Numéro de mois depuis « Janvier », « Jan », « 01 »… ou null. */
export function lireMois(texte: string | null | undefined): number | null {
  const c = cle(texte ?? "");
  if (/^\d{1,2}$/.test(c)) {
    const n = Number(c);
    return n >= 1 && n <= 12 ? n : null;
  }
  return MOIS[c.split(" ")[0]] ?? null;
}

/** Date au format AAAA-MM-JJ depuis « 2025-11-01 », « 01/11/2025 » ou « 1 nov. 2025 ». Ordre jour/mois : français. */
export function lireDate(texte: string | null | undefined): string | null {
  const t = (texte ?? "").trim();
  let a: number, m: number, j: number;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (r) [a, m, j] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/))) [j, m, a] = [Number(r[1]), Number(r[2]), Number(r[3])];
  else if ((r = cle(t).match(/^(\d{1,2}) ([a-z]+) (\d{4})$/)) && MOIS[r[2]]) [j, m, a] = [Number(r[1]), MOIS[r[2]], Number(r[3])];
  else return null;
  const jour = `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
  const d = new Date(`${jour}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(jour) ? jour : null;
}

/** Code devise depuis « MAD », « DH », « Dhs », « € », « EUR », « $ »… ou null. */
export function lireDevise(texte: string | null | undefined): string | null {
  const t = (texte ?? "").trim();
  if (!t) return null;
  if (t.includes("€")) return "EUR";
  if (t.includes("$")) return "USD";
  const c = cle(t);
  if (/\b(mad|dh|dhs|dirham|dirhams)\b/.test(c)) return "MAD";
  if (/\b(eur|euro|euros)\b/.test(c)) return "EUR";
  if (/\b(usd|dollar|dollars)\b/.test(c)) return "USD";
  return /^[a-z]{3}$/.test(c) ? c.toUpperCase() : null;
}
