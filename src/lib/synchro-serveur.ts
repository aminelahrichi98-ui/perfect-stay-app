import "server-only";
import { aujourdhui } from "@/lib/dates";
import { lireIcal, urlIcalAutorisee } from "@/lib/ical";
import {
  appliquerFlux,
  type Depot,
  type ResultatSynchro,
} from "@/lib/synchro";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const morceaux = <T,>(liste: T[], taille: number) =>
  Array.from({ length: Math.ceil(liste.length / taille) }, (_, i) => liste.slice(i * taille, (i + 1) * taille));

function depotSupabase(admin: Admin): Depot {
  const verifier = (erreur: { message: string } | null, contexte: string) => {
    if (erreur) throw new Error(`${contexte} : ${erreur.message}`);
  };
  return {
    async reservationsDuLien(icalId) {
      const { data, error } = await admin
        .from("reservations")
        .select("id, uid, type, code, resume, arrivee, depart, statut")
        .eq("ical_id", icalId);
      verifier(error, "Lecture des réservations");
      return (data ?? []) as Awaited<ReturnType<Depot["reservationsDuLien"]>>;
    },
    async tachesDesReservations(ids) {
      const resultat: { id: string; reservation_id: string; echeance: string | null; statut: string }[] = [];
      for (const lot of morceaux(ids, 150)) {
        const { data, error } = await admin.from("taches").select("id, reservation_id, echeance, statut").in("reservation_id", lot);
        verifier(error, "Lecture des ménages");
        resultat.push(...((data ?? []) as typeof resultat));
      }
      return resultat;
    },
    async inserer(lignes) {
      const creees: { id: string; uid: string }[] = [];
      for (const lot of morceaux(lignes, 200)) {
        const { data, error } = await admin.from("reservations").insert(lot).select("id, uid");
        verifier(error, "Enregistrement des réservations");
        creees.push(...(data ?? []));
      }
      return creees;
    },
    async mettreAJour(id, champs) {
      const { error } = await admin.from("reservations").update(champs).eq("id", id);
      verifier(error, "Mise à jour d'une réservation");
    },
    async creerMenage(t) {
      const { error } = await admin.from("taches").insert({
        titre: t.titre,
        type: "menage",
        pole: "Opérations",
        priorite: "important",
        statut: "a_faire",
        echeance: t.echeance,
        responsable_id: t.responsable_id,
        logement_id: t.logement_id,
        reservation_id: t.reservation_id,
        cree_auto: true,
      });
      // 23505 = ménage déjà créé par une synchronisation concurrente : sans gravité
      if (error && (error as { code?: string }).code !== "23505") verifier(error, "Création d'un ménage");
    },
    async mettreAJourTache(id, champs) {
      const { error } = await admin.from("taches").update(champs).eq("id", id);
      verifier(error, "Mise à jour d'un ménage");
    },
  };
}

const TAILLE_MAX = 5 * 1024 * 1024;

async function telechargerCalendrier(url: string): Promise<string> {
  const autorise = urlIcalAutorisee(url);
  if (!autorise.ok) throw new Error(autorise.erreur);
  let reponse: Response;
  try {
    reponse = await fetch(url, {
      headers: { "User-Agent": "PerfectStay-Calendrier/1.0", Accept: "text/calendar, text/plain, */*" },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    throw new Error("La plateforme n'a pas répondu (délai dépassé ou lien injoignable).");
  }
  if (!reponse.ok) {
    throw new Error(
      reponse.status === 404 || reponse.status === 403
        ? "Le lien est refusé ou n'existe plus : recopiez le lien d'export depuis la plateforme."
        : `La plateforme a répondu avec une erreur (${reponse.status}).`,
    );
  }
  const texte = await reponse.text();
  if (texte.length > TAILLE_MAX) throw new Error("Le calendrier reçu est anormalement gros.");
  return texte;
}

export type RapportLien = {
  logement: string;
  plateforme: string;
  ok: boolean;
  erreur?: string;
  resultat?: ResultatSynchro;
};

export type RapportSynchro = {
  liens: RapportLien[];
  totaux: Omit<ResultatSynchro, "evenements"> & { liensEnErreur: number; liensSynchronises: number };
};

/** Synchronise tous les liens iCal (ou ceux d'un seul logement). Appelé par la tâche planifiée et par le bouton. */
export async function synchroniserLiens(options: { logementId?: string } = {}): Promise<RapportSynchro> {
  const admin = createAdminClient();
  let requete = admin.from("logement_ical").select("id, plateforme, url, logement_id, logements(nom)");
  if (options.logementId) requete = requete.eq("logement_id", options.logementId);
  const { data: liens, error } = await requete;
  if (error) throw new Error("Impossible de lire les liens de calendrier.");

  const { data: entreprise } = await admin.from("entreprise").select("responsable_menage").eq("id", 1).maybeSingle();
  const responsableMenage = entreprise?.responsable_menage ?? null;

  const depot = depotSupabase(admin);
  const rapports: RapportLien[] = [];
  const file = [...(liens ?? [])];

  async function traiter(lien: NonNullable<typeof liens>[number]) {
    const nom = (lien.logements as unknown as { nom: string } | null)?.nom ?? "Logement";
    const maintenant = new Date();
    try {
      const texte = await telechargerCalendrier(lien.url);
      const lecture = lireIcal(texte);
      if (!lecture.ok) throw new Error(lecture.erreur);
      const resultat = await appliquerFlux(
        depot,
        { id: lien.id, logementId: lien.logement_id, nomLogement: nom, plateforme: lien.plateforme },
        lecture.evenements,
        { aujourdhui: aujourdhui(maintenant), maintenant: maintenant.toISOString(), responsableMenage },
      );
      await admin.from("logement_ical").update({ derniere_sync: maintenant.toISOString(), derniere_erreur: null }).eq("id", lien.id);
      rapports.push({ logement: nom, plateforme: lien.plateforme, ok: true, resultat });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue.";
      await admin.from("logement_ical").update({ derniere_erreur: message.slice(0, 300) }).eq("id", lien.id);
      rapports.push({ logement: nom, plateforme: lien.plateforme, ok: false, erreur: message });
    }
  }

  // 4 calendriers en parallèle au maximum, pour rester rapide sans surcharger les plateformes
  await Promise.all(
    Array.from({ length: Math.min(4, file.length) }, async () => {
      for (let lien = file.shift(); lien; lien = file.shift()) await traiter(lien);
    }),
  );

  const totaux = {
    nouvelles: 0,
    modifiees: 0,
    annulees: 0,
    retablies: 0,
    menagesCrees: 0,
    menagesMisAJour: 0,
    menagesAnnules: 0,
    liensEnErreur: rapports.filter((r) => !r.ok).length,
    liensSynchronises: rapports.filter((r) => r.ok).length,
  };
  for (const r of rapports) {
    if (!r.resultat) continue;
    totaux.nouvelles += r.resultat.nouvelles;
    totaux.modifiees += r.resultat.modifiees;
    totaux.annulees += r.resultat.annulees;
    totaux.retablies += r.resultat.retablies;
    totaux.menagesCrees += r.resultat.menagesCrees;
    totaux.menagesMisAJour += r.resultat.menagesMisAJour;
    totaux.menagesAnnules += r.resultat.menagesAnnules;
  }
  return { liens: rapports, totaux };
}

/**
 * Quand un lien de calendrier est retiré d'un logement, ses réservations à venir et leurs ménages
 * sont annulés (l'historique passé est conservé).
 */
export async function annulerReservationsDesLiens(icalIds: string[]) {
  if (!icalIds.length) return;
  const admin = createAdminClient();
  const maintenant = new Date();
  const { data: reservations } = await admin
    .from("reservations")
    .select("id")
    .in("ical_id", icalIds)
    .eq("statut", "confirmee")
    .gte("depart", aujourdhui(maintenant));
  const ids = (reservations ?? []).map((r) => r.id);
  for (const lot of morceaux(ids, 150)) {
    await admin.from("reservations").update({ statut: "annulee", annule_le: maintenant.toISOString() }).in("id", lot);
    await admin.from("taches").update({ statut: "annule" }).in("reservation_id", lot).in("statut", ["a_faire", "en_cours", "bloque"]);
  }
}
