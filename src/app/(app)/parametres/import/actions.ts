"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUtilisateur } from "@/lib/auth";
import { lirePhoto, schemaImport, montantRecu, type Hypothese } from "@/lib/import-ancien";
import { TAUX_COMMISSION_DEFAUT } from "@/lib/logements";
import { BUCKET_PHOTOS, fabriquerPhoto, supprimer } from "@/lib/stockage";
import { createClient } from "@/lib/supabase/server";

async function administrateur() {
  const u = await getUtilisateur();
  return u && u.actif && u.admin ? u : null;
}

const schemaDemande = z.object({
  donnees: schemaImport,
  hypothese: z.enum(["recu", "net", "encaisse"]),
  taux: z.record(z.string(), z.number().min(0).max(100)),
});

const morceaux = <T,>(liste: T[], taille: number) => Array.from({ length: Math.ceil(liste.length / taille) }, (_, i) => liste.slice(i * taille, (i + 1) * taille));

/** Quels éléments de l'export ont déjà été importés lors d'un précédent passage ? */
export async function etatImport(logementIds: string[], transactionIds: string[]) {
  if (!(await administrateur())) return { erreur: "Seul un administrateur peut importer les anciennes données." } as const;
  const supabase = await createClient();
  const logements = new Set<string>();
  const transactions = new Set<string>();
  for (const lot of morceaux(logementIds, 150)) {
    const { data } = await supabase.from("logements").select("ancien_id").in("ancien_id", lot);
    for (const d of data ?? []) if (d.ancien_id) logements.add(d.ancien_id);
  }
  for (const lot of morceaux(transactionIds, 150)) {
    const { data } = await supabase.from("versements").select("ancien_id").in("ancien_id", lot);
    for (const d of data ?? []) if (d.ancien_id) transactions.add(d.ancien_id);
  }
  return { logements: [...logements], transactions: [...transactions] } as const;
}

export type ResultatImport =
  | { erreur: string }
  | {
      logementsCrees: number;
      logementsExistants: number;
      versementsCrees: number;
      versementsIgnores: number;
      /** Logements créés avec une photo à envoyer ensuite */
      photos: { ancienId: string; logementId: string }[];
    };

export async function importerDonnees(demande: unknown): Promise<ResultatImport> {
  if (!(await administrateur())) return { erreur: "Seul un administrateur peut importer les anciennes données." };
  const parse = schemaDemande.safeParse(demande);
  if (!parse.success) return { erreur: "Les données reçues sont incomplètes. Rechargez la page et recommencez." };
  const { donnees, hypothese, taux } = parse.data;
  const supabase = await createClient();

  // 1. Logements : on ne recrée jamais un logement déjà importé
  const { data: existants } = await supabase.from("logements").select("id, ancien_id, taux_commission").in(
    "ancien_id",
    donnees.logements.map((l) => l.id),
  );
  const idDe = new Map<string, string>();
  const tauxDe = new Map<string, number>();
  for (const e of existants ?? []) {
    if (e.ancien_id) {
      idDe.set(e.ancien_id, e.id);
      tauxDe.set(e.ancien_id, Number(e.taux_commission));
    }
  }

  const aCreer = donnees.logements.filter((l) => !idDe.has(l.id));
  const photos: { ancienId: string; logementId: string }[] = [];
  for (const l of aCreer) {
    const t = taux[l.id] ?? TAUX_COMMISSION_DEFAUT;
    const { data, error } = await supabase
      .from("logements")
      .insert({
        nom: l.nom,
        type: /villa/i.test(l.nom) ? "villa" : /riad/i.test(l.nom) ? "riad" : "appartement",
        ville: l.ville,
        statut: "actif",
        frais_menage: l.fraisMenage,
        taux_commission: t,
        proprietaire_nom: l.proprietaire,
        ancien_id: l.id,
      })
      .select("id")
      .single();
    if (error || !data) return { erreur: `Le logement « ${l.nom} » n'a pas pu être créé. Les logements précédents sont déjà enregistrés : vous pouvez relancer l'import sans risque de doublon.` };
    idDe.set(l.id, data.id);
    tauxDe.set(l.id, t);
    if (/^https?:\/\//i.test(l.ical)) {
      await supabase.from("logement_ical").insert({ logement_id: data.id, plateforme: /booking/i.test(l.ical) ? "Booking.com" : "Airbnb", url: l.ical });
    }
    if (l.photo) photos.push({ ancienId: l.id, logementId: data.id });
  }

  // 2. Versements : uniquement ceux qui n'existent pas encore
  const valides = donnees.transactions.filter((t) => idDe.has(t.logementId));
  const { data: dejaLa } = await supabase.from("versements").select("ancien_id").in(
    "ancien_id",
    valides.map((t) => t.id),
  );
  const deja = new Set((dejaLa ?? []).map((d) => d.ancien_id));
  const nouveaux = valides.filter((t) => !deja.has(t.id));

  // Chaque versement est recalculé avec le taux de son logement ; ceux qu'on ne peut pas recalculer sont écartés
  const lignes: {
    logement_id: string;
    date_versement: string;
    montant_recu: number;
    frais_menage: number;
    taux_commission: number;
    note: string;
    ancien_id: string;
  }[] = [];
  for (const t of nouveaux) {
    const tauxLogement = tauxDe.get(t.logementId) ?? TAUX_COMMISSION_DEFAUT;
    try {
      lignes.push({
        logement_id: idDe.get(t.logementId)!,
        date_versement: t.date.slice(0, 10),
        montant_recu: montantRecu(t, hypothese as Hypothese, tauxLogement),
        frais_menage: t.fraisMenage,
        taux_commission: tauxLogement,
        note: t.note,
        ancien_id: t.id,
      });
    } catch {
      /* écarté : le recalcul est impossible (taux nul, montant inférieur au ménage) */
    }
  }

  let crees = 0;
  for (const lot of morceaux(lignes, 150)) {
    const { error } = await supabase.from("versements").insert(lot);
    if (error) {
      return { erreur: `Une partie des versements n'a pas pu être enregistrée (${crees} déjà importés). Relancez l'import : les versements déjà présents ne seront pas dupliqués.` };
    }
    crees += lot.length;
  }

  revalidatePath("/logements");
  return {
    logementsCrees: aCreer.length,
    logementsExistants: donnees.logements.length - aCreer.length,
    versementsCrees: crees,
    versementsIgnores: donnees.transactions.length - crees,
    photos,
  };
}

/** Une photo de l'ancienne app, envoyée une par une (elles peuvent être lourdes). */
export async function importerPhoto(logementId: string, photo: string): Promise<{ ok: boolean; erreur?: string }> {
  if (!(await administrateur())) return { ok: false, erreur: "Action non autorisée." };
  const octets = lirePhoto(photo);
  if (!octets) return { ok: false, erreur: "Format d'image non reconnu." };

  const supabase = await createClient();
  const { count } = await supabase.from("logement_photos").select("id", { count: "exact", head: true }).eq("logement_id", logementId);
  if (count) return { ok: true }; // déjà une photo : on ne duplique pas à la relance

  try {
    const { chemin, cheminVignette } = await fabriquerPhoto(octets, logementId);
    const { error } = await supabase.from("logement_photos").insert({ logement_id: logementId, chemin, chemin_vignette: cheminVignette, ordre: 0 });
    if (error) {
      await supprimer(BUCKET_PHOTOS, [chemin, cheminVignette]);
      return { ok: false, erreur: "Enregistrement impossible." };
    }
    return { ok: true };
  } catch {
    return { ok: false, erreur: "Image illisible." };
  }
}
