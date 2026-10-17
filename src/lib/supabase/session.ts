/** « Rester connecté » : durée de vie des cookies de session de l'application. */
export const COOKIE_RESTER = "ps_rester";
export const DUREE_RESTER = 60 * 60 * 24 * 400; // 400 jours, le maximum accepté par les navigateurs

/** Par défaut on reste connecté ; seul un « 0 » explicite demande une session qui s'efface à la fermeture du navigateur. */
export const veutRester = (valeur: string | undefined) => valeur !== "0";

/**
 * Adapte les options d'un cookie de session Supabase :
 * - rester connecté : le cookie dure 400 jours (et se prolonge à chaque rafraîchissement) ;
 * - sinon : cookie « de session », effacé quand le navigateur se ferme.
 * Un cookie qu'on supprime (déconnexion : maxAge 0) n'est jamais modifié.
 */
export function optionsSession<T extends { maxAge?: number; expires?: Date | number }>(options: T | undefined, rester: boolean): T {
  const o = (options ?? {}) as T;
  if (o.maxAge === 0) return o;
  if (rester) return { ...o, maxAge: DUREE_RESTER };
  const { maxAge: _maxAge, expires: _expires, ...reste } = o;
  void _maxAge;
  void _expires;
  return reste as T;
}
