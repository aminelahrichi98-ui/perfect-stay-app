"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUtilisateur, peutModifier, type Utilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  fusionnerDroits,
  isModuleKey,
  MODULE_BY_KEY,
  MODULE_KEYS,
  POLES,
  TYPES_UTILISATEUR,
  type Droits,
  type TypeUtilisateur,
} from "@/lib/modules";

export type EtatAction = { erreur?: string; succes?: string } | undefined;

/** Appelant : doit être un membre actif de l'équipe avec le droit de modifier les Paramètres. */
async function appelant(): Promise<Utilisateur | null> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "parametres")) return null;
  return u;
}

function lireDroits(formData: FormData): Droits {
  const droits: Droits = {};
  for (const key of MODULE_KEYS) {
    const modifier = formData.has(`modifier:${key}`);
    const voir = formData.has(`voir:${key}`) || modifier;
    if (voir) droits[key] = { voir, modifier };
  }
  return droits;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lireLogements(formData: FormData) {
  return formData.getAll("logements").map(String).filter((v) => UUID.test(v));
}

function lireIdentite(formData: FormData) {
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const type = String(formData.get("type") ?? "") as TypeUtilisateur;
  const poles = formData.getAll("poles").map(String).filter((p) => (POLES as readonly string[]).includes(p));
  return { prenom, nom, type, poles };
}

const MESSAGE_REFUS_DROITS = (modules: string[]) =>
  `Vous ne pouvez pas donner un accès que vous n'avez pas vous-même : ${modules
    .map((m) => (isModuleKey(m) ? MODULE_BY_KEY[m].label : m))
    .join(", ")}.`;

export async function creerUtilisateur(_: EtatAction, formData: FormData): Promise<EtatAction> {
  const moi = await appelant();
  if (!moi) return { erreur: "Vous n'avez pas le droit de créer des comptes." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { prenom, nom, type, poles } = lireIdentite(formData);
  const veutAdmin = formData.has("admin");

  if (!prenom || !nom) return { erreur: "Renseignez le prénom et le nom." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Cette adresse e-mail ne semble pas valide." };
  if (!TYPES_UTILISATEUR.some((t) => t.value === type)) return { erreur: "Choisissez un type de compte." };
  if (veutAdmin && !moi.admin) return { erreur: "Seul un administrateur peut créer un autre administrateur." };
  if (veutAdmin && type !== "equipe") return { erreur: "Un administrateur fait partie de l'équipe." };

  let droits: Droits = {};
  if (type !== "proprietaire" && !veutAdmin) {
    const r = fusionnerDroits(lireDroits(formData), {}, { admin: moi.admin, droits: moi.droits });
    if (r.refuses.length) return { erreur: MESSAGE_REFUS_DROITS(r.refuses) };
    droits = r.droits;
  }

  const admin = createAdminClient();

  const { data: existant } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existant) return { erreur: "Un compte existe déjà avec cette adresse e-mail." };

  const { data: invite, error: erreurInvitation } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { prenom, nom },
  });
  if (erreurInvitation || !invite.user) {
    return { erreur: "L'invitation n'a pas pu être envoyée. Vérifiez l'adresse e-mail et réessayez dans une minute." };
  }
  const id = invite.user.id;

  const { error: erreurProfil } = await admin.from("profiles").insert({
    id,
    email,
    prenom,
    nom,
    type,
    poles: type === "equipe" ? poles : [],
    is_admin: veutAdmin,
  });
  const lignes = Object.entries(droits).map(([module, d]) => ({
    user_id: id,
    module,
    can_view: d.voir,
    can_edit: d.modifier,
  }));
  const { error: erreurDroits } = lignes.length ? await admin.from("permissions").insert(lignes) : { error: null };

  const rattaches = type === "proprietaire" && peutModifier(moi, "logements") ? lireLogements(formData) : [];
  const { error: erreurLiens } = rattaches.length
    ? await admin.from("logement_proprietaires").insert(rattaches.map((logement_id) => ({ logement_id, user_id: id })))
    : { error: null };

  if (erreurProfil || erreurDroits || erreurLiens) {
    await admin.auth.admin.deleteUser(id); // on annule tout : pas de compte à moitié créé
    return { erreur: "Le compte n'a pas pu être créé. Rien n'a été enregistré, vous pouvez réessayer." };
  }

  revalidatePath("/parametres");
  redirect(`/parametres?cree=${encodeURIComponent(prenom)}`);
}

export async function modifierUtilisateur(id: string, _: EtatAction, formData: FormData): Promise<EtatAction> {
  const moi = await appelant();
  if (!moi) return { erreur: "Vous n'avez pas le droit de modifier des comptes." };
  if (id === moi.id) return { erreur: "Vous ne pouvez pas modifier vos propres droits." };

  const admin = createAdminClient();
  const { data: cible } = await admin.from("profiles").select("id, is_admin, type").eq("id", id).maybeSingle();
  if (!cible) return { erreur: "Ce compte n'existe plus." };
  if (cible.is_admin && !moi.admin) return { erreur: "Seul un administrateur peut modifier un autre administrateur." };

  const { prenom, nom, type, poles } = lireIdentite(formData);
  if (!prenom || !nom) return { erreur: "Renseignez le prénom et le nom." };
  if (!TYPES_UTILISATEUR.some((t) => t.value === type)) return { erreur: "Choisissez un type de compte." };
  const veutAdmin = moi.admin ? formData.has("admin") : cible.is_admin;
  if (veutAdmin && type !== "equipe") return { erreur: "Un administrateur fait partie de l'équipe." };

  const { data: lignesExistantes } = await admin.from("permissions").select("module, can_view, can_edit").eq("user_id", id);
  const existants: Droits = {};
  for (const l of lignesExistantes ?? []) {
    if (isModuleKey(l.module)) existants[l.module] = { voir: l.can_view, modifier: l.can_edit };
  }

  let droits: Droits = {};
  if (type !== "proprietaire" && !veutAdmin) {
    const r = fusionnerDroits(lireDroits(formData), existants, { admin: moi.admin, droits: moi.droits });
    if (r.refuses.length) return { erreur: MESSAGE_REFUS_DROITS(r.refuses) };
    droits = r.droits;
  }

  const { error: erreurProfil } = await admin
    .from("profiles")
    .update({ prenom, nom, type, poles: type === "equipe" ? poles : [], is_admin: veutAdmin, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (erreurProfil) return { erreur: "Les modifications n'ont pas pu être enregistrées. Réessayez." };

  await admin.from("permissions").delete().eq("user_id", id);
  const lignes = Object.entries(droits).map(([module, d]) => ({ user_id: id, module, can_view: d.voir, can_edit: d.modifier }));
  if (lignes.length) {
    const { error } = await admin.from("permissions").insert(lignes);
    if (error) return { erreur: "Les droits n'ont pas pu être enregistrés. Réessayez avant de quitter cette page." };
  }

  // Rattachement aux logements : seulement par quelqu'un qui a le droit de modifier les logements
  if (peutModifier(moi, "logements")) {
    await admin.from("logement_proprietaires").delete().eq("user_id", id);
    const rattaches = type === "proprietaire" ? lireLogements(formData) : [];
    if (rattaches.length) {
      const { error } = await admin.from("logement_proprietaires").insert(rattaches.map((logement_id) => ({ logement_id, user_id: id })));
      if (error) return { erreur: "Les logements rattachés n'ont pas pu être enregistrés. Réessayez." };
    }
  }

  revalidatePath("/parametres");
  return { succes: "Modifications enregistrées." };
}

export async function changerStatut(id: string, actif: boolean) {
  const moi = await appelant();
  if (!moi || id === moi.id) return;

  const admin = createAdminClient();
  const { data: cible } = await admin.from("profiles").select("is_admin").eq("id", id).maybeSingle();
  if (!cible || (cible.is_admin && !moi.admin)) return;

  await admin.from("profiles").update({ actif, updated_at: new Date().toISOString() }).eq("id", id);
  // « Bannir » coupe aussi les sessions déjà ouvertes ; l'historique reste intact.
  await admin.auth.admin.updateUserById(id, { ban_duration: actif ? "none" : "876000h" });
  revalidatePath("/parametres");
  revalidatePath(`/parametres/utilisateurs/${id}`);
}

export async function renvoyerEmail(id: string): Promise<EtatAction> {
  const moi = await appelant();
  if (!moi) return { erreur: "Action non autorisée." };
  const admin = createAdminClient();
  const { data: cible } = await admin.from("profiles").select("email").eq("id", id).maybeSingle();
  if (!cible) return { erreur: "Ce compte n'existe plus." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(cible.email);
  if (error) return { erreur: "L'e-mail n'a pas pu partir. Réessayez dans une minute." };
  return { succes: `E-mail envoyé à ${cible.email}.` };
}

export async function enregistrerEntreprise(_: EtatAction, formData: FormData): Promise<EtatAction> {
  const moi = await appelant();
  if (!moi) return { erreur: "Vous n'avez pas le droit de modifier ces informations." };

  const champ = (n: string) => String(formData.get(n) ?? "").trim();
  const supabase = await createClient(); // avec les droits de l'utilisateur : la base re-vérifie

  // Responsable des ménages : un membre actif de l'équipe, ou personne
  const demande = champ("responsable_menage");
  let responsableMenage: string | null = null;
  if (demande) {
    if (!UUID.test(demande)) return { erreur: "Le responsable des ménages choisi n'est pas valide." };
    const { data: membre } = await supabase.from("profiles").select("id").eq("id", demande).eq("type", "equipe").eq("actif", true).maybeSingle();
    if (!membre) return { erreur: "Le responsable des ménages doit être un membre actif de l'équipe." };
    responsableMenage = membre.id;
  }
  const { error } = await supabase
    .from("entreprise")
    .update({
      raison_sociale: champ("raison_sociale"),
      adresse: champ("adresse"),
      ice: champ("ice"),
      identifiant_fiscal: champ("identifiant_fiscal"),
      registre_commerce: champ("registre_commerce"),
      patente: champ("patente"),
      banque: champ("banque"),
      rib: champ("rib"),
      email: champ("email"),
      telephone: champ("telephone"),
      responsable_menage: responsableMenage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { erreur: "Les informations n'ont pas pu être enregistrées. Réessayez." };
  revalidatePath("/parametres/entreprise");
  return { succes: "Informations enregistrées. Elles apparaîtront sur les prochaines factures." };
}
