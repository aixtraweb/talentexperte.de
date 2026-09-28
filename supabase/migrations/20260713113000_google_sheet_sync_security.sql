create table if not exists public.google_sheet_sync_runs (
  subject_type text not null check (subject_type in ('privat', 'firma')),
  registration_id uuid not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  last_error text,
  primary key (subject_type, registration_id)
);

alter table public.google_sheet_sync_runs enable row level security;
revoke all on table public.google_sheet_sync_runs from public, anon, authenticated;
grant all on table public.google_sheet_sync_runs to service_role;

comment on table public.google_sheet_sync_runs is
  'Idempotenzjournal für den internen Export personenbezogener Buchungsdaten nach Google Sheets.';
