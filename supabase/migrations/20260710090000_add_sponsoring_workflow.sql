-- Sponsor-finanzierte Elternanmeldungen
--
-- Sicherheitsprinzipien:
--   * Sponsorcodes werden ausschliesslich als HMAC-SHA-256 gespeichert.
--   * Berechtigungen sind pro Kind einmalig einloesbar.
--   * Validierung und Einloesung sind nur fuer die service_role aufrufbar.
--   * Die Einloesung und das Anlegen der Anmeldung erfolgen in einer Transaktion.

create table if not exists public.sponsoring_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsoring_partners_name_not_blank check (btrim(name) <> ''),
  constraint sponsoring_partners_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

insert into public.sponsoring_partners (name, slug, active)
values ('Öcher Fans for Kenger e.V.', 'oecher-kenger', true)
on conflict (slug) do update
set
  name = excluded.name,
  active = true,
  updated_at = now();

create table if not exists public.sponsoring_entitlements (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.sponsoring_partners(id) on delete restrict,
  code_hash text not null,
  child_first_name text not null,
  child_last_name text not null,
  child_name_normalized text not null,
  birth_date date,
  camp_id uuid not null references public.camps(id) on delete restrict,
  expires_at timestamptz not null,
  active boolean not null default true,
  revoked_at timestamptz,
  redeemed_at timestamptz,
  registration_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsoring_entitlements_hash_format check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint sponsoring_entitlements_first_name_not_blank check (btrim(child_first_name) <> ''),
  constraint sponsoring_entitlements_last_name_not_blank check (btrim(child_last_name) <> ''),
  constraint sponsoring_entitlements_normalized_name_not_blank check (btrim(child_name_normalized) <> ''),
  constraint sponsoring_entitlements_expiry_after_creation check (expires_at > created_at),
  constraint sponsoring_entitlements_redemption_consistent check (
    (redeemed_at is null and registration_id is null)
    or (redeemed_at is not null and registration_id is not null)
  ),
  -- Ein gemeinsamer Code fuer Geschwister/mehrere Kinder ist ausdruecklich erlaubt.
  -- Doppelte Berechtigungen fuer dasselbe Kind und denselben Scope dagegen nicht.
  constraint sponsoring_entitlements_unique_match
    unique nulls not distinct (
      partner_id,
      code_hash,
      child_name_normalized,
      birth_date,
      camp_id
    )
);

-- Persistentes, datensparsames Rate-Limit. Es wird nur ein serverseitiger
-- HMAC der Netzwerkidentität gespeichert, niemals eine IP-Adresse im Klartext.
create table if not exists public.sponsoring_validation_limits (
  identity_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint sponsoring_validation_limits_hash_format check (identity_hash ~ '^[a-f0-9]{64}$'),
  constraint sponsoring_validation_limits_attempts_nonnegative check (attempt_count >= 0)
);

-- Serverseitige Allowlist fuer das interne Dashboard. Restriktive Policies
-- verhindern, dass ein beliebig neu registriertes Auth-Konto durch eine alte,
-- zu breite authenticated-Policy Personen- oder Finanzdaten sieht.
create table if not exists public.dashboard_admins (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint dashboard_admins_email_lowercase check (email = lower(email)),
  constraint dashboard_admins_email_format check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

insert into public.dashboard_admins (email, active)
values ('kontakt@talentexperte.de', true)
on conflict (email) do update set active = excluded.active;

alter table public.dashboard_admins enable row level security;
revoke all on table public.dashboard_admins from public, anon, authenticated;
grant all on table public.dashboard_admins to service_role;

create or replace function public.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select exists (
    select 1
    from public.dashboard_admins as da
    where da.active
      and da.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_dashboard_admin() from public, anon;
grant execute on function public.is_dashboard_admin() to authenticated, service_role;

alter table public.anmeldungen enable row level security;
alter table public.firmen_anmeldungen enable row level security;
alter table public.camps enable row level security;
alter table public.teilnahme enable row level security;

drop policy if exists dashboard_admin_guard on public.anmeldungen;
create policy dashboard_admin_guard on public.anmeldungen
  as restrictive for all to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

drop policy if exists dashboard_admin_guard on public.firmen_anmeldungen;
create policy dashboard_admin_guard on public.firmen_anmeldungen
  as restrictive for all to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

drop policy if exists dashboard_admin_guard on public.camps;
create policy dashboard_admin_guard on public.camps
  as restrictive for all to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

drop policy if exists dashboard_admin_guard on public.teilnahme;
create policy dashboard_admin_guard on public.teilnahme
  as restrictive for all to authenticated
  using (public.is_dashboard_admin())
  with check (public.is_dashboard_admin());

create index if not exists sponsoring_entitlements_lookup_idx
  on public.sponsoring_entitlements (code_hash, child_name_normalized)
  where active and revoked_at is null and redeemed_at is null;

create index if not exists sponsoring_validation_limits_updated_idx
  on public.sponsoring_validation_limits (updated_at);

alter table public.anmeldungen
  add column if not exists list_price_euro numeric(10,2) not null default 0,
  add column if not exists parent_amount_euro numeric(10,2) not null default 0,
  add column if not exists sponsor_amount_euro numeric(10,2) not null default 0,
  add column if not exists payer_type text not null default 'parent',
  add column if not exists parent_payment_status text not null default 'open',
  add column if not exists sponsor_settlement_status text,
  add column if not exists sponsoring_partner_id uuid references public.sponsoring_partners(id) on delete restrict,
  add column if not exists sponsoring_entitlement_id uuid references public.sponsoring_entitlements(id) on delete restrict;

-- Bestehende Elternanmeldungen auf die expliziten Felder abbilden.
update public.anmeldungen
set
  list_price_euro = coalesce(betrag_euro, 0),
  parent_amount_euro = coalesce(betrag_euro, 0),
  sponsor_amount_euro = 0,
  payer_type = 'parent',
  parent_payment_status = case lower(coalesce(zahlungsstatus::text, ''))
    when 'bezahlt' then 'paid'
    when 'paid' then 'paid'
    when 'storniert' then 'cancelled'
    when 'cancelled' then 'cancelled'
    when 'erstattet' then 'refunded'
    when 'refunded' then 'refunded'
    else 'open'
  end,
  sponsor_settlement_status = null,
  sponsoring_partner_id = null,
  sponsoring_entitlement_id = null;

-- Spiegelzeilen aus dem getrennten Firmenpfad sind weder Elternzahlungen noch
-- Sponsorcodes. Sie erhalten deshalb einen eigenen kanonischen Zahlertyp.
update public.anmeldungen as a
set
  list_price_euro = coalesce(nullif(a.list_price_euro, 0), a.betrag_euro, c.preis_euro, 0),
  parent_amount_euro = 0,
  sponsor_amount_euro = 0,
  payer_type = 'company',
  parent_payment_status = 'not_required',
  sponsor_settlement_status = null,
  sponsoring_partner_id = null,
  sponsoring_entitlement_id = null,
  betrag_euro = 0,
  zahlungsstatus = 'bezahlt'
from public.camps as c
where a.camp_id = c.id
  and (
    coalesce(a.notizen, '') ~ '\[TYP:SG\]'
    or a.id in (
      -- Pro Firmenzeile wird nur die zeitlich naechste, vollstaendig passende
      -- Spiegelzeile uebernommen. Eine zusaetzliche echte Elternbuchung mit
      -- gleichen Kindesdaten wird dadurch nicht ebenfalls auf 0 Euro gesetzt.
      select matched.id
      from public.firmen_anmeldungen as f
      cross join lateral (
        select a2.id
        from public.anmeldungen as a2
        where a2.camp_id = f.camp_id
          and a2.vorname = f.kind_vorname
          and a2.nachname = f.kind_nachname
          and a2.geburtsdatum = f.kind_geburtsdatum
          and lower(coalesce(a2.email, '')) = lower(coalesce(f.mitarbeiter_email, f.firma_email, ''))
          and coalesce(a2.telefon, '') = coalesce(f.mitarbeiter_telefon, f.firma_telefon, '')
          and abs(extract(epoch from (a2.created_at - f.created_at))) <= 600
        order by abs(extract(epoch from (a2.created_at - f.created_at))), a2.id
        limit 1
      ) as matched
    )
  );

-- Historische ÖF-Datensaetze waren nur ueber den Notizmarker erkennbar.
-- Der damalige Listenpreis wird aus dem jeweiligen Camp rekonstruiert; die
-- Sponsorabrechnung bleibt bewusst "unclear", bis sie kaufmaennisch geklaert ist.
update public.anmeldungen as a
set
  list_price_euro = coalesce(nullif(a.list_price_euro, 0), c.preis_euro, 0),
  parent_amount_euro = 0,
  sponsor_amount_euro = coalesce(nullif(a.list_price_euro, 0), c.preis_euro, 0),
  payer_type = 'sponsor',
  parent_payment_status = 'not_required',
  sponsor_settlement_status = 'unclear',
  sponsoring_partner_id = (
    select sp.id
    from public.sponsoring_partners as sp
    where sp.slug = 'oecher-kenger'
  ),
  betrag_euro = 0,
  zahlungsstatus = 'bezahlt'
from public.camps as c
where a.camp_id = c.id
  and coalesce(a.notizen, '') ~ '\[TYP:(ÖF|OEF)\]';

-- Uebergangsschutz: Auch waehrend eines kontrollierten Rollouts bleiben alte
-- register/company-register/Stripe-Versionen mit den neuen Finanzfeldern
-- konsistent. Der Trigger wird innerhalb derselben Migration aktiviert.
create or replace function public.normalize_anmeldung_finance_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  legacy_status text;
begin
  if tg_op = 'INSERT' and new.payer_type = 'parent' and (
    coalesce(new.notizen, '') ~ '\[TYP:SG\]'
    or exists (
      select 1
      from public.firmen_anmeldungen as f
      where f.camp_id = new.camp_id
        and f.kind_vorname = new.vorname
        and f.kind_nachname = new.nachname
        and f.kind_geburtsdatum = new.geburtsdatum
        and lower(coalesce(f.mitarbeiter_email, f.firma_email, '')) = lower(coalesce(new.email, ''))
        and coalesce(f.mitarbeiter_telefon, f.firma_telefon, '') = coalesce(new.telefon, '')
        and abs(extract(epoch from (coalesce(new.created_at, now()) - f.created_at))) <= 600
    )
  ) then
    new.payer_type := 'company';
  end if;

  if new.payer_type = 'company' then
    new.list_price_euro := coalesce(nullif(new.list_price_euro, 0), new.betrag_euro, 0);
    new.parent_amount_euro := 0;
    new.sponsor_amount_euro := 0;
    new.parent_payment_status := 'not_required';
    new.sponsor_settlement_status := null;
    new.sponsoring_partner_id := null;
    new.sponsoring_entitlement_id := null;
    new.betrag_euro := 0;
  elsif new.payer_type = 'sponsor' then
    new.list_price_euro := coalesce(nullif(new.list_price_euro, 0), nullif(new.sponsor_amount_euro, 0), 0);
    new.parent_amount_euro := 0;
    new.sponsor_amount_euro := new.list_price_euro;
    new.parent_payment_status := 'not_required';
    new.betrag_euro := 0;
  else
    new.payer_type := 'parent';
    new.list_price_euro := coalesce(nullif(new.list_price_euro, 0), new.betrag_euro, 0);
    if tg_op = 'INSERT' and coalesce(new.parent_amount_euro, 0) = 0 and coalesce(new.betrag_euro, 0) > 0 then
      new.parent_amount_euro := new.betrag_euro;
    end if;
    new.sponsor_amount_euro := 0;
    new.sponsor_settlement_status := null;
    new.sponsoring_partner_id := null;
    new.sponsoring_entitlement_id := null;

    if tg_op = 'INSERT' or new.zahlungsstatus is distinct from old.zahlungsstatus then
      legacy_status := lower(coalesce(new.zahlungsstatus::text, ''));
      new.parent_payment_status := case legacy_status
        when 'bezahlt' then 'paid'
        when 'paid' then 'paid'
        when 'storniert' then 'cancelled'
        when 'cancelled' then 'cancelled'
        when 'erstattet' then 'refunded'
        when 'refunded' then 'refunded'
        else 'open'
      end;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_anmeldung_finance_fields_trigger on public.anmeldungen;
create trigger normalize_anmeldung_finance_fields_trigger
before insert or update on public.anmeldungen
for each row execute function public.normalize_anmeldung_finance_fields();

alter table public.anmeldungen
  add constraint anmeldungen_amounts_nonnegative
    check (list_price_euro >= 0 and parent_amount_euro >= 0 and sponsor_amount_euro >= 0) not valid,
  add constraint anmeldungen_payer_type_values
    check (payer_type in ('parent', 'sponsor', 'company')) not valid,
  add constraint anmeldungen_parent_payment_status_values
    check (parent_payment_status in ('open', 'paid', 'not_required', 'cancelled', 'refunded')) not valid,
  add constraint anmeldungen_sponsor_settlement_status_values
    check (sponsor_settlement_status is null or sponsor_settlement_status in ('open', 'invoiced', 'paid', 'unclear')) not valid,
  add constraint anmeldungen_sponsor_consistency
    check (
      (
        payer_type = 'sponsor'
        and sponsoring_partner_id is not null
        and parent_amount_euro = 0
        and parent_payment_status = 'not_required'
        and sponsor_settlement_status is not null
        and sponsor_amount_euro = list_price_euro
        and coalesce(betrag_euro, 0) = 0
      )
      or (
        payer_type = 'parent'
        and sponsoring_partner_id is null
        and sponsoring_entitlement_id is null
        and sponsor_amount_euro = 0
        and sponsor_settlement_status is null
        and parent_payment_status <> 'not_required'
      )
      or (
        payer_type = 'company'
        and sponsoring_partner_id is null
        and sponsoring_entitlement_id is null
        and parent_amount_euro = 0
        and sponsor_amount_euro = 0
        and sponsor_settlement_status is null
        and parent_payment_status = 'not_required'
      )
    ) not valid;

alter table public.anmeldungen validate constraint anmeldungen_amounts_nonnegative;
alter table public.anmeldungen validate constraint anmeldungen_payer_type_values;
alter table public.anmeldungen validate constraint anmeldungen_parent_payment_status_values;
alter table public.anmeldungen validate constraint anmeldungen_sponsor_settlement_status_values;
alter table public.anmeldungen validate constraint anmeldungen_sponsor_consistency;

create unique index if not exists anmeldungen_sponsoring_entitlement_unique_idx
  on public.anmeldungen (sponsoring_entitlement_id)
  where sponsoring_entitlement_id is not null;

alter table public.sponsoring_entitlements
  add constraint sponsoring_entitlements_registration_fk
  foreign key (registration_id) references public.anmeldungen(id) on delete restrict;

-- Codegebundene Zuordnungen duerfen weder im Dashboard noch ueber REST von
-- Camp oder Partner geloest bzw. auf eine andere Berechtigung verschoben werden.
create or replace function public.enforce_registration_entitlement_match()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entitlement record;
begin
  if tg_op = 'UPDATE'
    and old.sponsoring_entitlement_id is not null
    and (
      new.sponsoring_entitlement_id is distinct from old.sponsoring_entitlement_id
      or new.vorname is distinct from old.vorname
      or new.nachname is distinct from old.nachname
      or new.geburtsdatum is distinct from old.geburtsdatum
    ) then
    raise exception using errcode = '23514', message = 'SPONSOR_ENTITLEMENT_IDENTITY_IMMUTABLE';
  end if;

  if new.sponsoring_entitlement_id is not null then
    select e.partner_id, e.camp_id, e.birth_date
    into entitlement
    from public.sponsoring_entitlements as e
    where e.id = new.sponsoring_entitlement_id;

    if not found
      or new.payer_type <> 'sponsor'
      or new.sponsoring_partner_id is distinct from entitlement.partner_id
      or new.camp_id is distinct from entitlement.camp_id
      or (entitlement.birth_date is not null and new.geburtsdatum is distinct from entitlement.birth_date) then
      raise exception using errcode = '23514', message = 'SPONSOR_ENTITLEMENT_REGISTRATION_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_registration_entitlement_match_trigger on public.anmeldungen;
create trigger enforce_registration_entitlement_match_trigger
before insert or update of vorname, nachname, geburtsdatum, camp_id, payer_type, sponsoring_partner_id, sponsoring_entitlement_id
on public.anmeldungen
for each row execute function public.enforce_registration_entitlement_match();

create or replace function public.enforce_entitlement_registration_match()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  registration record;
begin
  if tg_op = 'UPDATE'
    and old.registration_id is not null
    and new.registration_id is distinct from old.registration_id then
    raise exception using errcode = '23514', message = 'SPONSOR_REGISTRATION_LINK_IMMUTABLE';
  end if;

  if new.registration_id is not null then
    select a.sponsoring_entitlement_id, a.sponsoring_partner_id, a.camp_id, a.payer_type
    into registration
    from public.anmeldungen as a
    where a.id = new.registration_id;

    if not found
      or registration.sponsoring_entitlement_id is distinct from new.id
      or registration.sponsoring_partner_id is distinct from new.partner_id
      or registration.camp_id is distinct from new.camp_id
      or registration.payer_type <> 'sponsor' then
      raise exception using errcode = '23514', message = 'SPONSOR_REGISTRATION_ENTITLEMENT_MISMATCH';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_entitlement_registration_match_trigger on public.sponsoring_entitlements;
create trigger enforce_entitlement_registration_match_trigger
before insert or update of registration_id, partner_id, camp_id
on public.sponsoring_entitlements
for each row execute function public.enforce_entitlement_registration_match();

alter table public.sponsoring_partners enable row level security;
alter table public.sponsoring_entitlements enable row level security;
alter table public.sponsoring_validation_limits enable row level security;

revoke all on table public.sponsoring_partners from anon, authenticated;
revoke all on table public.sponsoring_entitlements from anon, authenticated;
revoke all on table public.sponsoring_validation_limits from anon, authenticated;
grant select on table public.sponsoring_partners to authenticated;
grant all on table public.sponsoring_partners to service_role;
grant all on table public.sponsoring_entitlements to service_role;
grant all on table public.sponsoring_validation_limits to service_role;

-- Partnernamen sind nur fuer freigeschaltete Dashboard-Konten lesbar; die
-- öffentliche Bestätigungsseite erhält sie ausschließlich aus der signierten
-- Edge-Antwort. Entitlements (inkl. Code-Hashes und Kindesdaten) bleiben
-- vollstaendig privat.
create policy sponsoring_partners_dashboard_read
  on public.sponsoring_partners
  for select
  to authenticated
  using (public.is_dashboard_admin());

-- Öffentliche Browser lesen und schreiben Anmeldedaten ausschließlich über
-- die gehärteten Edge Functions. Bestätigungen werden signiert abgerufen;
-- direkte REST-Zugriffe auf Personen- oder Finanzdaten sind nicht erforderlich.
revoke select, insert, update, delete
  on table public.anmeldungen, public.firmen_anmeldungen
  from anon, public;

create or replace function public.consume_sponsoring_validation_attempt(
  p_identity_hash text,
  p_max_attempts integer default 20,
  p_window_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  state record;
  next_count integer;
  window_interval interval;
begin
  if p_identity_hash !~ '^[a-f0-9]{64}$'
    or p_max_attempts < 1
    or p_window_seconds < 60
    or p_window_seconds > 86400 then
    raise exception using errcode = '22023', message = 'SPONSOR_RATE_LIMIT_ARGUMENT_INVALID';
  end if;

  window_interval := make_interval(secs => p_window_seconds);

  -- Alte Netzwerk-HMACs werden automatisch entfernt; die Tabelle ist kein
  -- dauerhaftes Nutzungsprofil und wächst nicht unbegrenzt.
  delete from public.sponsoring_validation_limits
  where updated_at < now() - interval '7 days';

  insert into public.sponsoring_validation_limits (identity_hash)
  values (p_identity_hash)
  on conflict (identity_hash) do nothing;

  select * into state
  from public.sponsoring_validation_limits
  where identity_hash = p_identity_hash
  for update;

  if state.blocked_until is not null and state.blocked_until > now() then
    update public.sponsoring_validation_limits
    set updated_at = now()
    where identity_hash = p_identity_hash;
    return false;
  end if;

  if state.window_started_at <= now() - window_interval then
    state.window_started_at := now();
    state.attempt_count := 0;
  end if;

  next_count := state.attempt_count + 1;
  update public.sponsoring_validation_limits
  set
    window_started_at = state.window_started_at,
    attempt_count = next_count,
    blocked_until = case when next_count > p_max_attempts then now() + window_interval else null end,
    updated_at = now()
  where identity_hash = p_identity_hash;

  return next_count <= p_max_attempts;
end;
$$;

-- Schlanke, codefreie Finanzsicht fuer Supabase und interne Auswertungen.
-- Personenbezogene Kontaktdaten verbleiben ausschliesslich in anmeldungen.
create or replace view public.sponsored_anmeldungen_dashboard
with (security_invoker = true)
as
select
  a.id as registration_id,
  upper(left(a.id::text, 8)) as booking_number,
  a.camp_id,
  c.name as camp_name,
  a.sponsoring_partner_id,
  sp.name as partner_name,
  sp.slug as partner_slug,
  a.sponsoring_entitlement_id,
  a.list_price_euro,
  a.parent_amount_euro,
  a.sponsor_amount_euro,
  a.parent_payment_status,
  a.sponsor_settlement_status,
  a.zahlungsstatus as registration_status,
  a.storniert_am,
  a.created_at
from public.anmeldungen as a
join public.sponsoring_partners as sp on sp.id = a.sponsoring_partner_id
left join public.camps as c on c.id = a.camp_id
where a.payer_type = 'sponsor';

revoke all on table public.sponsored_anmeldungen_dashboard from public, anon;
revoke all on table public.sponsored_anmeldungen_dashboard from authenticated;
grant select on table public.sponsored_anmeldungen_dashboard to service_role;

create or replace function public.validate_sponsoring_entitlement(
  p_code_hash text,
  p_child_name_normalized text,
  p_birth_date date,
  p_camp_id uuid
)
returns table (
  valid boolean,
  reason text,
  entitlement_id uuid,
  partner_id uuid,
  partner_name text,
  partner_slug text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  matched record;
begin
  select
    e.id as entitlement_id,
    sp.id as partner_id,
    sp.name as partner_name,
    sp.slug as partner_slug
  into matched
  from public.sponsoring_entitlements as e
  join public.sponsoring_partners as sp on sp.id = e.partner_id
  where e.code_hash = p_code_hash
    and e.child_name_normalized = p_child_name_normalized
    and (e.birth_date is null or (p_birth_date is not null and e.birth_date = p_birth_date))
    and e.camp_id = p_camp_id
    and e.active
    and e.revoked_at is null
    and e.redeemed_at is null
    and e.expires_at > now()
    and sp.active
  order by
    (case when e.birth_date is null then 0 else 1 end) desc,
    e.created_at,
    e.id
  limit 1;

  if found then
    return query select
      true,
      'valid'::text,
      matched.entitlement_id,
      matched.partner_id,
      matched.partner_name,
      matched.partner_slug;
    return;
  end if;

  if exists (
    select 1
    from public.sponsoring_entitlements as e
    join public.sponsoring_partners as sp on sp.id = e.partner_id
    where e.code_hash = p_code_hash
      and e.child_name_normalized = p_child_name_normalized
      and (e.birth_date is null or (p_birth_date is not null and e.birth_date = p_birth_date))
      and e.camp_id = p_camp_id
      and e.redeemed_at is not null
      and e.active
      and e.revoked_at is null
      and e.expires_at > now()
      and sp.active
  ) then
    return query select false, 'already_used'::text, null::uuid, null::uuid, null::text, null::text;
  else
    return query select false, 'invalid_or_mismatch'::text, null::uuid, null::uuid, null::text, null::text;
  end if;
end;
$$;

create or replace function public.redeem_sponsoring_entitlement_and_register(
  p_code_hash text,
  p_child_name_normalized text,
  p_birth_date date,
  p_camp_id uuid,
  p_list_price_euro numeric,
  p_registration jsonb
)
returns table (
  registration_id uuid,
  entitlement_id uuid,
  sponsor_partner_id uuid,
  partner_name text,
  partner_slug text,
  list_price_euro numeric,
  parent_amount_euro numeric,
  sponsor_amount_euro numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  matched record;
  new_registration_id uuid;
begin
  if p_list_price_euro is null or p_list_price_euro < 0 then
    raise exception using errcode = 'P0001', message = 'SPONSOR_PRICE_INVALID';
  end if;

  select
    e.id as entitlement_id,
    sp.id as partner_id,
    sp.name as partner_name,
    sp.slug as partner_slug
  into matched
  from public.sponsoring_entitlements as e
  join public.sponsoring_partners as sp on sp.id = e.partner_id
  where e.code_hash = p_code_hash
    and e.child_name_normalized = p_child_name_normalized
    and (e.birth_date is null or (p_birth_date is not null and e.birth_date = p_birth_date))
    and e.camp_id = p_camp_id
    and e.active
    and e.revoked_at is null
    and e.redeemed_at is null
    and e.expires_at > now()
    and sp.active
  order by
    (case when e.birth_date is null then 0 else 1 end) desc,
    e.created_at,
    e.id
  for update of e skip locked
  limit 1;

  if not found then
    if exists (
      select 1
      from public.sponsoring_entitlements as e
      join public.sponsoring_partners as sp on sp.id = e.partner_id
      where e.code_hash = p_code_hash
        and e.child_name_normalized = p_child_name_normalized
        and (e.birth_date is null or (p_birth_date is not null and e.birth_date = p_birth_date))
        and e.camp_id = p_camp_id
        and e.redeemed_at is not null
        and e.active
        and e.revoked_at is null
        and e.expires_at > now()
        and sp.active
    ) then
      raise exception using errcode = 'P0001', message = 'SPONSOR_ENTITLEMENT_ALREADY_USED';
    end if;
    raise exception using errcode = 'P0001', message = 'SPONSOR_ENTITLEMENT_INVALID';
  end if;

  insert into public.anmeldungen (
    camp_id,
    vorname,
    nachname,
    geburtsdatum,
    trikot_groesse,
    eltern_vorname,
    eltern_nachname,
    email,
    telefon,
    adresse,
    erfahrung,
    allergien,
    notizen,
    betrag_euro,
    zahlungsstatus,
    list_price_euro,
    parent_amount_euro,
    sponsor_amount_euro,
    payer_type,
    parent_payment_status,
    sponsor_settlement_status,
    sponsoring_partner_id,
    sponsoring_entitlement_id
  )
  values (
    p_camp_id,
    nullif(p_registration ->> 'vorname', ''),
    nullif(p_registration ->> 'nachname', ''),
    p_birth_date,
    nullif(p_registration ->> 'trikot_groesse', ''),
    nullif(p_registration ->> 'eltern_vorname', ''),
    nullif(p_registration ->> 'eltern_nachname', ''),
    nullif(p_registration ->> 'email', ''),
    nullif(p_registration ->> 'telefon', ''),
    nullif(p_registration ->> 'adresse', ''),
    nullif(p_registration ->> 'erfahrung', ''),
    nullif(p_registration ->> 'allergien', ''),
    nullif(p_registration ->> 'notizen', ''),
    0,
    'bezahlt',
    p_list_price_euro,
    0,
    p_list_price_euro,
    'sponsor',
    'not_required',
    'open',
    matched.partner_id,
    matched.entitlement_id
  )
  returning id into new_registration_id;

  update public.sponsoring_entitlements as e
  set
    redeemed_at = now(),
    registration_id = new_registration_id,
    updated_at = now()
  where e.id = matched.entitlement_id;

  return query select
    new_registration_id,
    matched.entitlement_id,
    matched.partner_id,
    matched.partner_name,
    matched.partner_slug,
    p_list_price_euro,
    0::numeric,
    p_list_price_euro;
end;
$$;

revoke all on function public.validate_sponsoring_entitlement(text, text, date, uuid)
  from public, anon, authenticated;
revoke all on function public.redeem_sponsoring_entitlement_and_register(text, text, date, uuid, numeric, jsonb)
  from public, anon, authenticated;
revoke all on function public.consume_sponsoring_validation_attempt(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_sponsoring_validation_attempt(text, integer, integer)
  to service_role;
grant execute on function public.validate_sponsoring_entitlement(text, text, date, uuid)
  to service_role;
grant execute on function public.redeem_sponsoring_entitlement_and_register(text, text, date, uuid, numeric, jsonb)
  to service_role;

comment on column public.sponsoring_entitlements.code_hash is
  'HMAC-SHA-256 des normalisierten Codes mit SPONSOR_CODE_PEPPER; niemals Klartext speichern.';
comment on function public.redeem_sponsoring_entitlement_and_register(text, text, date, uuid, numeric, jsonb) is
  'Loest eine Sponsoring-Berechtigung einmalig ein und legt die Anmeldung atomar an; nur service_role.';
