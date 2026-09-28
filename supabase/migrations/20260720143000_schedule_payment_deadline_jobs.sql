-- Verlässliche, zunächst deaktivierte Zeitpläne für Zahlungsfristen und Outbox.
-- Die Bearer-Secrets liegen ausschließlich in Supabase Vault und werden erst
-- zur Laufzeit gelesen. Die Aktivierung ist ein separater, kontrollierter Schritt.

create extension if not exists pg_cron with schema pg_catalog;

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
end;
$migration$;
