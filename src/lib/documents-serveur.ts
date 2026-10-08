import "server-only";
import { etatsDuMois, nuitsReservees } from "@/lib/calendrier";
import { aujourdhui, moisPrecedent, moisSuivant, premierDuMois, type Mois } from "@/lib/dates";
import { calculerLigne, totaliser, type VersementBrut } from "@/lib/synthese";
import { libelleType } from "@/lib/logements";
import { genererFacturePdf, type DonneesFacture, type Destinataire, type LigneFacture, type Vendeur } from "@/lib/pdf/facture";
import { genererRapportPdf } from "@/lib/pdf/rapport";
import { TAUX_TVA_DEFAUT } from "@/lib/compta";
import { createAdminClient } from "@/lib/supabase/admin";
import { deposer } from "@/lib/stockage";

export const BUCKET_RAPPORTS = "rapports";

type Admin = ReturnType<typeof createAdminClient>;

type Entreprise = Vendeur & { taux_tva: number };

async function lireEntreprise(admin: Admin): Promise<Entreprise> {
  const { data } = await admin.from("entreprise").select("*").eq("id", 1).maybeSingle();
  return {
    raison_sociale: data?.raison_sociale ?? "Perfect Stay Conciergerie",
    adresse: data?.adresse ?? "",
    ice: data?.ice ?? "",
    identifiant_fiscal: data?.identifiant_fiscal ?? "",
    registre_commerce: data?.registre_commerce ?? "",
    patente: data?.patente ?? "",
    banque: data?.banque ?? "",
    rib: data?.rib ?? "",
    email: data?.email ?? "",
    telephone: data?.telephone ?? "",
    mention_reglement: data?.mention_reglement ?? "",
    taux_tva: Number(data?.taux_tva ?? TAUX_TVA_DEFAUT),
  };
}

type DonneesMois = {
  logement: { id: string; nom: string; ville: string; type: string; proprietaire_nom: string; proprietaire_adresse: string; proprietaire_ice: string };
  proprietaire: string;
  versements: VersementBrut[];
  reservations: { id: string; arrivee: string; depart: string; type: "reservation" | "blocage" }[];
  maintenance: { date: string; description: string; montant: number }[];
};

async function chargerMois(admin: Admin, logementId: string, mois: Mois): Promise<DonneesMois | null> {
  const debut = premierDuMois(mois);
  const fin = premierDuMois(moisSuivant(mois));

  const { data: logement } = await admin
    .from("logements")
    .select("id, nom, ville, type, proprietaire_nom, proprietaire_adresse, proprietaire_ice")
    .eq("id", logementId)
    .maybeSingle();
  if (!logement) return null;

  const [{ data: versements }, { data: reservations }, { data: depenses }, { data: liens }] = await Promise.all([
    admin
      .from("versements")
      .select("id, logement_id, date_versement, montant_recu, frais_menage, taux_commission, note")
      .eq("logement_id", logementId)
      .gte("date_versement", debut)
      .lt("date_versement", fin)
      .order("date_versement"),
    admin
      .from("reservations")
      .select("id, arrivee, depart, type")
      .eq("logement_id", logementId)
      .eq("statut", "confirmee")
      .lt("arrivee", fin)
      .gt("depart", debut),
    admin
      .from("depenses")
      .select("date_depense, description, montant")
      .eq("logement_id", logementId)
      .eq("categorie", "maintenance")
      .gte("date_depense", debut)
      .lt("date_depense", fin)
      .order("date_depense"),
    admin.from("logement_proprietaires").select("user_id").eq("logement_id", logementId),
  ]);

  let comptes: string[] = [];
  if (liens?.length) {
    const { data: profils } = await admin.from("profiles").select("prenom, nom").in("id", liens.map((l) => l.user_id));
    comptes = (profils ?? []).map((p) => `${p.prenom} ${p.nom}`.trim());
  }
  const proprietaire = logement.proprietaire_nom.trim() || comptes.join(" et ") || "";

  return {
    logement,
    proprietaire,
    versements: (versements ?? []).map((v) => ({
      id: v.id,
      logement_id: v.logement_id,
      date_versement: v.date_versement,
      montant_recu: Number(v.montant_recu),
      frais_menage: Number(v.frais_menage),
      taux_commission: Number(v.taux_commission),
      note: v.note,
    })),
    reservations: (reservations ?? []) as DonneesMois["reservations"],
    maintenance: (depenses ?? []).map((d) => ({ date: d.date_depense, description: d.description, montant: Number(d.montant) })),
  };
}

function vendeurDe(e: Entreprise): Vendeur {
  const { taux_tva: _t, ...vendeur } = e;
  void _t;
  return vendeur;
}

/* ---------------------------------- Rapport mensuel ---------------------------------- */

/** Génère (ou régénère) le rapport mensuel d'un logement. Il peut être refait autant de fois que nécessaire. */
export async function genererRapport(logementId: string, mois: Mois) {
  const admin = createAdminClient();
  const [entreprise, donnees] = await Promise.all([lireEntreprise(admin), chargerMois(admin, logementId, mois)]);
  if (!donnees) throw new Error("Logement introuvable.");

  const lignes = donnees.versements.map((v) => calculerLigne(v, entreprise.taux_tva));
  const totaux = totaliser(lignes, entreprise.taux_tva);
  const nuits = nuitsReservees(etatsDuMois(mois, donnees.reservations));
  const sejours = donnees.reservations.filter((r) => r.type === "reservation").length;

  const pdf = await genererRapportPdf({
    mois,
    genereLe: aujourdhui(),
    vendeur: vendeurDe(entreprise),
    logement: { nom: donnees.logement.nom, ville: donnees.logement.ville, type: libelleType(donnees.logement.type) },
    proprietaire: donnees.proprietaire,
    lignes: lignes.map((l) => ({
      date: l.date_versement,
      montantRecu: l.calcul.montantRecu,
      fraisMenage: l.calcul.fraisMenage,
      loyerNet: l.calcul.loyerNetHorsMenage,
      commission: l.calcul.commission,
      revenuProprietaire: l.calcul.revenuProprietaire,
    })),
    totaux: {
      montantsRecus: totaux.montantsRecus,
      menage: totaux.menage,
      loyerNet: totaux.loyerNet,
      commissionTTC: totaux.commissionTTC,
      tva: totaux.tva,
      revenuProprietaire: totaux.revenuProprietaire,
    },
    tauxTva: entreprise.taux_tva,
    nuits,
    nbSejours: sejours,
    reservations: donnees.reservations,
    maintenance: donnees.maintenance,
  });

  const chemin = `rapports/${logementId}/${mois}.pdf`;
  await deposer(BUCKET_RAPPORTS, chemin, Buffer.from(pdf), "application/pdf");

  const premier = premierDuMois(mois);
  const resume = { totaux, nuits, sejours, nbVersements: lignes.length };
  const { data: existant } = await admin.from("rapports_mensuels").select("id, version").eq("logement_id", logementId).eq("mois", premier).maybeSingle();
  if (existant) {
    const version = existant.version + 1;
    await admin.from("rapports_mensuels").update({ resume, chemin_pdf: chemin, version, genere_le: new Date().toISOString() }).eq("id", existant.id);
    return { id: existant.id as string, version };
  }
  const { data } = await admin.from("rapports_mensuels").insert({ logement_id: logementId, mois: premier, resume, chemin_pdf: chemin }).select("id").single();
  return { id: data?.id as string, version: 1 };
}

/* ---------------------------------- Facture de commission ---------------------------------- */

function donneesFactureDepuisLigne(f: {
  numero: string;
  date_emission: string;
  mois: string;
  vendeur: Vendeur;
  destinataire: Destinataire;
  lignes: LigneFacture[];
  total_ht: number | string;
  taux_tva: number | string;
  montant_tva: number | string;
  total_ttc: number | string;
  statut?: string;
}, logement: { nom: string; ville: string }): DonneesFacture {
  return {
    numero: f.numero,
    dateEmission: f.date_emission,
    mois: f.mois.slice(0, 7),
    vendeur: f.vendeur,
    destinataire: f.destinataire,
    logement,
    lignes: f.lignes,
    totalHT: Number(f.total_ht),
    tauxTva: Number(f.taux_tva),
    montantTva: Number(f.montant_tva),
    totalTTC: Number(f.total_ttc),
    annulee: f.statut === "annulee",
  };
}

export type ResultatFacture =
  | { etat: "emise"; numero: string; factureId: string; pdf: boolean }
  | { etat: "deja"; numero: string; factureId: string }
  | { etat: "aucune"; raison: string };

/** Émet la facture de commission d'un logement pour un mois (une seule par logement et par mois). */
export async function emettreFacture(logementId: string, mois: Mois, parUtilisateur: string | null): Promise<ResultatFacture> {
  const admin = createAdminClient();
  const premier = premierDuMois(mois);

  const { data: existante } = await admin.from("factures").select("id, numero").eq("logement_id", logementId).eq("mois", premier).eq("statut", "emise").maybeSingle();
  if (existante) return { etat: "deja", numero: existante.numero, factureId: existante.id };

  const [entreprise, donnees] = await Promise.all([lireEntreprise(admin), chargerMois(admin, logementId, mois)]);
  if (!donnees) throw new Error("Logement introuvable.");
  const lignes = donnees.versements.map((v) => calculerLigne(v, entreprise.taux_tva));
  const totaux = totaliser(lignes, entreprise.taux_tva);
  if (!lignes.length) return { etat: "aucune", raison: "Aucun versement ce mois-ci." };
  if (totaux.commissionTTC <= 0) return { etat: "aucune", raison: "La commission du mois est nulle." };

  const destinataire: Destinataire = {
    nom: donnees.proprietaire || "Propriétaire",
    adresse: donnees.logement.proprietaire_adresse,
    ice: donnees.logement.proprietaire_ice,
  };
  const lignesFacture: LigneFacture[] = lignes.map((l) => ({
    date: l.date_versement,
    montantRecu: l.calcul.montantRecu,
    fraisMenage: l.calcul.fraisMenage,
    loyerNet: l.calcul.loyerNetHorsMenage,
    taux: l.taux_commission,
    commission: l.calcul.commission,
  }));

  const { data: facture, error } = await admin.rpc("emettre_facture", {
    p_logement: logementId,
    p_mois: premier,
    p_date_emission: aujourdhui(),
    p_destinataire: destinataire,
    p_vendeur: vendeurDe(entreprise),
    p_lignes: lignesFacture,
    p_total_ht: totaux.commissionHT,
    p_taux_tva: entreprise.taux_tva,
    p_montant_tva: totaux.tva,
    p_total_ttc: totaux.commissionTTC,
    p_created_by: parUtilisateur,
  });
  if (error || !facture) {
    // Deux émissions en même temps : l'autre a gagné, on renvoie sa facture
    const { data: concurrente } = await admin.from("factures").select("id, numero").eq("logement_id", logementId).eq("mois", premier).eq("statut", "emise").maybeSingle();
    if (concurrente) return { etat: "deja", numero: concurrente.numero, factureId: concurrente.id };
    throw new Error(error?.message ?? "La facture n'a pas pu être émise.");
  }

  let pdfOk = true;
  try {
    await ecrirePdfFacture(admin, facture.id, donneesFactureDepuisLigne(facture, donnees.logement));
  } catch {
    pdfOk = false; // la facture existe et garde son numéro : le PDF pourra être régénéré
  }
  return { etat: "emise", numero: facture.numero, factureId: facture.id, pdf: pdfOk };
}

async function ecrirePdfFacture(admin: Admin, factureId: string, donnees: DonneesFacture) {
  const pdf = await genererFacturePdf(donnees);
  const annee = donnees.numero.split("-")[1];
  const chemin = `factures/${annee}/${donnees.numero}.pdf`;
  await deposer(BUCKET_RAPPORTS, chemin, Buffer.from(pdf), "application/pdf");
  await admin.from("factures").update({ chemin_pdf: chemin }).eq("id", factureId);
}

/** Refait le PDF d'une facture à partir de ses données figées : le contenu et le numéro ne changent jamais. */
export async function regenererPdfFacture(factureId: string) {
  const admin = createAdminClient();
  const { data: f } = await admin.from("factures").select("*").eq("id", factureId).maybeSingle();
  if (!f) throw new Error("Facture introuvable.");
  let logement = { nom: "Logement supprimé", ville: "" };
  if (f.logement_id) {
    const { data: l } = await admin.from("logements").select("nom, ville").eq("id", f.logement_id).maybeSingle();
    if (l) logement = l;
  }
  await ecrirePdfFacture(admin, factureId, donneesFactureDepuisLigne(f, logement));
}

/* ---------------------------------- Traitement du mois ---------------------------------- */

export type BilanMois = {
  mois: Mois;
  rapports: number;
  facturesEmises: number;
  facturesDejaEmises: number;
  sansCommission: number;
  erreurs: { logement: string; erreur: string }[];
};

/** Rapports et factures de tous les logements qui ont des versements ce mois-là (idempotent). */
export async function genererDocumentsDuMois(mois: Mois, parUtilisateur: string | null): Promise<BilanMois> {
  const admin = createAdminClient();
  const debut = premierDuMois(mois);
  const fin = premierDuMois(moisSuivant(mois));
  const { data: versements } = await admin.from("versements").select("logement_id").gte("date_versement", debut).lt("date_versement", fin);
  const ids = [...new Set((versements ?? []).map((v) => v.logement_id))];
  const { data: logements } = ids.length ? await admin.from("logements").select("id, nom").in("id", ids).order("nom") : { data: [] };

  const bilan: BilanMois = { mois, rapports: 0, facturesEmises: 0, facturesDejaEmises: 0, sansCommission: 0, erreurs: [] };
  // Un logement après l'autre : les numéros de facture restent ainsi dans l'ordre
  for (const l of logements ?? []) {
    try {
      await genererRapport(l.id, mois);
      bilan.rapports++;
      const f = await emettreFacture(l.id, mois, parUtilisateur);
      if (f.etat === "emise") bilan.facturesEmises++;
      else if (f.etat === "deja") bilan.facturesDejaEmises++;
      else bilan.sansCommission++;
    } catch (e) {
      bilan.erreurs.push({ logement: l.nom, erreur: e instanceof Error ? e.message : "Erreur inconnue." });
    }
  }
  return bilan;
}

/** Mois précédent à Casablanca : celui que le traitement automatique du 1er doit couvrir. */
export function moisASolder(maintenant: Date = new Date()): Mois {
  return moisPrecedent(aujourdhui(maintenant).slice(0, 7));
}
