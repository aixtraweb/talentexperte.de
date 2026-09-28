-- Datenschutz: Allergie-/Gesundheitsangaben 3 Monate nach Campende leeren.
-- Betreiberentscheidung 28.09.2026: NUR das Feld `allergien` (Eltern- und
-- Firmenanmeldungen) wird geleert. Alle übrigen Anmelde-, Teilnahme-, Zahlungs-
-- und Rechnungsdaten bleiben unverändert erhalten (Aufbewahrung für Steuer).
-- Kopien des Feldes im Sicherheitsprotokoll werden mitbereinigt.
-- Siehe docs/LOESCHKONZEPT.md.

create table if not exists public.health_data_cleanup_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  cleared_anmeldungen integer not null,
  cleared_firmen integer not null
);
alter table public.health_data_cleanup_runs enable row level security;
revoke all on public.health_data_cleanup_runs from anon, authenticated;

create or replace function public.clear_expired_health_data()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ids_a text[];
  ids_f text[];
begin
  with upd as (
    update public.anmeldungen a set allergien = null
      from public.camps c
     where c.id = a.camp_id
       and c.datum_bis < current_date - interval '3 months'
       and nullif(btrim(coalesce(a.allergien, '')), '') is not null
    returning a.id::text
  ) select coalesce(array_agg(id), '{}') into ids_a from upd;

  with upd as (
    update public.firmen_anmeldungen f set allergien = null
      from public.camps c
     where c.id = f.camp_id
       and c.datum_bis < current_date - interval '3 months'
       and nullif(btrim(coalesce(f.allergien, '')), '') is not null
    returning f.id::text
  ) select coalesce(array_agg(id), '{}') into ids_f from upd;

  -- Feld `allergien` aus allen Protokollkopien der betroffenen Datensätze
  -- entfernen – auch aus Einträgen früherer Camps, deren Frist abgelaufen ist.
  update public.security_audit_log l
     set old_data = case when l.old_data ? 'allergien' then l.old_data - 'allergien' else l.old_data end,
         new_data = case when l.new_data ? 'allergien' then l.new_data - 'allergien' else l.new_data end
   where l.table_name in ('anmeldungen', 'firmen_anmeldungen')
     and (l.old_data ? 'allergien' or l.new_data ? 'allergien')
     and exists (
       select 1 from public.camps c
        where c.id::text = coalesce(l.new_data ->> 'camp_id', l.old_data ->> 'camp_id')
          and c.datum_bis < current_date - interval '3 months');

  insert into public.health_data_cleanup_runs (cleared_anmeldungen, cleared_firmen)
  values (cardinality(ids_a), cardinality(ids_f));
  return jsonb_build_object('cleared_anmeldungen', cardinality(ids_a), 'cleared_firmen', cardinality(ids_f));
end;
$$;

revoke all on function public.clear_expired_health_data() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'clear-expired-health-data-daily';
select cron.schedule('clear-expired-health-data-daily', '30 3 * * *', $$select public.clear_expired_health_data();$$);
