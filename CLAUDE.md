# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static website for **www.talentexperte.de** — a German-language registration platform for a children's soccer camp (TALENTEXPERTE Fußballschule). No build tools, no frameworks, no CMS. Pure HTML/CSS/JS with Supabase backend and Stripe payments.

## Commands

```bash
# Local development server (port 3000, live-reload)
npm run dev

# Alternative local server (no live-reload)
python3 -m http.server 8080 --bind 127.0.0.1

# Deploy to production (rsync to r20.hostingwerk.de)
./ci/deploy.sh

# Deploy Supabase Edge Function
supabase functions deploy send-reminder --no-verify-jwt

# Stripe payment backfill (dry-run preview)
node scripts/stripe-backfill-sync.mjs --from 2023-08-01

# Stripe payment backfill (apply changes)
MY_SUPABASE_URL=... MY_SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/stripe-backfill-sync.mjs --from 2023-08-01 --apply

# PayPal CSV backfill (dry-run preview)
node scripts/paypal-backfill-sync.mjs --csv /path/to/Download.CSV

# PayPal CSV backfill (apply changes)
node scripts/paypal-backfill-sync.mjs --csv /path/to/Download.CSV --apply
```

No linting or test framework is configured.

## Architecture

### Pages & Their Roles

| File | Purpose |
|------|---------|
| `anmeldung.html` | Parent registration (paid); inserts to `anmeldungen`; generates PDF; links to Stripe |
| `firmen-anmeldung.html` | Employee/company registration (free); inserts to `firmen_anmeldungen` |
| `bestaetigung.html` | Sichere Bestätigung + PDF; lädt Buchungsdaten nur mit signiertem, ID-gebundenem Token (E-Mail-Link oder exakt passende Browser-Sitzung) |
| `bestaetigung-firma.html` | Employee confirmation + PDF download |
| `admin.html` | Full dashboard: camp stats, registration table, bulk actions (mark paid, cancel, send reminders, delete); Anwesenheit checkboxes + Sprint/Torschuss/Dribbling metrics integrated directly in Anmeldungen tab when a camp is filtered (metric columns only visible with camp filter); separate Anwesenheit-Tab retains same metrics; offline-first write queue + session auto-refresh |
| `impressum.html`, `datenschutz.html`, `agb.html` | Legal pages |

### Supabase Data Model

- **`anmeldungen`** — private/parent registrations with `zahlungsstatus` enum (`offen`, `bezahlt`, `storniert`, `erstattet`)
- **`firmen_anmeldungen`** — employee/company registrations (non-paying)
- **`camps`** — event metadata: dates, prices, Stripe payment link
- **`teilnahme`** — attendance + performance data per child per camp; `referenz_id` (uuid from either table) + `quelle` (`anmeldungen`|`firmen_anmeldungen`) + `anwesenheit` (jsonb, `{"2026-03-30": true}`) + `sprint`, `torschuss`, `dribbling` (numeric); unique on `(referenz_id, camp_id)`; upsert via `Prefer: resolution=merge-duplicates`
- **Views**: `alle_anmeldungen`, `alle_anmeldungen_dashboard` for aggregation

Dashboard revenue/paid counts are based **only on `anmeldungen`**, not `firmen_anmeldungen`. Employee entries appear as `FIRMA` status and are excluded from payment tracking.

### Anmeldungstyp (`__typ`) — Erkennung und Speicherung

`__typ` wird clientseitig aus den Rohdaten berechnet (`normalizeAnmeldung()`):

| `__typ` | Erkennungsregel |
|---------|----------------|
| `'Firma'` | Datensatz aus `firmen_anmeldungen` **oder** `notizen` enthält `[TYP:SG]` |
| `'ÖF'`   | `typField === 'öf'/'oef'` **oder** `notizen` enthält `[TYP:ÖF]` |
| `'Privat'` | Default |

Im Edit-Modal (`mTyp`) kann man einem `anmeldungen`-Eintrag den Typ ändern:
- **ÖF** → setzt `[TYP:ÖF]` Prefix in `notizen`, Betrag = 0, Status = bezahlt
- **Saint-Gobain** → setzt `[TYP:SG]` Prefix in `notizen`, Betrag = 0, Status = bezahlt
- **Privat** → entfernt `[TYP:*]`-Tag aus `notizen`

Beim Speichern werden alte Tags (`[TYP:ÖF]`, `[TYP:SG]`) automatisch bereinigt, bevor der neue gesetzt wird.

### Edge Functions (Deno)

- `supabase/functions/register/index.ts` — handles `anmeldung.html` form submit (deployed with `--no-verify-jwt`): validates, inserts into `anmeldungen`, sends confirmation email via Resend, returns Stripe link with `client_reference_id=<anmeldung_id>` + `prefilled_email` appended. **Resend sender must be a verified `@talentexperte.de` address** — `onboarding@resend.dev` only delivers to the account owner and fails silently for parents.
- `supabase/functions/stripe-webhook/index.ts` — marks registrations `bezahlt`. Matches by `client_reference_id` first (exact), falls back to email + amount (can over-match if a family has two open registrations at the same price).
- `supabase/functions/send-reminder/index.ts` — sends batch payment reminder emails via Resend API. Max 50 per batch. Requires `RESEND_API_KEY` Supabase secret. Records send timestamp in `erinnerung_gesendet_am` column.
- Deployed-but-dead: `send-reminders` (plural) is an unused hello-world stub; `google-sheet-sync` runs the Sheets export.

### Payment Flow

1. User registers → Supabase INSERT with `zahlungsstatus = 'offen'`
2. User clicks payment → redirects to Stripe payment link (or pays via PayPal/bank transfer)
3. `zahlungsstatus` updated to `'bezahlt'` via:
   - Stripe webhook (automatic)
   - `stripe-backfill-sync.mjs` (manual Stripe sync)
   - `paypal-backfill-sync.mjs --csv Download.CSV --apply` (manual PayPal sync)
   - Admin dashboard "→ Bezahlt" button (manual per row)

**Important**: The `status` column does **not** exist in `anmeldungen` — only `zahlungsstatus`. Patching `status` causes HTTP 400. PayPal TX-IDs are stored in `stripe_payment_id`.

### CSS Strategy

Modular CSS files per page section (no bundler). Global variables in `:root`. All files are minified for production. Do not add a build step.

### Google Contacts Sync

`code.gs` runs in Google Apps Script (attached to a Google Sheet), syncs registrations to Google Contacts every 5 minutes. Child = contact name, parent = company field. Run `fullResync()` for a full resync.

## Key Operational Notes

- **RLS policies** in Supabase must include the admin email for dashboard DELETE, INSERT, UPDATE to work. If delete fails silently, check RLS.
- **Deployment excludes**: `.git`, `ci/`, `steuerberater/`, `.claude/`, `node_modules/`, `*.bak*`
- **Server**: `medina-82@r20.hostingwerk.de` → `/srv/www/medina-82/public/talentexperte`
- **Email DNS**: Resend DKIM/SPF/DMARC records documented in `dns-eintraege-resend.txt`
- **Troubleshooting**: See `RUNBOOK.md` for common issues (payments not counting, delete not working, reminder failures, offline sync)
- **Offline queue**: `localStorage` key `teilnahme_q` holds pending writes. Flushed on page load and on `window.online`. Safe to inspect/clear in browser console.
- **Session tokens**: `sb_token`, `sb_token_expiry`, `sb_refresh` in localStorage. Token auto-refreshed every 50 min; 401 triggers one refresh+retry before logout.

## Working Rules

- Keep directory structure: `css/`, `images/`, `fonts/`, `pdf/`, `favicon/`
- Do not rename or move files unless explicitly asked
- Prefer minimal, targeted changes — avoid large refactors
- Before multi-file edits: state plan and list affected files
