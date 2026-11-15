/*
  Emplacements des séquences cinématiques (Higgsfield). Tant qu'un fichier n'est pas livré
  (`video: null`), le site affiche la composition graphique de remplacement prévue pour la scène.
  Pour activer une vidéo : déposer les fichiers dans /public/media puis renseigner les chemins.
  Voir docs/HIGGSFIELD.md pour les prompts, cadrages et formats attendus.
*/
export type Media = { video: string | null; videoMobile: string | null; poster: string | null };

export const MEDIAS: Record<string, Media> = {
  hero: { video: null, videoMobile: null, poster: null },
  vacance: { video: null, videoMobile: null, poster: null },
  incertitude: { video: null, videoMobile: null, poster: null },
  transformation: { video: null, videoMobile: null, poster: null },
  messages: { video: null, videoMobile: null, poster: null },
  operations: { video: null, videoMobile: null, poster: null },
  portefeuille: { video: null, videoMobile: null, poster: null },
  convergence: { video: null, videoMobile: null, poster: null },
};
