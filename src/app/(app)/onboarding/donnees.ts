import "server-only";
import { ETAPES_ONBOARDING, etapesDetectees, etapesFaites, type CleEtape } from "@/lib/operations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Étapes reconnues dans la fiche du logement (photos, iCal, contrat) : lecture limitée à des comptages. */
async function detectees(logementIds: string[]) {
  const admin = createAdminClient();
  const [{ data: photos }, { data: ical }, { data: contrats }] = await Promise.all([
    admin.from("logement_photos").select("logement_id").in("logement_id", logementIds),
    admin.from("logement_ical").select("logement_id").in("logement_id", logementIds),
    admin.from("documents").select("logement_id").eq("type", "contrat_gestion").in("logement_id", logementIds),
  ]);
  const compte = (l: { logement_id: string }[] | null, id: string) => (l ?? []).filter((x) => x.logement_id === id).length;
  return new Map(
    logementIds.map((id) => [id, etapesDetectees({ nbPhotos: compte(photos, id), nbIcal: compte(ical, id), aContrat: compte(contrats, id) > 0 })]),
  );
}

export type SuiviOnboarding = {
  id: string;
  nom: string;
  ville: string;
  statut: string;
  etapes: { cle: CleEtape; libelle: string; aide: string; fait: boolean; auto: boolean; fait_le: string | null }[];
  faites: number;
};

/** Suivi des logements demandés (avec leurs étapes cochées à la main ou reconnues dans la fiche). */
export async function lireSuivis(statuts: string[], idUnique?: string): Promise<SuiviOnboarding[]> {
  const supabase = await createClient();
  let requete = supabase.from("operations_logements").select("id, nom, ville, statut").in("statut", statuts).order("nom");
  if (idUnique) requete = requete.eq("id", idUnique);
  const { data: logements } = await requete;
  if (!logements?.length) return [];
  const ids = logements.map((l) => l.id);
  const [{ data: lignes }, auto] = await Promise.all([supabase.from("onboarding_etapes").select("logement_id, cle, fait, fait_le").in("logement_id", ids), detectees(ids)]);
  return logements.map((l) => {
    const siennes = (lignes ?? []).filter((x) => x.logement_id === l.id);
    const cochees = new Set(siennes.filter((x) => x.fait).map((x) => x.cle));
    const reconnues = auto.get(l.id) ?? new Set<CleEtape>();
    const faites = new Set<string>(etapesFaites(cochees, reconnues));
    return {
      id: l.id,
      nom: l.nom,
      ville: l.ville,
      statut: l.statut,
      faites: faites.size,
      etapes: ETAPES_ONBOARDING.map((e) => ({
        cle: e.cle,
        libelle: e.libelle,
        aide: e.aide,
        fait: faites.has(e.cle),
        auto: !cochees.has(e.cle) && reconnues.has(e.cle),
        fait_le: siennes.find((x) => x.cle === e.cle)?.fait_le ?? null,
      })),
    };
  });
}

export async function etapesRestantes(logementId: string) {
  const [suivi] = await lireSuivis(["onboarding", "actif", "en_pause"], logementId);
  return suivi ? suivi.etapes.filter((e) => !e.fait) : ETAPES_ONBOARDING.map((e) => e);
}
