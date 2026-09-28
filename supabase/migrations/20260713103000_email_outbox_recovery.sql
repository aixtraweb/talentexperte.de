alter table public.email_outbox
  add column if not exists processing_started_at timestamptz;

create index if not exists email_outbox_stale_sending_idx
  on public.email_outbox (processing_started_at)
  where status = 'sending';

comment on column public.email_outbox.processing_started_at is
  'Ermöglicht die sichere Wiederaufnahme abgebrochener Versandläufe.';
