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

## 5) Schnelltest nach Deployment
1. Hard Reload im Browser (`Cmd+Shift+R`).
2. Admin öffnen und prüfen:
   - `Anmeldungen`
   - `Bezahlt`
   - `Offen`
   - `Umsatz`
3. Tab `Anmeldungen`:
   - Filter `Mitarbeiter` testen
   - Statusfilter `Offen` testen
   - Testeintrag löschen

## 6) Wichtige Dateien
- `admin.html` - Dashboard-Logik, Status, Filter, Löschen
- `anmeldung.html` - Eltern-Anmeldung
- `firmen-anmeldung.html` - Firmen/Mitarbeiter-Anmeldung
- `bestaetigung.html` - normale Bestätigung
- `bestaetigung-firma.html` - Firmenbestätigung + PDF
- `README.md` - Projektstatus und Betriebsinfos
- `CHANGELOG.md` - letzte Änderungen

## 7) Deployment und Git
```bash
./ci/deploy.sh
git add .
git commit -m "Runbook update"
git push
```
