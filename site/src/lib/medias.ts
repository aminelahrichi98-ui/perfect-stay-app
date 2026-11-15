/*
  Emplacements des séquences cinématiques (Higgsfield). Tant qu'un fichier n'est pas livré
  (`video: null`), le site affiche la composition graphique de remplacement prévue pour la scène.
  Pour activer une vidéo : renseigner son adresse (CDN Higgsfield, ou fichier déposé dans /public/media).
  Voir docs/HIGGSFIELD.md pour les prompts, cadrages et formats attendus.
*/
export type Media = { video: string | null; videoMobile: string | null; poster: string | null };

/** Séquences générées le 15/11/2026 (Seedance 2.5), servies par le CDN de Higgsfield */
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3H8wdcn1vQgWf0DLyAkNh4Fby60/";
const POSTER_MAITRE = "https://d8j0ntlcm91z4.cloudfront.net/user_3H8wdcn1vQgWf0DLyAkNh4Fby60/hf_20261115_101437_7b65dcd7-755a-4101-84a6-2555acd192ff_min.webp";
const POSTER_VIDE = "https://d8j0ntlcm91z4.cloudfront.net/user_3H8wdcn1vQgWf0DLyAkNh4Fby60/hf_20261115_101754_c0776e47-e7a6-4c0f-b878-93d12169e51c_min.webp";

export const MEDIAS: Record<string, Media> = {
  hero: { video: `${CDN}hf_20261115_101813_cf73e430-e7f9-4505-be44-89ea999dd0a7.mp4`, videoMobile: null, poster: POSTER_MAITRE },
  vacance: { video: `${CDN}hf_20261115_102134_bffd10b8-b612-4293-a319-06dd1263f454.mp4`, videoMobile: null, poster: POSTER_VIDE },
  incertitude: { video: `${CDN}hf_20261115_101814_3d42212a-6e51-4b4d-afc8-5f9efc071b5b.mp4`, videoMobile: null, poster: null },
  transformation: { video: `${CDN}hf_20261115_102107_2996e098-f6b2-4276-b112-f9c404bb4876.mp4`, videoMobile: null, poster: POSTER_VIDE },
  messages: { video: `${CDN}hf_20261115_101813_ba2be31a-0d65-4fda-b6a8-ce01bc0f9689.mp4`, videoMobile: null, poster: null },
  operations: { video: `${CDN}hf_20261115_101814_f2e82da4-ef1d-418d-b8d7-c32c7afa4d7d.mp4`, videoMobile: null, poster: null },
  portefeuille: { video: null, videoMobile: null, poster: null },
  convergence: { video: `${CDN}hf_20261115_101813_589e00f6-9531-4d44-b1ad-ab6d41bf5604.mp4`, videoMobile: null, poster: null },
};
