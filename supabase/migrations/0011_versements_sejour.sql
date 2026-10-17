-- ============================================================================
-- Perfect Stay — Versements : dates de check-in / check-out et canal de réservation
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger. Les versements existants sont conservés tels quels.
-- ============================================================================

alter table public.versements add column if not exists arrivee date;   -- check-in
alter table public.versements add column if not exists depart  date;   -- check-out
alter table public.versements add column if not exists canal   text;

alter table public.versements drop constraint if exists versements_canal_check;
alter table public.versements add constraint versements_canal_check
  check (canal is null or canal in ('airbnb', 'booking', 'expedia', 'agoda', 'almosafer', 'direct'));

alter table public.versements drop constraint if exists versements_sejour_check;
alter table public.versements add constraint versements_sejour_check
  check (arrivee is null or depart is null or depart > arrivee);

comment on column public.versements.date_versement is
  'Date de rattachement comptable du versement : c''est la date de check-out quand elle est connue (le mois du rapport et de la facture).';
