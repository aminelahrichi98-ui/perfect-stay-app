# Séquences cinématiques — manifeste de production Higgsfield

Statut : **aucune séquence générée**. Le compte Higgsfield est relié, mais la génération consomme des crédits payants et nécessite votre accord explicite, scène par scène. En attendant, chaque emplacement affiche une composition graphique de remplacement (vectorielle, sans requête réseau).

## Principes communs (cohérence architecturale entre les plans)

- **Un seul appartement de référence** pour toutes les scènes : séjour traversant d'un immeuble contemporain de Casablanca (quartier Gauthier / Racine), grande baie vitrée à trois vantaux sur la droite du cadre, sol en chêne clair, murs blanc cassé, plafond à 2,80 m, suspension en laiton au-dessus d'une table basse. Garder cette géométrie identique d'un plan à l'autre.
- **Méthode recommandée** : générer d'abord une image fixe de référence de l'appartement (le « plan maître »), puis l'utiliser comme image de départ (image-to-video) pour chaque séquence afin de verrouiller l'architecture.
- **Lumière** : fin d'après-midi, soleil bas et chaud entrant par la baie, ombres longues. Étalonnage sobre (noirs profonds #111315, hautes lumières crème #F5F2EC, accent or patiné #B69A70).
- **Caméra** : mouvements lents et motivés (travelling, dolly, léger pano). Jamais de mouvement rapide ni de zoom numérique.
- **Interdits** : personnes reconnaissables, logos de plateformes (Airbnb, Booking), texte incrusté, chiffres à l'écran (les données sont ajoutées par le site en HTML).

## Formats de livraison web

| Usage | Format | Résolution | Débit cible | Durée |
|---|---|---|---|---|
| Ordinateur | MP4 H.264 (+ WebM VP9 facultatif), sans piste audio | 1920 × 1080 (16:9) | ≤ 4 Mo pour 8 s | 6–10 s, boucle propre |
| Mobile | MP4 H.264, sans audio | 1080 × 1350 (4:5) ou 1080 × 1920 (9:16) pour le hero | ≤ 2,5 Mo | idem |
| Poster | AVIF + JPEG | même cadrage que la 1re image | ≤ 120 Ko | — |

Intégration : déposer les fichiers dans `site/public/media/` puis renseigner `src/lib/medias.ts` (`video`, `videoMobile`, `poster`). Le composant `MediaCinema` lit en boucle, muet, met en pause hors écran et respecte « réduire les animations ».

---

## 1. Hero — appartement premium à Casablanca (`hero`)

- **Prompt (EN)** : *Cinematic slow dolly-in through a contemporary luxury apartment living room in Casablanca at golden hour, tall three-panel floor-to-ceiling window on the right, warm low sunlight casting long soft shadows across light oak floor, off-white plaster walls, minimalist beige linen sofa, brass pendant lamp above a walnut coffee table, a single olive tree in a ceramic pot, dust particles in the light beam, dark moody composition with deep blacks on the left side of frame, architectural photography style, 35mm lens, shallow depth of field, no people, no text.*
- **Composition** : tiers gauche sombre et vide (place du titre), source de lumière et baie sur le tiers droit.
- **Caméra** : dolly avant de ~1 m, très lent, légère montée.
- **Lumière** : passage progressif d'un plan sombre à un plan baigné de lumière (le « dark-to-light » demandé).
- **Durée** : 8 s, boucle (fondu enchaîné de 1 s entre fin et début).
- **Image de début** : séjour dans la pénombre, rai de lumière étroit sur le sol.
- **Image de fin** : même cadrage plus serré, lumière pleine sur le canapé.
- **Transition** : fondu vers le noir du site en bas de cadre (dégradé déjà géré en CSS).
- **Ordinateur** : 16:9. **Mobile** : 9:16 recadré sur la baie et la suspension, titre posé sur la zone sombre du bas.

## 2. Appartement vide et vacance (`vacance`)

- **Prompt (EN)** : *The same Casablanca apartment living room completely empty and unfurnished, bare light oak floor, off-white walls, tall three-panel window, slow lateral camera slide from left to right, afternoon light moving across the empty floor, sense of stillness and absence, a few dust particles, cinematic, architectural photography, no people, no furniture, no text.*
- **Composition** : vide central, baie à droite, sol dominant (60 % du cadre).
- **Caméra** : travelling latéral lent (gauche → droite).
- **Lumière** : identique au plan maître, ombres qui s'allongent (time-lapse discret).
- **Durée** : 8 s. **Début** : pièce vide, lumière haute. **Fin** : même pièce, lumière rasante plus chaude.
- **Transition** : coupe franche vers la scène suivante. **Mobile** : 4:5 centré sur la baie.

## 3. Incertitude financière (`incertitude`)

- **Prompt (EN)** : *Close-up of a minimalist desk by the window of the same apartment, an unopened envelope and a closed notebook, soft overcast light, slow push-in, muted desaturated palette, a sense of waiting and uncertainty, cinematic, shallow depth of field, no people, no readable text, no numbers.*
- **Caméra** : push-in lent. **Lumière** : ciel couvert, plus froide que le plan maître.
- **Durée** : 6 s. **Début** : plan moyen du bureau. **Fin** : gros plan sur l'enveloppe.
- **Transition** : le site superpose sa carte « loyer attendu → impayé » (HTML) : laisser le tiers gauche calme.
- **Mobile** : 4:5.

## 4. Transformation : ameublement de l'appartement (`transformation`)

- **Prompt (EN)** : *Locked-off wide shot of the same empty Casablanca apartment living room transforming into a beautifully furnished premium short-term rental: linen sofa, walnut coffee table, wool rug, brass pendant lamp, framed abstract art, olive tree, white hotel-quality bedding visible through a doorway, furniture appearing progressively and seamlessly, warm golden hour light, architectural continuity, same camera position throughout, cinematic, no people, no text.*
- **Caméra** : **plan fixe** (impératif pour la continuité architecturale ; c'est la transformation qui bouge, pas la caméra).
- **Durée** : 10 s. **Début** : appartement vide (= dernière image de la scène 2). **Fin** : appartement meublé (= plan maître).
- **Transition** : enchaînement direct avec la convergence. **Mobile** : 4:5, même point de vue.

## 5. Messages des voyageurs (`messages`)

- **Prompt (EN)** : *Night interior of the same furnished apartment, a smartphone lying on the walnut coffee table lights up repeatedly with soft glowing notifications, warm lamp light, the rest of the room in shadow, slow orbit around the coffee table, elegant and calm rather than chaotic, cinematic, shallow depth of field, no readable text on screen, no logos.*
- **Caméra** : orbite lente à 30° autour du téléphone.
- **Durée** : 8 s. **Début** : téléphone éteint. **Fin** : écran allumé, halo sur la table.
- **Transition** : le site ajoute les notifications réelles en HTML par-dessus (laisser le tiers droit sobre).
- **Mobile** : 9:16 vertical sur le téléphone.

## 6. Complexité opérationnelle (`operations`)

- **Prompt (EN)** : *Top-down slow rotating view of the same apartment as a precise architectural cutaway model, rooms visible from above, soft studio lighting, subtle glowing points appearing in each room (entrance, kitchen, bedroom, bathroom), minimalist dark background, cinematic product-style shot, no people, no text.*
- **Caméra** : vue plongeante, rotation de 20° sur 8 s.
- **Durée** : 8 s. **Début** : maquette éteinte. **Fin** : 8 à 10 points lumineux répartis.
- **Transition** : raccord avec la maquette 3D interactive (même angle isométrique). **Mobile** : 4:5.

## 7. Portefeuille de plusieurs appartements (`portefeuille`)

- **Prompt (EN)** : *Slow camera pull-back revealing one architectural cutaway apartment model, then a second identical model, then a third, arranged on a dark minimalist surface, warm accent lights, the scene becoming more complex as more apartments appear, cinematic product visualization, no people, no text.*
- **Caméra** : travelling arrière continu.
- **Durée** : 10 s. **Début** : un seul appartement cadré serré. **Fin** : trois appartements en plan large.
- **Mobile** : 4:5, appartements empilés en diagonale.

## 8. Entrée dans l'écosystème Perfect Stay (`convergence`)

- **Prompt (EN)** : *Abstract cinematic transition: thin golden light lines converging from three directions toward the center of a dark architectural space, forming a precise geometric chevron shape, subtle volumetric light, deep charcoal background, elegant and minimal, slow motion, no text.*
- **Caméra** : fixe, léger zoom avant.
- **Durée** : 6 s. **Début** : noir, trois lignes naissantes. **Fin** : chevron lumineux centré.
- **Transition** : le monogramme et le titre du site apparaissent en HTML sur l'image de fin ; la section suivante (maquette 3D) reprend le même fond.
- **Mobile** : 9:16.

## Ce que Higgsfield ne remplace pas

Les séquences sont des **vidéos pré-calculées** : elles ne sont pas interactives. La maquette explorable de la section « Notre gestion » est de la vraie 3D temps réel (Three.js), indépendante de ces vidéos.

## Estimation des crédits

À demander à Higgsfield avant toute génération (le devis exact dépend du modèle et de la durée retenus) : 8 séquences ordinateur + 8 recadrages mobiles + 1 image maître. Rien n'est lancé sans votre accord.
