-- ============================================================================
-- Perfect Stay — Phase 1 : fondations (utilisateurs, droits, infos entreprise)
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Types d'utilisateurs -----------------------------------------------------
do $$ begin
  create type public.user_type as enum ('equipe', 'proprietaire', 'prestataire');
exception when duplicate_object then null; end $$;

-- 2. Profils (un par compte de connexion) --------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  prenom      text not null,
  nom         text not null,
  type        public.user_type not null default 'equipe',
  poles       text[] not null default '{}',
  is_admin    boolean not null default false,   -- super-administrateur (Amine)
  actif       boolean not null default true,    -- désactivé = ne peut plus se connecter, historique conservé
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Droits par module : Voir / Modifier -------------------------------------
create table if not exists public.permissions (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  module    text not null,
  can_view  boolean not null default false,
  can_edit  boolean not null default false,
  primary key (user_id, module),
  constraint modifier_implique_voir check (can_view or not can_edit)
);

-- 4. Informations de l'entreprise (une seule ligne) ----------------------------
create table if not exists public.entreprise (
  id               integer primary key default 1 check (id = 1),
  raison_sociale   text not null default '',
  adresse          text not null default '',
  ice              text not null default '',
  identifiant_fiscal text not null default '',
  registre_commerce text not null default '',
  patente          text not null default '',
  banque           text not null default '',
  rib              text not null default '',
  email            text not null default '',
  telephone        text not null default '',
  updated_at       timestamptz not null default now()
);
insert into public.entreprise (id, raison_sociale)
values (1, 'Perfect Stay Conciergerie')
on conflict (id) do nothing;

-- 5. Fonctions de droits (utilisées par les règles de sécurité) ---------------
create or replace function public.est_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin and p.actif
  );
$$;

-- niveau = 'voir' ou 'modifier'
create or replace function public.a_droit(p_module text, p_niveau text default 'voir')
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.est_admin() or exists (
    select 1
    from public.permissions pe
    join public.profiles p on p.id = pe.user_id
    where pe.user_id = (select auth.uid())
      and p.actif
      and pe.module = p_module
      and case when p_niveau = 'modifier' then pe.can_edit else pe.can_view end
  );
$$;

-- 6. Le tout premier compte créé devient administrateur ----------------------
-- (Pensez à désactiver les inscriptions publiques dans Supabase : voir le guide.)
create or replace function public.premier_compte_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, email, prenom, nom, type, is_admin)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'prenom', 'Admin'),
      coalesce(new.raw_user_meta_data ->> 'nom', ''),
      'equipe',
      true
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.premier_compte_admin();

-- 7. Row Level Security : les règles sont appliquées par la base elle-même -----
alter table public.profiles    enable row level security;
alter table public.permissions enable row level security;
alter table public.entreprise  enable row level security;

-- Profils : chacun voit le sien ; ceux qui ont le droit « Paramètres » voient tout le monde.
drop policy if exists profiles_lecture on public.profiles;
create policy profiles_lecture on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.a_droit('parametres', 'voir'));

-- Droits : chacun voit les siens ; « Paramètres » voit tout.
drop policy if exists permissions_lecture on public.permissions;
create policy permissions_lecture on public.permissions for select to authenticated
  using (user_id = (select auth.uid()) or public.a_droit('parametres', 'voir'));

-- Aucune règle d'écriture sur profiles / permissions : seules les actions serveur
-- de l'app (qui vérifient « on ne donne pas un droit qu'on n'a pas ») peuvent les modifier.

-- Entreprise : lisible par Paramètres et Comptabilité, modifiable par Paramètres.
drop policy if exists entreprise_lecture on public.entreprise;
create policy entreprise_lecture on public.entreprise for select to authenticated
  using (public.a_droit('parametres', 'voir') or public.a_droit('comptabilite', 'voir'));

drop policy if exists entreprise_modification on public.entreprise;
create policy entreprise_modification on public.entreprise for update to authenticated
  using (public.a_droit('parametres', 'modifier'))
  with check (public.a_droit('parametres', 'modifier'));
