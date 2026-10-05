/**
 * Adresse d'intégration de la carte Google Maps d'un logement.
 * - si le lien collé contient des coordonnées (@lat,lng ou ?q=lat,lng) : carte précise ;
 * - sinon : recherche à partir de l'adresse et de la ville.
 * Les liens courts (maps.app.goo.gl) ne contiennent pas de coordonnées : on retombe sur l'adresse.
 */
export function urlCarte({ mapsUrl, adresse, ville }: { mapsUrl: string; adresse: string; ville: string }): string | null {
  const coord =
    mapsUrl.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/) ??
    mapsUrl.match(/[?&](?:q|query|ll)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  const requete = coord ? `${coord[1]},${coord[2]}` : [adresse, ville, "Maroc"].filter(Boolean).join(", ");
  if (!coord && !adresse && !ville) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(requete)}&z=16&output=embed`;
}

/** Lien « Ouvrir dans Google Maps » : le lien saisi, ou une recherche par adresse. */
export function lienMaps({ mapsUrl, adresse, ville }: { mapsUrl: string; adresse: string; ville: string }): string | null {
  if (/^https?:\/\//i.test(mapsUrl)) return mapsUrl;
  const requete = [adresse, ville, "Maroc"].filter(Boolean).join(", ");
  if (!adresse && !ville) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(requete)}`;
}
