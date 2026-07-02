-- Close the old browser-direct company registration insert path.
-- Company registrations now go through supabase/functions/company-register
-- with server-side token, honeypot, time-window, content, and rate-limit checks.

drop policy if exists "Firmen können sich anmelden" on public.firmen_anmeldungen;

