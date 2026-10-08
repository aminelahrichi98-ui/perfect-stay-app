-- ============================================================================
-- Perfect Stay — Phase 8 : Stratégie (journal des décisions) et RH
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Stratégie : notes et journal des décisions ----------------------------------------
create table if not exists public.strategie_notes (
  id          uuid primary key default gen_random_uuid(),
  type        text not null default 'decision' check (type in ('decision', 'note')),
  titre       text not null,
  date_note   date not null default current_date,
  contenu     text not null default '',
  pole        text not null default '',
  auteur_id   uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists strategie_notes_date on public.strategie_notes (date_note desc);
drop trigger if exists strategie_notes_touch on public.strategie_notes;
create trigger strategie_notes_touch before update on public.strategie_notes
  for each row execute function public.touch_updated_at();

-- 2. RH : équipe, documents, recrutements, candidats ------------------------------------
create table if not exists public.rh_membres (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  role          text not null default '',
  categorie     text not null default 'equipe' check (categorie in ('equipe', 'prestataire')),
  type_contrat  text not null default 'cdi' check (type_contrat in ('cdi', 'cdd', 'freelance', 'prestation', 'stage', 'autre')),
  telephone     text not null default '',
  email         text not null default '',
  date_arrivee  date,
  date_depart   date,
  profile_id    uuid references public.profiles (id) on delete set null,   -- compte de connexion, s'il en a un
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.rh_documents (
  id          uuid primary key default gen_random_uuid(),
  membre_id   uuid not null references public.rh_membres (id) on delete cascade,
  nom         text not null,
  chemin      text not null,
  type_mime   text not null default '',
  taille      bigint not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists rh_documents_membre on public.rh_documents (membre_id);

create table if not exists public.rh_recrutements (
  id          uuid primary key default gen_random_uuid(),
  poste       text not null,
  statut      text not null default 'ouvert' check (statut in ('ouvert', 'en_pause', 'pourvu', 'clos')),
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.rh_candidats (
  id               uuid primary key default gen_random_uuid(),
  recrutement_id   uuid not null references public.rh_recrutements (id) on delete cascade,
  nom              text not null,
  telephone        text not null default '',
  email            text not null default '',
  etape            text not null default 'nouveau' check (etape in ('nouveau', 'entretien', 'test', 'offre', 'embauche', 'refuse')),
  notes            text not null default '',
  created_at       timestamptz not null default now()
);
create index if not exists rh_candidats_recrutement on public.rh_candidats (recrutement_id);

insert into storage.buckets (id, name, public) values ('rh', 'rh', false) on conflict (id) do nothing;

-- 3. Sécurité : droit « Stratégie » et droit « RH » (les données RH sont personnelles) --------
alter table public.strategie_notes  enable row level security;
alter table public.rh_membres       enable row level security;
alter table public.rh_documents     enable row level security;
alter table public.rh_recrutements  enable row level security;
alter table public.rh_candidats     enable row level security;

do $$
declare t text; m text;
begin
  foreach t in array array['strategie_notes', 'rh_membres', 'rh_documents', 'rh_recrutements', 'rh_candidats']
  loop
    m := case when t = 'strategie_notes' then 'strategie' else 'rh' end;
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (not public.est_prestataire() and public.a_droit(%L, 'voir'))$f$, t || '_lecture', t, m);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (not public.est_prestataire() and public.a_droit(%L, 'modifier'))$f$, t || '_ajout', t, m);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (not public.est_prestataire() and public.a_droit(%L, 'modifier')) with check (not public.est_prestataire() and public.a_droit(%L, 'modifier'))$f$, t || '_modification', t, m, m);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (not public.est_prestataire() and public.a_droit(%L, 'modifier'))$f$, t || '_suppression', t, m);
  end loop;
end $$;
