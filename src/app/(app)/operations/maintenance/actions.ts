"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aujourdhui } from "@/lib/dates";
import { REMBOURSEMENTS, STATUTS_INCIDENT, TYPES_INCIDENT } from "@/lib/operations";
import { BUCKET_OPERATIONS, urlsOperations } from "@/lib/operations-serveur";
import { nomSur, supprimer, urlEnvoiSigne } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, jourValide, nombre, texte, UUID, type Etat } from "../droits";

const rafraichir = () => revalidatePath("/operations", "layout");
const TAILLE_MAX_FACTURE = 15 * 1024 * 1024;

/** Les statuts de l'incident pilotent la tâche de maintenance qui lui est liée. */
const STATUT_TACHE = { signale: "a_faire", en_cours: "en_cours", resolu: "termine" } as const;

function lireIncident(f: FormData) {
  const logement = texte(f, "logement");
  const type = texte(f, "type");
  const titre = texte(f, "titre");
  const date = texte(f, "date");
  const responsable = texte(f, "responsable");
  if (!UUID.test(logement)) return { erreur: "Choisissez le logement." } as const;
  if (!TYPES_INCIDENT.some((t) => t.value === type)) return { erreur: "Choisissez le type d'incident." } as const;
  if (!titre) return { erreur: "Donnez un titre court à l'incident (ex. « Chauffe-eau en panne »)." } as const;
  if (!jourValide(date)) return { erreur: "Indiquez la date de l'incident." } as const;
  if (responsable && !UUID.test(responsable)) return { erreur: "Responsable invalide." } as const;
  return {
    valeurs: {
      logement_id: logement,
      type,
      titre: titre.slice(0, 160),
      description: texte(f, "description").slice(0, 2000),
      date_incident: date,
      intervenant: texte(f, "intervenant").slice(0, 160),
      responsable_id: responsable || null,
    },
  } as const;
}

export async function creerIncident(_: Etat, formData: FormData): Promise<Etat> {
  const u = await gestionnaire("maintenance");
  if (!u) return { erreur: "Vous n'avez pas le droit de déclarer un incident." };
  const l = lireIncident(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();

  // La tâche de maintenance liée apparaît dans les tâches de l'équipe
  const { data: tache, error: e1 } = await supabase
    .from("taches")
    .insert({
      titre: `Maintenance — ${l.valeurs.titre}`,
      type: "maintenance",
      pole: "Opérations",
      priorite: l.valeurs.type === "plainte" ? "important" : "normal",
      logement_id: l.valeurs.logement_id,
      echeance: l.valeurs.date_incident,
      responsable_id: l.valeurs.responsable_id,
    })
    .select("id")
    .single();
  if (e1 || !tache) return { erreur: "L'incident n'a pas pu être créé. Réessayez." };
  const { data, error } = await supabase.from("incidents").insert({ ...l.valeurs, tache_id: tache.id, created_by: u.id }).select("id").single();
  if (error || !data) {
    await supabase.from("taches").delete().eq("id", tache.id);
    return { erreur: "L'incident n'a pas pu être créé. Réessayez." };
  }
  rafraichir();
  redirect(`/operations/maintenance/${data.id}?cree=1`);
}

export async function modifierIncident(id: string, _: Etat, formData: FormData): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Vous n'avez pas le droit de modifier un incident." };
  if (!UUID.test(id)) return { erreur: "Incident invalide." };
  const l = lireIncident(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();
  const { data, error } = await supabase.from("incidents").update(l.valeurs).eq("id", id).select("tache_id").maybeSingle();
  if (error || !data) return { erreur: "L'incident n'a pas pu être modifié." };
  if (data.tache_id) {
    await supabase
      .from("taches")
      .update({ titre: `Maintenance — ${l.valeurs.titre}`, responsable_id: l.valeurs.responsable_id, logement_id: l.valeurs.logement_id })
      .eq("id", data.tache_id);
  }
  rafraichir();
  return { succes: "Incident enregistré." };
}

export async function changerStatutIncident(id: string, statut: string): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Action non autorisée." };
  const valide = STATUTS_INCIDENT.find((s) => s.value === statut);
  if (!UUID.test(id) || !valide) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .update({ statut, resolu_le: statut === "resolu" ? aujourdhui() : null })
    .eq("id", id)
    .select("tache_id")
    .maybeSingle();
  if (error || !data) return { erreur: "Le statut n'a pas pu être modifié." };
  if (data.tache_id) await supabase.from("taches").update({ statut: STATUT_TACHE[valide.value] }).eq("id", data.tache_id);
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerIncident(id: string): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data: inc } = await supabase.from("incidents").select("remboursement, tache_id").eq("id", id).maybeSingle();
  if (!inc) return { erreur: "Cet incident n'existe plus." };
  if (inc.remboursement === "rembourse") return { erreur: "Cet incident a été remboursé : il est conservé pour la comptabilité." };
  const [{ data: frais }, { data: photos }] = await Promise.all([
    supabase.from("incident_frais").select("justificatif").eq("incident_id", id),
    supabase.from("incident_photos").select("chemin, chemin_vignette").eq("incident_id", id),
  ]);
  const { error } = await supabase.from("incidents").delete().eq("id", id);
  if (error) return { erreur: "L'incident n'a pas pu être supprimé." };
  if (inc.tache_id) await supabase.from("taches").delete().eq("id", inc.tache_id);
  await supprimer(BUCKET_OPERATIONS, [
    ...(frais ?? []).map((f) => f.justificatif ?? ""),
    ...(photos ?? []).flatMap((p) => [p.chemin, p.chemin_vignette]),
  ]);
  rafraichir();
  redirect("/operations/maintenance?supprime=1");
}

/* ------------------------- Frais engagés et factures ------------------------- */

export type PreparationFacture = { erreur: string } | { chemin: string; token: string; bucket: string };

export async function preparerFacture(args: { incidentId: string; nomFichier: string; taille: number }): Promise<PreparationFacture> {
  if (!(await gestionnaire("maintenance")) || !UUID.test(args.incidentId)) return { erreur: "Vous n'avez pas le droit d'ajouter une facture." };
  if (args.taille > TAILLE_MAX_FACTURE) return { erreur: "Fichier trop lourd (maximum 15 Mo)." };
  try {
    const { chemin, token } = await urlEnvoiSigne(BUCKET_OPERATIONS, `frais/${args.incidentId}/${crypto.randomUUID()}-${nomSur(args.nomFichier)}`);
    return { chemin, token, bucket: BUCKET_OPERATIONS };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function ajouterFrais(args: {
  incidentId: string;
  date: string;
  description: string;
  montant: string;
  justificatif: { chemin: string; nom: string } | null;
}): Promise<Etat> {
  const u = await gestionnaire("maintenance");
  if (!u) return { erreur: "Vous n'avez pas le droit d'ajouter des frais." };
  if (!UUID.test(args.incidentId)) return { erreur: "Incident invalide." };
  if (!jourValide(args.date)) return { erreur: "Indiquez la date de la dépense." };
  const montant = nombre(args.montant);
  if (!Number.isFinite(montant) || montant <= 0) return { erreur: "Indiquez un montant supérieur à zéro (en MAD)." };
  if (args.justificatif && (!args.justificatif.chemin.startsWith(`frais/${args.incidentId}/`) || args.justificatif.chemin.includes(".."))) return { erreur: "Fichier invalide." };

  const supabase = await createClient();
  const { data: inc } = await supabase.from("incidents").select("remboursement").eq("id", args.incidentId).maybeSingle();
  if (!inc) return { erreur: "Cet incident n'existe plus." };
  if (inc.remboursement === "rembourse") return { erreur: "Cet incident est déjà remboursé. Ouvrez un nouvel incident pour de nouveaux frais." };
  const { error } = await supabase.from("incident_frais").insert({
    incident_id: args.incidentId,
    date_frais: args.date,
    description: args.description.trim().slice(0, 300),
    montant: Math.round(montant * 100) / 100,
    justificatif: args.justificatif?.chemin ?? null,
    justificatif_nom: args.justificatif?.nom.slice(0, 200) ?? null,
    created_by: u.id,
  });
  if (error) {
    if (args.justificatif) await supprimer(BUCKET_OPERATIONS, [args.justificatif.chemin]);
    return { erreur: "Les frais n'ont pas pu être enregistrés." };
  }
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerFrais(id: string): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(id)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("incident_frais").select("justificatif, incidents(remboursement)").eq("id", id).maybeSingle();
  if (!f) return { erreur: "Ces frais n'existent plus." };
  const incident = Array.isArray(f.incidents) ? f.incidents[0] : f.incidents;
  if (incident?.remboursement === "rembourse") return { erreur: "Ces frais ont été remboursés : ils sont conservés." };
  const { error } = await supabase.from("incident_frais").delete().eq("id", id);
  if (error) return { erreur: "Les frais n'ont pas pu être supprimés." };
  if (f.justificatif) await supprimer(BUCKET_OPERATIONS, [f.justificatif]);
  rafraichir();
  return { succes: "ok" };
}

export async function ouvrirFacture(fraisId: string): Promise<{ url?: string; erreur?: string }> {
  if (!(await gestionnaire("maintenance")) || !UUID.test(fraisId)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data } = await supabase.from("incident_frais").select("justificatif").eq("id", fraisId).maybeSingle();
  if (!data?.justificatif) return { erreur: "Aucune facture jointe." };
  const url = (await urlsOperations([data.justificatif])).get(data.justificatif);
  return url ? { url } : { erreur: "La facture n'a pas pu être ouverte." };
}

/* ------------------------------ Remboursement ------------------------------ */

export async function definirRemboursement(incidentId: string, statut: string, date: string, note: string): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(incidentId) || !REMBOURSEMENTS.some((r) => r.value === statut)) return { erreur: "Demande invalide." };
  if (statut === "rembourse" && !jourValide(date)) return { erreur: "Indiquez la date du remboursement." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .update({ remboursement: statut, rembourse_le: statut === "rembourse" ? date : null, remboursement_note: note.trim().slice(0, 300) })
    .eq("id", incidentId)
    .select("id");
  if (error || !data?.length) return { erreur: "Le remboursement n'a pas pu être enregistré." };
  rafraichir();
  return { succes: "ok" };
}

/** Le propriétaire a tout remboursé : on marque d'un coup tous les incidents en attente de ce logement. */
export async function marquerRembourses(logementId: string, date: string): Promise<Etat> {
  if (!(await gestionnaire("maintenance"))) return { erreur: "Action non autorisée." };
  if (!UUID.test(logementId) || !jourValide(date)) return { erreur: "Demande invalide." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .update({ remboursement: "rembourse", rembourse_le: date })
    .eq("logement_id", logementId)
    .eq("remboursement", "a_rembourser")
    .select("id");
  if (error) return { erreur: "Le remboursement n'a pas pu être enregistré." };
  if (!data?.length) return { erreur: "Aucun frais en attente pour ce logement." };
  rafraichir();
  return { succes: `${data.length} incident${data.length > 1 ? "s" : ""} marqué${data.length > 1 ? "s" : ""} comme remboursé${data.length > 1 ? "s" : ""}.` };
}
