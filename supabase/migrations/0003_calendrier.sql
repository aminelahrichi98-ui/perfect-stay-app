-- ============================================================================
-- Perfect Stay — Phase 3 : calendrier, réservations et ménages automatiques
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Prérequis : 0001 et 0002 déjà exécutés. Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Réservations importées des calendriers iCal -----------------------------
-- Les flux iCal ne contiennent ni montants ni noms de voyageurs : seulement des dates.
create table if not exists public.reservations (
  id           uuid primary key default gen_random_uuid(),
  logement_id  uuid not null references public.logements (id) on delete cascade,
  -- Le lien iCal d'où vient la réservation (conservée même si le lien est retiré ensuite)
  ical_id      uuid references public.logement_ical (id) on delete set null,
  plateforme   text not null default 'Airbnb',
  uid          text not null,                 -- identifiant de l'événement dans le calendrier
  type         text not null default 'reservation'
                 check (type in ('reservation', 'blocage')),   -- blocage = nuits indisponibles, sans voyageur
  code         text not null default '',      -- code de confirmation Airbnb (ex. HMABC123XY), si présent
  resume       text not null default '',
  arrivee      date not null,
  depart       date not null,
  statut       text not null default 'confirmee' check (statut in ('confirmee', 'annulee')),
  vu_le        timestamptz not null default now(),   -- dernière synchronisation où elle était présente
  annule_le    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint depart_apres_arrivee check (depart > arrivee)
);
create unique index if not exists reservations_source on public.reservations (ical_id, uid) where ical_id is not null;
create index if not exists reservations_logement_dates on public.reservations (logement_id, arrivee, depart);
drop trigger if exists reservations_touch on public.reservations;
create trigger reservations_touch before update on public.reservations
  for each row execute function public.touch_updated_at();

-- 2. Tâches (base du module Tâches de la phase 6 ; sert déjà aux ménages) -------
create table if not exists public.taches (
  id              uuid primary key default gen_random_uuid(),
  titre           text not null,
  type            text not null default 'tache' check (type in ('tache', 'menage')),
  pole            text not null default 'Opérations',
  priorite        text not null default 'normal' check (priorite in ('urgent', 'important', 'normal')),
  statut          text not null default 'a_faire' check (statut in ('a_faire', 'en_cours', 'bloque', 'termine', 'annule')),
  echeance        date,
  responsable_id  uuid references public.profiles (id) on delete set null,
  logement_id     uuid references public.logements (id) on delete cascade,
  -- Un seul ménage automatique par réservation
  reservation_id  uuid unique references public.reservations (id) on delete set null,
  notes           text not null default '',
  cree_auto       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists taches_echeance on public.taches (echeance);
create index if not exists taches_responsable on public.taches (responsable_id);
drop trigger if exists taches_touch on public.taches;
create trigger taches_touch before update on public.taches
  for each row execute function public.touch_updated_at();

-- 3. Responsable des ménages par défaut (réglage de l'entreprise) --------------
alter table public.entreprise
  add column if not exists responsable_menage uuid references public.profiles (id) on delete set null;

-- 4. Row Level Security --------------------------------------------------------
alter table public.reservations enable row level security;
alter table public.taches       enable row level security;

-- Réservations : lecture avec le droit « Calendrier ». Aucune écriture depuis l'app des
-- utilisateurs : seule la synchronisation (côté serveur) les crée et les met à jour.
drop policy if exists reservations_lecture on public.reservations;
create policy reservations_lecture on public.reservations for select to authenticated
  using (public.a_droit('calendrier', 'voir'));

-- Tâches : droit « Tâches », ou droit « Ménage » pour les ménages, ou être le responsable
drop policy if exists taches_lecture on public.taches;
create policy taches_lecture on public.taches for select to authenticated
  using (
    public.a_droit('taches', 'voir')
    or (type = 'menage' and public.a_droit('menage', 'voir'))
    or responsable_id = (select auth.uid())
  );

drop policy if exists taches_ajout on public.taches;
create policy taches_ajout on public.taches for insert to authenticated
  with check (
    public.a_droit('taches', 'modifier')
    or (type = 'menage' and public.a_droit('menage', 'modifier'))
  );

drop policy if exists taches_modification on public.taches;
create policy taches_modification on public.taches for update to authenticated
  using (
    public.a_droit('taches', 'modifier')
    or (type = 'menage' and public.a_droit('menage', 'modifier'))
    or responsable_id = (select auth.uid())
  )
  with check (
    public.a_droit('taches', 'modifier')
    or (type = 'menage' and public.a_droit('menage', 'modifier'))
    or responsable_id = (select auth.uid())
  );

drop policy if exists taches_suppression on public.taches;
create policy taches_suppression on public.taches for delete to authenticated
  using (public.a_droit('taches', 'modifier'));

-- Le réglage « responsable des ménages » doit pouvoir être lu par ceux qui voient le calendrier
-- (la politique existante couvre déjà Paramètres et Comptabilité).
drop policy if exists entreprise_lecture on public.entreprise;
create policy entreprise_lecture on public.entreprise for select to authenticated
  using (
    public.a_droit('parametres', 'voir')
    or public.a_droit('comptabilite', 'voir')
    or public.a_droit('calendrier', 'voir')
  );
