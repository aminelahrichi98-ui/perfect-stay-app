/*
  Logement décrit dans le formulaire du site (Revenue Audit) → fiche logement du CRM.
  Seules les valeurs réellement envoyées et lisibles sont reprises ; le reste reste vide (non renseigné).
*/
import { cle, lireEntier, lireNombre } from "../marche/nombres.ts";
import { bienVide, type Bien } from "./snapshot.ts";

type Charge = {
  ville?: string;
  quartier?: string;
  bien?: { typeBien?: unknown; surface?: unknown; chambres?: unknown; capacite?: unknown; ameublement?: unknown };
  situation?: Record<string, unknown> & { situation?: unknown };
};

const texte = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "");

export function typeDepuisSite(v: unknown): Bien["type_logement"] {
  const c = cle(texte(v, 60));
  if (!c) return null;
  for (const t of ["studio", "duplex", "penthouse", "villa", "riad"] as const) if (c.includes(t)) return t;
  if (c.includes("appartement") || c.includes("apartment")) return "appartement";
  return null;
}

export function bienDepuisSite(c: Charge): Bien | null {
  const b = bienVide();
  b.ville = texte(c.ville, 80);
  b.quartier = texte(c.quartier, 120);
  b.type_logement = typeDepuisSite(c.bien?.typeBien);
  const chambresTexte = texte(c.bien?.chambres, 10);
  const ch = chambresTexte.includes("+") ? null : lireEntier(chambresTexte).valeur; // « 3+ » : nombre exact inconnu
  b.chambres = b.type_logement === "studio" ? 0 : ch !== null && ch >= 0 && ch <= 20 ? ch : null;
  const surface = lireEntier(texte(c.bien?.surface, 10)).valeur;
  b.surface = surface !== null && surface >= 5 && surface <= 5000 ? surface : null;
  const capacite = lireEntier(texte(c.bien?.capacite, 10)).valeur;
  b.capacite = capacite !== null && capacite >= 1 && capacite <= 50 ? capacite : null;
  const meuble = cle(texte(c.bien?.ameublement, 40));
  b.ameublement = meuble.includes("non") ? "non_meuble" : meuble.includes("partiel") ? "partiel" : meuble.includes("meuble") ? "meuble" : null;
  const situation = texte(c.situation?.situation, 20);
  b.exploitation = situation === "longue" || situation === "courte" || situation === "vacant" ? situation : null;
  const montant = (v: unknown) => {
    const n = lireNombre(texte(v, 30)).valeur;
    return n !== null && n >= 0 && n < 1e7 ? n : null;
  };
  if (situation === "longue") b.loyer_longue_duree = montant(c.situation?.loyer);
  if (situation === "courte") b.revenus_courte_mensuels = montant(c.situation?.revenuMensuel);
  const lien = texte(c.situation?.lienAnnonce, 500);
  b.lien_annonce = /^https:\/\/[^\s]+$/.test(lien) ? lien : "";
  const renseigne = b.quartier || b.type_logement || b.chambres !== null || b.surface !== null;
  return renseigne ? b : null;
}
