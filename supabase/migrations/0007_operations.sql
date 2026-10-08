-- ============================================================================
-- Perfect Stay — Phase 5 : Opérations (ménage, maintenance, stock, check-lists) + Onboarding
-- À coller UNE FOIS dans Supabase > SQL Editor > New query, puis « Run ».
-- Le script peut être relancé sans danger.
-- ============================================================================

-- 1. Outils de droits ---------------------------------------------------------
-- Un prestataire n'accède qu'à ce qui lui est attribué, quels que soient ses droits de module.
create or replace function public.est_prestataire()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.type = 'prestataire' and p.actif
  );
$$;

create or replace function public.responsable_de_tache(p_tache uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.taches t
    where t.id = p_tache and t.responsable_id = (select auth.uid())
  );
$$;

-- 2. Tâches : maintenance, contrôle qualité des ménages ------------------------
alter table public.taches drop constraint if exists taches_type_check;
alter table public.taches add constraint taches_type_check check (type in ('tache', 'menage', 'maintenance'));

alter table public.taches add column if not exists controle text not null default 'en_attente'
  check (controle in ('en_attente', 'valide', 'a_refaire'));
alter table public.taches add column if not exists controle_par uuid references public.profiles (id) on delete set null;
alter table public.taches add column if not exists controle_le timestamptz;
alter table public.taches add column if not exists controle_note text not null default '';
alter table public.taches add column if not exists termine_le timestamptz;

-- Garde-fous : un prestataire ne change que l'avancement de SA tâche ; une tâche terminée repart « à contrôler »
create or replace function public.taches_regles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.est_prestataire() then
    if new.titre is distinct from old.titre
       or new.type is distinct from old.type
       or new.pole is distinct from old.pole
       or new.priorite is distinct from old.priorite
       or new.echeance is distinct from old.echeance
       or new.responsable_id is distinct from old.responsable_id
       or new.logement_id is distinct from old.logement_id
       or new.reservation_id is distinct from old.reservation_id
       or new.cree_auto is distinct from old.cree_auto
       or new.controle is distinct from old.controle
       or new.controle_par is distinct from old.controle_par
       or new.controle_le is distinct from old.controle_le
       or new.controle_note is distinct from old.controle_note
       or new.termine_le is distinct from old.termine_le then
      raise exception 'Un prestataire ne peut modifier que l''avancement de ses tâches.';
    end if;
    if new.statut = 'annule' then
      raise exception 'Un prestataire ne peut pas annuler une tâche.';
    end if;
  end if;

  if new.statut = 'termine' and old.statut is distinct from 'termine' then
    new.controle := 'en_attente';
    new.controle_par := null;
    new.controle_le := null;
    new.termine_le := now();
  elsif new.statut <> 'termine' and old.statut = 'termine' then
    new.termine_le := null;
  end if;
  return new;
end;
$$;
drop trigger if exists taches_regles_trg on public.taches;
create trigger taches_regles_trg before update on public.taches
  for each row execute function public.taches_regles();

-- Politiques : droits de module pour l'équipe, uniquement ses propres tâches pour un prestataire
drop policy if exists taches_lecture on public.taches;
create policy taches_lecture on public.taches for select to authenticated
  using (
    (not public.est_prestataire() and (
      public.a_droit('taches', 'voir')
      or (type = 'menage' and public.a_droit('menage', 'voir'))
      or (type = 'maintenance' and public.a_droit('maintenance', 'voir'))
    ))
    or responsable_id = (select auth.uid())
  );

drop policy if exists taches_ajout on public.taches;
create policy taches_ajout on public.taches for insert to authenticated
  with check (
    not public.est_prestataire() and (
      public.a_droit('taches', 'modifier')
      or (type = 'menage' and public.a_droit('menage', 'modifier'))
      or (type = 'maintenance' and public.a_droit('maintenance', 'modifier'))
    )
  );

drop policy if exists taches_modification on public.taches;
create policy taches_modification on public.taches for update to authenticated
  using (
    (not public.est_prestataire() and (
      public.a_droit('taches', 'modifier')
      or (type = 'menage' and public.a_droit('menage', 'modifier'))
      or (type = 'maintenance' and public.a_droit('maintenance', 'modifier'))
    ))
    or responsable_id = (select auth.uid())
  )
  with check (
    (not public.est_prestataire() and (
      public.a_droit('taches', 'modifier')
      or (type = 'menage' and public.a_droit('menage', 'modifier'))
      or (type = 'maintenance' and public.a_droit('maintenance', 'modifier'))
    ))
    or responsable_id = (select auth.uid())
  );

drop policy if exists taches_suppression on public.taches;
create policy taches_suppression on public.taches for delete to authenticated
  using (
    not public.est_prestataire() and (
      public.a_droit('taches', 'modifier')
      or (type = 'menage' and public.a_droit('menage', 'modifier'))
      or (type = 'maintenance' and public.a_droit('maintenance', 'modifier'))
    )
  );

-- 3. Logements vus par les opérations (jamais les infos de propriétaire, ni les finances) ----
-- Le code d'accès n'est montré qu'à ceux qui ont le droit Logements, ou au prestataire à qui
-- une tâche non terminée de ce logement est attribuée.
create or replace view public.operations_logements as
  select l.id, l.nom, l.ville, l.adresse, l.maps_url, l.capacite, l.statut,
         case
           when public.a_droit('logements', 'voir')
             or exists (
               select 1 from public.taches t
               where t.logement_id = l.id and t.responsable_id = (select auth.uid())
                 and t.statut in ('a_faire', 'en_cours', 'bloque')
             )
           then l.code_acces else null
         end as code_acces
  from public.logements l
  where (not public.est_prestataire() and (
          public.a_droit('menage', 'voir') or public.a_droit('maintenance', 'voir')
          or public.a_droit('stock', 'voir') or public.a_droit('checklists', 'voir')
          or public.a_droit('onboarding', 'voir') or public.a_droit('taches', 'voir')
        ))
     or exists (
          select 1 from public.taches t
          where t.logement_id = l.id and t.responsable_id = (select auth.uid())
        );

-- 4. Stockage privé des photos et factures d'exploitation ------------------------
insert into storage.buckets (id, name, public) values ('operations', 'operations', false)
on conflict (id) do nothing;

-- 5. Check-lists ----------------------------------------------------------------
create table if not exists public.checklist_modeles (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  type        text not null default 'menage' check (type in ('menage', 'controle', 'checkin', 'autre')),
  actif       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.checklist_modele_points (
  id             uuid primary key default gen_random_uuid(),
  modele_id      uuid not null references public.checklist_modeles (id) on delete cascade,
  ordre          integer not null default 0,
  libelle        text not null,
  photo_requise  boolean not null default false
);
create index if not exists checklist_modele_points_modele on public.checklist_modele_points (modele_id, ordre);

-- Une check-list remplie est une copie du modèle : modifier le modèle ensuite ne change pas l'historique
create table if not exists public.checklists (
  id           uuid primary key default gen_random_uuid(),
  modele_id    uuid references public.checklist_modeles (id) on delete set null,
  nom          text not null,
  logement_id  uuid references public.logements (id) on delete cascade,
  tache_id     uuid references public.taches (id) on delete cascade,
  statut       text not null default 'en_cours' check (statut in ('en_cours', 'terminee')),
  termine_le   timestamptz,
  termine_par  uuid references public.profiles (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists checklists_tache on public.checklists (tache_id);
create index if not exists checklists_logement on public.checklists (logement_id, created_at desc);

create table if not exists public.checklist_points (
  id             uuid primary key default gen_random_uuid(),
  checklist_id   uuid not null references public.checklists (id) on delete cascade,
  ordre          integer not null default 0,
  libelle        text not null,
  photo_requise  boolean not null default false,
  fait           boolean not null default false,
  fait_le        timestamptz,
  fait_par       uuid references public.profiles (id) on delete set null,
  note           text not null default ''
);
create index if not exists checklist_points_checklist on public.checklist_points (checklist_id, ordre);

create table if not exists public.checklist_photos (
  id               uuid primary key default gen_random_uuid(),
  checklist_id     uuid not null references public.checklists (id) on delete cascade,
  point_id         uuid references public.checklist_points (id) on delete cascade,
  chemin           text not null,
  chemin_vignette  text not null,
  -- Date et heure de la prise : posées par la base, jamais modifiables
  pris_le          timestamptz not null default now(),
  pris_par         uuid references public.profiles (id) on delete set null
);
create index if not exists checklist_photos_checklist on public.checklist_photos (checklist_id);

-- Qui peut agir sur une check-list : l'équipe (droit Check-lists ou Ménage pour un ménage), ou le prestataire de la tâche
create or replace function public.peut_checklist(p_checklist uuid, p_niveau text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.checklists c
    where c.id = p_checklist and (
      (not public.est_prestataire() and (
        public.a_droit('checklists', p_niveau)
        or (c.tache_id is not null and public.a_droit('menage', p_niveau))
      ))
      or (c.tache_id is not null and public.responsable_de_tache(c.tache_id))
    )
  );
$$;

-- Les prestataires ne changent que « fait » et la note ; l'heure et l'auteur sont posés par la base
create or replace function public.checklist_points_regles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.est_prestataire() and (
       new.checklist_id is distinct from old.checklist_id
       or new.ordre is distinct from old.ordre
       or new.libelle is distinct from old.libelle
       or new.photo_requise is distinct from old.photo_requise) then
    raise exception 'Un prestataire ne peut que cocher les points et ajouter une note.';
  end if;
  if new.fait is distinct from old.fait then
    new.fait_le := case when new.fait then now() else null end;
    new.fait_par := case when new.fait then (select auth.uid()) else null end;
  end if;
  return new;
end;
$$;
drop trigger if exists checklist_points_regles_trg on public.checklist_points;
create trigger checklist_points_regles_trg before update on public.checklist_points
  for each row execute function public.checklist_points_regles();

-- Modèles de départ (modifiables dans l'app)
do $$
declare m uuid;
begin
  if not exists (select 1 from public.checklist_modeles) then
    insert into public.checklist_modeles (nom, type) values ('Ménage après départ', 'menage') returning id into m;
    insert into public.checklist_modele_points (modele_id, ordre, libelle, photo_requise) values
      (m, 1, 'Aérer toutes les pièces', false),
      (m, 2, 'Retirer le linge sale et sortir les poubelles', false),
      (m, 3, 'Faire les lits avec du linge propre', true),
      (m, 4, 'Nettoyer et désinfecter la salle de bain', true),
      (m, 5, 'Nettoyer la cuisine : plans de travail, évier, électroménager', false),
      (m, 6, 'Passer l''aspirateur et laver les sols', false),
      (m, 7, 'Dépoussiérer les surfaces, les miroirs et les vitres', false),
      (m, 8, 'Vérifier les consommables : papier toilette, savon, café, gel douche', false),
      (m, 9, 'Signaler toute casse ou tout dégât (photo à l''appui)', false),
      (m, 10, 'Photo d''ensemble de chaque pièce', true),
      (m, 11, 'Fermer les fenêtres, éteindre lumières et climatisation, verrouiller', false);

    insert into public.checklist_modeles (nom, type) values ('Contrôle qualité', 'controle') returning id into m;
    insert into public.checklist_modele_points (modele_id, ordre, libelle, photo_requise) values
      (m, 1, 'Entrée propre et accueillante', false),
      (m, 2, 'Aucune odeur désagréable, aucune trace d''humidité', false),
      (m, 3, 'Lits impeccables, linge sans tache', true),
      (m, 4, 'Salle de bain sans trace ni cheveux', true),
      (m, 5, 'Cuisine propre, vaisselle rangée', false),
      (m, 6, 'Sols propres', false),
      (m, 7, 'Équipements en état de marche : lumières, climatisation, TV, wifi, eau chaude', false),
      (m, 8, 'Consommables d''accueil en place', false),
      (m, 9, 'Aucun objet oublié par le voyageur', false);

    insert into public.checklist_modeles (nom, type) values ('Check-in', 'checkin') returning id into m;
    insert into public.checklist_modele_points (modele_id, ordre, libelle, photo_requise) values
      (m, 1, 'Logement propre et prêt à accueillir', false),
      (m, 2, 'Wifi et code d''accès communiqués au voyageur', false),
      (m, 3, 'Climatisation, eau chaude et TV vérifiées', false),
      (m, 4, 'Consommables d''accueil en place', false),
      (m, 5, 'Clés ou badge disponibles', false),
      (m, 6, 'Photo de l''entrée, lumières allumées', true),
      (m, 7, 'Message d''accueil envoyé au voyageur', false);
  end if;
end $$;

-- 6. Maintenance : incidents, frais engagés par Perfect Stay, photos ----------------
create table if not exists public.incidents (
  id               uuid primary key default gen_random_uuid(),
  logement_id      uuid not null references public.logements (id) on delete cascade,
  type             text not null default 'panne' check (type in ('panne', 'degat', 'plainte', 'autre')),
  titre            text not null,
  description      text not null default '',
  statut           text not null default 'signale' check (statut in ('signale', 'en_cours', 'resolu')),
  date_incident    date not null default current_date,
  resolu_le        date,
  intervenant      text not null default '',                       -- plombier, électricien…
  responsable_id   uuid references public.profiles (id) on delete set null,
  tache_id         uuid unique references public.taches (id) on delete set null,
  -- Les frais sont avancés par Perfect Stay puis remboursés par le propriétaire
  remboursement    text not null default 'a_rembourser' check (remboursement in ('a_rembourser', 'rembourse', 'sans_objet')),
  rembourse_le     date,
  remboursement_note text not null default '',
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists incidents_logement on public.incidents (logement_id, date_incident desc);
create index if not exists incidents_statut on public.incidents (statut);
drop trigger if exists incidents_touch on public.incidents;
create trigger incidents_touch before update on public.incidents
  for each row execute function public.touch_updated_at();

create table if not exists public.incident_frais (
  id                uuid primary key default gen_random_uuid(),
  incident_id       uuid not null references public.incidents (id) on delete cascade,
  date_frais        date not null default current_date,
  description       text not null default '',
  montant           numeric(12, 2) not null check (montant > 0),
  justificatif      text,                       -- facture ou reçu, dans le stockage privé « operations »
  justificatif_nom  text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists incident_frais_incident on public.incident_frais (incident_id);

create table if not exists public.incident_photos (
  id               uuid primary key default gen_random_uuid(),
  incident_id      uuid not null references public.incidents (id) on delete cascade,
  chemin           text not null,
  chemin_vignette  text not null,
  legende          text not null default '',
  pris_le          timestamptz not null default now(),
  pris_par         uuid references public.profiles (id) on delete set null
);
create index if not exists incident_photos_incident on public.incident_photos (incident_id);

-- Le propriétaire voit les frais avancés pour SES logements (mêmes colonnes qu'avant)
create or replace view public.proprietaire_maintenance as
  select f.id, i.logement_id, f.date_frais as date_depense,
         case when f.description = '' then i.titre else i.titre || ' · ' || f.description end as description,
         f.montant
  from public.incident_frais f
  join public.incidents i on i.id = f.incident_id
  where i.remboursement <> 'sans_objet'
    and exists (
      select 1 from public.logement_proprietaires lp
      where lp.logement_id = i.logement_id and lp.user_id = (select auth.uid())
    );

-- 7. Stock ---------------------------------------------------------------------
create table if not exists public.stock_articles (
  id            uuid primary key default gen_random_uuid(),
  nom           text not null,
  categorie     text not null default 'consommable' check (categorie in ('linge', 'accueil', 'consommable', 'autre')),
  unite         text not null default 'pièce',
  seuil_alerte  integer not null default 0 check (seuil_alerte >= 0),   -- alerte quand le total passe sous ce seuil
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Historique des entrées et sorties : on ne modifie jamais une ligne, on en ajoute une (correction = inventaire)
create table if not exists public.stock_mouvements (
  id             uuid primary key default gen_random_uuid(),
  article_id     uuid not null references public.stock_articles (id) on delete cascade,
  logement_id    uuid references public.logements (id) on delete cascade,   -- null = la réserve
  type           text not null check (type in ('entree', 'sortie', 'transfert', 'inventaire')),
  quantite       integer not null check (quantite <> 0),                    -- + ajoute, − retire à cet endroit
  lot            uuid,                                                       -- relie les deux lignes d'un transfert
  note           text not null default '',
  date_mouvement date not null default current_date,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists stock_mouvements_article on public.stock_mouvements (article_id, created_at desc);

create or replace view public.stock_niveaux with (security_invoker = true) as
  select article_id, logement_id, sum(quantite)::integer as quantite
  from public.stock_mouvements
  group by article_id, logement_id;

do $$
begin
  if not exists (select 1 from public.stock_articles) then
    insert into public.stock_articles (nom, categorie, unite, seuil_alerte) values
      ('Draps', 'linge', 'jeu', 10),
      ('Housses de couette', 'linge', 'pièce', 10),
      ('Serviettes', 'linge', 'pièce', 20),
      ('Papier toilette', 'consommable', 'rouleau', 24),
      ('Savon', 'consommable', 'pièce', 10),
      ('Capsules de café', 'accueil', 'capsule', 100),
      ('Gel douche', 'accueil', 'flacon', 10);
  end if;
end $$;

-- 8. Onboarding : les 8 étapes d'un nouveau logement -------------------------------
create table if not exists public.onboarding_etapes (
  logement_id  uuid not null references public.logements (id) on delete cascade,
  cle          text not null check (cle in ('visite', 'inventaire', 'photos', 'achats', 'contrat', 'annonce', 'ical', 'en_ligne')),
  fait         boolean not null default false,
  fait_le      timestamptz,
  fait_par     uuid references public.profiles (id) on delete set null,
  primary key (logement_id, cle)
);

create or replace function public.onboarding_regles()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.fait is distinct from old.fait then
    new.fait_le := case when new.fait then now() else null end;
    new.fait_par := case when new.fait then (select auth.uid()) else null end;
  end if;
  return new;
end;
$$;
drop trigger if exists onboarding_regles_trg on public.onboarding_etapes;
create trigger onboarding_regles_trg before update on public.onboarding_etapes
  for each row execute function public.onboarding_regles();

-- 9. Row Level Security ----------------------------------------------------------
alter table public.checklist_modeles        enable row level security;
alter table public.checklist_modele_points  enable row level security;
alter table public.checklists               enable row level security;
alter table public.checklist_points         enable row level security;
alter table public.checklist_photos         enable row level security;
alter table public.incidents                enable row level security;
alter table public.incident_frais           enable row level security;
alter table public.incident_photos          enable row level security;
alter table public.stock_articles           enable row level security;
alter table public.stock_mouvements         enable row level security;
alter table public.onboarding_etapes        enable row level security;

-- Modèles : lus par ceux qui font des check-lists ou des ménages, modifiés avec le droit Check-lists
do $$
declare t text;
begin
  foreach t in array array['checklist_modeles', 'checklist_modele_points']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (not public.est_prestataire() and (public.a_droit('checklists', 'voir') or public.a_droit('menage', 'voir')))$f$, t || '_lecture', t);
    execute format('drop policy if exists %I on public.%I', t || '_ecriture', t);
    execute format($f$create policy %I on public.%I for all to authenticated using (not public.est_prestataire() and public.a_droit('checklists', 'modifier')) with check (not public.est_prestataire() and public.a_droit('checklists', 'modifier'))$f$, t || '_ecriture', t);
  end loop;
end $$;

-- Check-lists remplies
drop policy if exists checklists_lecture on public.checklists;
create policy checklists_lecture on public.checklists for select to authenticated
  using (
    (not public.est_prestataire() and (
      public.a_droit('checklists', 'voir') or (tache_id is not null and public.a_droit('menage', 'voir'))
    ))
    or (tache_id is not null and public.responsable_de_tache(tache_id))
  );
drop policy if exists checklists_ajout on public.checklists;
create policy checklists_ajout on public.checklists for insert to authenticated
  with check (
    (not public.est_prestataire() and (
      public.a_droit('checklists', 'modifier') or (tache_id is not null and public.a_droit('menage', 'modifier'))
    ))
    or (tache_id is not null and public.responsable_de_tache(tache_id))
  );
drop policy if exists checklists_modification on public.checklists;
create policy checklists_modification on public.checklists for update to authenticated
  using (
    (not public.est_prestataire() and (
      public.a_droit('checklists', 'modifier') or (tache_id is not null and public.a_droit('menage', 'modifier'))
    ))
    or (tache_id is not null and public.responsable_de_tache(tache_id))
  )
  with check (
    (not public.est_prestataire() and (
      public.a_droit('checklists', 'modifier') or (tache_id is not null and public.a_droit('menage', 'modifier'))
    ))
    or (tache_id is not null and public.responsable_de_tache(tache_id))
  );
drop policy if exists checklists_suppression on public.checklists;
create policy checklists_suppression on public.checklists for delete to authenticated
  using (not public.est_prestataire() and public.a_droit('checklists', 'modifier'));

drop policy if exists checklist_points_lecture on public.checklist_points;
create policy checklist_points_lecture on public.checklist_points for select to authenticated
  using (public.peut_checklist(checklist_id, 'voir'));
drop policy if exists checklist_points_ajout on public.checklist_points;
create policy checklist_points_ajout on public.checklist_points for insert to authenticated
  with check (public.peut_checklist(checklist_id, 'modifier'));
drop policy if exists checklist_points_modification on public.checklist_points;
create policy checklist_points_modification on public.checklist_points for update to authenticated
  using (public.peut_checklist(checklist_id, 'modifier')) with check (public.peut_checklist(checklist_id, 'modifier'));
drop policy if exists checklist_points_suppression on public.checklist_points;
create policy checklist_points_suppression on public.checklist_points for delete to authenticated
  using (not public.est_prestataire() and public.peut_checklist(checklist_id, 'modifier'));

drop policy if exists checklist_photos_lecture on public.checklist_photos;
create policy checklist_photos_lecture on public.checklist_photos for select to authenticated
  using (public.peut_checklist(checklist_id, 'voir'));
drop policy if exists checklist_photos_ajout on public.checklist_photos;
create policy checklist_photos_ajout on public.checklist_photos for insert to authenticated
  with check (public.peut_checklist(checklist_id, 'modifier'));
drop policy if exists checklist_photos_suppression on public.checklist_photos;
create policy checklist_photos_suppression on public.checklist_photos for delete to authenticated
  using (public.peut_checklist(checklist_id, 'modifier'));

-- Maintenance, stock, onboarding : droit du module (jamais pour un prestataire sans droit explicite)
do $$
declare t text; m text;
begin
  foreach t in array array['incidents', 'incident_frais', 'incident_photos', 'stock_articles', 'onboarding_etapes']
  loop
    m := case t when 'stock_articles' then 'stock' when 'onboarding_etapes' then 'onboarding' else 'maintenance' end;
    execute format('drop policy if exists %I on public.%I', t || '_lecture', t);
    execute format($f$create policy %I on public.%I for select to authenticated using (public.a_droit(%L, 'voir'))$f$, t || '_lecture', t, m);
    execute format('drop policy if exists %I on public.%I', t || '_ajout', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (public.a_droit(%L, 'modifier'))$f$, t || '_ajout', t, m);
    execute format('drop policy if exists %I on public.%I', t || '_modification', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (public.a_droit(%L, 'modifier')) with check (public.a_droit(%L, 'modifier'))$f$, t || '_modification', t, m, m);
    execute format('drop policy if exists %I on public.%I', t || '_suppression', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (public.a_droit(%L, 'modifier'))$f$, t || '_suppression', t, m);
  end loop;
end $$;

-- Mouvements de stock : on lit et on ajoute, on ne modifie ni ne supprime jamais
drop policy if exists stock_mouvements_lecture on public.stock_mouvements;
create policy stock_mouvements_lecture on public.stock_mouvements for select to authenticated
  using (public.a_droit('stock', 'voir'));
drop policy if exists stock_mouvements_ajout on public.stock_mouvements;
create policy stock_mouvements_ajout on public.stock_mouvements for insert to authenticated
  with check (public.a_droit('stock', 'modifier'));

-- 10. Accès aux vues ------------------------------------------------------------
revoke all on public.operations_logements, public.stock_niveaux from public, anon;
grant select on public.operations_logements, public.stock_niveaux to authenticated;
revoke all on public.proprietaire_maintenance from public, anon;
grant select on public.proprietaire_maintenance to authenticated;
