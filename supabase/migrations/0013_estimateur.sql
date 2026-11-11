-- ============================================================================
-- Perfect Stay — Estimateur de revenus (biens prospects)
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

create table if not exists public.estimations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  prenom      text not null check (length(trim(prenom)) > 0),
  telephone   text not null default '',
  ville       text not null default 'Casablanca',
  quartier    text not null,
  type_bien   text not null check (type_bien in ('studio_1ch', '2ch', '3ch_plus', 'villa')),
  piscine     boolean not null default false,
  capacite    integer check (capacite is null or capacite > 0),
  standing    text not null check (standing in ('standard', 'superieur', 'premium')),
  -- Revenus annuels en MAD (bornes retenues après ajustement éventuel)
  brut_bas    numeric(12, 2) not null check (brut_bas >= 0),
  brut_haut   numeric(12, 2) not null check (brut_haut >= brut_bas),
  net_bas     numeric(12, 2) not null check (net_bas >= 0),
  net_haut    numeric(12, 2) not null check (net_haut >= net_bas),
  -- Photos (chemins dans le stockage privé « estimations »), annonces comparables et conseils retenus
  photos      jsonb not null default '[]',
  comparables jsonb not null default '[]',
  conseils    jsonb not null default '[]'
);
create index if not exists estimations_date on public.estimations (created_at desc);

alter table public.estimations enable row level security;

drop policy if exists estimations_lecture on public.estimations;
create policy estimations_lecture on public.estimations for select to authenticated
  using (public.a_droit('estimateur', 'voir'));

drop policy if exists estimations_creation on public.estimations;
create policy estimations_creation on public.estimations for insert to authenticated
  with check (public.a_droit('estimateur', 'modifier'));

drop policy if exists estimations_suppression on public.estimations;
create policy estimations_suppression on public.estimations for delete to authenticated
  using (public.est_admin());

-- Photos des biens et des annonces : stockage privé, servi par l'application après contrôle des droits
insert into storage.buckets (id, name, public) values ('estimations', 'estimations', false)
on conflict (id) do nothing;
