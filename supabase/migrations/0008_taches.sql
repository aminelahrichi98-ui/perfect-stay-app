-- ============================================================================
-- Perfect Stay — Phase 6 : Tâches (sous-tâches, pièces jointes, récurrences)
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Récurrences : une règle qui crée des tâches à intervalles réguliers --------
create table if not exists public.tache_recurrences (
  id                 uuid primary key default gen_random_uuid(),
  titre              text not null,
  pole               text not null default 'Opérations',
  priorite           text not null default 'normal' check (priorite in ('urgent', 'important', 'normal')),
  responsable_id     uuid references public.profiles (id) on delete set null,
  logement_id        uuid references public.logements (id) on delete set null,
  notes              text not null default '',
  frequence          text not null check (frequence in ('jour', 'semaine', 'mois', 'dernier_jour_mois')),
  jour_semaine       smallint check (jour_semaine between 0 and 6),   -- lundi = 0 … dimanche = 6
  jour_mois          smallint check (jour_mois between 1 and 31),
  actif              boolean not null default true,
  derniere_echeance  date,                                             -- dernière tâche déjà créée
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);

alter table public.taches add column if not exists recurrence_id uuid references public.tache_recurrences (id) on delete set null;
-- Une seule tâche par règle et par date : relancer la génération ne crée jamais de doublon
create unique index if not exists taches_recurrence_echeance on public.taches (recurrence_id, echeance);   -- les tâches sans règle (NULL) ne sont pas concernées

-- 2. Sous-tâches et pièces jointes ------------------------------------------------
create table if not exists public.tache_sous_taches (
  id          uuid primary key default gen_random_uuid(),
  tache_id    uuid not null references public.taches (id) on delete cascade,
  libelle     text not null,
  fait        boolean not null default false,
  fait_le     timestamptz,
  ordre       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists tache_sous_taches_tache on public.tache_sous_taches (tache_id, ordre);

create table if not exists public.tache_pieces (
  id          uuid primary key default gen_random_uuid(),
  tache_id    uuid not null references public.taches (id) on delete cascade,
  chemin      text not null,
  nom         text not null,
  type_mime   text not null default '',
  taille      bigint not null default 0,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists tache_pieces_tache on public.tache_pieces (tache_id);

create or replace function public.sous_taches_regles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.fait is distinct from old.fait then
    new.fait_le := case when new.fait then now() else null end;
  end if;
  return new;
end;
$$;
drop trigger if exists sous_taches_regles_trg on public.tache_sous_taches;
create trigger sous_taches_regles_trg before update on public.tache_sous_taches
  for each row execute function public.sous_taches_regles();

insert into storage.buckets (id, name, public) values ('taches', 'taches', false) on conflict (id) do nothing;

-- 3. Sécurité : qui peut agir sur les éléments d'une tâche ---------------------------
create or replace function public.peut_tache(p_tache uuid, p_niveau text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.taches t
    where t.id = p_tache and (
      (not public.est_prestataire() and public.a_droit('taches', p_niveau))
      or t.responsable_id = (select auth.uid())
    )
  );
$$;

alter table public.tache_recurrences enable row level security;
alter table public.tache_sous_taches enable row level security;
alter table public.tache_pieces      enable row level security;

drop policy if exists tache_recurrences_lecture on public.tache_recurrences;
create policy tache_recurrences_lecture on public.tache_recurrences for select to authenticated
  using (not public.est_prestataire() and public.a_droit('taches', 'voir'));
drop policy if exists tache_recurrences_ecriture on public.tache_recurrences;
create policy tache_recurrences_ecriture on public.tache_recurrences for all to authenticated
  using (not public.est_prestataire() and public.a_droit('taches', 'modifier'))
  with check (not public.est_prestataire() and public.a_droit('taches', 'modifier'));

do $$
declare t text;
begin
  foreach t in array array['tache_sous_taches', 'tache_pieces']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (public.peut_tache(tache_id, 'voir'))$f$, t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (public.peut_tache(tache_id, 'modifier'))$f$, t || '_ajout', t);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (public.peut_tache(tache_id, 'modifier')) with check (public.peut_tache(tache_id, 'modifier'))$f$, t || '_modification', t);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (public.peut_tache(tache_id, 'modifier'))$f$, t || '_suppression', t);
  end loop;
end $$;

-- 4. Tâche récurrente demandée d'office : la comptabilité du mois ------------------------
do $$
begin
  if not exists (select 1 from public.tache_recurrences) then
    insert into public.tache_recurrences (titre, pole, priorite, frequence)
    values ('Comptabilité du mois', 'Comptabilité', 'important', 'dernier_jour_mois');
  end if;
end $$;
