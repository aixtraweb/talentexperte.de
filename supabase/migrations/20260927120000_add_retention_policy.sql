-- Löschkonzept (Datenschutz) – automatische Fristen, Stand 27.09.2026.
-- Siehe docs/LOESCHKONZEPT.md. Zeitplan (pg_cron) wird separat aktiviert.
--
--  Regel                                              Frist
--  R1 Allergien/Besonderheiten + Freitext-Notizen     3 Monate nach Campende (TYP-Marker bleiben)
--  R2 Anwesenheit und Trainingswerte (teilnahme)       12 Monate nach Campende
--  R3 abgelaufene Bestätigungslinks                    30 Tage nach Ablauf
--  R4 Formular-Schutzdaten (Nonces, Rate Limits)       30 Tage
--  R5 E-Mail-Warteschlange                             90 Tage nach Versand/Anlage
--  R6 Sicherheitsprotokoll                             12 Monate; personenbezogene Kopien von
--                                                      R1/R2-Feldern werden sofort mitbereinigt

create table if not exists public.retention_runs (
  id bigint generated always as identity primary key,
  run_at timestamptz not null default now(),
  mode text not null check (mode in ('preview', 'apply')),
  result jsonb not null
);
alter table public.retention_runs enable row level security;
revoke all on public.retention_runs from anon, authenticated;

-- Nur Zählwerte, keine Inhalte.
create or replace function public.retention_counts()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'r1_anmeldungen_freitext', (
      select count(*) from public.anmeldungen a join public.camps c on c.id = a.camp_id
      where c.datum_bis < current_date - interval '3 months'
        and (nullif(btrim(coalesce(a.allergien, '')), '') is not null
          or nullif(btrim(regexp_replace(coalesce(a.notizen, ''), '\[TYP:[^\]]+\]', '', 'g')), '') is not null)),
    'r1_firmen_freitext', (
      select count(*) from public.firmen_anmeldungen f join public.camps c on c.id = f.camp_id
      where c.datum_bis < current_date - interval '3 months'
        and (nullif(btrim(coalesce(f.allergien, '')), '') is not null
          or nullif(btrim(coalesce(f.notizen, '')), '') is not null)),
    'r2_teilnahme', (
      select count(*) from public.teilnahme t join public.camps c on c.id = t.camp_id
      where c.datum_bis < current_date - interval '12 months'),
    'r3_tokens', (select count(*) from public.confirmation_tokens where expires_at < now() - interval '30 days'),
    'r4_nonces', (select count(*) from public.form_submission_nonces where expires_at < now() - interval '30 days'),
    'r4_rate_limits', (select count(*) from public.form_rate_limits where updated_at < now() - interval '30 days'),
    'r5_outbox', (select count(*) from public.email_outbox
      where coalesce(sent_at, created_at) < now() - interval '90 days' and status in ('sent', 'failed', 'cancelled')),
    'r6_audit', (select count(*) from public.security_audit_log where created_at < now() - interval '12 months')
  );
$$;

create or replace function public.retention_preview()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r jsonb := public.retention_counts();
begin
  insert into public.retention_runs (mode, result) values ('preview', r);
  return r;
end;
$$;

create or replace function public.apply_retention_policy()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  before jsonb := public.retention_counts();
  ids text[];
begin
  -- R1: Freitext der Eltern-Anmeldungen leeren, TYP-Marker erhalten.
  with target as (
    select a.id from public.anmeldungen a join public.camps c on c.id = a.camp_id
    where c.datum_bis < current_date - interval '3 months'
      and (nullif(btrim(coalesce(a.allergien, '')), '') is not null
        or nullif(btrim(regexp_replace(coalesce(a.notizen, ''), '\[TYP:[^\]]+\]', '', 'g')), '') is not null)
  ), upd as (
    update public.anmeldungen a set
      allergien = null,
      notizen = nullif((select string_agg(m[1], ' ') from regexp_matches(coalesce(a.notizen, ''), '(\[TYP:[^\]]+\])', 'g') as m), '')
    from target where a.id = target.id
    returning a.id::text
  ) select coalesce(array_agg(id), '{}') into ids from upd;

  -- Kopien im Sicherheitsprotokoll mitbereinigen (auch die gerade entstandenen).
  update public.security_audit_log
     set old_data = case when old_data is null then null else old_data - 'allergien' - 'notizen' end,
         new_data = case when new_data is null then null else new_data - 'allergien' - 'notizen' end
   where table_name = 'anmeldungen' and record_id = any(ids);

  -- R1: Firmen-Anmeldungen.
  with target as (
    select f.id from public.firmen_anmeldungen f join public.camps c on c.id = f.camp_id
    where c.datum_bis < current_date - interval '3 months'
      and (nullif(btrim(coalesce(f.allergien, '')), '') is not null or nullif(btrim(coalesce(f.notizen, '')), '') is not null)
  ), upd as (
    update public.firmen_anmeldungen f set allergien = null, notizen = null
    from target where f.id = target.id
    returning f.id::text
  ) select coalesce(array_agg(id), '{}') into ids from upd;
  update public.security_audit_log
     set old_data = case when old_data is null then null else old_data - 'allergien' - 'notizen' end,
         new_data = case when new_data is null then null else new_data - 'allergien' - 'notizen' end
   where table_name = 'firmen_anmeldungen' and record_id = any(ids);

  -- R2: Anwesenheit und Trainingswerte löschen, Protokollkopien ebenfalls.
  with del as (
    delete from public.teilnahme t using public.camps c
    where c.id = t.camp_id and c.datum_bis < current_date - interval '12 months'
    returning t.id::text
  ) select coalesce(array_agg(id), '{}') into ids from del;
  delete from public.security_audit_log where table_name = 'teilnahme' and record_id = any(ids);

  -- R3–R5
  delete from public.confirmation_tokens where expires_at < now() - interval '30 days';
  delete from public.form_submission_nonces where expires_at < now() - interval '30 days';
  delete from public.form_rate_limits where updated_at < now() - interval '30 days';
  delete from public.email_outbox
   where coalesce(sent_at, created_at) < now() - interval '90 days' and status in ('sent', 'failed', 'cancelled');

  -- R6
  delete from public.security_audit_log where created_at < now() - interval '12 months';

  insert into public.retention_runs (mode, result)
  values ('apply', jsonb_build_object('before', before, 'after', public.retention_counts()));
  return jsonb_build_object('before', before, 'after', public.retention_counts());
end;
$$;

revoke all on function public.retention_counts() from public, anon, authenticated;
revoke all on function public.retention_preview() from public, anon, authenticated;
revoke all on function public.apply_retention_policy() from public, anon, authenticated;
