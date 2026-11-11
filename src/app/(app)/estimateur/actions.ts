"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUtilisateur, peutModifier } from "@/lib/auth";
import {
  BUCKET_ESTIMATIONS,
  MAX_COMPARABLES,
  MAX_CONSEILS,
  MAX_PHOTOS,
  QUARTIERS,
  STANDINGS,
  TYPES_BIEN,
  VILLES,
} from "@/lib/estimateur";
import { createClient } from "@/lib/supabase/server";
import { nomSur, supprimer, urlEnvoiSigne } from "@/lib/stockage";

const TAILLE_MAX_PHOTO = 8 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Chemin fabriqué par preparerPhotos : un seul niveau, aucun « .. » */
const CHEMIN = /^photos\/[0-9a-f-]{36}-[A-Za-z0-9._-]{1,80}$/;

async function estimateur() {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "estimateur")) return null;
  return u;
}

export type EnvoiPhoto = { chemin: string; token: string };

/** Autorisations d'envoi direct vers le stockage privé, une par photo (déjà allégée par le navigateur). */
export async function preparerPhotos(fichiers: { nom: string; taille: number }[]): Promise<{ erreur?: string; envois?: EnvoiPhoto[] }> {
  if (!(await estimateur())) return { erreur: "Vous n'avez pas le droit de créer des estimations." };
  if (!fichiers.length || fichiers.length > MAX_PHOTOS + MAX_COMPARABLES) return { erreur: "Nombre de photos invalide." };
  if (fichiers.some((f) => !(f.taille > 0) || f.taille > TAILLE_MAX_PHOTO)) return { erreur: "Une photo est trop lourde (8 Mo maximum)." };
  try {
    const envois = await Promise.all(fichiers.map((f) => urlEnvoiSigne(BUCKET_ESTIMATIONS, `photos/${crypto.randomUUID()}-${nomSur(f.nom)}`)));
    return { envois };
  } catch {
    return { erreur: "L'envoi des photos n'a pas pu être préparé. Réessayez." };
  }
}

export type DonneesEstimation = {
  prenom: string;
  telephone: string;
  ville: string;
  quartier: string;
  typeBien: string;
  piscine: boolean;
  capacite: number | null;
  standing: string;
  photos: string[];
  comparables: { titre: string; quartier: string; chambres: number; brutBas: number; brutHaut: number; photo: string | null }[];
  conseils: string[];
  brutBas: number;
  brutHaut: number;
  netBas: number;
  netHaut: number;
};

const montant = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 1e9 ? Math.round(n) : NaN);

export async function enregistrerEstimation(d: DonneesEstimation): Promise<{ erreur?: string }> {
  const u = await estimateur();
  if (!u) return { erreur: "Vous n'avez pas le droit de créer des estimations." };

  const prenom = String(d.prenom ?? "").trim().slice(0, 80);
  if (!prenom) return { erreur: "Indiquez le prénom du propriétaire." };
  if (!(VILLES as readonly string[]).includes(d.ville)) return { erreur: "Ville non prise en charge." };
  if (!(QUARTIERS as readonly string[]).includes(d.quartier)) return { erreur: "Choisissez le quartier." };
  if (!TYPES_BIEN.some((t) => t.value === d.typeBien)) return { erreur: "Choisissez le type de bien." };
  if (!STANDINGS.some((s) => s.value === d.standing)) return { erreur: "Choisissez le standing." };
  const capacite = d.capacite === null ? null : Number(d.capacite);
  if (capacite !== null && !(Number.isInteger(capacite) && capacite > 0 && capacite < 100)) return { erreur: "La capacité doit être un nombre de voyageurs." };

  const photos = (d.photos ?? []).filter((c) => CHEMIN.test(c));
  if (!photos.length || photos.length > MAX_PHOTOS || photos.length !== (d.photos ?? []).length) return { erreur: "Ajoutez de 1 à 4 photos du bien." };

  const comparables = (d.comparables ?? []).slice(0, MAX_COMPARABLES + 1).map((c) => ({
    titre: String(c.titre ?? "").trim().slice(0, 140),
    quartier: String(c.quartier ?? "").trim().slice(0, 80),
    chambres: Math.max(0, Math.min(20, Math.round(Number(c.chambres) || 0))),
    brutBas: montant(c.brutBas),
    brutHaut: montant(c.brutHaut),
    photo: c.photo && CHEMIN.test(c.photo) ? c.photo : null,
  }));
  if (!comparables.length || comparables.length > MAX_COMPARABLES) return { erreur: "Ajoutez de 1 à 4 annonces comparables." };
  if (comparables.some((c) => !c.titre || !(c.brutBas > 0) || !(c.brutHaut >= c.brutBas))) {
    return { erreur: "Chaque annonce comparable doit avoir un titre et des revenus bas et haut (le haut supérieur ou égal au bas)." };
  }

  const conseils = (d.conseils ?? []).map((c) => String(c).trim().slice(0, 160)).filter(Boolean);
  if (conseils.length > MAX_CONSEILS) return { erreur: `Retenez ${MAX_CONSEILS} conseils au maximum.` };

  const [brutBas, brutHaut, netBas, netHaut] = [d.brutBas, d.brutHaut, d.netBas, d.netHaut].map(montant);
  if (![brutBas, brutHaut, netBas, netHaut].every((n) => n > 0) || brutHaut < brutBas || netHaut < netBas) {
    return { erreur: "La fourchette n'est pas valide : le haut doit être supérieur ou égal au bas." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estimations")
    .insert({
      created_by: u.id,
      prenom,
      telephone: String(d.telephone ?? "").trim().slice(0, 40),
      ville: d.ville,
      quartier: d.quartier,
      type_bien: d.typeBien,
      piscine: d.typeBien === "villa" && Boolean(d.piscine),
      capacite,
      standing: d.standing,
      brut_bas: brutBas,
      brut_haut: brutHaut,
      net_bas: netBas,
      net_haut: netHaut,
      photos,
      comparables,
      conseils,
    })
    .select("id")
    .single();
  if (error || !data) return { erreur: "L'estimation n'a pas pu être enregistrée. Réessayez dans un instant." };

  revalidatePath("/estimateur");
  redirect(`/estimation/${data.id}`);
}

export async function supprimerEstimation(id: string): Promise<{ erreur?: string }> {
  const u = await getUtilisateur();
  if (!u?.admin) return { erreur: "Seul un administrateur peut supprimer une estimation." };
  if (!UUID.test(id)) return { erreur: "Estimation invalide." };
  const supabase = await createClient();
  const { data } = await supabase.from("estimations").delete().eq("id", id).select("photos, comparables");
  if (!data?.length) return { erreur: "L'estimation n'a pas pu être supprimée." };
  const e = data[0];
  const chemins = [...(e.photos as string[]), ...(e.comparables as { photo: string | null }[]).map((c) => c.photo ?? "")];
  await supprimer(BUCKET_ESTIMATIONS, chemins.filter((c) => CHEMIN.test(c)));
  revalidatePath("/estimateur");
  return {};
}
