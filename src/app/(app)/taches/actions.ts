"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { peutModifier } from "@/lib/auth";
import { analyserListe, LIGNES_MAX } from "@/lib/liste-taches";
import { POLES } from "@/lib/modules";
import { FREQUENCES } from "@/lib/recurrence";
import { nomSur, supprimer, urlEnvoiSigne, urlsLecture } from "@/lib/stockage";
import { COOKIE_VUE_TACHES, PRIORITES, STATUTS_TACHE, VUES_TACHES } from "@/lib/taches";
import { createClient } from "@/lib/supabase/server";
import { jourValide, nombre, texte, utilisateurActif, UUID, type Etat } from "../operations/droits";
import { genererRecurrences } from "./generation";

const BUCKET_TACHES = "taches";
const TAILLE_MAX_PIECE = 15 * 1024 * 1024;
const rafraichir = () => revalidatePath("/taches", "layout");

async function editeur() {
  const u = await utilisateurActif();
  if (!u || u.type === "prestataire" || !peutModifier(u, "taches")) return null;
  return u;
}

function lireTache(f: FormData) {
  const titre = texte(f, "titre");
  const pole = texte(f, "pole");
  const priorite = texte(f, "priorite");
  const statut = texte(f, "statut") || "a_faire";
  const echeance = texte(f, "echeance");
  const responsable = texte(f, "responsable");
  const logement = texte(f, "logement");
  if (!titre) return { erreur: "Donnez un titre à la tâche." } as const;
  if (!(POLES as readonly string[]).includes(pole)) return { erreur: "Choisissez le pôle." } as const;
  if (!PRIORITES.some((p) => p.value === priorite)) return { erreur: "Choisissez la priorité." } as const;
  if (!STATUTS_TACHE.some((s) => s.value === statut)) return { erreur: "Statut invalide." } as const;
  if (echeance && !jourValide(echeance)) return { erreur: "Date d'échéance invalide." } as const;
  if (responsable && !UUID.test(responsable)) return { erreur: "Responsable invalide." } as const;
  if (logement && !UUID.test(logement)) return { erreur: "Logement invalide." } as const;
  return {
    valeurs: {
      titre: titre.slice(0, 200),
      pole,
      priorite,
      statut,
      echeance: echeance || null,
      responsable_id: responsable || null,
      logement_id: logement || null,
      notes: texte(f, "notes").slice(0, 4000),
    },
  } as const;
}

export async function creerTache(_: Etat, formData: FormData): Promise<Etat> {
  if (!(await editeur())) return { erreur: "Vous n'avez pas le droit de créer une tâche." };
  const l = lireTache(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();
  const { data, error } = await supabase.from("taches").insert({ ...l.valeurs, type: "tache" }).select("id").single();
  if (error || !data) return { erreur: "La tâche n'a pas pu être créée. Réessayez." };
  rafraichir();
  redirect(`/taches/${data.id}?cree=1`);
}

export async function modifierTache(id: string, _: Etat, formData: FormData): Promise<Etat> {
  if (!UUID.test(id) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const l = lireTache(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();
  const { data, error } = await supabase.from("taches").update(l.valeurs).eq("id", id).eq("type", "tache").select("id");
  if (error || !data?.length) return { erreur: "Vous ne pouvez pas modifier cette tâche." };
  rafraichir();
  return { succes: "Tâche enregistrée." };
}

/** Changement de statut depuis le Kanban ou la case « terminé » (les ménages et la maintenance suivent leur propre circuit). */
export async function changerStatutTache(id: string, statut: string): Promise<Etat> {
  if (!UUID.test(id) || !STATUTS_TACHE.some((s) => s.value === statut) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("taches").update({ statut }).eq("id", id).eq("type", "tache").select("id");
  if (error || !data?.length) return { erreur: "Le statut n'a pas pu être modifié." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerTache(id: string): Promise<Etat> {
  if (!UUID.test(id) || !(await editeur())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: pieces } = await supabase.from("tache_pieces").select("chemin").eq("tache_id", id);
  const { data, error } = await supabase.from("taches").delete().eq("id", id).eq("type", "tache").select("id");
  if (error || !data?.length) return { erreur: "La tâche n'a pas pu être supprimée." };
  await supprimer(BUCKET_TACHES, (pieces ?? []).map((p) => p.chemin));
  rafraichir();
  redirect("/taches?supprime=1");
}

/* ------------------------------ Sous-tâches ------------------------------ */

export async function ajouterSousTache(tacheId: string, libelle: string): Promise<Etat> {
  const titre = libelle.trim().slice(0, 200);
  if (!UUID.test(tacheId) || !titre || !(await utilisateurActif())) return { erreur: "Écrivez la sous-tâche." };
  const supabase = await createClient();
  const { count } = await supabase.from("tache_sous_taches").select("id", { count: "exact", head: true }).eq("tache_id", tacheId);
  const { error } = await supabase.from("tache_sous_taches").insert({ tache_id: tacheId, libelle: titre, ordre: count ?? 0 });
  if (error) return { erreur: "La sous-tâche n'a pas pu être ajoutée." };
  rafraichir();
  return { succes: "ok" };
}

export async function cocherSousTache(id: string, fait: boolean): Promise<Etat> {
  if (!UUID.test(id) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tache_sous_taches").update({ fait }).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "La sous-tâche n'a pas pu être mise à jour." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerSousTache(id: string): Promise<Etat> {
  if (!UUID.test(id) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("tache_sous_taches").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "La sous-tâche n'a pas pu être supprimée." };
  rafraichir();
  return { succes: "ok" };
}

/* ------------------------------ Pièces jointes ------------------------------ */

export type PreparationPiece = { erreur: string } | { chemin: string; token: string; bucket: string };

export async function preparerPiece(args: { tacheId: string; nomFichier: string; taille: number }): Promise<PreparationPiece> {
  if (!UUID.test(args.tacheId) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  if (args.taille > TAILLE_MAX_PIECE) return { erreur: "Fichier trop lourd (maximum 15 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_TACHES, `${args.tacheId}/${crypto.randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_TACHES };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function enregistrerPiece(args: { tacheId: string; chemin: string; nom: string; type: string; taille: number }): Promise<Etat> {
  const u = await utilisateurActif();
  if (!u || !UUID.test(args.tacheId) || !args.chemin.startsWith(`${args.tacheId}/`) || args.chemin.includes("..")) return { erreur: "Fichier invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("tache_pieces").insert({
    tache_id: args.tacheId,
    chemin: args.chemin,
    nom: args.nom.slice(0, 200),
    type_mime: args.type.slice(0, 100),
    taille: Math.max(0, Math.round(args.taille)),
    created_by: u.id,
  });
  if (error) {
    await supprimer(BUCKET_TACHES, [args.chemin]);
    return { erreur: "La pièce jointe n'a pas pu être enregistrée." };
  }
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerPiece(id: string): Promise<Etat> {
  if (!UUID.test(id) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: p } = await supabase.from("tache_pieces").select("chemin").eq("id", id).maybeSingle();
  if (!p) return { erreur: "Cette pièce n'existe plus." };
  const { data, error } = await supabase.from("tache_pieces").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "La pièce n'a pas pu être supprimée." };
  await supprimer(BUCKET_TACHES, [p.chemin]);
  rafraichir();
  return { succes: "ok" };
}

export async function ouvrirPiece(id: string): Promise<{ url?: string; erreur?: string }> {
  if (!UUID.test(id) || !(await utilisateurActif())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data } = await supabase.from("tache_pieces").select("chemin").eq("id", id).maybeSingle();
  if (!data) return { erreur: "Pièce introuvable." };
  const url = (await urlsLecture(BUCKET_TACHES, [data.chemin], 120)).get(data.chemin);
  return url ? { url } : { erreur: "La pièce n'a pas pu être ouverte." };
}

/* ------------------------------ Coller une liste ------------------------------ */

export type LigneImport = { titre: string; sousTaches: string[] };

export async function importerListe(args: { pole: string; priorite: string; responsable: string; logement: string; echeance: string; lignes: LigneImport[] }): Promise<Etat & { nb?: number }> {
  if (!(await editeur())) return { erreur: "Vous n'avez pas le droit de créer des tâches." };
  if (!(POLES as readonly string[]).includes(args.pole)) return { erreur: "Choisissez le pôle." };
  if (!PRIORITES.some((p) => p.value === args.priorite)) return { erreur: "Choisissez la priorité." };
  if (args.responsable && !UUID.test(args.responsable)) return { erreur: "Responsable invalide." };
  if (args.logement && !UUID.test(args.logement)) return { erreur: "Logement invalide." };
  if (args.echeance && !jourValide(args.echeance)) return { erreur: "Date d'échéance invalide." };
  // Les lignes sont re-vérifiées côté serveur avec les mêmes règles que l'analyse
  const lignes = analyserListe(args.lignes.map((l) => [l.titre, ...l.sousTaches.map((s) => `  ${s}`)].join("\n")).join("\n")).slice(0, LIGNES_MAX);
  if (!lignes.length) return { erreur: "Aucune tâche à créer." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taches")
    .insert(
      lignes.map((l) => ({
        titre: l.titre,
        type: "tache",
        pole: args.pole,
        priorite: args.priorite,
        echeance: args.echeance || null,
        responsable_id: args.responsable || null,
        logement_id: args.logement || null,
      })),
    )
    .select("id");
  if (error || !data) return { erreur: "Les tâches n'ont pas pu être créées. Réessayez." };
  const sous = lignes.flatMap((l, i) => l.sousTaches.map((libelle, ordre) => ({ tache_id: data[i]?.id, libelle, ordre })));
  if (sous.length) await supabase.from("tache_sous_taches").insert(sous.filter((s) => s.tache_id));
  rafraichir();
  return { succes: "ok", nb: data.length };
}

/* ------------------------------ Récurrences ------------------------------ */

export async function enregistrerRecurrence(r: {
  id?: string;
  titre: string;
  pole: string;
  priorite: string;
  responsable: string;
  logement: string;
  frequence: string;
  jourSemaine: string;
  jourMois: string;
  notes: string;
}): Promise<Etat> {
  const u = await editeur();
  if (!u) return { erreur: "Vous n'avez pas le droit de modifier les récurrences." };
  const titre = r.titre.trim();
  if (!titre) return { erreur: "Donnez un titre à la tâche récurrente." };
  if (!(POLES as readonly string[]).includes(r.pole)) return { erreur: "Choisissez le pôle." };
  if (!PRIORITES.some((p) => p.value === r.priorite)) return { erreur: "Choisissez la priorité." };
  if (!FREQUENCES.some((f) => f.value === r.frequence)) return { erreur: "Choisissez la fréquence." };
  if (r.responsable && !UUID.test(r.responsable)) return { erreur: "Responsable invalide." };
  if (r.logement && !UUID.test(r.logement)) return { erreur: "Logement invalide." };
  const js = nombre(r.jourSemaine);
  const jm = nombre(r.jourMois);
  if (r.frequence === "semaine" && !(Number.isInteger(js) && js >= 0 && js <= 6)) return { erreur: "Choisissez le jour de la semaine." };
  if (r.frequence === "mois" && !(Number.isInteger(jm) && jm >= 1 && jm <= 31)) return { erreur: "Indiquez le jour du mois (de 1 à 31)." };

  const supabase = await createClient();
  const champs = {
    titre: titre.slice(0, 200),
    pole: r.pole,
    priorite: r.priorite,
    responsable_id: r.responsable || null,
    logement_id: r.logement || null,
    notes: r.notes.trim().slice(0, 2000),
    frequence: r.frequence,
    jour_semaine: r.frequence === "semaine" ? js : null,
    jour_mois: r.frequence === "mois" ? jm : null,
  };
  const { error } = r.id
    ? await supabase.from("tache_recurrences").update({ ...champs, derniere_echeance: null }).eq("id", r.id)
    : await supabase.from("tache_recurrences").insert({ ...champs, created_by: u.id });
  if (error) return { erreur: "La récurrence n'a pas pu être enregistrée." };
  await genererRecurrences();
  rafraichir();
  return { succes: "ok" };
}

export async function basculerRecurrence(id: string, actif: boolean): Promise<Etat> {
  if (!UUID.test(id) || !(await editeur())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("tache_recurrences").update({ actif }).eq("id", id);
  if (error) return { erreur: "La récurrence n'a pas pu être modifiée." };
  if (actif) await genererRecurrences();
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerRecurrence(id: string): Promise<Etat> {
  if (!UUID.test(id) || !(await editeur())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("tache_recurrences").delete().eq("id", id);
  if (error) return { erreur: "La récurrence n'a pas pu être supprimée." };
  rafraichir();
  return { succes: "ok" };
}

/* ------------------------------ Préférence de vue ------------------------------ */

export async function memoriserVue(vue: string) {
  if (!(VUES_TACHES as readonly string[]).includes(vue)) return;
  (await cookies()).set(COOKIE_VUE_TACHES, vue, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
