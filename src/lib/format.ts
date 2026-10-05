const FUSEAU = "Africa/Casablanca";

/** 1 234,50 MAD */
export function formatMad(montant: number) {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: Number.isInteger(montant) ? 0 : 2,
      maximumFractionDigits: 2,
    })
      .format(montant)
      .replace(/ | /g, " ") + " MAD"
  );
}

/** JJ/MM/AAAA */
export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSEAU,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** « lundi 4 octobre » */
export function formatJourLong(date: Date = new Date()) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: FUSEAU,
  }).format(date);
}

/** Heure à Casablanca : « matin » | « après-midi » | « soir » */
export function momentDeLaJournee(date: Date = new Date()) {
  const heure = Number(
    new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: FUSEAU }).format(date),
  );
  if (heure < 5) return "soir";
  if (heure < 12) return "matin";
  if (heure < 18) return "après-midi";
  return "soir";
}

/** JJ/MM/AAAA à HH:MM (heure du Maroc) */
export function formatDateHeure(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: FUSEAU }).format(d);
  return `${formatDate(d)} à ${heure}`;
}
