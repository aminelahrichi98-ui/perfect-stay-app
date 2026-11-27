# Estimateur v2 — Perfect Stay

Estimations locatives fondées sur des données de marché **validées par un humain**, liées au CRM,
avec un document client de 3 pages au maximum.

## 1. Organisation

| Écran | Adresse | Rôle |
|---|---|---|
| Tableau de bord | `/estimateur` | Compteurs (créées, envoyées, brouillons), segments disponibles ou à actualiser, dernières estimations |
| Nouvelle estimation | `/estimateur/nouvelle` | Parcours en 6 étapes : propriétaire (CRM) → logement → données de marché → finances → personnalisation → aperçu |
| Historique | `/estimateur/historique` | Filtres, statuts, ouvrir / modifier un brouillon / nouvelle version / dupliquer / archiver |
| Base marché | `/estimateur/marche` | Segments PriceLabs, import de captures, validation, versions, comparables, quartiers et alias |
| Suivi | `/estimateur/suivi` | Temps de création, taux d'envoi, conversions en rendez-vous et mandats, par commercial, quartier et modèle |
| Paramètres | `/estimateur/parametres` | Financiers, commerciaux, document, données/IA, offres, témoignages (modifiables par un administrateur) |
| Document | `/estimation/[id]` | Ancien modèle (4 pages) pour les estimations existantes, nouveau modèle (3 pages) pour les autres |

Dans la fiche d'un prospect (`/crm/[id]`) : sections **Logements** et **Estimations locatives**.

## 2. Règles de fiabilité appliquées

- Une valeur absente reste `null` (« non renseigné »), jamais 0.
- L'IA **recopie** le texte des captures ; la conversion en nombres est faite par l'application (`src/lib/marche/nombres.ts`, testée).
  Une valeur douteuse (« 1?9 0?6 », « ~10 000 », « 3+ », « 0,68 » sans %) n'est pas convertie.
- Aucune valeur n'est reconstituée à partir d'un graphique ; aucun lien n'est reconstruit.
- Le texte des captures est traité comme une donnée : une consigne écrite dans une capture est signalée, jamais suivie.
- Rien ne devient actif sans validation humaine. Chaque validation crée une **nouvelle version** ; une version validée
  n'est jamais modifiée (contrôlé par la base). Les estimations gardent la version utilisée (instantané figé).
- Studio et 1 chambre sont des segments différents. Un regroupement (« 2 à 3 chambres ») n'existe que s'il vient de PriceLabs.
- Pas d'approximation silencieuse : un autre quartier ou un autre nombre de chambres doit être confirmé explicitement et
  apparaît dans la méthodologie du document.
- Scénario central : valeur de la source si elle existe (avec sa nature : médiane, moyenne…), sinon moyenne du bas et du haut,
  **signalée comme calculée** (jamais présentée comme une médiane).
- Formule initiale : 18 % de frais de plateforme puis 20 % de commission (le propriétaire garde 65,6 %). Tous les taux, la TVA,
  la base de commission, le ménage et les arrondis sont des paramètres.
- Comparaison longue durée : seulement avec un loyer renseigné (source et date affichées) ; pas de pourcentage si le loyer est 0 ;
  si la longue durée rapporte plus, le document le dit.
- Témoignages : seuls ceux marqués « vérifiés » peuvent apparaître. Offres : seulement si actives, dans leurs dates et choisies.
- « Envoyée » est une action explicite (télécharger ou ouvrir WhatsApp ne suffit pas). L'ouverture du PDF n'est pas suivie.
- L'estimateur ne change **jamais** l'étape commerciale du prospect. La fiche logement du CRM n'est mise à jour que par le bouton
  « Enregistrer dans la fiche CRM ».

## 3. Configuration

### Base de données
Coller `supabase/migrations/0015_estimateur_v2.sql` dans Supabase > SQL Editor, puis « Run » (relançable sans danger).

### Lecture automatique des captures (facultatif)
- Variable d'environnement **`ANTHROPIC_API_KEY`** (Vercel > Settings > Environment Variables). Jamais dans le code.
- `ESTIMATEUR_IA_FOURNISSEUR` : `claude` (par défaut).
- Modèle : paramètre « Modèle d'IA » de l'estimateur (`claude-opus-5-5` par défaut).
- Repli côté serveur activé : si le modèle principal décline une requête, l'API la relance automatiquement sur le modèle de
  repli recommandé (signalé dans les avertissements de l'import).
- Sans clé : l'import de captures fonctionne (elles servent de sources) et les valeurs se saisissent à la main.
- Seules les captures (et la description publique du segment attendu) sont envoyées : aucune donnée de propriétaire.

Architecture : `src/lib/marche/ia/fournisseur.ts` (contrat indépendant du fournisseur), `claude.ts` (adaptateur),
`consignes.ts` (consignes), `src/app/api/estimateur/extraction/route.ts` (route serveur, 300 s max).

### Stockage
Dossier privé `marche` (captures et photos de comparables) : 15 Mo par fichier, PNG/JPEG/WEBP uniquement, contenu vérifié
par le serveur. Photos des logements : dossier privé `estimations` (existant).

## 4. Tests
- `npm test` : lecture des nombres, extraction (test 10), recherche de segments (tests 3 et 4), calcul (tests 5 et 6),
  versions (test 8), suivi, formulaire du site.
- `npm run test:sql` : droits, versions figées, estimations figées après validation, historique non supprimable (tests 7, 8, 11).

## 5. Retour arrière

Le code peut être ramené à la version précédente par un « revert » du merge. Les données ne sont pas touchées.

Retirer la structure de la base (**destructif : efface les données de marché, les logements des prospects et les estimations
du nouveau modèle** — à ne faire qu'après export et avec accord) :

```sql
-- 1. Estimations du nouveau modèle (les anciennes, modèle v1, sont conservées)
delete from public.estimations where modele_document = 'v2';
-- 2. Nouvelles tables
drop table if exists public.estimation_evenements, public.estimateur_temoignages, public.estimateur_offres,
  public.estimateur_parametres, public.marche_comparables, public.marche_versions, public.marche_captures,
  public.marche_imports, public.marche_segments, public.marche_alias, public.marche_quartiers, public.crm_biens cascade;
-- 3. Colonnes ajoutées aux estimations
drop trigger if exists estimations_figee on public.estimations;
drop trigger if exists estimations_touch on public.estimations;
drop function if exists public.estimation_figee(), public.marche_version_figee();
alter table public.estimations drop constraint if exists estimations_statut_check, drop constraint if exists estimations_modele_check,
  drop constraint if exists estimations_version_check;
alter table public.estimations drop column if exists lead_id, drop column if exists bien_id, drop column if exists statut,
  drop column if exists modele_document, drop column if exists numero_version, drop column if exists racine_id,
  drop column if exists segment_version_id, drop column if exists snapshot, drop column if exists validee_le,
  drop column if exists envoyee_le, drop column if exists archivee_le, drop column if exists duree_creation_s, drop column if exists updated_at;
drop policy if exists estimations_modification on public.estimations;
drop policy if exists estimations_suppression on public.estimations;
create policy estimations_suppression on public.estimations for delete to authenticated using (public.est_admin());
```
Le dossier de stockage `marche` se supprime depuis Supabase > Storage après l'avoir vidé.
