"use server";

import { revalidatePath } from "next/cache";
import { CATEGORIES_STOCK } from "@/lib/operations";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, nombre, UUID, type Etat } from "../droits";

const rafraichir = () => revalidatePath("/operations/stock", "layout");

export async function enregistrerArticle(a: { id?: string; nom: string; categorie: string; unite: string; seuil: string; actif: boolean }): Promise<Etat> {
  if (!(await gestionnaire("stock"))) return { erreur: "Vous n'avez pas le droit de modifier le stock." };
  const nom = a.nom.trim();
  const seuil = nombre(a.seuil || "0");
  if (!nom) return { erreur: "Donnez un nom à l'article." };
  if (!CATEGORIES_STOCK.some((c) => c.value === a.categorie)) return { erreur: "Choisissez une catégorie." };
  if (!Number.isInteger(seuil) || seuil < 0) return { erreur: "Le seuil d'alerte doit être un nombre entier (0 pour aucune alerte)." };
  if (a.id && !UUID.test(a.id)) return { erreur: "Article invalide." };
  const supabase = await createClient();
  const champs = { nom: nom.slice(0, 120), categorie: a.categorie, unite: a.unite.trim().slice(0, 30) || "pièce", seuil_alerte: seuil, actif: a.actif };
  const { error } = a.id ? await supabase.from("stock_articles").update(champs).eq("id", a.id) : await supabase.from("stock_articles").insert(champs);
  if (error) return { erreur: "L'article n'a pas pu être enregistré." };
  rafraichir();
  return { succes: "ok" };
}

export type MouvementSaisi = {
  articleId: string;
  genre: "entree" | "transfert" | "sortie" | "inventaire";
  /** Pour une sortie ou un inventaire : où ? « » = la réserve. Pour un transfert : le logement de destination. */
  lieu: string;
  quantite: string;
  note: string;
  date: string;
};

export async function enregistrerMouvement(m: MouvementSaisi): Promise<Etat> {
  const u = await gestionnaire("stock");
  if (!u) return { erreur: "Vous n'avez pas le droit de modifier le stock." };
  if (!UUID.test(m.articleId)) return { erreur: "Choisissez l'article." };
  if (m.lieu && !UUID.test(m.lieu)) return { erreur: "Lieu invalide." };
  if (!jourValide(m.date)) return { erreur: "Indiquez la date." };
  const q = nombre(m.quantite);
  if (!Number.isInteger(q) || (m.genre === "inventaire" ? q < 0 : q <= 0)) {
    return { erreur: m.genre === "inventaire" ? "Indiquez la quantité réellement comptée (0 ou plus)." : "Indiquez une quantité entière supérieure à zéro." };
  }
  if (m.genre === "transfert" && !m.lieu) return { erreur: "Choisissez le logement de destination." };

  const supabase = await createClient();
  const { data: niveaux } = await supabase.from("stock_niveaux").select("logement_id, quantite").eq("article_id", m.articleId);
  const en = (logementId: string | null) => (niveaux ?? []).find((n) => n.logement_id === (logementId ?? null))?.quantite ?? 0;
  const lieu = m.lieu || null;
  const base = { article_id: m.articleId, note: m.note.trim().slice(0, 300), date_mouvement: m.date, created_by: u.id };
  let lignes: (typeof base & { logement_id: string | null; type: string; quantite: number; lot?: string })[] = [];

  if (m.genre === "entree") {
    lignes = [{ ...base, logement_id: null, type: "entree", quantite: q }];
  } else if (m.genre === "sortie") {
    if (en(lieu) < q) return { erreur: `Il n'y en a que ${en(lieu)} à cet endroit.` };
    lignes = [{ ...base, logement_id: lieu, type: "sortie", quantite: -q }];
  } else if (m.genre === "transfert") {
    if (en(null) < q) return { erreur: `Il n'y en a que ${en(null)} en réserve.` };
    const lot = crypto.randomUUID();
    lignes = [
      { ...base, logement_id: null, type: "transfert", quantite: -q, lot },
      { ...base, logement_id: lieu, type: "transfert", quantite: q, lot },
    ];
  } else {
    const ecart = q - en(lieu);
    if (ecart === 0) return { erreur: "La quantité comptée est déjà celle enregistrée." };
    lignes = [{ ...base, logement_id: lieu, type: "inventaire", quantite: ecart }];
  }
  const { error } = await supabase.from("stock_mouvements").insert(lignes);
  if (error) return { erreur: "Le mouvement n'a pas pu être enregistré." };
  rafraichir();
  return { succes: "ok" };
}
