# RUNBOOK - Talentexperte Betrieb

## Zweck
Schnelle Notfall-Anleitung für häufige Live-Probleme (Anmeldung, Zahlung, Dashboard, Löschen).

## 1) Anmeldung funktioniert nicht
### Symptom
- Formular sendet nicht
- Fehlermeldung bei Supabase-Insert

### Check
1. Browser-Konsole öffnen und erste Fehlermeldung notieren.
2. In Supabase prüfen, ob Tabelle und Feldnamen zum Code passen:
```sql
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='firmen_anmeldungen'
order by ordinal_position;
```
3. RLS-Policy für `INSERT` prüfen.

### Fix
- Feldnamen im Frontend auf reale Spalten mappen.
- Bei Firmenanmeldung keine Felder senden, die in `firmen_anmeldungen` nicht existieren.

## 2) Dashboard zeigt Bezahlt/Umsatz falsch
### Symptom
- `Bezahlt = 0` oder `Umsatz = 0 €`, obwohl Zahlungen eingegangen sind.

### Check (Privat-Anmeldungen)
```sql
select
  count(*) as total,
  count(*) filter (where zahlungsstatus = 'bezahlt') as status_bezahlt,
  count(*) filter (where stripe_payment_id is not null or zahlung_am is not null) as payment_signal
from public.anmeldungen;
```

### Fix (nur falls `payment_signal > status_bezahlt`)
```sql
update public.anmeldungen
set
  zahlungsstatus = 'bezahlt',
  zahlung_am = coalesce(zahlung_am, now())
where
  (stripe_payment_id is not null or zahlung_am is not null)
  and zahlungsstatus is distinct from 'bezahlt';
```

### Backfill aus Stripe (falls `payment_signal = status_bezahlt`, aber weitere Zahlungen in Stripe existieren)
```bash
node scripts/stripe-backfill-sync.mjs --from 2023-08-01
```

Prueft vergangene Stripe-Zahlungen gegen `public.anmeldungen` per `email + betrag_euro`.

Echte Updates erst nach Dry Run:
```bash
MY_SUPABASE_URL=... MY_SUPABASE_SERVICE_ROLE_KEY=... node scripts/stripe-backfill-sync.mjs --from 2023-08-01 --apply
```

## 3) Mitarbeiter-Anmeldungen erscheinen als offen
### Regel
- Mitarbeiter/Firma sind **nicht zahlungspflichtig**.
- Diese Einträge dürfen nicht als offene Eltern-Forderung zählen.

### Check
```sql
select id, status, bezahlt_am, betrag_euro
from public.firmen_anmeldungen
order by created_at desc
limit 50;
```

### Hinweis
- Im Dashboard werden Firmeneinträge als `FIRMA` gekennzeichnet.

## 4) Löschen im Dashboard klappt nicht
### Symptom
- Meldung „gelöscht“, Eintrag bleibt sichtbar.

### Stripe / Supabase / Dashboard
- Detaillierter Status und Aufgabenliste: `STRIPE-SUPABASE-STATUS.md`

### Check
1. Nach Löschen Seite neu laden.
2. RLS-Delete-Policies prüfen:
```sql
select schemaname, tablename, policyname, cmd, roles, qual
from pg_policies
where schemaname='public'
  and tablename in ('anmeldungen','firmen_anmeldungen')
  and cmd='DELETE';
```

### Fix
- Admin-E-Mail in DELETE-Policy aufnehmen.
- Danach erneut im Dashboard löschen.

## 5) Zahlungserinnerung funktioniert nicht
### Symptom
- Bulk-Reminder-Button zeigt Fehlermeldung oder öffnet mailto-Fallback

### Check
1. Resend-Domain verifiziert? → Resend-Dashboard prüfen
2. Edge Function deployed? → `supabase functions list`
3. API-Key gesetzt? → `supabase secrets list`
4. DB-Spalte vorhanden? → `SELECT column_name FROM information_schema.columns WHERE table_name='anmeldungen' AND column_name='erinnerung_gesendet_am';`

### Fix
```bash
supabase secrets set RESEND_API_KEY=<key>
supabase functions deploy send-reminder --no-verify-jwt
```
```sql
ALTER TABLE anmeldungen ADD COLUMN IF NOT EXISTS erinnerung_gesendet_am timestamptz;
```

## 6) PayPal-Zahlungen manuell nachbuchen (CSV-Backfill)
### Symptom
- Eltern schicken PayPal-Zahlungsnachweis, Admin zeigt noch „OFFEN"
- E-Mail in PayPal weicht von Registrierungs-E-Mail ab

### Vorgehen
1. PayPal-Export als CSV herunterladen (PayPal → Aktivitäten → Transaktionen exportieren)
2. Dry-Run ausführen — zeigt welche Anmeldungen gefunden werden:
```bash
cd talenexperte.de
node scripts/paypal-backfill-sync.mjs --csv /pfad/zur/Download.CSV
```
3. Treffer prüfen: Matching per E-Mail (primär) + Nachname (Fallback)
4. Bei Abweichungen (z.B. `sunriseonly@` vs `xinyuonly@`) direkten PATCH ausführen:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://yxygwwoocsdnneqykiym.supabase.co/rest/v1/anmeldungen?id=eq.<UUID>" \
  -X PATCH \
  -H "apikey: <SERVICE_KEY>" \
  -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"zahlungsstatus":"bezahlt","zahlung_am":"<ISO-DATUM>","stripe_payment_id":"<PAYPAL-TX-ID>"}'
```
5. Apply ausführen wenn Treffer stimmen:
```bash
node scripts/paypal-backfill-sync.mjs --csv /pfad/zur/Download.CSV --apply
```

### Hinweise
- `status`-Spalte existiert in `anmeldungen` **nicht** → nur `zahlungsstatus` patchen (HTTP 400 sonst)
- PayPal-TX-IDs werden im Feld `stripe_payment_id` gespeichert
- Absender-E-Mail im CSV-Export ≠ Empfänger-E-Mail in Supabase ist häufig (verschiedene PayPal-Konten vs. Anmelde-E-Mail)

## 7) Schnelltest nach Deployment
1. Hard Reload im Browser (`Cmd+Shift+R`).
2. Admin öffnen und prüfen:
   - `Anmeldungen`
   - `Bezahlt`
   - `Offen`
   - `Umsatz`
3. Tab `Anmeldungen`:
   - Standardsortierung: Vorname A→Z ✓
   - Camp im Filter auswählen → Camp-Spalte verschwindet, Anwesenheits-Checkboxen erscheinen ✓
   - Anwesenheit-Checkbox klicken → speichert sofort (kein Fehler-Toast) ✓
   - Filter zurücksetzen → Camp-Spalte erscheint wieder ✓
   - Filter `Mitarbeiter` testen
   - Statusfilter `Offen` testen
   - Checkbox-Auswahl + Bulk-Leiste testen
   - Testeintrag löschen

## 7) Wichtige Dateien
- `admin.html` - Dashboard-Logik, Status, Filter, Bulk-Aktionen, Löschen
- `css/admin.css` - Dashboard-Styling
- `anmeldung.html` - Eltern-Anmeldung
- `firmen-anmeldung.html` - Firmen/Mitarbeiter-Anmeldung
- `bestaetigung.html` - normale Bestätigung
- `bestaetigung-firma.html` - Firmenbestätigung + PDF
- `supabase/functions/send-reminder/index.ts` - Zahlungserinnerung per Resend
- `scripts/stripe-backfill-sync.mjs` - Stripe-Backfill-Script
- `dns-eintraege-resend.txt` - DNS-Einträge für E-Mail-Domain
- `README.md` - Projektstatus und Betriebsinfos
- `CHANGELOG.md` - letzte Änderungen
- `STRIPE-SUPABASE-STATUS.md` - Stripe/Supabase Status-Tracking

## 8) Deployment und Git
```bash
./ci/deploy.sh
git add .
git commit -m "Kurzbeschreibung"
git push
```
