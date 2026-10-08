-- ============================================================================
-- Perfect Stay — Génération automatique des rapports et factures le 1er de chaque mois
-- À exécuter UNE FOIS, après 0004 et 0005, dans Supabase > SQL Editor.
--
-- Même principe que la synchronisation des calendriers (script 0004) : Supabase appelle l'application,
-- cette fois le 1er du mois à 06h00 (heure du Maroc, UTC+1 : 05h00 UTC). L'adresse et le mot de passe ne sont
-- pas dans ce fichier : vous les saisissez dans la dernière ligne, sur votre écran.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.planifier_documents_mensuels(p_url text, p_secret text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_url !~ '^https://' or length(p_secret) < 24 then
    raise exception 'Adresse en https:// et mot de passe d''au moins 24 caractères requis.';
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'documents-mensuels';

  perform cron.schedule(
    'documents-mensuels',
    '0 5 1 * *',
    format(
      $cmd$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'),
        body := '{}'::jsonb,
        timeout_milliseconds := 55000
      );$cmd$,
      p_url,
      'Bearer ' || p_secret
    )
  );
  return 'Génération des rapports et factures planifiée le 1er de chaque mois.';
end;
$$;

revoke all on function public.planifier_documents_mensuels(text, text) from public, anon, authenticated;

-- ► Dernière ligne à compléter (même mot de passe que pour la synchronisation), puis à exécuter :
-- select public.planifier_documents_mensuels('https://VOTRE-APP.vercel.app/api/cron/documents', 'VOTRE_MOT_DE_PASSE_LONG');
