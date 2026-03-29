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
```

No linting or test framework is configured.

## Architecture

### Pages & Their Roles

| File | Purpose |
|------|---------|
| `anmeldung.html` | Parent registration (paid); inserts to `anmeldungen`; generates PDF; links to Stripe |
| `firmen-anmeldung.html` | Employee/company registration (free); inserts to `firmen_anmeldungen` |
| `bestaetigung.html` | Post-payment confirmation; generates PDF with booking number; `?id=<uuid>` fallback if localStorage empty |
| `bestaetigung-firma.html` | Employee confirmation + PDF download |
| `admin.html` | Full dashboard: camp stats, registration table, bulk actions (mark paid, cancel, send reminders, delete); Anwesenheit-Tab with daily checkboxes + performance metrics |
| `impressum.html`, `datenschutz.html`, `agb.html` | Legal pages |

### Supabase Data Model

- **`anmeldungen`** — private/parent registrations with `zahlungsstatus` enum (`offen`, `bezahlt`, `storniert`, `erstattet`)
- **`firmen_anmeldungen`** — employee/company registrations (non-paying)
- **`camps`** — event metadata: dates, prices, Stripe payment link
- **`teilnahme`** — attendance + performance data per child per camp; `referenz_id` (uuid from either table) + `quelle` (`anmeldungen`|`firmen_anmeldungen`) + `anwesenheit` (jsonb, `{"2026-03-30": true}`) + `sprint`, `torschuss`, `dribbling` (numeric); unique on `(referenz_id, camp_id)`; upsert via `Prefer: resolution=merge-duplicates`
- **Views**: `alle_anmeldungen`, `alle_anmeldungen_dashboard` for aggregation

Dashboard revenue/paid counts are based **only on `anmeldungen`**, not `firmen_anmeldungen`. Employee entries appear as `FIRMA` status and are excluded from payment tracking.

### Edge Function (Deno)

`supabase/functions/send-reminder/index.ts` — sends batch payment reminder emails via Resend API. Max 50 per batch. Requires `RESEND_API_KEY` Supabase secret. Records send timestamp in `erinnerung_gesendet_am` column.

### Payment Flow

1. User registers → Supabase INSERT with `zahlungsstatus = 'offen'`
2. User clicks payment → redirects to Stripe payment link
3. `zahlungsstatus` updated to `'bezahlt'` via webhook or manual `stripe-backfill-sync.mjs`

### CSS Strategy

Modular CSS files per page section (no bundler). Global variables in `:root`. All files are minified for production. Do not add a build step.

### Google Contacts Sync

`code.gs` runs in Google Apps Script (attached to a Google Sheet), syncs registrations to Google Contacts every 5 minutes. Child = contact name, parent = company field. Run `fullResync()` for a full resync.

## Key Operational Notes

- **RLS policies** in Supabase must include the admin email for dashboard DELETE, INSERT, UPDATE to work. If delete fails silently, check RLS.
- **Deployment excludes**: `.git`, `ci/`, `steuerberater/`, `.claude/`, `node_modules/`, `*.bak*`
- **Server**: `medina-82@r20.hostingwerk.de` → `/srv/www/medina-82/public/talentexperte`
- **Email DNS**: Resend DKIM/SPF/DMARC records documented in `dns-eintraege-resend.txt`
- **Troubleshooting**: See `RUNBOOK.md` for common issues (payments not counting, delete not working, reminder failures)

## Working Rules

- Keep directory structure: `css/`, `images/`, `fonts/`, `pdf/`, `favicon/`
- Do not rename or move files unless explicitly asked
- Prefer minimal, targeted changes — avoid large refactors
- Before multi-file edits: state plan and list affected files
