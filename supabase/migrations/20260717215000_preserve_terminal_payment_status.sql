-- Preserve a completed payment as evidence without overwriting a later
-- cancellation or refund. The canonical terminal state must remain visible
-- in the legacy `zahlungsstatus` field because the admin dashboard still
-- consumes it for its effective registration status.
create or replace function public.sync_anmeldungen_payment_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.stripe_payment_id is not null or new.zahlung_am is not null then
    if lower(coalesce(new.zahlungsstatus::text, '')) not in ('storniert', 'erstattet')
      and lower(coalesce(new.parent_payment_status, '')) not in ('cancelled', 'refunded') then
      new.zahlungsstatus := 'bezahlt';

      if new.zahlung_am is null then
        new.zahlung_am := now();
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.sync_anmeldungen_payment_status() is
  'Keeps successful payment evidence in sync while preserving later cancelled/refunded terminal states.';
