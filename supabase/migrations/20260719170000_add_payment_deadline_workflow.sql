-- Verbindliche Zahlungs- und Reservierungsfrist fuer Elternanmeldungen.
-- Neue Anmeldungen: 72 Stunden bis zur letzten Erinnerung, danach 24 Stunden
-- Nachfrist. Bestehende offene Anmeldungen werden beim Rollout zunaechst nur
-- faellig gestellt und niemals ohne die neue Letztfrist storniert.

alter table public.anmeldungen
  add column if not exists payment_due_at timestamptz,
  add column if not exists payment_deadline_reminder_sent_at timestamptz,
  add column if not exists payment_reminder_processing_at timestamptz,
  add column if not exists payment_reminder_queued_at timestamptz,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists released_due_to_nonpayment_at timestamptz;

comment on column public.anmeldungen.payment_due_at is
  'Zeitpunkt, ab dem eine offene Elternzahlung die verbindliche Letzterinnerung erhalten darf.';
comment on column public.anmeldungen.payment_deadline_reminder_sent_at is
  'Erfolgreicher Versand der neuen Letztfrist; getrennt von historischen allgemeinen Erinnerungen.';
comment on column public.anmeldungen.reservation_expires_at is
  'In der erfolgreich zugestellten Letzterinnerung genannte Freigabefrist.';
comment on column public.anmeldungen.released_due_to_nonpayment_at is
  'Kennzeichnet ausschliesslich die automatische Stornierung nach unbezahlter Letztfrist.';

-- Bereits bestehende offene Elternanmeldungen erhalten zuerst die neue klare
-- Erinnerung. Die Freigabefrist beginnt erst mit deren erfolgreichem Versand.
update public.anmeldungen
set payment_due_at = now()
where payer_type = 'parent'
  and parent_payment_status = 'open'
  and parent_amount_euro > 0
  and payment_due_at is null;

create index if not exists anmeldungen_payment_deadline_due_idx
  on public.anmeldungen (payment_due_at)
  where payer_type = 'parent'
    and parent_payment_status = 'open'
    and payment_deadline_reminder_sent_at is null;

create index if not exists anmeldungen_reservation_expiry_idx
  on public.anmeldungen (reservation_expires_at)
  where payer_type = 'parent'
    and parent_payment_status = 'open'
    and reservation_expires_at is not null;

create or replace function public.set_parent_payment_deadline()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payer_type = 'parent'
     and new.parent_payment_status = 'open'
     and coalesce(new.parent_amount_euro, 0) > 0
     and new.payment_due_at is null then
    new.payment_due_at := coalesce(new.created_at, now()) + interval '72 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists set_parent_payment_deadline_trigger on public.anmeldungen;
create trigger set_parent_payment_deadline_trigger
before insert or update
on public.anmeldungen
for each row execute function public.set_parent_payment_deadline();

create or replace function public.claim_payment_deadline_reminder(
  p_registration_id uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_count integer;
begin
  update public.anmeldungen
  set payment_reminder_processing_at = p_now
  where id = p_registration_id
    and payer_type = 'parent'
    and parent_payment_status = 'open'
    and parent_amount_euro > 0
    and payment_due_at <= p_now
    and payment_deadline_reminder_sent_at is null
    and payment_reminder_queued_at is null
    and (
      payment_reminder_processing_at is null
      or payment_reminder_processing_at < p_now - interval '15 minutes'
    );
  get diagnostics claimed_count = row_count;
  return claimed_count = 1;
end;
$$;

create or replace function public.complete_payment_deadline_reminder(
  p_registration_id uuid,
  p_sent_at timestamptz,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if p_expires_at < p_sent_at + interval '24 hours' then
    raise exception 'PAYMENT_DEADLINE_TOO_SHORT';
  end if;

  update public.anmeldungen
  set erinnerung_gesendet_am = coalesce(erinnerung_gesendet_am, p_sent_at),
      payment_deadline_reminder_sent_at = p_sent_at,
      reservation_expires_at = p_expires_at,
      payment_reminder_processing_at = null,
      payment_reminder_queued_at = null
  where id = p_registration_id
    and payer_type = 'parent'
    and parent_payment_status = 'open'
    and payment_deadline_reminder_sent_at is null;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.queue_payment_deadline_reminder(
  p_registration_id uuid,
  p_queued_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.anmeldungen
  set payment_reminder_processing_at = null,
      payment_reminder_queued_at = p_queued_at
  where id = p_registration_id
    and payer_type = 'parent'
    and parent_payment_status = 'open'
    and payment_deadline_reminder_sent_at is null;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.fail_payment_deadline_reminder(
  p_registration_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.anmeldungen
  set payment_reminder_processing_at = null
  where id = p_registration_id
    and payment_deadline_reminder_sent_at is null;
$$;

create or replace function public.release_unpaid_registration(
  p_registration_id uuid,
  p_released_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.anmeldungen
  set zahlungsstatus = 'storniert',
      parent_payment_status = 'cancelled',
      storniert_am = p_released_at,
      released_due_to_nonpayment_at = p_released_at,
      payment_reminder_processing_at = null,
      payment_reminder_queued_at = null
  where id = p_registration_id
    and payer_type = 'parent'
    and parent_payment_status = 'open'
    and zahlungsstatus = 'offen'
    and parent_amount_euro > 0
    and payment_deadline_reminder_sent_at is not null
    and reservation_expires_at <= p_released_at;
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

revoke all on function public.claim_payment_deadline_reminder(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.complete_payment_deadline_reminder(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.queue_payment_deadline_reminder(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.fail_payment_deadline_reminder(uuid) from public, anon, authenticated;
revoke all on function public.release_unpaid_registration(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_payment_deadline_reminder(uuid, timestamptz) to service_role;
grant execute on function public.complete_payment_deadline_reminder(uuid, timestamptz, timestamptz) to service_role;
grant execute on function public.queue_payment_deadline_reminder(uuid, timestamptz) to service_role;
grant execute on function public.fail_payment_deadline_reminder(uuid) to service_role;
grant execute on function public.release_unpaid_registration(uuid, timestamptz) to service_role;

alter table public.email_outbox
  add column if not exists related_registration_id uuid references public.anmeldungen(id) on delete set null,
  add column if not exists payment_deadline_at timestamptz;

-- Eine Anmeldung darf genau eine Letztfrist-Mail in der Outbox besitzen.
create unique index if not exists email_outbox_payment_deadline_once_idx
  on public.email_outbox (message_type, related_registration_id)
  where message_type = 'payment_deadline_reminder'
    and related_registration_id is not null;

alter table public.email_outbox
  drop constraint if exists email_outbox_status_check;
alter table public.email_outbox
  add constraint email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled'));
