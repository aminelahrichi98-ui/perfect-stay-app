-- ============================================================================
-- Perfect Stay — Phase 4 : comptabilité, factures de commission, Espace propriétaire
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Prérequis : 0001, 0002 et 0003 déjà exécutés. Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Versements : lien avec la réservation du calendrier --------------------------
alter table public.versements
  add column if not exists reservation_id uuid references public.reservations (id) on delete set null;
create index if not exists versements_reservation on public.versements (reservation_id);

-- 2. TVA de l'entreprise (20 % au Maroc) -------------------------------------------
alter table public.entreprise
  add column if not exists taux_tva numeric(5, 2) not null default 20 check (taux_tva >= 0 and taux_tva < 100);

-- Mention de règlement imprimée sur les factures (modifiable dans Paramètres > Entreprise)
alter table public.entreprise
  add column if not exists mention_reglement text not null
    default 'Commission perçue directement lors du partage des paiements de la plateforme. Aucun règlement complémentaire n''est à effectuer.';

-- 3. Coordonnées de facturation du propriétaire (pour la facture de commission) ----
alter table public.logements add column if not exists proprietaire_adresse text not null default '';
alter table public.logements add column if not exists proprietaire_ice     text not null default '';

-- 4. Dépenses internes (non refacturées aux propriétaires) ----------------------------
create table if not exists public.depenses (
  id               uuid primary key default gen_random_uuid(),
  date_depense     date not null,
  logement_id      uuid references public.logements (id) on delete set null,   -- vide = dépense générale
  categorie        text not null
                     check (categorie in ('linge', 'menage', 'maintenance', 'prestataires', 'salaires', 'deplacement', 'marketing')),
  description      text not null default '',
  montant          numeric(12, 2) not null check (montant > 0),
  justificatif     text,                      -- fichier dans le stockage privé « justificatifs »
  justificatif_nom text,
  created_at       timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null
);
create index if not exists depenses_date on public.depenses (date_depense);
create index if not exists depenses_logement on public.depenses (logement_id, date_depense);

-- 5. Factures de commission -------------------------------------------------------------
-- Numérotation continue et chronologique : PS-AAAA-NNNN. Le numéro est attribué dans la même
-- opération que l'enregistrement de la facture : s'il échoue, aucun numéro n'est consommé.
create table if not exists public.facture_sequences (
  annee   integer primary key,
  dernier integer not null default 0
);

create table if not exists public.factures (
  id             uuid primary key default gen_random_uuid(),
  numero         text not null unique,
  annee          integer not null,
  sequence       integer not null,
  logement_id    uuid references public.logements (id) on delete set null,
  mois           date not null,                    -- 1er jour du mois facturé
  date_emission  date not null,
  destinataire   jsonb not null,                   -- nom, adresse, ICE du propriétaire (au moment de l'émission)
  vendeur        jsonb not null,                   -- mentions légales de Perfect Stay (au moment de l'émission)
  lignes         jsonb not null,                   -- détail figé des versements facturés
  total_ht       numeric(12, 2) not null,
  taux_tva       numeric(5, 2) not null,
  montant_tva    numeric(12, 2) not null,
  total_ttc      numeric(12, 2) not null,
  chemin_pdf     text,                             -- fichier dans le stockage privé « rapports »
  statut         text not null default 'emise' check (statut in ('emise', 'annulee')),
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  unique (annee, sequence)
);
-- Une seule facture active par logement et par mois
create unique index if not exists factures_une_par_mois
  on public.factures (logement_id, mois) where statut = 'emise';

-- Une facture émise ne se modifie pas (seuls le PDF et l'annulation peuvent changer), ne se supprime pas.
create or replace function public.factures_protegees()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Une facture émise ne peut pas être supprimée.';
  end if;
  if (to_jsonb(new) - 'chemin_pdf' - 'statut' - 'logement_id') is distinct from (to_jsonb(old) - 'chemin_pdf' - 'statut' - 'logement_id')
     or (new.logement_id is distinct from old.logement_id and new.logement_id is not null) then
    raise exception 'Une facture émise ne peut pas être modifiée.';
  end if;
  return new;
end;
$$;
drop trigger if exists factures_no_update on public.factures;
create trigger factures_no_update before update on public.factures
  for each row execute function public.factures_protegees();
drop trigger if exists factures_no_delete on public.factures;
create trigger factures_no_delete before delete on public.factures
  for each row execute function public.factures_protegees();

create or replace function public.emettre_facture(
  p_logement      uuid,
  p_mois          date,
  p_date_emission date,
  p_destinataire  jsonb,
  p_vendeur       jsonb,
  p_lignes        jsonb,
  p_total_ht      numeric,
  p_taux_tva      numeric,
  p_montant_tva   numeric,
  p_total_ttc     numeric,
  p_created_by    uuid
)
returns public.factures
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_annee integer := extract(year from p_date_emission);
  v_seq   integer;
  v_row   public.factures;
begin
  -- Chronologie : on n'émet pas une facture datée avant une facture déjà émise la même année
  if exists (select 1 from public.factures where annee = v_annee and date_emission > p_date_emission) then
    raise exception 'La date d''émission ne peut pas être antérieure à celle d''une facture déjà émise.';
  end if;

  insert into public.facture_sequences (annee, dernier) values (v_annee, 1)
    on conflict (annee) do update set dernier = public.facture_sequences.dernier + 1
    returning dernier into v_seq;

  insert into public.factures (
    numero, annee, sequence, logement_id, mois, date_emission, destinataire, vendeur, lignes,
    total_ht, taux_tva, montant_tva, total_ttc, created_by
  ) values (
    'PS-' || v_annee || '-' || lpad(v_seq::text, 4, '0'), v_annee, v_seq, p_logement, p_mois, p_date_emission,
    p_destinataire, p_vendeur, p_lignes, p_total_ht, p_taux_tva, p_montant_tva, p_total_ttc, p_created_by
  ) returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.emettre_facture(uuid, date, date, jsonb, jsonb, jsonb, numeric, numeric, numeric, numeric, uuid)
  from public, anon, authenticated;

-- 6. Rapports mensuels (régénérables) -----------------------------------------------------
create table if not exists public.rapports_mensuels (
  id          uuid primary key default gen_random_uuid(),
  logement_id uuid not null references public.logements (id) on delete cascade,
  mois        date not null,
  resume      jsonb not null,
  chemin_pdf  text,
  version     integer not null default 1,
  genere_le   timestamptz not null default now(),
  unique (logement_id, mois)
);

-- 7. Stockage privé : justificatifs de dépenses et PDF ------------------------------------
insert into storage.buckets (id, name, public)
values ('justificatifs', 'justificatifs', false), ('rapports', 'rapports', false)
on conflict (id) do nothing;

-- 8. Row Level Security -------------------------------------------------------------------
alter table public.depenses           enable row level security;
alter table public.facture_sequences  enable row level security;
alter table public.factures           enable row level security;
alter table public.rapports_mensuels  enable row level security;

-- Dépenses : droit « Comptabilité »
drop policy if exists depenses_lecture on public.depenses;
create policy depenses_lecture on public.depenses for select to authenticated
  using (public.a_droit('comptabilite', 'voir'));
drop policy if exists depenses_ajout on public.depenses;
create policy depenses_ajout on public.depenses for insert to authenticated
  with check (public.a_droit('comptabilite', 'modifier'));
drop policy if exists depenses_modification on public.depenses;
create policy depenses_modification on public.depenses for update to authenticated
  using (public.a_droit('comptabilite', 'modifier')) with check (public.a_droit('comptabilite', 'modifier'));
drop policy if exists depenses_suppression on public.depenses;
create policy depenses_suppression on public.depenses for delete to authenticated
  using (public.a_droit('comptabilite', 'modifier'));

-- Numéros de facture : aucun accès direct (uniquement la fonction d'émission)

-- Un propriétaire doit pouvoir lire ses propres rattachements (les règles ci-dessous s'en servent
-- pour savoir quels documents lui appartiennent) : ses lignes à lui, jamais celles des autres.
drop policy if exists logement_proprietaires_les_siens on public.logement_proprietaires;
create policy logement_proprietaires_les_siens on public.logement_proprietaires for select to authenticated
  using (user_id = (select auth.uid()));

-- Factures et rapports : lisibles par la comptabilité, et par le propriétaire du logement concerné.
-- Aucune écriture directe : seuls les traitements du serveur créent ces documents.
drop policy if exists factures_lecture on public.factures;
create policy factures_lecture on public.factures for select to authenticated
  using (
    public.a_droit('comptabilite', 'voir')
    or exists (
      select 1 from public.logement_proprietaires lp
      where lp.logement_id = factures.logement_id and lp.user_id = (select auth.uid())
    )
  );
drop policy if exists rapports_lecture on public.rapports_mensuels;
create policy rapports_lecture on public.rapports_mensuels for select to authenticated
  using (
    public.a_droit('comptabilite', 'voir')
    or exists (
      select 1 from public.logement_proprietaires lp
      where lp.logement_id = rapports_mensuels.logement_id and lp.user_id = (select auth.uid())
    )
  );

-- 9. Espace propriétaire : vues limitées aux logements du propriétaire connecté ---------
-- Ces vues ne montrent QUE ses logements et seulement les colonnes utiles (jamais les codes d'accès,
-- le wifi, les notes internes, les documents, les dépenses autres que la maintenance…).
create or replace view public.proprietaire_logements as
  select l.id, l.nom, l.type, l.ville, l.capacite, l.statut
  from public.logements l
  where exists (
    select 1 from public.logement_proprietaires lp
    where lp.logement_id = l.id and lp.user_id = (select auth.uid())
  );

create or replace view public.proprietaire_reservations as
  select r.id, r.logement_id, r.type, r.arrivee, r.depart
  from public.reservations r
  where r.statut = 'confirmee'
    and exists (
      select 1 from public.logement_proprietaires lp
      where lp.logement_id = r.logement_id and lp.user_id = (select auth.uid())
    );

create or replace view public.proprietaire_versements as
  select v.id, v.logement_id, v.date_versement, v.montant_recu, v.frais_menage, v.taux_commission
  from public.versements v
  where exists (
    select 1 from public.logement_proprietaires lp
    where lp.logement_id = v.logement_id and lp.user_id = (select auth.uid())
  );

create or replace view public.proprietaire_maintenance as
  select d.id, d.logement_id, d.date_depense, d.description, d.montant
  from public.depenses d
  where d.categorie = 'maintenance'
    and exists (
      select 1 from public.logement_proprietaires lp
      where lp.logement_id = d.logement_id and lp.user_id = (select auth.uid())
    );

revoke all on public.proprietaire_logements, public.proprietaire_reservations,
              public.proprietaire_versements, public.proprietaire_maintenance from public, anon;
grant select on public.proprietaire_logements, public.proprietaire_reservations,
                public.proprietaire_versements, public.proprietaire_maintenance to authenticated;

-- 10. Comptabilité : vues limitées pour ceux qui ont le droit « Comptabilité » mais pas « Logements » ----
-- Elles donnent juste ce qu'il faut pour saisir un versement ou une dépense (nom, ménage, taux, coordonnées
-- de facturation), sans les codes d'accès, le wifi, les notes ni les documents.
create or replace view public.comptabilite_logements as
  select l.id, l.nom, l.ville, l.type, l.statut, l.frais_menage, l.taux_commission,
         l.proprietaire_nom, l.proprietaire_adresse, l.proprietaire_ice,
         exists (select 1 from public.logement_ical i where i.logement_id = l.id) as a_calendrier
  from public.logements l
  where public.a_droit('comptabilite', 'voir');

create or replace view public.comptabilite_reservations as
  select r.id, r.logement_id, r.type, r.plateforme, r.code, r.arrivee, r.depart
  from public.reservations r
  where r.statut = 'confirmee' and public.a_droit('comptabilite', 'voir');

revoke all on public.comptabilite_logements, public.comptabilite_reservations from public, anon;
grant select on public.comptabilite_logements, public.comptabilite_reservations to authenticated;
