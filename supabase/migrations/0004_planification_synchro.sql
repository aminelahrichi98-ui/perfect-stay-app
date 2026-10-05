-- ============================================================================
-- Perfect Stay — Synchronisation automatique des calendriers toutes les 30 minutes
-- À exécuter UNE FOIS, après 0003, dans Supabase > SQL Editor.
--
-- Principe : Supabase appelle l'application toutes les 30 minutes (gratuit). L'adresse et le
-- mot de passe de l'appel NE sont PAS dans ce fichier : vous les saisissez dans la dernière
-- ligne, sur votre écran, jamais sur GitHub.
-- ============================================================================

-- Extensions nécessaires (si une erreur apparaît ici : Database > Extensions, activez
-- « pg_cron » et « pg_net », puis relancez ce script)
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.planifier_synchro_ical(p_url text, p_secret text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_url !~ '^https://' or length(p_secret) < 24 then
    raise exception 'Adresse en https:// et mot de passe d''au moins 24 caractères requis.';
  end if;

  -- on remplace l'éventuelle planification précédente
  perform cron.unschedule(jobid) from cron.job where jobname = 'synchro-ical';

  perform cron.schedule(
    'synchro-ical',
    '*/30 * * * *',
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
  return 'Synchronisation planifiée toutes les 30 minutes.';
end;
$$;

-- Personne d'autre que vous (via l'éditeur SQL) ne peut l'appeler
revoke all on function public.planifier_synchro_ical(text, text) from public, anon, authenticated;

-- ► Dernière ligne à compléter, puis à exécuter :
-- select public.planifier_synchro_ical('https://VOTRE-APP.vercel.app/api/cron/ical', 'VOTRE_MOT_DE_PASSE_LONG');
--
-- Pour vérifier plus tard que ça tourne :
-- select start_time, status, return_message from cron.job_run_details order by start_time desc limit 5;
