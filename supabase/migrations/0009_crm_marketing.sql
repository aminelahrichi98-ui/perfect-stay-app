-- ============================================================================
-- Perfect Stay — Phase 7 : CRM (prospects propriétaires) et Marketing
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. CRM : leads, appels, historique des étapes ------------------------------------
create table if not exists public.crm_leads (
  id             uuid primary key default gen_random_uuid(),
  nom            text not null,
  telephone      text not null default '',
  email          text not null default '',
  ville          text not null default '',
  type_bien      text not null default '',
  source         text not null default 'manuel',            -- meta, manuel, import, recommandation…
  campagne       text not null default '',
  etape          text not null default 'nouveau'
                   check (etape in ('nouveau', 'appele', 'rdv', 'estimation', 'proposition', 'signe', 'perdu')),
  motif_perte    text not null default '',
  responsable_id uuid references public.profiles (id) on delete set null,
  notes          text not null default '',
  meta_lead_id   text unique,                                -- identifiant Meta : empêche d'importer deux fois le même lead
  logement_id    uuid references public.logements (id) on delete set null,   -- créé par « démarrer l'onboarding »
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists crm_leads_etape on public.crm_leads (etape);
create index if not exists crm_leads_created on public.crm_leads (created_at desc);
drop trigger if exists crm_leads_touch on public.crm_leads;
create trigger crm_leads_touch before update on public.crm_leads
  for each row execute function public.touch_updated_at();

create table if not exists public.crm_appels (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.crm_leads (id) on delete cascade,
  date_appel  timestamptz not null default now(),
  resultat    text not null check (resultat in ('pas_de_reponse', 'repondeur', 'rappeler', 'rdv_pris', 'pas_interesse', 'autre')),
  note        text not null default '',
  auteur_id   uuid references public.profiles (id) on delete set null
);
create index if not exists crm_appels_lead on public.crm_appels (lead_id, date_appel desc);
create index if not exists crm_appels_date on public.crm_appels (date_appel);

-- Chaque passage d'étape est conservé : c'est lui qui compte les rendez-vous et les signatures d'un mois
create table if not exists public.crm_etapes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.crm_leads (id) on delete cascade,
  etape      text not null,
  date_etape timestamptz not null default now(),
  auteur_id  uuid references public.profiles (id) on delete set null
);
create index if not exists crm_etapes_date on public.crm_etapes (etape, date_etape);

create or replace function public.crm_journal_etape()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.etape is distinct from old.etape then
    insert into public.crm_etapes (lead_id, etape, auteur_id) values (new.id, new.etape, (select auth.uid()));
  end if;
  return new;
end;
$$;
drop trigger if exists crm_leads_journal on public.crm_leads;
create trigger crm_leads_journal after insert or update of etape on public.crm_leads
  for each row execute function public.crm_journal_etape();

-- Trace des appels reçus de Meta (pour comprendre un lead manquant)
create table if not exists public.crm_webhook_journal (
  id        uuid primary key default gen_random_uuid(),
  recu_le   timestamptz not null default now(),
  evenement text not null default '',
  statut    text not null default 'recu' check (statut in ('recu', 'cree', 'doublon', 'erreur')),
  detail    text not null default ''
);

-- 2. Marketing : dépenses publicitaires et calendrier des publications ----------------
create table if not exists public.marketing_depenses (
  id            uuid primary key default gen_random_uuid(),
  date_depense  date not null default current_date,
  canal         text not null check (canal in ('meta', 'google', 'autre')),
  campagne      text not null default '',
  montant       numeric(12, 2) not null check (montant > 0),
  note          text not null default '',
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists marketing_depenses_date on public.marketing_depenses (date_depense);

create table if not exists public.marketing_publications (
  id               uuid primary key default gen_random_uuid(),
  date_publication date not null default current_date,
  reseau           text not null check (reseau in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'autre')),
  sujet            text not null,
  statut           text not null default 'idee' check (statut in ('idee', 'a_rediger', 'pret', 'publie')),
  notes            text not null default '',
  responsable_id   uuid references public.profiles (id) on delete set null,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists marketing_publications_date on public.marketing_publications (date_publication);

-- 3. Sécurité : droits CRM et Marketing ---------------------------------------------
alter table public.crm_leads             enable row level security;
alter table public.crm_appels            enable row level security;
alter table public.crm_etapes            enable row level security;
alter table public.crm_webhook_journal   enable row level security;
alter table public.marketing_depenses    enable row level security;
alter table public.marketing_publications enable row level security;

do $$
declare t text; m text;
begin
  foreach t in array array['crm_leads', 'crm_appels', 'marketing_depenses', 'marketing_publications']
  loop
    m := case when t like 'crm_%' then 'crm' else 'marketing' end;
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

-- L'historique des étapes et le journal Meta se lisent, jamais ne s'écrivent depuis l'app
drop policy if exists crm_etapes_lecture on public.crm_etapes;
create policy crm_etapes_lecture on public.crm_etapes for select to authenticated
  using (not public.est_prestataire() and public.a_droit('crm', 'voir'));
drop policy if exists crm_webhook_journal_lecture on public.crm_webhook_journal;
create policy crm_webhook_journal_lecture on public.crm_webhook_journal for select to authenticated
  using (not public.est_prestataire() and public.a_droit('crm', 'voir'));
