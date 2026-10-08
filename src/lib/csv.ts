/** Lecture d'un fichier CSV (virgule, point-virgule ou tabulation ; guillemets et accents compris). */

export function analyserCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const premiere = t.split("\n", 1)[0] ?? "";
  const choix = [";", ",", "\t"].map((d) => ({ d, n: premiere.split(d).length }));
  const delimiteur = choix.sort((a, b) => b.n - a.n)[0].d;

  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = "";
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') {
        cellule += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else cellule += c;
    } else if (c === '"') guillemets = true;
    else if (c === delimiteur) {
      ligne.push(cellule.trim());
      cellule = "";
    } else if (c === "\n") {
      ligne.push(cellule.trim());
      if (ligne.some((x) => x !== "")) lignes.push(ligne);
      ligne = [];
      cellule = "";
    } else cellule += c;
  }
  ligne.push(cellule.trim());
  if (ligne.some((x) => x !== "")) lignes.push(ligne);
  return lignes;
}

const simplifier = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export type ChampLead = "nom" | "telephone" | "email" | "ville" | "type_bien" | "notes" | "";

const INDICES: Record<Exclude<ChampLead, "">, string[]> = {
  nom: ["nom", "name", "full name", "nom complet", "contact", "prospect", "lead"],
  telephone: ["telephone", "tel", "phone", "mobile", "gsm", "whatsapp", "numero"],
  email: ["email", "e mail", "mail", "courriel"],
  ville: ["ville", "city", "localisation"],
  type_bien: ["type de bien", "type bien", "bien", "property", "type de logement", "logement"],
  notes: ["note", "notes", "commentaire", "remarque", "message", "description"],
};

/** Devine à quel champ du CRM correspond chaque colonne (modifiable ensuite par l'utilisateur). */
export function deviner(entetes: string[]): ChampLead[] {
  const pris = new Set<string>();
  return entetes.map((e) => {
    const s = simplifier(e);
    for (const [champ, mots] of Object.entries(INDICES)) {
      if (pris.has(champ)) continue;
      if (mots.some((m) => s === m || s.includes(m))) {
        pris.add(champ);
        return champ as ChampLead;
      }
    }
    return "";
  });
}
