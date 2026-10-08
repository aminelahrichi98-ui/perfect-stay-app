# Perfect Stay — application interne

Application de gestion de Perfect Stay Conciergerie (logements, calendrier, opérations, comptabilité, CRM…).
Cahier des charges : [`CAHIER-DES-CHARGES.md`](./CAHIER-DES-CHARGES.md).

## Technique
- Next.js (App Router, TypeScript) + Tailwind CSS
- Supabase (base Postgres, connexion, droits par Row Level Security)
- Hébergement Vercel

## Commandes
```bash
npm install        # installe les dépendances
npm run dev        # lance l'app en local sur http://localhost:3000
npm run lint       # vérifie la qualité du code
npm run typecheck  # vérifie les types
npm test           # lance les tests (formule de commission, droits, import, photos)
npm run test:sql   # teste les règles de sécurité de la base sur une vraie base PostgreSQL embarquée
```

## Base de données
Les scripts SQL sont dans `supabase/migrations/`, à exécuter dans l'ordre dans Supabase > SQL Editor.

## Synchronisation des calendriers (phase 3)
Les calendriers iCal sont synchronisés toutes les 30 minutes : Supabase (pg_cron + pg_net, gratuit) appelle
`/api/cron/ical` avec le mot de passe `CRON_SECRET`. Le script `supabase/migrations/0004_planification_synchro.sql`
met en place cette planification. Vercel garde une passe quotidienne en filet de sécurité (`vercel.json`).

## Comptabilité et espace propriétaire (phase 4)
Le script `supabase/migrations/0005_comptabilite.sql` ajoute les dépenses, les factures (numéros PS-AAAA-NNNN continus,
non modifiables une fois émises), les rapports mensuels et les vues réservées aux propriétaires. Le script
`0006_planification_documents.sql` planifie la génération automatique des rapports et factures le 1er de chaque mois
(`/api/cron/documents`, même `CRON_SECRET` que la synchronisation). Les PDF sont stockés dans le bucket privé `rapports`.

## Opérations et onboarding (phase 5)
Le script `supabase/migrations/0007_operations.sql` ajoute les ménages avec contrôle qualité, les check-lists
(modèles, photos horodatées), la maintenance (incidents, frais avancés, remboursements), le stock et l'onboarding.
Les photos et factures vont dans le bucket privé `operations`. Un compte de type « Prestataire » ne voit que les
ménages qui lui sont attribués : la base de données applique cette règle, pas seulement l'écran.

## Tâches (phase 6)
Le script `supabase/migrations/0008_taches.sql` ajoute les sous-tâches, les pièces jointes (bucket privé `taches`) et les
règles de récurrence. Les tâches récurrentes sont créées 14 jours à l'avance, à l'ouverture de la page Tâches et chaque
jour à 03:00 par `/api/cron/taches` (sans doublon). « Comptabilité du mois » est créée d'office : dernier jour de chaque mois.

## CRM et Marketing (phase 7)
Le script `supabase/migrations/0009_crm_marketing.sql` ajoute le pipeline de leads (appels, historique des étapes),
les dépenses publicitaires et le calendrier des publications. Les leads Meta arrivent par `POST /api/meta/leads`
(signature vérifiée avec `META_APP_SECRET`, jeton de vérification `META_VERIFY_TOKEN`, lecture du lead avec
`META_PAGE_ACCESS_TOKEN`). Sans Meta, l'import CSV du CRM sert de solution de repli.

## Stratégie, RH et installation sur téléphone (phase 8)
Le script `supabase/migrations/0010_strategie_rh.sql` ajoute le journal des décisions et les modules RH (fiches, documents
dans le bucket privé `rh`, recrutements). Le Dashboard affiche les chiffres des modules auxquels l'utilisateur a droit.
L'app est installable (PWA) : `manifest.webmanifest`, icônes, et un petit service worker (`public/sw.js`) qui ne garde
que la page « hors ligne » : aucune donnée n'est stockée sur le téléphone.

## Sauvegardes
Supabase sauvegarde la base chaque jour (conservation selon l'offre : 7 jours en Pro, aucune sauvegarde automatique téléchargeable
en offre gratuite). Pensez à exporter régulièrement les données importantes (Comptabilité > rapports PDF) et à envisager l'offre Pro
quand l'activité grandit. Les fichiers (photos, PDF) sont dans Supabase Storage.

## Variables d'environnement
Voir `.env.example`. Les vraies clés ne sont jamais versionnées (`.env*` est ignoré par Git).
