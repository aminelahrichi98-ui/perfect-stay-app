-- ============================================================================
-- Perfect Stay — Phase 2 : logements, documents, reprise des anciennes données
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Prérequis : 0001_fondations.sql déjà exécuté. Le script peut être relancé sans danger.
-- ============================================================================

-- 0. Mise à jour automatique de la date de modification -----------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Logements ---------------------------------------------------------------
create table if not exists public.logements (
  id                uuid primary key default gen_random_uuid(),
  nom               text not null,
  type              text not null default 'appartement'
                      check (type in ('appartement', 'villa', 'riad', 'studio', 'autre')),
  ville             text not null default '',
  adresse           text not null default '',
  maps_url          text not null default '',          -- lien Google Maps
  capacite          integer check (capacite is null or capacite > 0),
  statut            text not null default 'onboarding'
                      check (statut in ('actif', 'en_pause', 'onboarding')),
  -- Tarifs : base de tous les calculs de la comptabilité
  frais_menage      numeric(10, 2) not null default 0 check (frais_menage >= 0),  -- MAD, fixe
  taux_commission   numeric(5, 2) not null default 20 check (taux_commission between 0 and 100),  -- %
  -- Accès et équipements
  code_acces        text not null default '',
  wifi_nom          text not null default '',
  wifi_mot_de_passe text not null default '',
  equipements       text not null default '',
  notes             text not null default '',
  -- Propriétaire pas encore doté d'un compte (ou repris de l'ancienne app)
  proprietaire_nom  text not null default '',
  -- Identifiant dans l'ancienne app : évite les doublons si on relance l'import
  ancien_id         text unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists logements_touch on public.logements;
create trigger logements_touch before update on public.logements
  for each row execute function public.touch_updated_at();

-- 2. Liens iCal (un ou plusieurs par logement) --------------------------------
create table if not exists public.logement_ical (
  id            uuid primary key default gen_random_uuid(),
  logement_id   uuid not null references public.logements (id) on delete cascade,
  plateforme    text not null default 'Airbnb',
  url           text not null check (url ~* '^https?://'),
  derniere_sync timestamptz,
  derniere_erreur text,
  unique (logement_id, url)
);

-- 3. Contacts (concierge, sécurité, syndic…) ----------------------------------
create table if not exists public.logement_contacts (
  id          uuid primary key default gen_random_uuid(),
  logement_id uuid not null references public.logements (id) on delete cascade,
  role        text not null default 'concierge'
                check (role in ('concierge', 'securite', 'syndic', 'autre')),
  nom         text not null default '',
  telephone   text not null default ''
);

-- 4. Propriétaires rattachés (comptes de type « proprietaire ») ----------------
create table if not exists public.logement_proprietaires (
  logement_id uuid not null references public.logements (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  primary key (logement_id, user_id)
);

create or replace function public.verifier_proprietaire()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.type = 'proprietaire') then
    raise exception 'Seul un compte de type Propriétaire peut être rattaché à un logement.';
  end if;
  return new;
end;
$$;
drop trigger if exists logement_proprietaires_verif on public.logement_proprietaires;
create trigger logement_proprietaires_verif before insert or update on public.logement_proprietaires
  for each row execute function public.verifier_proprietaire();

-- 5. Photos du logement ------------------------------------------------------
create table if not exists public.logement_photos (
  id               uuid primary key default gen_random_uuid(),
  logement_id      uuid not null references public.logements (id) on delete cascade,
  chemin           text not null,        -- fichier dans le stockage privé « logements-photos »
  chemin_vignette  text not null,
  legende          text not null default '',
  ordre            integer not null default 0,
  created_at       timestamptz not null default now()
);

-- 6. Documents (contrat, fiches de police, états des lieux…) ------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  logement_id   uuid not null references public.logements (id) on delete cascade,
  type          text not null
                  check (type in ('contrat_gestion', 'fiche_police', 'contrat_location', 'etat_des_lieux', 'autre')),
  nom           text not null,
  chemin        text not null,           -- fichier dans le stockage privé « documents »
  type_mime     text not null default '',
  taille        bigint not null default 0,
  reference     text not null default '',  -- ex. réservation concernée
  -- Date et heure d'envoi : posées par la base, jamais modifiables
  horodatage    timestamptz not null default now(),
  televerse_par uuid references public.profiles (id) on delete set null
);

-- Un document ne se modifie pas : on le supprime et on le renvoie.
create or replace function public.documents_immuables()
returns trigger language plpgsql set search_path = ''
as $$
begin
  raise exception 'Un document ne peut pas être modifié. Supprimez-le puis renvoyez-le.';
end;
$$;
drop trigger if exists documents_no_update on public.documents;
create trigger documents_no_update before update on public.documents
  for each row execute function public.documents_immuables();

-- 7. Versements (saisis ici à la reprise, la saisie complète arrive en phase 4) --
create table if not exists public.versements (
  id               uuid primary key default gen_random_uuid(),
  logement_id      uuid not null references public.logements (id) on delete restrict,
  reservation_ref  text not null default '',
  date_versement   date not null,
  -- Montant reçu = chiffre d'affaires − commission de la plateforme
  montant_recu     numeric(12, 2) not null,
  -- Valeurs au moment du versement : modifier le taux d'un logement ne réécrit pas l'historique
  frais_menage     numeric(10, 2) not null default 0 check (frais_menage >= 0),
  taux_commission  numeric(5, 2) not null check (taux_commission between 0 and 100),
  note             text not null default '',
  ancien_id        text unique,
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null
);
create index if not exists versements_logement_date on public.versements (logement_id, date_versement);

-- 8. Stockage privé : aucun accès direct, tout passe par l'app (qui vérifie les droits)
insert into storage.buckets (id, name, public)
values ('logements-photos', 'logements-photos', false), ('documents', 'documents', false)
on conflict (id) do nothing;

-- 9. Row Level Security ------------------------------------------------------
alter table public.logements              enable row level security;
alter table public.logement_ical          enable row level security;
alter table public.logement_contacts      enable row level security;
alter table public.logement_proprietaires enable row level security;
alter table public.logement_photos        enable row level security;
alter table public.documents              enable row level security;
alter table public.versements             enable row level security;

-- Logements et tout ce qui s'y rattache : droit « Logements »
do $$
declare t text;
begin
  foreach t in array array['logements', 'logement_ical', 'logement_contacts', 'logement_proprietaires', 'logement_photos']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.a_droit(''logements'', ''voir''))', t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.a_droit(''logements'', ''modifier''))', t || '_ajout', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.a_droit(''logements'', ''modifier'')) with check (public.a_droit(''logements'', ''modifier''))', t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.a_droit(''logements'', ''modifier''))', t || '_suppression', t);
  end loop;
end $$;

-- Supprimer un logement entier : administrateur seulement
drop policy if exists logements_suppression on public.logements;
create policy logements_suppression on public.logements for delete to authenticated
  using (public.est_admin());

-- Documents : les fiches de police (données de voyageurs) exigent le droit explicite
-- « documents_sensibles », en plus du droit Logements. Jamais visibles des propriétaires.
drop policy if exists documents_lecture on public.documents;
create policy documents_lecture on public.documents for select to authenticated
  using (
    public.a_droit('logements', 'voir')
    and (type <> 'fiche_police' or public.a_droit('documents_sensibles', 'voir'))
  );

drop policy if exists documents_ajout on public.documents;
create policy documents_ajout on public.documents for insert to authenticated
  with check (
    public.a_droit('logements', 'modifier')
    and (type <> 'fiche_police' or public.a_droit('documents_sensibles', 'modifier'))
  );

-- Suppression : les états des lieux horodatés ne sont supprimables que par un administrateur
drop policy if exists documents_suppression on public.documents;
create policy documents_suppression on public.documents for delete to authenticated
  using (
    public.a_droit('logements', 'modifier')
    and (type <> 'fiche_police' or public.a_droit('documents_sensibles', 'modifier'))
    and (type <> 'etat_des_lieux' or public.est_admin())
  );

-- Versements : droit « Comptabilité » (invisibles pour Abdelkarim)
drop policy if exists versements_lecture on public.versements;
create policy versements_lecture on public.versements for select to authenticated
  using (public.a_droit('comptabilite', 'voir'));
drop policy if exists versements_ajout on public.versements;
create policy versements_ajout on public.versements for insert to authenticated
  with check (public.a_droit('comptabilite', 'modifier'));
drop policy if exists versements_modification on public.versements;
create policy versements_modification on public.versements for update to authenticated
  using (public.a_droit('comptabilite', 'modifier')) with check (public.a_droit('comptabilite', 'modifier'));
drop policy if exists versements_suppression on public.versements;
create policy versements_suppression on public.versements for delete to authenticated
  using (public.est_admin());

-- Les personnes qui gèrent les logements peuvent lister les comptes Propriétaire
-- (pour les rattacher), mais pas les autres comptes.
drop policy if exists profiles_proprietaires_pour_logements on public.profiles;
create policy profiles_proprietaires_pour_logements on public.profiles for select to authenticated
  using (type = 'proprietaire' and public.a_droit('logements', 'voir'));
