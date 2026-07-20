-- Die automatische Zahlungsfrist gilt ausschließlich für Anmeldungen, die ab
-- Anwendung dieser Migration neu angelegt werden. Bestehende Anmeldungen,
-- Zahlungsstände, Campbelegungen und Kapazitäten werden nicht aktualisiert.

create table if not exists public.payment_deadline_policy (
  id boolean primary key default true check (id),
  active_from timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.payment_deadline_policy enable row level security;
revoke all on table public.payment_deadline_policy
  from public, anon, authenticated;
grant select on table public.payment_deadline_policy to service_role;

insert into public.payment_deadline_policy (id, active_from)
values (true, clock_timestamp())
on conflict (id) do nothing;

comment on table public.payment_deadline_policy is
  'Prospektive Aktivierungsgrenze: bestehende Anmeldungen bleiben vom automatischen Zahlungsfrist-Workflow ausgeschlossen.';
