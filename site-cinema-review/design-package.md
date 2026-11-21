# Perfect Stay, dossier de design (site cinéma, Tier 1)

## 1. Prémisse
Un seul mot : **prêt**. Le logement est prêt pour le voyageur, les comptes sont prêts pour le propriétaire. La porte s'ouvre, tout est déjà fait. Chaque section sert cette idée, et tout mène à une action : demander une estimation gratuite.

## 2. Palette (à affiner sur la vidéo validée)
```css
:root{
  --canvas:#160813;        /* aubergine très profond */
  --panel:#230c1f;         /* aubergine de la charte */
  --accent:#b98aac;        /* prune clair : bouton et rares accents */
  --accent-hover:#d2b0c8;
  --accent-muted:#7a3e6c;
  --text-secondary:#cdbfc6;
  --text-primary:#f5f0e8;  /* ivoire */
  --stone:#e9dfd0;         /* pierre chaude, sections claires */
}
```

## 3. Polices
- Titres : Cormorant Garamond 500 et 500 italique
- Texte : Manrope 400, 500, 600
- Petites étiquettes : JetBrains Mono 400

## 4. Carte des bandes (points de départ)
| Bande | Plage | Moment vidéo | Texte | Entrée |
|---|---|---|---|---|
| 1 | 0.00 à 0.22 | couloir, porte entrouverte | « Votre porte s'ouvre. Tout est déjà prêt. » | lettres qui montent comme une lame de lumière |
| 2 | 0.30 à 0.52 | la porte pivote, on franchit le seuil | « Ménage, accueil, annonces, prix. On s'occupe de tout. » | fondu qui s'ouvre du centre, comme la porte |
| 3 | 0.60 à 0.80 | entrée dans le salon, éclat de lumière | « Vous savez ce que gagne votre bien. Ligne par ligne. » | traits du logo qui se dessinent puis texte |
| 4 | 0.88 à 1.00 | salon au repos, mur ivoire en haut à gauche | « Perfect Stay. Votre bien, prêt à recevoir. » + bouton | pose lente, bouton en dernier |

## 5. Hero fixe (téléphone, mouvement réduit)
- Titre : « Votre bien, prêt à recevoir. »
- Sous-titre : « Perfect Stay gère votre logement de A à Z, et vous montre chaque dirham. »
- Bouton : « Recevoir mon estimation gratuite »

## 6. Sous le hero
1. **Le constat** (mots des propriétaires)
   - Titre : « Louer devrait être simple. »
   - « Vous pensez céder 20 %. Vous en cédez 30. »
   - « Vous recevez vos versements, sans savoir dans quel état est votre bien. »
   - « Vous courez après votre conciergerie. »
   - Chute : « Chez nous, c'est l'inverse. »
2. **Ce que nous faisons** (4 cartes, images dans le monde de la vidéo)
   - « Un logement toujours prêt » : « Ménage professionnel, linge frais et contrôle du logement après chaque séjour. »
   - « Des voyageurs bien reçus » : « Accueil, messages et assistance, de la réservation au départ. »
   - « Des annonces qui remplissent » : « Photos, textes et prix ajustés chaque jour, sur Airbnb et Booking. »
   - « Des comptes clairs » : « Un relevé chaque mois : ce qui est entré, ce qui est sorti, ce qui vous revient. »
3. **Moment interactif : le relevé** (dans la section transparence)
   - Titre : « Chaque dirham a une ligne. »
   - Le visiteur déplace un curseur « nuits louées ce mois » et voit un relevé d'exemple se remplir : revenus, ménage, commission, net propriétaire.
   - Mention : « Exemple illustratif. Votre estimation réelle dépend de votre logement. »
4. **Comment ça marche** (3 étapes, 3 images)
   - « 1. On visite votre bien. » « Une visite, une estimation chiffrée, sans engagement. »
   - « 2. On le prépare. » « Photos, annonces, linge, serrure : tout est mis en place. »
   - « 3. Vous recevez vos revenus. » « Chaque mois, votre versement et votre relevé détaillé. »
5. **Questions fréquentes**
   - « Combien ça coûte ? » « Une commission sur les revenus encaissés, annoncée avant de commencer. Pas de frais cachés. » (à valider)
   - « Qui encaisse l'argent des voyageurs ? » (à valider par Amine)
   - « Et si un voyageur abîme quelque chose ? » « Le logement est contrôlé après chaque séjour. On vous prévient et on gère la réclamation. » (à valider)
   - « Puis-je utiliser mon logement ? » « Oui. Vous bloquez vos dates quand vous voulez. » (à valider)
   - « Mon logement n'est pas meublé. » « On vous accompagne pour le préparer. » (à valider)
   - Pas de témoignages inventés : la section preuves reste vide tant qu'Amine n'en fournit pas.
6. **Formulaire final** (ancre unique #estimation)
   - Titre : « Combien peut gagner votre bien ? »
   - Sous-titre : « Réponse sous 24 h. Gratuit et sans engagement. »
   - Champs : Nom, Téléphone (WhatsApp), Ville, Type de logement
   - Bouton : « Recevoir mon estimation gratuite »
   - Succès : « Merci. Nous vous rappelons très vite. »
   - Traitement : à décider avec Amine (WhatsApp ou service de formulaire).
7. **Pied de page** : monogramme, « Perfect Stay Conciergerie », contact, mentions.

## 7. Couche vectorielle
- Monogramme redessiné en SVG (toit et P à rayures), tracé au défilement.
- Rayures diagonales du logo comme séparateurs de sections, qui se dessinent.
- Poussière de lumière très discrète en fond fixe.
- Mouvement réduit : états finaux affichés, animations arrêtées.

## 8. Ingénierie
Tout le standard de scrub-pipeline.md : chargement Blob avec anneau, lerp normalisé, seeks verrouillés, écritures DOM sur changement, rythme des bandes et test du flick, lisibilité en quatre couches, cinq cas de hero fixe, page complète sans vidéo, seuil de qualité.

## 9. Porte de relecture
Les textes ci-dessus partent tels quels. Zéro tiret long, zéro mot creux.

## État d'avancement (pour la session suivante)
- Concept retenu : 1, « La porte s'ouvre ». Tier 1. Modèle vidéo choisi par Amine : Seedance 2.5.
- Image de départ (job Higgsfield) : 3d29987c-8fd7-41a9-99b4-5016cb30d71c
- Vidéo hero (job Higgsfield) : e786d4b0-16c3-4f85-8a13-f1a16af207a6
  https://d8j0ntlcm91z4.cloudfront.net/user_3H8wdcn1vQgWf0DLyAkNh4Fby60/hf_20261121_111501_e786d4b0-16c3-4f85-8a13-f1a16af207a6.mp4
- La session d'origine ne pouvait pas télécharger depuis ce CDN : ni l'image ni la vidéo n'ont été inspectées par Claude. À faire en premier sur l'environnement « perfect-stay-app » : télécharger, extraire début, milieu et fin, inspecter, puis porte vidéo avec Amine.
- Restant : 3 images de sections (environ 6 crédits, accord déjà donné dans le total), ffmpeg, construction dans site-cinema/ (index.html + assets/), auto-test, aperçu, puis mise en ligne (Phase 10).
- Logo : monogramme rayé (toit et P), fourni par Amine en image, à redessiner en SVG.
- Action unique : demander une estimation gratuite. Pas de mention IA (photos réelles plus tard).
