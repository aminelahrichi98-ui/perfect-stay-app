"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { peutVoir } from "@/lib/auth";
import { ETAPES_CRM, normaliserTelephone, RESULTATS_APPEL, SOURCES } from "@/lib/crm";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gestionnaire, texte, UUID, type Etat } from "../operations/droits";

const rafraichir = () => revalidatePath("/crm", "layout");

function lireLead(f: FormData) {
  const nom = texte(f, "nom");
  const source = texte(f, "source") || "manuel";
  const responsable = texte(f, "responsable");
  if (!nom) return { erreur: "Indiquez le nom du prospect." } as const;
  if (!SOURCES.some((s) => s.value === source)) return { erreur: "Source invalide." } as const;
  if (responsable && !UUID.test(responsable)) return { erreur: "Responsable invalide." } as const;
  const email = texte(f, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Cette adresse e-mail ne semble pas valide." } as const;
  return {
    valeurs: {
      nom: nom.slice(0, 160),
      telephone: texte(f, "telephone").slice(0, 40),
      email: email.slice(0, 200),
      ville: texte(f, "ville").slice(0, 100),
      type_bien: texte(f, "type_bien").slice(0, 100),
      source,
      campagne: texte(f, "campagne").slice(0, 200),
      responsable_id: responsable || null,
      notes: texte(f, "notes").slice(0, 4000),
    },
  } as const;
}

export async function creerLead(_: Etat, formData: FormData): Promise<Etat> {
  const u = await gestionnaire("crm");
  if (!u) return { erreur: "Vous n'avez pas le droit d'ajouter un lead." };
  const l = lireLead(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_leads").insert({ ...l.valeurs, created_by: u.id }).select("id").single();
  if (error || !data) return { erreur: "Le lead n'a pas pu être créé. Réessayez." };
  rafraichir();
  redirect(`/crm/${data.id}?cree=1`);
}

export async function modifierLead(id: string, _: Etat, formData: FormData): Promise<Etat> {
  if (!(await gestionnaire("crm")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const l = lireLead(formData);
  if ("erreur" in l) return { erreur: l.erreur };
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_leads").update(l.valeurs).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Le lead n'a pas pu être modifié." };
  rafraichir();
  return { succes: "Fiche enregistrée." };
}

export async function changerEtape(id: string, etape: string, motif = ""): Promise<Etat> {
  if (!(await gestionnaire("crm")) || !UUID.test(id) || !ETAPES_CRM.some((e) => e.value === etape)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const champs: Record<string, string> = { etape };
  if (etape === "perdu") champs.motif_perte = motif.trim().slice(0, 300);
  const { data, error } = await supabase.from("crm_leads").update(champs).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "L'étape n'a pas pu être modifiée." };
  rafraichir();
  return { succes: "ok" };
}

export async function enregistrerAppel(leadId: string, resultat: string, note: string): Promise<Etat> {
  const u = await gestionnaire("crm");
  if (!u || !UUID.test(leadId) || !RESULTATS_APPEL.some((r) => r.value === resultat)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: lead } = await supabase.from("crm_leads").select("etape").eq("id", leadId).maybeSingle();
  if (!lead) return { erreur: "Ce lead n'existe plus." };
  const { error } = await supabase.from("crm_appels").insert({ lead_id: leadId, resultat, note: note.trim().slice(0, 1000), auteur_id: u.id });
  if (error) return { erreur: "L'appel n'a pas pu être enregistré." };
  // Un premier appel fait avancer le lead ; un rendez-vous pris aussi
  if (lead.etape === "nouveau") await supabase.from("crm_leads").update({ etape: resultat === "rdv_pris" ? "rdv" : "appele" }).eq("id", leadId);
  else if (resultat === "rdv_pris" && lead.etape === "appele") await supabase.from("crm_leads").update({ etape: "rdv" }).eq("id", leadId);
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerAppel(id: string): Promise<Etat> {
  if (!(await gestionnaire("crm")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { error } = await supabase.from("crm_appels").delete().eq("id", id);
  if (error) return { erreur: "L'appel n'a pas pu être supprimé." };
  rafraichir();
  return { succes: "ok" };
}

export async function supprimerLead(id: string): Promise<Etat> {
  if (!(await gestionnaire("crm")) || !UUID.test(id)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("crm_leads").delete().eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Le lead n'a pas pu être supprimé." };
  rafraichir();
  redirect("/crm?supprime=1");
}

/** « Lead signé → démarrer l'onboarding » : crée le logement en statut Onboarding à partir de la fiche du lead. */
export async function demarrerOnboarding(leadId: string): Promise<Etat & { logementId?: string; onboardingVisible?: boolean }> {
  const u = await gestionnaire("crm");
  if (!u || !UUID.test(leadId)) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data: lead } = await supabase.from("crm_leads").select("id, nom, ville, type_bien, logement_id, etape").eq("id", leadId).maybeSingle();
  if (!lead) return { erreur: "Ce lead n'existe plus." };
  if (lead.logement_id) return { succes: "ok", logementId: lead.logement_id, onboardingVisible: peutVoir(u, "onboarding") };
  if (lead.etape !== "signe") return { erreur: "Passez d'abord le lead à « Signé »." };

  // Le droit CRM suffit pour lancer l'onboarding : la création du logement se fait côté serveur
  const admin = createAdminClient();
  const type = /villa/i.test(lead.type_bien) ? "villa" : /riad/i.test(lead.type_bien) ? "riad" : "appartement";
  const { data: logement, error } = await admin
    .from("logements")
    .insert({ nom: `Logement de ${lead.nom}`.slice(0, 160), type, ville: lead.ville, statut: "onboarding", proprietaire_nom: lead.nom })
    .select("id")
    .single();
  if (error || !logement) return { erreur: "Le logement n'a pas pu être créé. Réessayez." };
  await supabase.from("crm_leads").update({ logement_id: logement.id }).eq("id", leadId);
  rafraichir();
  revalidatePath("/onboarding", "layout");
  revalidatePath("/logements");
  return { succes: "ok", logementId: logement.id, onboardingVisible: peutVoir(u, "onboarding") };
}

/* ------------------------------ Import CSV ------------------------------ */

export type LigneLead = { nom: string; telephone: string; email: string; ville: string; type_bien: string; notes: string };

export async function importerLeads(lignes: LigneLead[], source = "import"): Promise<Etat & { crees?: number; ignores?: number }> {
  const u = await gestionnaire("crm");
  if (!u) return { erreur: "Vous n'avez pas le droit d'importer des leads." };
  if (!lignes.length) return { erreur: "Aucune ligne à importer." };
  if (lignes.length > 2000) return { erreur: "Importez 2 000 leads au maximum à la fois." };
  const supabase = await createClient();

  // Un lead déjà connu (même téléphone ou même e-mail) n'est jamais importé deux fois
  const { data: existants } = await supabase.from("crm_leads").select("telephone, email").limit(20000);
  const tels = new Set((existants ?? []).map((l) => normaliserTelephone(l.telephone)).filter((t) => t.length >= 8));
  const mails = new Set((existants ?? []).map((l) => l.email.toLowerCase()).filter(Boolean));
  const aCreer: (LigneLead & { source: string; created_by: string })[] = [];
  let ignores = 0;
  for (const l of lignes) {
    const nom = l.nom.trim();
    const tel = normaliserTelephone(l.telephone);
    const mail = l.email.trim().toLowerCase();
    if (!nom && !tel && !mail) {
      ignores++;
      continue;
    }
    if ((tel.length >= 8 && tels.has(tel)) || (mail && mails.has(mail))) {
      ignores++;
      continue;
    }
    if (tel.length >= 8) tels.add(tel);
    if (mail) mails.add(mail);
    aCreer.push({ nom: (nom || l.telephone || l.email).slice(0, 160), telephone: l.telephone.slice(0, 40), email: l.email.slice(0, 200), ville: l.ville.slice(0, 100), type_bien: l.type_bien.slice(0, 100), notes: l.notes.slice(0, 4000), source, created_by: u.id });
  }
  if (aCreer.length) {
    const { error } = await supabase.from("crm_leads").insert(aCreer);
    if (error) return { erreur: "L'import n'a pas pu être terminé. Rien n'a été créé, réessayez." };
  }
  rafraichir();
  return { succes: "ok", crees: aCreer.length, ignores };
}
