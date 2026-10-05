"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUtilisateur, peutModifier, peutVoir, type Utilisateur } from "@/lib/auth";
import { tamponnerImage } from "@/lib/horodatage";
import {
  PLATEFORMES,
  ROLES_CONTACT,
  STATUTS_LOGEMENT,
  TAILLE_MAX_DOCUMENT,
  TAILLE_MAX_PHOTO,
  TYPES_DOCUMENT,
  TYPES_LOGEMENT,
  type TypeDocument,
} from "@/lib/logements";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_DOCUMENTS,
  BUCKET_PHOTOS,
  cheminDuLogement,
  deposer,
  fabriquerPhoto,
  nouveauChemin,
  supprimer,
  telecharger,
  urlEnvoiSigne,
  urlsLecture,
} from "@/lib/stockage";

export type EtatLogement = { erreur?: string; succes?: string } | undefined;

async function gestionnaire(): Promise<Utilisateur | null> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutModifier(u, "logements")) return null;
  return u;
}

const nombre = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};
const texte = (formData: FormData, nom: string) => String(formData.get(nom) ?? "").trim();

type Lecture = {
  ok: false;
  erreur: string;
} | {
  ok: true;
  logement: Record<string, string | number | null>;
  ical: { plateforme: string; url: string }[];
  contacts: { role: string; nom: string; telephone: string }[];
  proprietaires: string[];
};

function lireFormulaire(formData: FormData): Lecture {
  const nom = texte(formData, "nom");
  if (!nom) return { ok: false, erreur: "Donnez un nom au logement." };

  const type = texte(formData, "type");
  if (!TYPES_LOGEMENT.some((t) => t.value === type)) return { ok: false, erreur: "Choisissez le type de logement." };
  const statut = texte(formData, "statut");
  if (!STATUTS_LOGEMENT.some((s) => s.value === statut)) return { ok: false, erreur: "Choisissez le statut du logement." };

  const frais = nombre(formData.get("frais_menage"));
  if (!(frais >= 0)) return { ok: false, erreur: "Les frais de ménage doivent être un montant en MAD (0 ou plus)." };
  const taux = nombre(formData.get("taux_commission"));
  if (!(taux >= 0 && taux <= 100)) return { ok: false, erreur: "Le taux de commission doit être compris entre 0 et 100 %." };

  const capaciteBrute = texte(formData, "capacite");
  const capacite = capaciteBrute ? Number(capaciteBrute) : null;
  if (capacite !== null && !(Number.isInteger(capacite) && capacite > 0)) {
    return { ok: false, erreur: "La capacité doit être un nombre de voyageurs (1 ou plus)." };
  }

  const mapsUrl = texte(formData, "maps_url");
  if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) return { ok: false, erreur: "Le lien Google Maps doit commencer par https://" };

  const ical: { plateforme: string; url: string }[] = [];
  const urls = formData.getAll("ical_url").map(String);
  const plateformes = formData.getAll("ical_plateforme").map(String);
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) return { ok: false, erreur: "Un lien de calendrier doit commencer par https:// (copiez-le depuis Airbnb)." };
    const plateforme = (PLATEFORMES as readonly string[]).includes(plateformes[i]) ? plateformes[i] : "Autre";
    if (!ical.some((c) => c.url === url)) ical.push({ plateforme, url });
  }

  const contacts: { role: string; nom: string; telephone: string }[] = [];
  const roles = formData.getAll("contact_role").map(String);
  const noms = formData.getAll("contact_nom").map(String);
  const tels = formData.getAll("contact_tel").map(String);
  for (let i = 0; i < roles.length; i++) {
    const n = (noms[i] ?? "").trim();
    const t = (tels[i] ?? "").trim();
    if (!n && !t) continue;
    const role = ROLES_CONTACT.some((r) => r.value === roles[i]) ? roles[i] : "autre";
    contacts.push({ role, nom: n, telephone: t });
  }

  return {
    ok: true,
    logement: {
      nom,
      type,
      statut,
      ville: texte(formData, "ville"),
      adresse: texte(formData, "adresse"),
      maps_url: mapsUrl,
      capacite,
      frais_menage: frais,
      taux_commission: taux,
      code_acces: texte(formData, "code_acces"),
      wifi_nom: texte(formData, "wifi_nom"),
      wifi_mot_de_passe: texte(formData, "wifi_mot_de_passe"),
      equipements: texte(formData, "equipements"),
      notes: texte(formData, "notes"),
      proprietaire_nom: texte(formData, "proprietaire_nom"),
    },
    ical,
    contacts,
    proprietaires: formData.getAll("proprietaires").map(String),
  };
}

async function enregistrerEnfants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  lecture: Extract<Lecture, { ok: true }>,
  remplacer: boolean,
) {
  if (remplacer) {
    // On conserve les dates de dernière synchronisation des liens inchangés
    const { data: existants } = await supabase.from("logement_ical").select("id, url").eq("logement_id", id);
    const garder = new Set(lecture.ical.map((c) => c.url));
    const aSupprimer = (existants ?? []).filter((e) => !garder.has(e.url)).map((e) => e.id);
    if (aSupprimer.length) await supabase.from("logement_ical").delete().in("id", aSupprimer);
    await supabase.from("logement_contacts").delete().eq("logement_id", id);
    await supabase.from("logement_proprietaires").delete().eq("logement_id", id);
  }
  if (lecture.ical.length) {
    const { error } = await supabase
      .from("logement_ical")
      .upsert(lecture.ical.map((c) => ({ ...c, logement_id: id })), { onConflict: "logement_id,url" });
    if (error) return "Les liens de calendrier n'ont pas pu être enregistrés.";
  }
  if (lecture.contacts.length) {
    const { error } = await supabase.from("logement_contacts").insert(lecture.contacts.map((c) => ({ ...c, logement_id: id })));
    if (error) return "Les contacts n'ont pas pu être enregistrés.";
  }
  if (lecture.proprietaires.length) {
    const { error } = await supabase.from("logement_proprietaires").insert(lecture.proprietaires.map((user_id) => ({ logement_id: id, user_id })));
    if (error) return "Le rattachement des propriétaires n'a pas pu être enregistré.";
  }
  return null;
}

export async function creerLogement(_: EtatLogement, formData: FormData): Promise<EtatLogement> {
  if (!(await gestionnaire())) return { erreur: "Vous n'avez pas le droit de créer un logement." };
  const lecture = lireFormulaire(formData);
  if (!lecture.ok) return { erreur: lecture.erreur };

  const supabase = await createClient();
  const { data, error } = await supabase.from("logements").insert(lecture.logement).select("id").single();
  if (error || !data) return { erreur: "Le logement n'a pas pu être créé. Réessayez dans un instant." };

  const probleme = await enregistrerEnfants(supabase, data.id, lecture, false);
  revalidatePath("/logements");
  if (probleme) redirect(`/logements/${data.id}/modifier?avertissement=${encodeURIComponent(probleme)}`);
  redirect(`/logements/${data.id}?cree=1`);
}

export async function modifierLogement(id: string, _: EtatLogement, formData: FormData): Promise<EtatLogement> {
  if (!(await gestionnaire())) return { erreur: "Vous n'avez pas le droit de modifier un logement." };
  const lecture = lireFormulaire(formData);
  if (!lecture.ok) return { erreur: lecture.erreur };

  const supabase = await createClient();
  const { data, error } = await supabase.from("logements").update(lecture.logement).eq("id", id).select("id");
  if (error || !data?.length) return { erreur: "Les modifications n'ont pas pu être enregistrées. Réessayez dans un instant." };

  const probleme = await enregistrerEnfants(supabase, id, lecture, true);
  if (probleme) return { erreur: probleme };
  revalidatePath("/logements");
  revalidatePath(`/logements/${id}`);
  redirect(`/logements/${id}?modifie=1`);
}

export async function supprimerLogement(id: string): Promise<EtatLogement> {
  const u = await getUtilisateur();
  if (!u?.admin) return { erreur: "Seul un administrateur peut supprimer un logement." };
  const supabase = await createClient();
  const { count } = await supabase.from("versements").select("id", { count: "exact", head: true }).eq("logement_id", id);
  if (count) return { erreur: `Ce logement a ${count} versement(s) enregistré(s) : il ne peut pas être supprimé. Passez-le plutôt « En pause ».` };

  const { data: photos } = await supabase.from("logement_photos").select("chemin, chemin_vignette").eq("logement_id", id);
  const { data: docs } = await supabase.from("documents").select("chemin").eq("logement_id", id);
  const { error } = await supabase.from("logements").delete().eq("id", id);
  if (error) return { erreur: "Le logement n'a pas pu être supprimé." };
  await supprimer(BUCKET_PHOTOS, (photos ?? []).flatMap((p) => [p.chemin, p.chemin_vignette]));
  await supprimer(BUCKET_DOCUMENTS, (docs ?? []).map((d) => d.chemin));
  revalidatePath("/logements");
  redirect("/logements?supprime=1");
}

/* ---------- Photos et documents : envoi direct vers le stockage privé ---------- */

export type PreparationEnvoi = { erreur: string } | { chemin: string; token: string; bucket: string };

export async function preparerEnvoi(args: {
  logementId: string;
  nature: "photo" | "document";
  nomFichier: string;
  taille: number;
  typeDocument?: TypeDocument;
}): Promise<PreparationEnvoi> {
  const u = await gestionnaire();
  if (!u) return { erreur: "Vous n'avez pas le droit d'ajouter des fichiers." };
  if (args.typeDocument === "fiche_police" && !peutModifier(u, "documents_sensibles")) {
    return { erreur: "Vous n'avez pas le droit d'ajouter des fiches de police." };
  }
  const limite = args.nature === "photo" ? TAILLE_MAX_PHOTO : TAILLE_MAX_DOCUMENT;
  if (args.taille > limite) return { erreur: `Fichier trop lourd (maximum ${Math.round(limite / 1024 / 1024)} Mo).` };

  const bucket = args.nature === "photo" ? BUCKET_PHOTOS : BUCKET_DOCUMENTS;
  try {
    const { chemin, token } = await urlEnvoiSigne(bucket, nouveauChemin(args.logementId, `origine-${args.nomFichier}`));
    return { chemin, token, bucket };
  } catch {
    return { erreur: "L'envoi n'a pas pu être préparé. Réessayez." };
  }
}

export async function enregistrerPhoto(logementId: string, chemin: string): Promise<EtatLogement> {
  if (!(await gestionnaire())) return { erreur: "Action non autorisée." };
  if (!cheminDuLogement(chemin, logementId)) return { erreur: "Fichier invalide." };
  try {
    const original = await telecharger(BUCKET_PHOTOS, chemin);
    const { chemin: principal, cheminVignette } = await fabriquerPhoto(original, logementId);
    await supprimer(BUCKET_PHOTOS, [chemin]);

    const supabase = await createClient();
    const { count } = await supabase.from("logement_photos").select("id", { count: "exact", head: true }).eq("logement_id", logementId);
    const { error } = await supabase
      .from("logement_photos")
      .insert({ logement_id: logementId, chemin: principal, chemin_vignette: cheminVignette, ordre: count ?? 0 });
    if (error) {
      await supprimer(BUCKET_PHOTOS, [principal, cheminVignette]);
      return { erreur: "La photo n'a pas pu être enregistrée." };
    }
  } catch {
    await supprimer(BUCKET_PHOTOS, [chemin]);
    return { erreur: "Ce fichier n'est pas une photo lisible. Essayez un JPEG ou un PNG." };
  }
  revalidatePath(`/logements/${logementId}`);
  return { succes: "ok" };
}

export async function supprimerPhoto(id: string): Promise<EtatLogement> {
  if (!(await gestionnaire())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data } = await supabase.from("logement_photos").select("logement_id, chemin, chemin_vignette").eq("id", id).maybeSingle();
  if (!data) return { erreur: "Cette photo n'existe plus." };
  const { error } = await supabase.from("logement_photos").delete().eq("id", id);
  if (error) return { erreur: "La photo n'a pas pu être supprimée." };
  await supprimer(BUCKET_PHOTOS, [data.chemin, data.chemin_vignette]);
  revalidatePath(`/logements/${data.logement_id}`);
  return { succes: "ok" };
}

export async function enregistrerDocument(args: {
  logementId: string;
  chemin: string;
  nomFichier: string;
  typeMime: string;
  taille: number;
  typeDocument: TypeDocument;
  reference: string;
}): Promise<EtatLogement> {
  const u = await gestionnaire();
  if (!u) return { erreur: "Action non autorisée." };
  if (!TYPES_DOCUMENT.some((t) => t.value === args.typeDocument)) return { erreur: "Type de document invalide." };
  if (args.typeDocument === "fiche_police" && !peutModifier(u, "documents_sensibles")) {
    return { erreur: "Vous n'avez pas le droit d'ajouter des fiches de police." };
  }
  if (!cheminDuLogement(args.chemin, args.logementId)) return { erreur: "Fichier invalide." };

  let chemin = args.chemin;
  let taille = args.taille;
  let typeMime = args.typeMime;
  const maintenant = new Date();

  try {
    if (args.typeDocument === "etat_des_lieux") {
      if (!args.typeMime.startsWith("image/")) {
        await supprimer(BUCKET_DOCUMENTS, [args.chemin]);
        return { erreur: "Un état des lieux horodaté doit être une photo (JPEG ou PNG)." };
      }
      // La date et l'heure sont gravées dans l'image, puis l'original est supprimé.
      const original = await telecharger(BUCKET_DOCUMENTS, args.chemin);
      const tamponnee = await tamponnerImage(original, maintenant);
      chemin = nouveauChemin(args.logementId, "etat-des-lieux.jpg");
      await deposer(BUCKET_DOCUMENTS, chemin, tamponnee, "image/jpeg");
      await supprimer(BUCKET_DOCUMENTS, [args.chemin]);
      taille = tamponnee.length;
      typeMime = "image/jpeg";
    }

    const supabase = await createClient();
    const nom = args.typeDocument === "etat_des_lieux" ? args.nomFichier.replace(/\.[^.]+$/, "") + ".jpg" : args.nomFichier;
    const { error } = await supabase.from("documents").insert({
      logement_id: args.logementId,
      type: args.typeDocument,
      nom: nom.slice(0, 200),
      chemin,
      type_mime: typeMime,
      taille,
      reference: args.reference.trim().slice(0, 120),
      televerse_par: u.id,
    });
    if (error) {
      await supprimer(BUCKET_DOCUMENTS, [chemin, args.chemin]);
      return { erreur: "Le document n'a pas pu être enregistré. Vérifiez vos droits et réessayez." };
    }
  } catch {
    await supprimer(BUCKET_DOCUMENTS, [args.chemin]);
    return { erreur: "Le document n'a pas pu être traité. Réessayez avec un autre fichier." };
  }
  revalidatePath(`/logements/${args.logementId}`);
  return { succes: "ok" };
}

export async function supprimerDocument(id: string): Promise<EtatLogement> {
  if (!(await gestionnaire())) return { erreur: "Action non autorisée." };
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("logement_id, chemin, type").eq("id", id).maybeSingle();
  if (!data) return { erreur: "Ce document n'existe plus ou vous n'y avez pas accès." };
  const { data: supprimes, error } = await supabase.from("documents").delete().eq("id", id).select("id");
  if (error || !supprimes?.length) {
    return {
      erreur:
        data.type === "etat_des_lieux"
          ? "Les états des lieux horodatés ne peuvent être supprimés que par un administrateur."
          : "Le document n'a pas pu être supprimé.",
    };
  }
  await supprimer(BUCKET_DOCUMENTS, [data.chemin]);
  revalidatePath(`/logements/${data.logement_id}`);
  return { succes: "ok" };
}

/** Adresse temporaire (2 minutes) pour ouvrir un document, après vérification des droits par la base. */
export async function ouvrirDocument(id: string): Promise<{ url?: string; erreur?: string }> {
  const u = await getUtilisateur();
  if (!u || !u.actif || u.type !== "equipe" || !peutVoir(u, "logements")) return { erreur: "Action non autorisée." };
  const supabase = await createClient(); // la base refuse si le droit « Fiches de police » manque
  const { data } = await supabase.from("documents").select("chemin").eq("id", id).maybeSingle();
  if (!data) return { erreur: "Document introuvable ou accès refusé." };
  const urls = await urlsLecture(BUCKET_DOCUMENTS, [data.chemin], 120);
  const url = urls.get(data.chemin);
  return url ? { url } : { erreur: "Le document n'a pas pu être ouvert." };
}

