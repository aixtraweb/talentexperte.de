-- Privater, nachvollziehbarer Schalter für die beiden Zahlungsworkflow-Jobs.
-- cron.job ist in gehosteten Projekten nicht direkt für die Migrationsrolle
-- lesbar; deshalb werden die von cron.schedule gelieferten IDs separat gehalten.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.payment_workflow_jobs (
  job_name text primary key,
  job_id bigint not null unique,
  schedule text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

revoke all on table private.payment_workflow_jobs from public, anon, authenticated;

do $migration$
declare
  deadline_job_id bigint;
  outbox_job_id bigint;
begin
  deadline_job_id := cron.schedule(
    'process-payment-deadlines-every-15-minutes',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := 'https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/process-payment-deadlines',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'payment_deadline_processor_secret'
            order by created_at desc
            limit 1
          )
        ),
        body := '{}'::jsonb
      ) as request_id;
    $job$
  );
  perform cron.alter_job(deadline_job_id, active := false);

  outbox_job_id := cron.schedule(
    'process-email-outbox-every-15-minutes',
    '*/15 * * * *',
    $job$
      select net.http_post(
        url := 'https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/process-email-outbox',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'outbox_processor_secret'
            order by created_at desc
            limit 1
          )
        ),
        body := '{}'::jsonb
      ) as request_id;
    $job$
  );
  perform cron.alter_job(outbox_job_id, active := false);

  insert into private.payment_workflow_jobs (
    job_name,
    job_id,
    schedule,
    enabled,
    updated_at
  ) values
    (
      'process-payment-deadlines-every-15-minutes',
      deadline_job_id,
      '*/15 * * * *',
      false,
      now()
    ),
    (
      'process-email-outbox-every-15-minutes',
      outbox_job_id,
      '*/15 * * * *',
      false,
      now()
    )
  on conflict (job_name) do update
  set job_id = excluded.job_id,
      schedule = excluded.schedule,
      enabled = false,
      updated_at = now();
end;
$migration$;

create or replace function public.set_payment_workflow_jobs_enabled(
  p_enabled boolean
)
returns table(job_name text, enabled boolean, schedule text)
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  target record;
begin
  for target in
    select j.job_id
    from private.payment_workflow_jobs as j
  loop
    perform cron.alter_job(target.job_id, active := p_enabled);
  end loop;

  update private.payment_workflow_jobs as j
  set enabled = p_enabled,
      updated_at = now();

  return query
  select j.job_name, j.enabled, j.schedule
  from private.payment_workflow_jobs as j
  order by j.job_name;
end;
$$;

create or replace function public.get_payment_workflow_job_status()
returns table(job_name text, enabled boolean, schedule text, updated_at timestamptz)
language sql
security definer
set search_path = public, private, pg_catalog
as $$
  select j.job_name, j.enabled, j.schedule, j.updated_at
  from private.payment_workflow_jobs as j
  order by j.job_name;
$$;

revoke all on function public.set_payment_workflow_jobs_enabled(boolean)
  from public, anon, authenticated;
revoke all on function public.get_payment_workflow_job_status()
  from public, anon, authenticated;
grant execute on function public.set_payment_workflow_jobs_enabled(boolean)
  to service_role;
grant execute on function public.get_payment_workflow_job_status()
  to service_role;
