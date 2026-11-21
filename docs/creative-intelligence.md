# Creative Intelligence : créer une image publicitaire avec Claude et Higgsfield

Higgsfield n'est pas relié à l'application : il s'utilise depuis une conversation Claude où le
connecteur Higgsfield est actif. L'application, elle, garde les angles, les images, leurs prompts
et leurs performances. Images fixes uniquement : pas de vidéo, pas de carrousel.

## Le déroulé, image par image

1. **Contexte.** Claude lit l'angle (problèmes, hook, USP, solution, CTA) et les images déjà faites.
2. **Concept.** Claude propose l'idée de l'image pour un type donné (photo premium, data, avant/après,
   problème émotionnel, bold hook, case study).
3. **Prompt.** Claude rédige le prompt d'image.
4. **Validation.** Vous validez le concept et le prompt.
5. **Coût.** Claude annonce le coût en crédits Higgsfield et attend votre accord avant de générer.
6. **Vérification.** Vous regardez l'image : texte lisible, pas de logo parasite, pas de détail faux.
7. **Enregistrement.** L'image entre dans l'application, rattachée à son angle et à son type.
8. **Publication.** Vous publiez l'image vous-même dans Meta Ads Manager, puis vous copiez
   l'identifiant de la publicité (Meta Ad ID) sur la fiche de l'image.

## Étape 7 : deux façons d'enregistrer l'image

**Dépôt manuel (toujours disponible).** Marketing, Creative Intelligence, Images, « Nouvelle image » :
choisissez l'angle et le type, déposez le fichier, collez le hook et le prompt.

**Dépôt par Claude.** L'application expose deux adresses protégées par le secret
`CREATIVE_IMPORT_SECRET` (variable d'environnement Vercel, 24 caractères au minimum), envoyé dans
l'en-tête `Authorization: Bearer …` :

- `GET /api/creative/angles` : les angles non archivés et leurs images, pour l'étape 1 ;
- `POST /api/creative/import` : crée l'image en « Brouillon ». Corps JSON :
  `{ "angle_code": "ANG-001", "type_image": "data", "hook": "…", "prompt": "…", "image_url": "https://…" }`.
  `type_image` vaut `photo`, `data`, `avant_apres`, `emotion`, `bold_hook` ou `case_study`.
  `image_url` doit être l'adresse https du fichier chez Higgsfield : le serveur la télécharge
  lui-même et refuse toute autre adresse. À défaut, `image_base64` contient l'image encodée.

Ce passage ne peut que lire les angles et déposer une image. Il ne publie rien dans Meta et ne
modifie aucune autre donnée. Son usage depuis une conversation Claude suppose que la session ait le
droit de joindre l'adresse de l'application ; sinon, le dépôt manuel fait le même travail.
