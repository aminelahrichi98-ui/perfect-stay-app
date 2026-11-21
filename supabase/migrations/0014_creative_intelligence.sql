-- ============================================================================
-- Perfect Stay — Creative Intelligence (Marketing) : angles, images publicitaires,
-- imports Meta Ads et performances.
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Angles marketing --------------------------------------------------------------
create sequence if not exists public.ci_angles_numero;
grant usage, select on sequence public.ci_angles_numero to authenticated;

create table if not exists public.ci_angles (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null unique default ('ANG-' || lpad(nextval('public.ci_angles_numero')::text, 3, '0')),
  nom                    text not null check (length(trim(nom)) > 0),
  segment                text not null default 'tous' check (segment in ('longue', 'vacant', 'courte', 'tous')),
  probleme_principal     text not null default '',
  problemes_secondaires  text[] not null default '{}',
  consequences           text not null default '',
  hook                   text not null default '',
  usp                    text not null default '',
  solution               text not null default '',
  cta                    text not null default '',
  statut                 text not null default 'backlog' check (statut in ('backlog', 'testing', 'active', 'paused', 'archived')),
  created_by             uuid references public.profiles (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
drop trigger if exists ci_angles_touch on public.ci_angles;
create trigger ci_angles_touch before update on public.ci_angles
  for each row execute function public.touch_updated_at();

-- 2. Images publicitaires (statiques uniquement) -----------------------------------
create table if not exists public.ci_creatives (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                       -- ex. ANG-003-DATA-V2
  angle_id     uuid not null references public.ci_angles (id) on delete restrict,
  type_image   text not null check (type_image in ('photo', 'data', 'avant_apres', 'emotion', 'bold_hook', 'case_study')),
  version      integer not null check (version > 0),
  hook         text not null default '',
  prompt       text not null default '',
  image_chemin text not null default '',                   -- chemin dans le stockage privé « creatives »
  statut       text not null default 'brouillon' check (statut in ('brouillon', 'prete', 'publiee', 'en_pause', 'archivee')),
  -- Identifiant de l'annonce dans Meta Ads Manager : c'est le SEUL lien avec les performances importées
  meta_ad_id   text unique check (meta_ad_id is null or meta_ad_id ~ '^[0-9]{6,25}$'),
  notes        text not null default '',
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (angle_id, type_image, version)
);
create index if not exists ci_creatives_angle on public.ci_creatives (angle_id);
drop trigger if exists ci_creatives_touch on public.ci_creatives;
create trigger ci_creatives_touch before update on public.ci_creatives
  for each row execute function public.touch_updated_at();

-- 3. Imports Meta Ads (historique) et performances ---------------------------------
create table if not exists public.ci_imports (
  id                  uuid primary key default gen_random_uuid(),
  nom_fichier         text not null default '',
  devise              text not null default 'EUR',
  periode_debut       date,
  periode_fin         date,
  lignes_creees       integer not null default 0,
  lignes_mises_a_jour integer not null default 0,
  lignes_refusees     integer not null default 0,
  erreurs             jsonb not null default '[]',
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);

-- Une ligne = une annonce Meta sur une période (un jour, idéalement). Rangée par identifiant Meta,
-- qu'une image y soit associée ou non : rien n'est jamais attribué à une image par déduction.
create table if not exists public.ci_performances (
  id           uuid primary key default gen_random_uuid(),
  import_id    uuid references public.ci_imports (id) on delete set null,
  meta_ad_id   text not null check (meta_ad_id ~ '^[0-9]{6,25}$'),
  nom_annonce  text not null default '',
  date_debut   date not null,
  date_fin     date not null check (date_fin >= date_debut),
  depenses     numeric(12, 2) not null default 0 check (depenses >= 0),
  impressions  integer not null default 0 check (impressions >= 0),
  clics        integer not null default 0 check (clics >= 0),
  leads        integer not null default 0 check (leads >= 0),
  devise       text not null default 'EUR',
  updated_at   timestamptz not null default now(),
  unique (meta_ad_id, date_debut, date_fin)                -- réimporter le même fichier ne crée pas de doublon
);
create index if not exists ci_performances_dates on public.ci_performances (date_debut, date_fin);

-- 4. Réglages (une seule ligne) ----------------------------------------------------
create table if not exists public.ci_reglages (
  id              boolean primary key default true check (id),
  devise          text not null default 'EUR',
  budget_mensuel  numeric(12, 2) not null default 300 check (budget_mensuel >= 0),
  cpl_cible       numeric(12, 2) not null default 10 check (cpl_cible > 0),
  cpl_confirme    boolean not null default false,
  impressions_min integer not null default 1000 check (impressions_min >= 0),
  leads_min       integer not null default 3 check (leads_min >= 1),
  ctr_min         numeric(6, 2) not null default 0.8 check (ctr_min >= 0),
  tolerance       numeric(6, 2) not null default 1.3 check (tolerance >= 1),
  updated_at      timestamptz not null default now()
);
insert into public.ci_reglages (id) values (true) on conflict (id) do nothing;

-- 5. Sécurité : mêmes droits que le reste du Marketing ------------------------------
alter table public.ci_angles       enable row level security;
alter table public.ci_creatives    enable row level security;
alter table public.ci_imports      enable row level security;
alter table public.ci_performances enable row level security;
alter table public.ci_reglages     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ci_angles', 'ci_creatives', 'ci_imports', 'ci_performances', 'ci_reglages']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (not public.est_prestataire() and public.a_droit('marketing', 'voir'))$f$, t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (not public.est_prestataire() and public.a_droit('marketing', 'modifier'))$f$, t || '_ajout', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (not public.est_prestataire() and public.a_droit('marketing', 'modifier')) with check (not public.est_prestataire() and public.a_droit('marketing', 'modifier'))$f$, t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (not public.est_prestataire() and public.a_droit('marketing', 'modifier'))$f$, t || '_suppression', t);
  end loop;
end $$;

-- Images : stockage privé, servi par l'application après contrôle des droits
insert into storage.buckets (id, name, public) values ('creatives', 'creatives', false)
on conflict (id) do nothing;
