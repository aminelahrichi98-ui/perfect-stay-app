# Perfect Stay — Cahier des charges de l'app interne

Document de référence pour construire l'application de gestion de Perfect Stay Conciergerie. Lis-le en entier avant d'écrire la moindre ligne de code, et reviens-y à chaque phase.

---

## 0. À lire en premier : comment travailler avec Amine

- Amine, le fondateur, **n'a aucun background en développement**. Explique chaque action technique pas à pas, en français simple : quoi installer, où cliquer, quoi copier, comment vérifier que ça marche. Pas de jargon sans explication.
- Avant chaque commande dans le terminal, dis en une phrase ce qu'elle fait.
- Quand un compte externe est nécessaire (GitHub, Supabase, Vercel, Meta), guide Amine écran par écran pour le créer et récupérer les clés. Ne lui demande jamais de coller une clé secrète dans le chat si elle peut aller directement dans un fichier `.env.local` ; explique-lui comment faire.
- Travaille **phase par phase** (section 12). À la fin de chaque phase : montre le résultat, donne à Amine une courte liste de choses à tester lui-même, et attends sa validation avant de passer à la suivante.
- Toute l'interface est **en français**.
- Montants en **dirhams marocains (MAD)**, dates au format JJ/MM/AAAA, semaine commençant le lundi, fuseau horaire Africa/Casablanca.

## 1. Skills de design à utiliser

Utilise ces skills pour toute l'interface, du premier écran au dernier :

- **impeccable** : direction visuelle, hiérarchie, ergonomie, accessibilité, états vides et erreurs, responsive.
- **emil-design-eng** (philosophie d'Emil Kowalski) : finitions, micro-interactions, animations justes, qualité perçue des composants.
- **taste** : goût et cohérence d'ensemble, éviter tout rendu générique.

Si un de ces skills n'est pas disponible dans ta session, dis-le à Amine dès le début et explique-lui comment l'ajouter, au lieu de continuer sans.

Contraintes de marque : l'identité actuelle de Perfect Stay est aubergine très foncé avec des accents bordeaux et un motif de chevrons, plus le logo fourni par Amine. Pars de là et laisse les skills faire évoluer le rendu vers une app haut de gamme, très ergonomique, aussi agréable sur téléphone que sur ordinateur.

## 2. Contexte de l'entreprise

- Perfect Stay Conciergerie : conciergerie de location courte durée au Maroc (Marrakech, Casablanca), environ 7 logements aujourd'hui (1 villa, 6 appartements), objectif 50 logements à 12 mois puis expansion (Rabat, Tanger, Agadir…).
- Plateformes : Airbnb principalement. Airbnb fait le partage des paiements : la part de Perfect Stay lui est versée, celle du propriétaire lui est versée directement.
- Équipe : Amine (direction, accès total, basé en France), Abdelkarim (opérations terrain à Marrakech), prestataires de ménage et de maintenance, futures recrues par pôle.
- Outils actuels : PriceLabs (pricing), WhatsApp Business, Kommo (CRM, leads Meta Ads), une app comptabilité existante créée sur claude.ai (voir section 11 pour la reprise des données).

## 3. Architecture technique imposée

Choisie pour être fiable, sécurisée et peu coûteuse au démarrage (offres gratuites) :

- **Next.js** (App Router, TypeScript) + **Tailwind CSS**.
- **Supabase** : base de données Postgres, authentification e-mail + mot de passe, stockage de fichiers (photos, documents, PDF), **Row Level Security** pour appliquer les droits côté serveur (jamais seulement dans l'interface).
- **Vercel** : hébergement + **tâches planifiées (cron)** pour la synchronisation iCal et les tâches récurrentes.
- Génération de PDF côté serveur pour les rapports et factures.
- Application installable sur téléphone (**PWA** : icône sur l'écran d'accueil, plein écran).
- Code versionné sur **GitHub**.

## 4. Utilisateurs, rôles et droits

### 4.1 Types d'utilisateurs
1. **Équipe** : rattaché à un ou plusieurs pôles (Stratégie, Recrutement, Marketing, Sales/CRM, Opérations, Relations clients, Automatisations, Comptabilité, RH).
2. **Propriétaire (client)** : accès uniquement à l'Espace propriétaire, limité à son ou ses logements.
3. **Prestataire** (ménage, maintenance…) : accès limité aux tâches et check-lists qui lui sont attribuées.

### 4.2 Droits
- Chaque utilisateur a une **liste de droits à cocher par module** : *Voir* et *Modifier*, séparément.
- Les droits sont appliqués **côté serveur** (Row Level Security Supabase), pas uniquement en masquant des menus.
- **Amine** : super-administrateur, accès total.
- **Abdelkarim** : Onboarding, Logements, Calendrier, Opérations (Ménage, Maintenance, Stock, Check-lists). Il **ne voit pas** la Comptabilité, le Dashboard financier, le CRM, le Marketing, la Stratégie ni les RH.
- Un propriétaire ne voit **jamais** les données d'un autre propriétaire, ni aucune donnée interne.

### 4.3 Paramètres (en bas du menu)
- Accessible à Amine et Abdelkarim.
- Créer un utilisateur : prénom, nom, e-mail, type (Équipe / Propriétaire / Prestataire), pôle(s) pour l'équipe, logement(s) rattachés pour un propriétaire, puis cases à cocher des droits par module.
- L'utilisateur reçoit un e-mail pour définir son mot de passe.
- Règle de sécurité : **un utilisateur ne peut jamais donner un droit qu'il n'a pas lui-même** (Abdelkarim ne peut pas créer un compte avec accès à la Comptabilité). Seul Amine peut créer d'autres administrateurs.
- Désactiver un utilisateur (sans supprimer son historique).
- Informations de l'entreprise pour les factures : raison sociale, adresse, ICE, IF, RC, patente, coordonnées bancaires, logo.

## 5. Navigation

Menu à gauche (barre du bas ou menu repliable sur téléphone), dans cet ordre, chaque entrée visible seulement si l'utilisateur a le droit de la voir :

1. Dashboard
2. Tâches
3. Stratégie entreprise
4. Marketing
5. CRM
6. Onboarding
7. Logements
8. Calendrier
9. Opérations → sous-pages Ménage, Maintenance, Stock, Check-lists
10. Comptabilité
11. RH
12. Paramètres (tout en bas)

Les propriétaires voient uniquement l'**Espace propriétaire**.

## 6. Modules en détail

### 6.1 Dashboard (premier écran au matin, Amine)
Cartes de chiffres en temps réel, avec comparaison au mois précédent quand c'est pertinent :
- **Taux de biens réservés** : aujourd'hui et sur le mois (à partir du calendrier iCal).
- **Commissions** du mois en cours, mises à jour à chaque versement saisi.
- **Leads appelés depuis le début de la semaine** par l'équipe Sales (depuis le CRM).
- **Biens signés depuis le début du mois** (depuis le CRM).
- **Budget marketing dépensé** sur le mois (depuis le module Marketing).
- Un tableau par logement : loyers encaissés hors ménage, commission, taux d'occupation du mois.
- Un bloc « Tâches du jour et en retard ».

Pour les autres utilisateurs, le Dashboard n'affiche que les blocs de leurs modules autorisés.

### 6.2 Tâches (to-do par pôle)
- Champs : titre, pôle, priorité (Urgent / Important / Normal), échéance, responsable, statut, notes, **sous-tâches** cochables, **pièces jointes**, **lien vers un logement**.
- Statuts : À faire, En cours, Bloqué, Terminé.
- Deux vues au choix de l'utilisateur (choix mémorisé) : **vue semaine** (lundi → dimanche) et **Kanban** par statut. Filtres par pôle, responsable, logement.
- **Tâches récurrentes** : règle de récurrence (chaque jour, semaine, mois, dernier jour du mois). Exemple à créer d'office : « Comptabilité du mois », pôle Comptabilité, **le dernier jour de chaque mois**.
- **Coller une liste** : un champ où Amine colle une liste d'actions (une par ligne, éventuellement avec des puces) ; l'app crée une tâche par ligne dans le pôle choisi, après un écran de vérification.
- Pas de notifications pour l'instant.
- Les tâches de ménage générées automatiquement (6.8) apparaissent aussi ici, pôle Opérations.

### 6.3 Stratégie entreprise
- Notes et décisions de stratégie (titre, date, contenu), journal des décisions.
- Vue d'ensemble de l'avancement des tâches par pôle (ouvertes, en retard, terminées).
- Pas d'OKR pour l'instant (prévoir de pouvoir les ajouter plus tard).

### 6.4 Marketing
- Saisie des dépenses publicitaires : date, canal (Meta, Google, autre), campagne, montant.
- Calendrier des publications : date, réseau, sujet, statut.
- Indicateurs : budget dépensé sur le mois, coût par lead (dépenses ÷ leads reçus du CRM).

### 6.5 CRM (prospects propriétaires)
- Pipeline en colonnes : Nouveau lead → Appelé → Rendez-vous → Estimation envoyée → Proposition → Signé / Perdu.
- Fiche lead : nom, téléphone, e-mail, ville, type de bien, source, notes, historique des appels (date, résultat, auteur), responsable.
- **Réception automatique des leads Meta Lead Ads** via un webhook Meta. Guide Amine pas à pas pour la configuration côté Meta (application développeur, page Facebook, formulaire). Si ce n'est pas faisable dans un délai raisonnable, prévois un import CSV et dis-le à Amine : il gardera Kommo en attendant.
- Bouton « Lead signé → démarrer l'onboarding » qui crée le logement en brouillon dans Onboarding.
- Indicateurs : leads reçus, leads appelés (semaine), rendez-vous, signatures du mois, taux de conversion.

### 6.6 Onboarding (nouveau logement)
Check-list d'intégration d'un nouveau bien, par logement, avec progression en % : visite, inventaire, photos, achats d'équipement, contrat de gestion signé, création de l'annonce, lien iCal ajouté, mise en ligne. Quand tout est coché, le logement passe en statut Actif.

### 6.7 Logements
Fiche logement :
- Nom, type, ville, adresse, **localisation Google Maps** (lien et carte), capacité, statut (Actif / En pause / Onboarding).
- Propriétaire(s) rattaché(s) (comptes Propriétaire).
- **Frais de ménage** (MAD, fixe) et **taux de commission Perfect Stay** (%, 20 % par défaut), saisis à la création.
- Lien(s) iCal (Airbnb, et autres plateformes plus tard).
- Codes d'accès, wifi, équipements.
- **Contacts** : concierge de l'immeuble (nom, téléphone), sécurité, syndic.
- Photos.
- **Documents** : contrat de gestion, fiches de police, contrat de location par réservation, photos d'état des lieux **horodatées** (date et heure d'upload enregistrées et affichées sur l'image, sans pouvoir être modifiées).
- Les fiches de police contiennent des données personnelles de voyageurs (pièces d'identité) : accès restreint aux utilisateurs ayant le droit explicite, stockage privé, jamais visible des propriétaires.

### 6.8 Calendrier
- Synchronisation des **liens iCal** de chaque logement, automatique toutes les 30 minutes (cron) + bouton « Synchroniser maintenant ».
- Vue **style Airbnb** : un calendrier mensuel par logement avec les **nuits réservées en vert**, et une vue multi-logements (logements en lignes, jours en colonnes).
- Chaque réservation importée crée une fiche Réservation : logement, arrivée, départ, nombre de nuits, plateforme.
- **Création automatique d'une tâche de ménage le jour du départ** (pôle Opérations, attribuée par défaut à Abdelkarim, liée au logement). Si une réservation est modifiée ou annulée dans iCal, la tâche est mise à jour ou annulée.
- Important : les flux iCal d'Airbnb ne contiennent **ni les montants ni les noms des voyageurs**, seulement les dates. Les montants sont saisis en Comptabilité (6.10).

### 6.9 Opérations
- **Ménage** : planning des ménages (issus du calendrier + ajouts manuels), statut, prestataire, check-list associée, photos après ménage.
- **Maintenance** : incidents (panne, dégât, plainte) avec logement, description, photos, coût, prestataire, statut (Signalé / En cours / Résolu), date.
- **Stock** : articles (linge, produits d'accueil, consommables), quantité par logement ou en réserve, seuil d'alerte visible dans l'app, historique des entrées/sorties.
- **Check-lists** : modèles de check-lists (ménage, contrôle qualité, check-in…) modifiables, qu'Abdelkarim ou un prestataire coche sur son téléphone, avec photos optionnelles et horodatage.

### 6.10 Comptabilité
**Formule de calcul (à faire valider par Amine dès la phase 1 avec un exemple chiffré) :**

1. **Montant reçu** = chiffre d'affaires de la réservation − commission de la plateforme (saisi par réservation).
2. **Loyer net hors ménage** = Montant reçu − Frais de ménage du logement.
3. **Commission Perfect Stay** = Loyer net hors ménage × taux de commission du logement.
4. **Revenu net propriétaire** = Loyer net hors ménage − Commission Perfect Stay.
5. **Encaissé par Perfect Stay** = Frais de ménage + Commission Perfect Stay.

Exemple : montant reçu 5 000 MAD, ménage 300 MAD, commission 20 % → loyer net hors ménage 4 700, commission 940, revenu propriétaire 3 760, encaissé par Perfect Stay 1 240.

Fonctions :
- Saisie d'un versement rattaché à une réservation du calendrier (ou saisie libre si la réservation n'existe pas) : seul le **Montant reçu** est à saisir, tout le reste est calculé.
- **Dépenses internes** : linge, ménage, maintenance (date, logement, catégorie, montant, justificatif). Non refacturées aux propriétaires.
- Par logement et par mois : total des loyers encaissés hors ménage, commission, taux d'occupation, revenu propriétaire, dépenses.
- **Rapport mensuel propriétaire** (PDF) et **facture de commission** (PDF, numérotation chronologique continue, mentions légales de l'entreprise depuis Paramètres), générés automatiquement le 1er de chaque mois pour le mois précédent, et régénérables à la main.
- Export Excel pour le comptable : à prévoir plus tard (structure les données pour que ce soit simple à ajouter).

### 6.11 RH
- Fiches membres de l'équipe et prestataires : nom, rôle, contact, type de contrat, date d'arrivée, documents.
- Suivi des recrutements : poste, candidats, étape, notes.

### 6.12 Espace propriétaire
- Connexion par e-mail + mot de passe (comptes créés dans Paramètres).
- Le propriétaire voit **uniquement ses logements** : cartes mensuelles avec revenu net, nombre de nuits réservées, taux d'occupation, frais de maintenance engagés, et le calendrier de réservation (lecture seule).
- Il télécharge ses **rapports mensuels** et ses **factures de commission**. Ces documents ne sont accessibles qu'à lui et à Amine.
- Interface très simple, rassurante, adaptée au téléphone.

## 7. Reprise des données de l'ancienne app

L'ancienne app comptabilité est publiée ici : https://claude.ai/public/artifacts/297361e5-617e-4a50-9534-553c30a67efd (7 logements, environ 3 mois de versements). Ses données sont stockées dans l'artifact claude.ai et ne sont pas accessibles directement depuis ce projet.

Procédure :
1. Amine demande, dans la conversation claude.ai où l'ancienne app a été créée, l'ajout d'un bouton « Exporter toutes les données » qui produit ce JSON :

```json
{
  "logements": [
    { "id": "...", "nom": "...", "proprietaire": "...", "ville": "...", "fraisMenage": 0, "ical": "...", "photo": "data:image/jpeg;base64,..." }
  ],
  "transactions": [
    { "id": "...", "logementId": "...", "date": "AAAA-MM-JJ", "montant": 0, "fraisMenage": 0, "note": "..." }
  ]
}
```

2. Construis dans Paramètres un écran **Importer les anciennes données** : Amine colle le JSON ou choisit le fichier, l'app affiche un résumé (nombre de logements, versements, total) avant de valider, puis importe sans créer de doublons si on relance.
3. Attention : dans l'ancienne app, « montant » correspond à ce qui a été saisi à l'époque. Montre à Amine quelques versements importés recalculés avec la nouvelle formule pour qu'il valide que les chiffres sont justes.

## 8. Qualité attendue

- Responsive parfait téléphone et ordinateur ; actions principales accessibles au pouce sur mobile.
- Chargement rapide, états de chargement soignés, états vides qui disent quoi faire, messages d'erreur clairs qui expliquent comment corriger.
- Accessibilité : contraste, navigation clavier, focus visible, mouvement réduit respecté.
- Aucune donnée d'un utilisateur visible par un autre sans droit : teste les règles de sécurité avec des comptes de test (un propriétaire, Abdelkarim).
- Sauvegardes : explique à Amine comment les sauvegardes Supabase fonctionnent.

## 9. Coûts

Démarre sur les offres gratuites (Supabase, Vercel, GitHub). Préviens Amine avant toute étape qui implique un abonnement payant, avec le prix et la raison.

## 10. Ce qu'il ne faut pas faire

- Ne pas inventer de données de démonstration mélangées aux vraies données (utilise un jeu de test séparé et supprimable).
- Ne pas exposer de clé secrète dans le code envoyé sur GitHub.
- Ne pas passer à la phase suivante sans validation d'Amine.

## 11. Ordre de construction (phases)

Tout est important pour Amine ; l'ordre ci-dessous sert uniquement à construire sur des fondations solides.

1. **Fondations** : création des comptes (GitHub, Supabase, Vercel), projet Next.js, design system avec les skills, connexion, utilisateurs, droits, Paramètres, navigation. Validation de la formule de commission.
2. **Logements + reprise des données** : fiches logements complètes, documents, import de l'ancienne app.
3. **Calendrier** : synchronisation iCal, vue style Airbnb, réservations, tâches de ménage automatiques.
4. **Comptabilité + Espace propriétaire** : versements, dépenses, rapports et factures PDF, portail propriétaire.
5. **Opérations** : ménage, maintenance, stock, check-lists mobiles. **Onboarding**.
6. **Tâches** : vue semaine, Kanban, sous-tâches, récurrences, coller une liste.
7. **CRM + Marketing** : pipeline, webhook Meta Lead Ads, dépenses pub, publications.
8. **Dashboard + Stratégie + RH**, puis mise en ligne finale et installation sur les téléphones d'Amine et d'Abdelkarim.

À la fin de chaque phase : déploiement sur Vercel, lien à tester, liste de vérifications pour Amine.
