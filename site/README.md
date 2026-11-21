# Perfect Stay — site vitrine (prototype)

Site public d'acquisition de propriétaires : expérience cinématique, parcours personnalisés, maquette 3D interactive, démonstration de l'application et tunnel de qualification.

Projet Next.js **autonome** (dossier `site/`), séparé de l'application de gestion interne qui vit à la racine du dépôt. Les deux ne partagent aucun code ni dépendance ; la racine ignore ce dossier (typecheck et lint).

## Lancer en local

```bash
cd site
npm install
npm run dev        # http://localhost:3000
```

Contrôles : `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

## Variables d'environnement (toutes facultatives)

| Variable | Rôle |
|---|---|
| `LEAD_WEBHOOK_URL` | Adresse qui reçoit chaque demande en JSON (CRM, Zapier, Make, webhook de l'application). **Absente = mode démonstration** : rien n'est transmis et l'écran de confirmation le dit. |
| `LEAD_WEBHOOK_SECRET` | Jeton envoyé en `Authorization: Bearer …` au webhook. |
| `NEXT_PUBLIC_SITE_URL` | URL publique (métadonnées Open Graph). |

## Architecture

```
src/
  app/                 page, layout (polices, SEO, Open Graph), image OG, confidentialité, API /api/leads
  lib/
    content.ts         TOUS les textes (offre, FAQ, services…) — à relire et valider ici
    funnel.ts          options, schémas zod (partagés navigateur/serveur), qualification
    analytics.ts       événements, consentement, attribution (UTM, gclid, fbclid)
    experience.tsx     état partagé : profil locatif choisi, ouverture du tunnel
    demo.ts            données de démonstration du tableau de bord (remplaçables par l'API)
    medias.ts          emplacements des vidéos Higgsfield
  components/
    sections/          navigation, hero, choix du profil, convergence, méthode, preuves, offre, FAQ, pied, consentement
    journeys/          parcours longue durée / courte durée / bien vacant, visuels animés, transformations
    apartment/         maquette 3D (modèle procédural, scène, points de service, plan de secours sans WebGL)
    dashboard/         démonstration de l'espace propriétaire
    funnel/            tunnel de qualification en 7 étapes
docs/HIGGSFIELD.md     prompts, cadrages, formats des 8 séquences cinématiques
```

## Parcours

1. **Hero** : promesse, CTA principal (ouvre le tunnel) et question « Comment exploitez-vous votre appartement ? » (longue durée, courte durée, lien discret « vacant »). Le choix est facultatif, modifiable, gardé pour la session et pré-remplit le tunnel.
2. **Parcours personnalisé** : 3 scènes animées par profil + scène de bascule (appartement qui se meuble, ou tâches qui se rangent dans un système).
3. **Convergence** : les trois parcours se rejoignent, révélation de la marque.
4. **Maquette 3D** : appartement en coupe, 9 services répartis en 3 familles (3 points visibles à la fois), caméra qui se déplace vers le point choisi, panneau explicatif avec mini-démonstration.
5. **Application** : tableau de bord interactif (performance, opérations, qualité, patrimoine), données de démonstration clairement signalées.
6. **Méthode, preuves, offre, FAQ**.
7. **Tunnel** : ville → quartier → bien → situation (questions conditionnelles) → objectif → contact → confirmation. Accessible depuis tous les CTA, la navigation et la barre fixe sur mobile.

## Tunnel et API

- Validation zod identique côté navigateur et serveur.
- Progression conservée pendant la session (sauf le consentement, toujours redemandé).
- Anti-spam : champ piège invisible, durée minimale de remplissage (4 s), 5 envois max par IP et par 10 minutes (mémoire du serveur : à remplacer par un stockage partagé en production multi-instances).
- Qualification simple et explicable (`prioritaire` / `standard`) jointe au lead, sans estimation financière.
- Aucune projection chiffrée n'est affichée : l'écran final propose une évaluation personnalisée.

## Analytics

`track(événement, propriétés)` pousse dans `window.dataLayer` **uniquement après consentement** (bandeau). Événements : PageView, RentalProfileSelected, CinematicJourneyStarted, ServiceHotspotClicked, InvestorDashboardViewed, FunnelStarted, FunnelStepCompleted, LeadSubmitted, QualifiedLead, AppointmentRequested. Aucun outil externe (GTM, GA4, Meta Pixel) n'est encore installé : il suffit d'ajouter leur balise, conditionnée au consentement.

## Performance et accessibilité

- La 3D (Three.js) est chargée à la demande, ~600 px avant d'arriver à l'écran, et mise en pause hors écran ; ombres désactivées et résolution plafonnée sur téléphone.
- Sans WebGL (ou si la 3D plante) : plan isométrique de secours, mêmes points de service, section toujours utilisable.
- Hero 100 % vectoriel (aucune image ni vidéo à télécharger tant que Higgsfield n'est pas livré).
- `prefers-reduced-motion` respecté partout ; navigation clavier (lien d'évitement, focus visibles, fenêtre du tunnel avec piège de focus et Échap).
- Aucun détournement du défilement.

## Limites connues

- **Maquette 3D procédurale** : géométrie simple (boîtes, cylindres), sans textures ni modèle détaillé. Elle illustre les services ; un modèle GLB réaliste (Blender, Sketchfab sous licence) pourra la remplacer dans `components/apartment/modele.tsx`.
- **Pas de vidéo Higgsfield** : compositions graphiques de remplacement (voir `docs/HIGGSFIELD.md`).
- **Contenus à valider** : conditions de l'offre (`OFFRE.conditions`), réponses FAQ marquées `aValider`, page confidentialité, coordonnées (`CONTACT`).
- **Preuves** : emplacements vides volontairement, à remplir avec des éléments réels.
- **Indexation désactivée** (`robots: noindex`) tant que le site n'est pas validé et publié.

## Intégrations restantes

1. Webhook CRM (`LEAD_WEBHOOK_URL`) — par exemple vers le CRM de l'application de gestion.
2. Balises GTM / GA4 / Meta Pixel conditionnées au consentement.
3. Vidéos Higgsfield (après accord sur les crédits).
4. Numéro WhatsApp et e-mail publics (`CONTACT`), domaine et mise en ligne (projet Vercel distinct, dossier racine `site/`).

## Réception des demandes d'audit

Le formulaire envoie chaque demande à l'application de gestion, qui la crée dans le CRM (source « Site internet »).

Variables à définir dans Vercel :

- projet du **site** : `LEAD_WEBHOOK_URL` = `https://<adresse de l'application>/api/site/leads` et `LEAD_WEBHOOK_SECRET` = une longue suite de caractères ;
- projet de l'**application** : `SITE_LEADS_SECRET` = la même suite de caractères.

Tant que `LEAD_WEBHOOK_URL` n'est pas défini, le formulaire refuse l'envoi et affiche un message d'indisponibilité : il n'affiche jamais un succès pour une demande non transmise.

## Études de cas

Les fiches se remplissent dans `src/lib/content.ts`, tableau `ETUDES_DE_CAS`. Tant qu'il est vide, le site n'affiche aucun chiffre.
