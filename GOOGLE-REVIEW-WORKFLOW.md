# Google-Bewertungs-Workflow

**Dokumentiert:** 6. April 2026  
**Erstellt für:** TALENTEXPERTE Fußballschule  
**Anwendung:** Automatische Google-Review-Anfragen nach jedem Camp

---

## Übersicht

Automatisierter Workflow zur Anfrage von Google-Bewertungen bei Camp-Teilnehmern. Personalisierte E-Mails werden 1-2 Tage nach Camp-Ende versendet, um die positive Erfahrung zu dokumentieren und für potenzielle Neukunden sichtbar zu machen.

### Kernvorteile
- ✅ Automatische Personalisierung (Familienname + Kindernamen)
- ✅ Einheitliches TALENTEXPERTE-Design
- ✅ Direkter Google-Review-Link
- ✅ Freundlicher, höflicher Ton
- ✅ Wiederverwendbar für alle Camps
- ✅ 96%+ Zustellquote

---

## E-Mail-Template Design

### Aufbau
1. **Header:** Gelbe Markenfarbe (#eab308) mit TALENTEXPERTE Logo
2. **Begrüßung:** "Hallo Familie {{Familienname}}"
3. **Dank:** Dank für Teilnahme von {{Kindname}} am Camp
4. **Bitte:** Freundliche Anfrage für Google-Bewertung
5. **CTA-Button:** "⭐ Jetzt bewerten" mit direktem Link
6. **Abschluss:** Dank und sportliche Grüße
7. **Footer:** Kontaktinformationen und Datenschutzhinweis

### Design-Prinzipien
- **Einheitlich:** Gleiche CI wie andere TALENTEXPERTE-E-Mails
- **Freundlich:** Kein Druck, keine Urgency
- **Kurz:** Bewertung wird NICHT als "dauert nur X Minuten" dargestellt
- **Persönlich:** Immer mit Familien- und Kindernamen
- **Mobile-first:** Responsive Design

### Vermieden
- ❌ "Die Bewertung dauert nur..." (entfernt nach Board-Feedback)
- ❌ Zu viele Bilder (lenken ab)
- ❌ Mehrere CTAs (nur ein klarer Button)
- ❌ Aggressive Farben (freundliches Gelb statt Rot)

---

## Technischer Stack

```
Supabase Database → Edge Function → Resend API → E-Mail-Postfach
```

**Komponenten:**
- **Supabase:** Datenbank mit Camp-Teilnehmern (`anmeldungen`)
- **Edge Function:** `send-google-review-request`
- **Resend:** E-Mail-Versand (DKIM/SPF konfiguriert)
- **Domain:** talentexperte.de

---

## Workflow-Schritt für Schritt

### 1. Camp abgeschlossen

Warten Sie 1-2 Tage nach Camp-Ende für optimale Response-Rate.

### 2. Camp-ID identifizieren

```sql
SELECT id, name, datum_von, datum_bis 
FROM camps 
WHERE status = 'abgeschlossen'
ORDER BY datum_bis DESC;
```

**Beispiel Ostercamp I:**
```
id: 28488a88-e1f9-4822-b85f-a1da16b60b4b
name: Ostercamp I
datum_bis: 2026-04-02
```

### 3. Kampagne ausführen

**Über Supabase Edge Function:**

```bash
curl -X POST \
  'https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/send-google-review-request' \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H 'Content-Type: application/json' \
  -d '{"campId": "28488a88-e1f9-4822-b85f-a1da16b60b4b"}'
```

**ANON_KEY** aus `admin.html` Zeile 182 oder Supabase-Dashboard.

### 4. Ergebnis prüfen

Die Funktion gibt zurück:
```json
{
  "success": true,
  "total": 30,
  "sent": 30,
  "failed": 0,
  "errors": []
}
```

---

## Test-E-Mail versenden

Für Tests vor der Kampagne:

```bash
node scripts/send-google-review-test.mjs
```

Dies versendet eine Test-E-Mail an `aixtraweb@icloud.com` mit:
- Kindname: Leo
- Familienname: Mustermann
- Camp: Ostercamp I

**Anpassen für andere Tests:**
Bearbeiten Sie `scripts/send-google-review-test.mjs` Zeile 113-118:

```javascript
const testData = {
  email: 'ihre-test@email.de',
  familienname: 'Wunschname',
  kindname: 'Max',
  campName: 'Sommercamp I'
}
```

---

## Automatisierung einrichten

### Option A: Manuell nach jedem Camp

1. Camp in Datenbank auf `status = 'abgeschlossen'` setzen
2. 1-2 Tage warten
3. Edge Function mit Camp-ID aufrufen
4. Ergebnis prüfen

### Option B: Automatisch via Cron (Zukünftig)

Supabase Edge Functions unterstützen Cron-Trigger:

```sql
-- Cronjob: Täglich um 10:00 Uhr
-- Sendet Review-Anfragen für Camps, die vor 2 Tagen endeten
SELECT id FROM camps 
WHERE datum_bis = CURRENT_DATE - INTERVAL '2 days'
  AND status = 'abgeschlossen';
```

**Noch nicht implementiert** - auf Wunsch konfigurierbar.

---

## Erwartete Ergebnisse

### Response-Raten
- **E-Mail-Zustellung:** 96%+ (basierend auf Ostercamp-Daten)
- **Review-Quote:** 20-30% der Empfänger (Branchendurchschnitt)
- **Zeitfenster:** Meiste Reviews in 3-7 Tagen nach Versand

### ROI-Kalkulation
- **30 Familien angeschrieben** = 6-9 erwartete Reviews
- **Wert pro 5-Sterne-Review:** €50-100 (Sichtbarkeit, Vertrauen)
- **Jährlicher Wert:** €2.000-3.000 bei 4 Camps/Jahr

---

## E-Mail-Timing

### Optimal
- **1-2 Tage nach Camp-Ende**
- Erfahrung ist noch frisch
- Positive Stimmung hält an
- Wochenende vermeiden (Montag-Donnerstag besser)

### Zu früh
- Noch während Camp = zu aufdringlich
- Direkt am letzten Tag = Familie noch beschäftigt

### Zu spät
- Nach 1 Woche = Erfahrung verblasst
- Nach 2 Wochen = drastisch niedrigere Response-Rate

---

## Technische Details

### Familien-Deduplizierung

```typescript
// Mehrere Kinder pro E-Mail werden gruppiert
const recipientMap = new Map<string, Recipient>()
for (const p of participants) {
  if (!recipientMap.has(p.email)) {
    recipientMap.set(p.email, { 
      email, 
      familienname: p.nachname, 
      kinder: [] 
    })
  }
  recipientMap.get(p.email)!.kinder.push(p.vorname)
}
```

**Beispiel:**
- 2 Kinder: "Max und Lisa"
- 3 Kinder: "Max, Lisa und Tom"

### Rate Limiting

```typescript
await new Promise(resolve => setTimeout(resolve, 2000)) // 2 Sek.
```

- 2 Sekunden zwischen E-Mails
- Bei 30 E-Mails: ~60 Sekunden Gesamtdauer
- Verhindert Cloudflare-Block

### Fehlerbehandlung

Ungültige E-Mail-Adressen werden geloggt:
```json
{
  "errors": ["invalid@email.de: 400 Validation Error"]
}
```

---

## Datenbankfilter

### Nur bezahlte Teilnehmer

```sql
WHERE zahlungsstatus = 'bezahlt'
```

Verhindert Review-Anfragen an:
- Offene Zahlungen (`'offen'`)
- Stornierungen (`'storniert'`)
- Firmenbuchungen (separate Tabelle)

### E-Mail-Validierung

```sql
WHERE email IS NOT NULL
```

Überspringt Teilnehmer ohne E-Mail-Adresse.

---

## Checkliste: Neue Kampagne

### Vorbereitung
- [ ] Camp abgeschlossen und auf `'abgeschlossen'` gesetzt
- [ ] 1-2 Tage seit Camp-Ende vergangen
- [ ] Bezahlte Teilnehmer geprüft (mind. 10-15 für sinnvolle Kampagne)
- [ ] Google-Review-Link funktioniert

### Test
- [ ] Test-E-Mail versendet (`scripts/send-google-review-test.mjs`)
- [ ] E-Mail im Posteingang geprüft
- [ ] Design korrekt (Logo, Farben, Button)
- [ ] Personalisierung funktioniert
- [ ] Google-Link funktioniert
- [ ] Mobile-Ansicht geprüft

### Versand
- [ ] Camp-ID kopiert
- [ ] Edge Function aufgerufen
- [ ] Response geprüft (`sent` vs. `failed`)
- [ ] Bei Fehlern: Errors-Array analysiert

### Follow-up (Optional)
- [ ] Nach 3 Tagen: Neue Reviews zählen
- [ ] Nach 1 Woche: Finale Review-Quote dokumentieren
- [ ] Lessons Learned notieren

---

## Troubleshooting

### Problem: API Key ungültig

**Symptom:** `401 Unauthorized`  
**Lösung:** Resend API Key in Supabase Secrets aktualisieren

```bash
npx supabase secrets set RESEND_API_KEY=re_...
```

### Problem: Keine E-Mails versendet

**Prüfen:**
1. Camp-ID korrekt?
2. Gibt es bezahlte Teilnehmer mit E-Mails?
3. Supabase Edge Function deployed?

```bash
npx supabase functions list
```

### Problem: Hohe Fehlerquote

**Ursachen:**
- Ungültige E-Mail-Adressen in Datenbank
- Resend-Limit erreicht (100/Tag im Free-Tier)
- DKIM/SPF nicht konfiguriert

**Lösung:** Errors-Array prüfen und betroffene E-Mails manuell bereinigen.

### Problem: Google-Link funktioniert nicht

**Aktueller Link:** `https://g.page/r/CRwplaTKzL7VEBM/review`

**Prüfen:**
1. Link im Browser testen
2. Leitet zu Google Business Profil weiter?
3. Falls nicht: Neuen Review-Link in Google Business erstellen

---

## Integration mit anderen Workflows

### Kombination mit Camp-Reminder

**Reihenfolge:**
1. **Vor Camp:** Zahlungs-Erinnerung (`send-reminder`)
2. **Nach Camp:** Google-Review-Anfrage (`send-google-review-request`)
3. **Zwischen Camps:** Wiederholer-Angebot (`send-ostercamp2-campaign`)

### Datenbank-Update

Optional: Tracke Review-Anfragen in Datenbank

```sql
ALTER TABLE camps 
ADD COLUMN review_request_sent_at TIMESTAMP;

UPDATE camps 
SET review_request_sent_at = NOW() 
WHERE id = 'CAMP_ID';
```

**Noch nicht implementiert** - bei Bedarf ergänzen.

---

## Kosten

### Resend
- **Tarif:** Hobby (kostenlos)
- **Limit:** 100 E-Mails/Tag, 3.000/Monat
- **Kosten pro E-Mail:** €0,00

### Supabase
- **Tarif:** Free Tier
- **Edge Functions:** 500.000 Requests/Monat
- **Kosten:** €0,00

**Gesamtkosten pro Kampagne:** €0,00

---

## Sicherheit & Datenschutz

### DKIM/SPF
- ✅ Konfiguriert über Resend
- ✅ DNS-Einträge in `dns-eintraege-resend.txt`

### Datenschutz
- Nur an bezahlte Teilnehmer (implizite Einwilligung)
- Unsubscribe-Hinweis im Footer
- Keine Speicherung von Review-Inhalten
- Logging minimal (nur Erfolg/Fehler)

### API-Keys
- `RESEND_API_KEY` in Supabase Secrets
- Nie in Code committen
- Rotation bei Bedarf

---

## Kontakt & Support

**Dateien:**
- **Edge Function:** `supabase/functions/send-google-review-request/index.ts`
- **Test-Script:** `scripts/send-google-review-test.mjs`
- **Workflow-Doku:** Dieses Dokument

**Logs einsehen:**
```bash
supabase functions logs send-google-review-request
```

**Edge Function neu deployen:**
```bash
npx supabase functions deploy send-google-review-request --no-verify-jwt
```

---

**Erstellt:** 6. April 2026  
**Version:** 1.0  
**Test-E-Mail:** ✅ Erfolgreich versendet an aixtraweb@icloud.com  
**Review-Link:** https://g.page/r/CRwplaTKzL7VEBM/review
