import { ajouterJours, jourDepuisInstant, type Jour } from "./dates.ts";

/*
  Lecture d'un calendrier iCal (RFC 5545), limitée à ce dont l'app a besoin : les événements
  avec leur identifiant, leurs dates, leur résumé et leur statut.
  Airbnb exporte des journées entières : DTSTART = arrivée, DTEND = départ (non inclus).
*/

export type EvenementIcal = {
  uid: string;
  debut: Jour;
  fin: Jour;
  resume: string;
  description: string;
  annule: boolean;
};

export type LectureIcal = { ok: true; evenements: EvenementIcal[] } | { ok: false; erreur: string };

const echapper = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");

function lireDate(valeur: string, params: string): Jour | null {
  const m = valeur.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, a, mo, j, hh, mi, ss, z] = m;
  const jour = `${a}-${mo}-${j}`;
  if (!hh || /VALUE=DATE(?!-)/i.test(params)) return jour;
  // Heure en UTC : on la ramène au jour de Casablanca. Heure « flottante » ou avec fuseau : on garde le jour tel quel.
  if (z) return jourDepuisInstant(`${jour}T${hh}:${mi}:${ss ?? "00"}Z`);
  return jour;
}

export function lireIcal(texte: string): LectureIcal {
  if (!/BEGIN:VCALENDAR/i.test(texte)) {
    return { ok: false, erreur: "Ce lien ne renvoie pas un calendrier iCal (vérifiez que vous avez copié le lien d'export du calendrier)." };
  }

  // Les lignes longues sont coupées : une ligne qui commence par un espace continue la précédente
  const lignes = texte.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const evenements = new Map<string, EvenementIcal>();

  let courant: Record<string, { valeur: string; params: string }> | null = null;
  for (const ligne of lignes) {
    if (/^BEGIN:VEVENT/i.test(ligne)) {
      courant = {};
      continue;
    }
    if (/^END:VEVENT/i.test(ligne)) {
      if (courant) {
        const uid = courant.UID?.valeur.trim();
        const debut = courant.DTSTART ? lireDate(courant.DTSTART.valeur, courant.DTSTART.params) : null;
        if (uid && debut) {
          let fin = courant.DTEND ? lireDate(courant.DTEND.valeur, courant.DTEND.params) : null;
          if (!fin || fin <= debut) fin = ajouterJours(debut, 1); // sans fin valide : une nuit
          evenements.set(uid, {
            uid,
            debut,
            fin,
            resume: echapper(courant.SUMMARY?.valeur ?? "").trim(),
            description: echapper(courant.DESCRIPTION?.valeur ?? ""),
            annule: /^CANCELLED$/i.test((courant.STATUS?.valeur ?? "").trim()),
          });
        }
      }
      courant = null;
      continue;
    }
    if (!courant) continue;
    const m = ligne.match(/^([A-Za-z-]+)((?:;[^:]*)*):(.*)$/);
    if (m) courant[m[1].toUpperCase()] = { valeur: m[3], params: m[2] };
  }
  return { ok: true, evenements: [...evenements.values()] };
}

/** Code de confirmation Airbnb présent dans la description (ex. HMABC123XY), sinon vide. */
export function codeReservation(description: string): string {
  const m = description.match(/reservations\/details\/([A-Z0-9]{6,})/i) ?? description.match(/\b(HM[A-Z0-9]{8,})\b/);
  return m ? m[1].toUpperCase() : "";
}

export type TypeEvenement = "reservation" | "blocage";

/**
 * Airbnb mélange réservations (« Reserved ») et nuits bloquées (« Not available »).
 * Pour les autres plateformes, le flux ne permet pas de les distinguer de façon fiable :
 * on les compte comme des réservations (un ménage en trop vaut mieux qu'un ménage oublié).
 */
export function classerEvenement(e: EvenementIcal, plateforme: string): { type: TypeEvenement; code: string } {
  const code = codeReservation(e.description);
  if (/airbnb/i.test(plateforme)) {
    if (code || /^reserved$/i.test(e.resume)) return { type: "reservation", code };
    return { type: "blocage", code };
  }
  return { type: "reservation", code };
}

/** Un lien de calendrier doit être une adresse publique en https (pas d'adresse interne). */
export function urlIcalAutorisee(url: string): { ok: true } | { ok: false; erreur: string } {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, erreur: "Adresse invalide." };
  }
  if (u.protocol !== "https:") return { ok: false, erreur: "Le lien doit commencer par https://" };
  const h = u.hostname.toLowerCase();
  const interne =
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h) ||
    h.includes(":") ||
    !h.includes(".");
  if (interne) return { ok: false, erreur: "Ce lien pointe vers une adresse interne : il n'est pas autorisé." };
  return { ok: true };
}
