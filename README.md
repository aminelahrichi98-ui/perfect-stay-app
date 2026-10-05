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

## Variables d'environnement
Voir `.env.example`. Les vraies clés ne sont jamais versionnées (`.env*` est ignoré par Git).
