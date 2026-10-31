-- ============================================================================
-- Perfect Stay — Frais de ménage : encaissés par le gestionnaire ou par le propriétaire
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger. Les logements et versements existants restent
-- « encaissés par le gestionnaire » : rien ne change dans les chiffres déjà enregistrés.
-- ============================================================================

-- 1. Réglage de chaque logement
alter table public.logements add column if not exists menage_encaisse_par text not null default 'gestionnaire';
alter table public.logements drop constraint if exists logements_menage_encaisse_par_check;
alter table public.logements add constraint logements_menage_encaisse_par_check
  check (menage_encaisse_par in ('gestionnaire', 'proprietaire'));

-- 2. Chaque versement garde la valeur du moment (comme le montant du ménage et le taux)
alter table public.versements add column if not exists menage_proprietaire boolean not null default false;

-- 3. Les vues de la comptabilité et de l'espace propriétaire exposent ce réglage
create or replace view public.comptabilite_logements as
  select l.id, l.nom, l.ville, l.type, l.statut, l.frais_menage, l.taux_commission,
         l.proprietaire_nom, l.proprietaire_adresse, l.proprietaire_ice,
         exists (select 1 from public.logement_ical i where i.logement_id = l.id) as a_calendrier,
         l.menage_encaisse_par
  from public.logements l
  where public.a_droit('comptabilite', 'voir');

create or replace view public.proprietaire_versements as
  select v.id, v.logement_id, v.date_versement, v.montant_recu, v.frais_menage, v.taux_commission,
         v.menage_proprietaire
  from public.versements v
  where exists (
    select 1 from public.logement_proprietaires lp
    where lp.logement_id = v.logement_id and lp.user_id = (select auth.uid())
  );
