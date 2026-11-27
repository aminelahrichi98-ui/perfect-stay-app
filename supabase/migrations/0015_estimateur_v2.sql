-- ============================================================================
-- Perfect Stay — Estimateur v2 : logements des prospects, base de données marché
-- (PriceLabs), versions, estimations liées au CRM, paramètres et suivi.
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger. Il ne supprime ni ne modifie aucune donnée
-- existante : il ajoute des tables, des colonnes et des règles.
-- Retour arrière : voir docs/estimateur.md (section « Retour arrière »).
-- ============================================================================

-- 1. Logements des prospects (CRM) ----------------------------------------------------
-- Un prospect peut posséder plusieurs logements : chaque estimation désigne le sien.
create table if not exists public.crm_biens (
  id                      uuid primary key default gen_random_uuid(),
  lead_id                 uuid not null references public.crm_leads (id) on delete cascade,
  libelle                 text not null default '',
  ville                   text not null default '',
  quartier                text not null default '',
  adresse                 text not null default '',
  residence               text not null default '',
  type_logement           text check (type_logement is null or type_logement in ('studio', 'appartement', 'duplex', 'penthouse', 'villa', 'riad', 'autre')),
  chambres                integer check (chambres is null or chambres between 0 and 20),
  surface                 integer check (surface is null or surface between 5 and 5000),
  capacite                integer check (capacite is null or capacite between 1 and 50),
  standing                text check (standing is null or standing in ('standard', 'superieur', 'premium')),
  salles_de_bain          integer check (salles_de_bain is null or salles_de_bain between 0 and 20),
  equipements             text[] not null default '{}',
  parking                 boolean,                          -- null = inconnu
  terrasse                boolean,
  piscine                 boolean,
  salle_sport             boolean,
  ameublement             text check (ameublement is null or ameublement in ('meuble', 'partiel', 'non_meuble')),
  photos                  jsonb not null default '[]',      -- chemins dans le stockage privé « estimations »
  exploitation            text check (exploitation is null or exploitation in ('longue', 'courte', 'vacant', 'autre')),
  occupation              text check (occupation is null or occupation in ('occupe', 'vacant', 'bientot_libre')),
  loyer_longue_duree      numeric(12, 2) check (loyer_longue_duree is null or loyer_longue_duree >= 0),
  revenus_courte_mensuels numeric(12, 2) check (revenus_courte_mensuels is null or revenus_courte_mensuels >= 0),
  attentes                text not null default '',
  lien_annonce            text not null default '',
  created_by              uuid references public.profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists crm_biens_lead on public.crm_biens (lead_id);
drop trigger if exists crm_biens_touch on public.crm_biens;
create trigger crm_biens_touch before update on public.crm_biens
  for each row execute function public.touch_updated_at();

-- 2. Quartiers et alias ---------------------------------------------------------------
-- « cle » = nom normalisé par l'application (minuscules, sans accents ni ponctuation).
create table if not exists public.marche_quartiers (
  id         uuid primary key default gen_random_uuid(),
  pays       text not null default 'MA',
  ville      text not null check (length(trim(ville)) > 0),
  ville_cle  text not null,
  nom        text not null check (length(trim(nom)) > 0),
  cle        text not null,
  actif      boolean not null default true,
  created_at timestamptz not null default now(),
  unique (pays, ville_cle, cle)
);

-- Un alias pointe vers un seul quartier d'une ville : deux quartiers ne peuvent pas partager un alias
create table if not exists public.marche_alias (
  id          uuid primary key default gen_random_uuid(),
  quartier_id uuid not null references public.marche_quartiers (id) on delete cascade,
  ville_cle   text not null,
  alias       text not null check (length(trim(alias)) > 0),
  cle         text not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (ville_cle, cle)
);

-- 3. Segments de marché ---------------------------------------------------------------
-- Studio = 0 chambre de type « studio », distinct d'un appartement d'une chambre.
-- chambres_max ne sert qu'aux regroupements réellement fournis par PriceLabs (ex. 1 à 2 chambres).
create table if not exists public.marche_segments (
  id            uuid primary key default gen_random_uuid(),
  quartier_id   uuid not null references public.marche_quartiers (id) on delete restrict,
  type_logement text not null check (type_logement in ('studio', 'appartement', 'villa', 'riad')),
  chambres      integer not null check (chambres between 0 and 20),
  chambres_max  integer check (chambres_max is null or chambres_max > chambres),
  capacite      integer check (capacite is null or capacite between 1 and 50),
  standing      text check (standing is null or standing in ('standard', 'superieur', 'premium')),
  statut        text not null default 'actif' check (statut in ('actif', 'archive')),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (type_logement <> 'studio' or (chambres = 0 and chambres_max is null))
);
create unique index if not exists marche_segments_unique
  on public.marche_segments (quartier_id, type_logement, chambres, coalesce(chambres_max, -1), coalesce(capacite, -1), coalesce(standing, ''));

-- 4. Imports PriceLabs et captures sources --------------------------------------------
create table if not exists public.marche_imports (
  id          uuid primary key default gen_random_uuid(),
  statut      text not null default 'brouillon' check (statut in ('brouillon', 'extrait', 'valide', 'abandonne')),
  segment_id  uuid references public.marche_segments (id) on delete set null,   -- segment visé (actualisation)
  extraction  jsonb,                 -- sortie de l'IA, telle que reçue (après contrôle du schéma)
  donnees     jsonb,                 -- données corrigées par l'utilisateur
  modele      text not null default '',
  erreur      text not null default '',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists marche_imports_touch on public.marche_imports;
create trigger marche_imports_touch before update on public.marche_imports
  for each row execute function public.touch_updated_at();

create table if not exists public.marche_captures (
  id         uuid primary key default gen_random_uuid(),
  import_id  uuid not null references public.marche_imports (id) on delete cascade,
  chemin     text not null,          -- stockage privé « marche »
  nom        text not null default '',
  type_mime  text not null check (type_mime in ('image/png', 'image/jpeg', 'image/webp')),
  taille     integer not null check (taille > 0 and taille <= 15728640),
  ordre      integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists marche_captures_import on public.marche_captures (import_id, ordre);

-- 5. Versions des données de marché -----------------------------------------------------
-- Une version validée ne change plus : une actualisation crée une nouvelle version.
create table if not exists public.marche_versions (
  id                       uuid primary key default gen_random_uuid(),
  segment_id               uuid not null references public.marche_segments (id) on delete restrict,
  numero                   integer not null check (numero > 0),
  active                   boolean not null default false,
  statut                   text not null default 'validee' check (statut in ('validee', 'remplacee', 'archivee')),
  source                   text not null default 'PriceLabs',
  import_id                uuid references public.marche_imports (id) on delete set null,
  periode_debut            date,
  periode_fin              date check (periode_fin is null or periode_debut is null or periode_fin >= periode_debut),
  type_periode             text not null default '',
  devise                   text not null default 'MAD' check (devise ~ '^[A-Z]{3}$'),
  base_plateforme_incluse  boolean,   -- null = définition des revenus inconnue
  base_menage_inclus       boolean,
  base_taxes_incluses      boolean,
  definition_source        text not null default '',
  revenu_annuel_bas        numeric(14, 2) check (revenu_annuel_bas is null or revenu_annuel_bas >= 0),
  revenu_annuel_central    numeric(14, 2) check (revenu_annuel_central is null or revenu_annuel_central >= 0),
  revenu_annuel_haut       numeric(14, 2) check (revenu_annuel_haut is null or revenu_annuel_haut >= 0),
  central_derive           boolean not null default false,
  central_nature           text not null default 'inconnu' check (central_nature in ('moyenne', 'mediane', 'percentile', 'prevision', 'autre', 'inconnu')),
  adr                      numeric(12, 2) check (adr is null or adr >= 0),
  occupation               numeric(5, 2) check (occupation is null or occupation between 0 and 100),
  nuits_reservees          numeric(8, 2) check (nuits_reservees is null or nuits_reservees >= 0),
  echantillon              integer check (echantillon is null or echantillon >= 0),
  revenu_mensuel_moyen     numeric(12, 2) check (revenu_mensuel_moyen is null or revenu_mensuel_moyen >= 0),
  percentiles              jsonb not null default '[]',
  mensuels                 jsonb not null default '[]',
  parametres_recherche     jsonb not null default '[]',
  autres_metriques         jsonb not null default '[]',
  infos_frais              text not null default '',
  preuves                  jsonb not null default '[]',
  avertissements           jsonb not null default '[]',
  derives                  jsonb not null default '[]',
  notes                    text not null default '',
  date_import              timestamptz not null default now(),
  validee_par              uuid references public.profiles (id) on delete set null,
  validee_le               timestamptz not null default now(),
  unique (segment_id, numero)
);
create unique index if not exists marche_versions_une_active on public.marche_versions (segment_id) where active;

create table if not exists public.marche_comparables (
  id                 uuid primary key default gen_random_uuid(),
  version_id         uuid not null references public.marche_versions (id) on delete cascade,
  ordre              integer not null default 0,
  nom                text not null default '',
  quartier           text not null default '',
  type_logement      text not null default '',
  chambres           integer check (chambres is null or chambres between 0 and 20),
  capacite           integer check (capacite is null or capacite between 1 and 50),
  revenu_annuel      numeric(14, 2) check (revenu_annuel is null or revenu_annuel >= 0),
  revenu_annuel_bas  numeric(14, 2) check (revenu_annuel_bas is null or revenu_annuel_bas >= 0),
  revenu_annuel_haut numeric(14, 2) check (revenu_annuel_haut is null or revenu_annuel_haut >= 0),
  adr                numeric(12, 2) check (adr is null or adr >= 0),
  occupation         numeric(5, 2) check (occupation is null or occupation between 0 and 100),
  note               numeric(3, 2) check (note is null or note between 0 and 5),
  nb_avis            integer check (nb_avis is null or nb_avis >= 0),
  equipements        text[] not null default '{}',
  url                text not null default '' check (url = '' or url ~ '^https://'),
  identifiant        text not null default '',
  photo_chemin       text not null default '',            -- photo ajoutée à la main (stockage « marche »)
  capture_id         uuid references public.marche_captures (id) on delete set null,
  affichable         boolean not null default true,       -- proposé dans les estimations commerciales
  created_at         timestamptz not null default now()
);
create index if not exists marche_comparables_version on public.marche_comparables (version_id, ordre);

-- Les chiffres d'une version validée sont figés : seuls le statut, l'activation et les notes changent.
create or replace function public.marche_version_figee()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (to_jsonb(new) - array['active', 'statut', 'notes']) is distinct from (to_jsonb(old) - array['active', 'statut', 'notes']) then
    raise exception 'Une version validée ne peut pas être modifiée : importez une nouvelle version.';
  end if;
  return new;
end;
$$;
drop trigger if exists marche_versions_figee on public.marche_versions;
create trigger marche_versions_figee before update on public.marche_versions
  for each row execute function public.marche_version_figee();

-- 6. Estimations : extension non destructive ----------------------------------------------
-- Les estimations existantes restent intactes : modèle « v1 », statut « validee ».
alter table public.estimations add column if not exists lead_id            uuid references public.crm_leads (id) on delete set null;
alter table public.estimations add column if not exists bien_id            uuid references public.crm_biens (id) on delete set null;
alter table public.estimations add column if not exists statut             text not null default 'validee';
alter table public.estimations add column if not exists modele_document    text not null default 'v1';
alter table public.estimations add column if not exists numero_version     integer not null default 1;
alter table public.estimations add column if not exists racine_id          uuid references public.estimations (id) on delete set null;
alter table public.estimations add column if not exists segment_version_id uuid references public.marche_versions (id) on delete set null;
alter table public.estimations add column if not exists snapshot           jsonb;
alter table public.estimations add column if not exists validee_le         timestamptz;
alter table public.estimations add column if not exists envoyee_le         timestamptz;
alter table public.estimations add column if not exists archivee_le        timestamptz;
alter table public.estimations add column if not exists duree_creation_s   integer;
alter table public.estimations add column if not exists updated_at         timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'estimations_statut_check') then
    alter table public.estimations add constraint estimations_statut_check check (statut in ('brouillon', 'a_valider', 'validee', 'envoyee', 'archivee'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estimations_modele_check') then
    alter table public.estimations add constraint estimations_modele_check check (modele_document in ('v1', 'v2'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estimations_version_check') then
    alter table public.estimations add constraint estimations_version_check check (numero_version > 0 and (duree_creation_s is null or duree_creation_s >= 0));
  end if;
end $$;

-- Un brouillon v2 peut exister avant que les données de marché soient choisies
alter table public.estimations alter column standing drop not null;
alter table public.estimations alter column brut_bas drop not null;
alter table public.estimations alter column brut_haut drop not null;
alter table public.estimations alter column net_bas drop not null;
alter table public.estimations alter column net_haut drop not null;

create index if not exists estimations_lead on public.estimations (lead_id);
create index if not exists estimations_racine on public.estimations (racine_id);
drop trigger if exists estimations_touch on public.estimations;
create trigger estimations_touch before update on public.estimations
  for each row execute function public.touch_updated_at();

-- Une estimation validée, envoyée ou archivée garde ses chiffres d'origine :
-- seuls le statut et les dates d'envoi ou d'archivage évoluent. Une modification = une nouvelle version.
create or replace function public.estimation_figee()
returns trigger language plpgsql set search_path = ''
as $$
declare
  libres text[] := array['statut', 'validee_le', 'envoyee_le', 'archivee_le', 'updated_at'];
begin
  if old.statut in ('validee', 'envoyee', 'archivee')
     and (to_jsonb(new) - libres) is distinct from (to_jsonb(old) - libres) then
    raise exception 'Cette estimation est validée : créez une nouvelle version pour la modifier.';
  end if;
  if old.statut in ('validee', 'envoyee', 'archivee') and new.statut in ('brouillon', 'a_valider') then
    raise exception 'Une estimation validée ne redevient pas un brouillon.';
  end if;
  return new;
end;
$$;
drop trigger if exists estimations_figee on public.estimations;
create trigger estimations_figee before update on public.estimations
  for each row execute function public.estimation_figee();

drop policy if exists estimations_modification on public.estimations;
create policy estimations_modification on public.estimations for update to authenticated
  using (public.a_droit('estimateur', 'modifier')) with check (public.a_droit('estimateur', 'modifier'));
-- Historique conservé : seule une estimation en brouillon peut être supprimée (par un administrateur) ; les autres s'archivent
drop policy if exists estimations_suppression on public.estimations;
create policy estimations_suppression on public.estimations for delete to authenticated
  using (public.est_admin() and statut = 'brouillon');

-- 7. Événements des estimations (suivi commercial, historique du lead) --------------------
create table if not exists public.estimation_evenements (
  id            uuid primary key default gen_random_uuid(),
  estimation_id uuid not null references public.estimations (id) on delete cascade,
  lead_id       uuid references public.crm_leads (id) on delete set null,
  type          text not null check (type in ('creee', 'soumise', 'validee', 'envoyee', 'nouvelle_version', 'dupliquee', 'archivee')),
  detail        text not null default '',
  auteur_id     uuid references public.profiles (id) on delete set null,
  cree_le       timestamptz not null default now()
);
create index if not exists estimation_evenements_estimation on public.estimation_evenements (estimation_id, cree_le);
create index if not exists estimation_evenements_lead on public.estimation_evenements (lead_id, cree_le);

-- 8. Paramètres, offres et témoignages ----------------------------------------------------
create table if not exists public.estimateur_parametres (
  id                       boolean primary key default true check (id),
  -- Financiers : configuration initiale = formule du document actuel (18 % puis 20 %)
  taux_plateforme          numeric(6, 4) not null default 0.18 check (taux_plateforme >= 0 and taux_plateforme < 1),
  tva_plateforme           numeric(6, 4) not null default 0 check (tva_plateforme >= 0 and tva_plateforme < 1),
  taux_commission          numeric(6, 4) not null default 0.20 check (taux_commission >= 0 and taux_commission < 1),
  tva_commission           numeric(6, 4) not null default 0 check (tva_commission >= 0 and tva_commission < 1),
  base_commission          text not null default 'apres_plateforme' check (base_commission in ('apres_plateforme', 'brut')),
  menage_mode              text not null default 'inconnu' check (menage_mode in ('refacture_voyageur', 'a_charge_proprietaire', 'inconnu')),
  menage_plateforme_preleve boolean not null default false,
  menage_part_revenu       numeric(6, 4) check (menage_part_revenu is null or (menage_part_revenu >= 0 and menage_part_revenu < 1)),
  methode_scenarios        text not null default 'fourchette' check (methode_scenarios in ('fourchette', 'percentiles')),
  arrondi_mensuel          integer not null default 100 check (arrondi_mensuel in (1, 10, 100)),
  devise                   text not null default 'MAD' check (devise ~ '^[A-Z]{3}$'),
  -- Commerciaux
  cta_texte                text not null default 'Réserver ma visite gratuite',
  whatsapp                 text not null default '',
  message_whatsapp         text not null default 'Bonjour, j''ai reçu mon estimation Perfect Stay et je souhaite organiser une visite de mon appartement.',
  lien_rdv                 text not null default '' check (lien_rdv = '' or lien_rdv ~ '^https://'),
  email_contact            text not null default '',
  telephone_contact        text not null default '',
  services                 jsonb not null default '["Optimisation des revenus et tarification dynamique", "Création des annonces et gestion des réservations", "Sélection et accueil des voyageurs", "Ménage professionnel et contrôle qualité", "Assistance voyageurs et coordination de la maintenance", "Reporting mensuel et suivi des performances"]',
  -- Document
  mentions_legales         text not null default 'Estimation indicative fondée sur des données de marché. Les revenus ne sont pas garantis et varient selon la saison, le prix, l''état du logement et la demande. Charges d''exploitation et fiscalité non déduites sauf mention contraire.',
  validite_jours           integer not null default 30 check (validite_jours between 1 and 365),
  max_comparables          integer not null default 4 check (max_comparables between 2 and 4),
  section_saisonnalite     boolean not null default true,
  section_preuve           boolean not null default true,
  qr_code                  boolean not null default true,
  -- Données
  fraicheur_recente_jours  integer not null default 30 check (fraicheur_recente_jours > 0),
  fraicheur_alerte_jours   integer not null default 90 check (fraicheur_alerte_jours > 0),
  standing_obligatoire     boolean not null default false,
  tolerance_capacite       integer not null default 1 check (tolerance_capacite between 0 and 10),
  ia_active                boolean not null default true,
  ia_modele                text not null default 'claude-opus-5-5',
  updated_by               uuid references public.profiles (id) on delete set null,
  updated_at               timestamptz not null default now(),
  check (fraicheur_alerte_jours > fraicheur_recente_jours)
);
insert into public.estimateur_parametres (id) values (true) on conflict (id) do nothing;

create table if not exists public.estimateur_offres (
  id          uuid primary key default gen_random_uuid(),
  titre       text not null check (length(trim(titre)) > 0),
  description text not null default '',
  duree_mois  integer check (duree_mois is null or duree_mois between 1 and 24),
  conditions  text not null default '',
  debut       date,
  fin         date check (fin is null or debut is null or fin >= debut),
  actif       boolean not null default false,
  created_at  timestamptz not null default now()
);
-- L'offre de bienvenue existe sur le site : elle est créée désactivée, à confirmer avant usage
insert into public.estimateur_offres (titre, description, duree_mois, actif)
select 'Votre premier mois de gestion offert', 'Aucune commission de gestion Perfect Stay sur le premier mois d''exploitation.', 1, false
where not exists (select 1 from public.estimateur_offres);

create table if not exists public.estimateur_temoignages (
  id         uuid primary key default gen_random_uuid(),
  auteur     text not null check (length(trim(auteur)) > 0),
  contexte   text not null default '',
  texte      text not null check (length(trim(texte)) > 0),
  verifie    boolean not null default false,   -- accord écrit du propriétaire et faits vérifiés
  actif      boolean not null default true,
  created_at timestamptz not null default now()
);

-- 9. Sécurité -----------------------------------------------------------------------------
alter table public.crm_biens              enable row level security;
alter table public.marche_quartiers       enable row level security;
alter table public.marche_alias           enable row level security;
alter table public.marche_segments        enable row level security;
alter table public.marche_imports         enable row level security;
alter table public.marche_captures        enable row level security;
alter table public.marche_versions        enable row level security;
alter table public.marche_comparables     enable row level security;
alter table public.estimation_evenements  enable row level security;
alter table public.estimateur_parametres  enable row level security;
alter table public.estimateur_offres      enable row level security;
alter table public.estimateur_temoignages enable row level security;

-- Logements des prospects : mêmes droits que le CRM
drop policy if exists crm_biens_lecture on public.crm_biens;
create policy crm_biens_lecture on public.crm_biens for select to authenticated using (not public.est_prestataire() and public.a_droit('crm', 'voir'));
drop policy if exists crm_biens_ajout on public.crm_biens;
create policy crm_biens_ajout on public.crm_biens for insert to authenticated with check (not public.est_prestataire() and public.a_droit('crm', 'modifier'));
drop policy if exists crm_biens_modification on public.crm_biens;
create policy crm_biens_modification on public.crm_biens for update to authenticated using (not public.est_prestataire() and public.a_droit('crm', 'modifier')) with check (not public.est_prestataire() and public.a_droit('crm', 'modifier'));
drop policy if exists crm_biens_suppression on public.crm_biens;
create policy crm_biens_suppression on public.crm_biens for delete to authenticated using (not public.est_prestataire() and public.a_droit('crm', 'modifier'));

-- Base marché : lecture avec « Estimateur – voir », écriture avec « Estimateur – modifier »
do $$
declare t text;
begin
  foreach t in array array['marche_quartiers', 'marche_alias', 'marche_segments', 'marche_imports', 'marche_captures', 'marche_versions', 'marche_comparables']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (not public.est_prestataire() and public.a_droit('estimateur', 'voir'))$f$, t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (not public.est_prestataire() and public.a_droit('estimateur', 'modifier'))$f$, t || '_ajout', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (not public.est_prestataire() and public.a_droit('estimateur', 'modifier')) with check (not public.est_prestataire() and public.a_droit('estimateur', 'modifier'))$f$, t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
  end loop;
end $$;
-- Rien ne se supprime dans la base marché (on archive), sauf un import non validé et ses captures
drop policy if exists marche_imports_suppression on public.marche_imports;
create policy marche_imports_suppression on public.marche_imports for delete to authenticated using (public.a_droit('estimateur', 'modifier') and statut <> 'valide');
drop policy if exists marche_captures_suppression on public.marche_captures;
create policy marche_captures_suppression on public.marche_captures for delete to authenticated
  using (public.a_droit('estimateur', 'modifier') and exists (select 1 from public.marche_imports i where i.id = import_id and i.statut <> 'valide'));
drop policy if exists marche_alias_suppression on public.marche_alias;
create policy marche_alias_suppression on public.marche_alias for delete to authenticated using (public.est_admin());

-- Événements : ajout et lecture, jamais de modification ni de suppression
drop policy if exists estimation_evenements_lecture on public.estimation_evenements;
create policy estimation_evenements_lecture on public.estimation_evenements for select to authenticated using (public.a_droit('estimateur', 'voir') or public.a_droit('crm', 'voir'));
drop policy if exists estimation_evenements_ajout on public.estimation_evenements;
create policy estimation_evenements_ajout on public.estimation_evenements for insert to authenticated with check (public.a_droit('estimateur', 'modifier'));

-- Paramètres, offres, témoignages : lus par l'Estimateur, modifiés par un administrateur seulement
do $$
declare t text;
begin
  foreach t in array array['estimateur_parametres', 'estimateur_offres', 'estimateur_temoignages']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (public.a_droit('estimateur', 'voir'))$f$, t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (public.est_admin())$f$, t || '_ajout', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (public.est_admin()) with check (public.est_admin())$f$, t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (public.est_admin())$f$, t || '_suppression', t);
  end loop;
end $$;

-- Captures PriceLabs et photos de comparables : stockage privé
-- Limites appliquées par le stockage lui-même : 15 Mo, images PNG, JPEG ou WEBP uniquement
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marche', 'marche', false, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
