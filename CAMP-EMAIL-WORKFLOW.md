# E-Mail-Kampagnen Workflow für Camps

**Dokumentiert:** 5. April 2026  
**Erstellt für:** TALENTEXPERTE Fußballschule  
**Anwendung:** Wiederholer-Angebote für alle zukünftigen Camps

---

## Übersicht

Dieser Workflow ermöglicht automatisierte, personalisierte E-Mail-Kampagnen an Camp-Teilnehmer für Folge-Camps. Erfolgreich eingesetzt für **Ostercamp I → Ostercamp II** mit **96,8% Erfolgsquote** (30 von 31 E-Mails).

### Kernvorteile
- ✅ Automatische Personalisierung mit Kindernamen
- ✅ Direkte Datenbankabfrage (keine manuellen Listen)
- ✅ Umgeht Cloudflare Rate-Limiting
- ✅ Wiederverwendbar für alle Camps
- ✅ Professionelles HTML-Design

---

## Technischer Stack

```
Supabase Database → Edge Function → Resend API → E-Mail-Postfach
```

**Komponenten:**
- **Supabase:** Datenbank mit Camp-Anmeldungen
- **Edge Function:** Deno/TypeScript-Funktion auf Supabase-Servern
- **Resend:** E-Mail-Versand-API (inkl. DKIM/SPF)
- **Domain:** talentexperte.de

---

## Schritt-für-Schritt: Neue Kampagne erstellen

### 1. Camp-IDs identifizieren

```sql
-- Alle Camps anzeigen
SELECT id, name, datum_von, datum_bis, status 
FROM camps 
ORDER BY datum_von;
```

**Beispiel:**
- Ostercamp I: `28488a88-e1f9-4822-b85f-a1da16b60b4b`
- Ostercamp II: `9ef06fcf-16e9-4db9-94c6-9dba1a4a36ff`

### 2. Edge Function anpassen

**Datei:** `supabase/functions/send-ostercamp2-campaign/index.ts`

**Wichtige Anpassungen:**
1. **Camp-ID aktualisieren:** (Zeile ~10)
   ```typescript
   const SOURCE_CAMP_ID = '28488a88-e1f9-4822-b85f-a1da16b60b4b' // Vorheriges Camp
   const TARGET_CAMP_NAME = 'Ostercamp II'
   const TARGET_CAMP_DATES = '7.-10. April 2026 (Dienstag bis Freitag)'
   ```

2. **Preis anpassen:**
   ```typescript
   const REGULAR_PRICE = 149 // Normalpreis
   const REPEAT_PRICE = 129  // Wiederholer-Preis
   ```

3. **WhatsApp-Nummer aktualisieren:** (falls geändert)
   ```typescript
   const WHATSAPP_NUMBER = '4915234678108'
   ```

4. **E-Mail-Betreff:**
   ```typescript
   subject: '⚽ [CAMP_NAME] - Exklusiv [REPEAT_PRICE]€ für [SOURCE_CAMP] Teilnehmer'
   ```

### 3. HTML-Template anpassen

**Anpassbare Elemente im `createHTML()`:
- Camp-Name und Daten
- Preise (Normal vs. Wiederholer)
- Ersparnis-Betrag
- Saisonale Grüße (z.B. "Frohe Ostern" → "Schöne Sommerferien")
- WhatsApp-Nummer
- Zahlungsart (Bar/Online)

**Beispiel Sommer-Anpassung:**
```typescript
// Ostern → Sommer
'Frohe Ostern! 🐰' → 'Schöne Sommerferien! ☀️'
'Ostercamp II' → 'Sommercamp II'
```

### 4. Edge Function deployen

```bash
# Im Projekt-Root
npx supabase functions deploy send-[CAMP]-campaign --no-verify-jwt

# Beispiel:
# npx supabase functions deploy send-sommercamp2-campaign --no-verify-jwt
```

**Wichtig:** `--no-verify-jwt` Flag ist notwendig für anonyme Aufrufe!

### 5. Kampagne ausführen

```bash
curl -X POST \
  'https://yxygwwoocsdnneqykiym.supabase.co/functions/v1/send-[CAMP]-campaign' \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H 'Content-Type: application/json'
```

**ANON_KEY** aus `admin.html` Zeile 182 (oder `.env`)

---

## E-Mail-Template Best Practices

### Design-Prinzipien
1. **Mobile-First:** Alle Designs responsive
2. **Klare CTAs:** WhatsApp-Button prominent
3. **Personalisierung:** Immer mit Kindernamen
4. **Urgency:** Startdatum betonen
5. **CI-Farben:** #333 (schwarz), #c00 (rot als Akzent)

### Pflicht-Elemente
- [ ] Saisonale Grüße (Ostern/Sommer/Herbst)
- [ ] "EXKLUSIV für [Vorheriges Camp] Teilnehmer"
- [ ] Wiederholer-Preis hervorheben
- [ ] Camp-Details (Datum, Zeit, Ort)
- [ ] WhatsApp-Registrierung (NUR-Hinweis)
- [ ] Barzahlung vor Ort
- [ ] Personalisierung mit Kindernamen
- [ ] Urgency-Element (Startdatum)

### Vermeiden
- ❌ Zu viel Rot (zu aggressiv)
- ❌ Online-Payment-Links (Bar bevorzugt)
- ❌ Generische Ansprache
- ❌ Komplizierte Registrierung

---

## Technische Details

### Rate Limiting
```typescript
await new Promise(resolve => setTimeout(resolve, 2000)) // 2 Sek.
```
- 2 Sekunden zwischen E-Mails verhindert Cloudflare-Block
- Bei 30 E-Mails: ~60 Sekunden Gesamtdauer

### Fehlerbehandlung
```typescript
if (!response.ok) {
  // HTTP-Fehler loggen
  return { success: false, error: `HTTP ${response.status}` }
}
```

### E-Mail-Gruppierung
```typescript
// Gruppiere nach E-Mail, sammle alle Kinder
const recipientMap = new Map<string, Recipient>()
for (const p of participants) {
  if (!recipientMap.has(p.email)) {
    recipientMap.set(p.email, { email, kinder: [], nachname })
  }
  recipientMap.get(p.email)!.kinder.push(p.vorname)
}
```

**Wichtig:** Mehrere Kinder pro Familie werden automatisch zu "Kind1 und Kind2" kombiniert.

---

## Checkliste: Neue Kampagne

### Vorbereitung
- [ ] Vorheriges Camp abgeschlossen
- [ ] Neues Camp in Datenbank angelegt
- [ ] Camp-IDs notiert (Source + Target)
- [ ] Preis festgelegt (Normal + Wiederholer)
- [ ] WhatsApp-Nummer aktiv

### Edge Function
- [ ] Neue Function-Datei kopiert (von Template)
- [ ] Camp-IDs aktualisiert
- [ ] Preise angepasst
- [ ] Datum/Wochentage korrekt
- [ ] Saisonale Grüße angepasst
- [ ] WhatsApp-Nummer aktualisiert
- [ ] HTML-Template geprüft

### Deployment & Test
- [ ] Edge Function deployed
- [ ] Test-E-Mail an aixtraweb@icloud.com
- [ ] Design im Posteingang geprüft
- [ ] Personalisierung funktioniert
- [ ] Links funktionieren (WhatsApp)
- [ ] Mobile-Ansicht OK

### Versand
- [ ] Freigabe eingeholt
- [ ] Kampagne ausgeführt
- [ ] Ergebnis geprüft (Sent/Failed)
- [ ] Fehlgeschlagene E-Mails per WhatsApp nachgefasst

---

## Anwendungsfälle

### 1. Ostercamp I → II ✅ (Erprobt)
- **Teilnehmer:** 38 (Ostercamp I)
- **Versendet:** 30 von 31 (96,8%)
- **Wiederholer-Preis:** 129€ statt 149€
- **Dauer:** 68 Sekunden

### 2. Sommercamp I → II (Geplant)
**Anpassungen:**
- Saisongrüße: "Schöne Sommerferien! ☀️"
- Camp-Name: Sommercamp I/II
- Datum: Juli/August
- Sonst identisch

### 3. Herbstcamp I → II (Geplant)
**Anpassungen:**
- Saisongrüße: "Schöne Herbstferien! 🍂"
- Camp-Name: Herbstcamp I/II
- Datum: Oktober
- Sonst identisch

---

## Troubleshooting

### Problem: Cloudflare-Block (HTTP 403)
**Ursache:** Zu viele Requests von lokaler Maschine  
**Lösung:** Edge Function nutzen (läuft auf Supabase-Servern)

### Problem: Ungültige E-Mail-Adresse
**Beispiel:** `mesuttum _20@outlook.de` (Leerzeichen)  
**Lösung:** 
1. Edge Function loggt Fehler
2. Manuell per WhatsApp nachfassen
3. E-Mail in Datenbank korrigieren

### Problem: JSON-Escaping-Fehler
**Ursache:** HTML mit Quotes in Shell-Scripts  
**Lösung:** TypeScript Edge Function statt Shell (automatisches Escaping)

### Problem: Keine Personalisierung
**Prüfen:**
1. `SELECT vorname FROM anmeldungen WHERE camp_id = '...'`
2. Kinder-Array wird korrekt befüllt
3. `kinderText` Variable in HTML verwendet

---

## Datenbankstruktur

### Relevante Tabellen

**camps:**
```sql
id UUID PRIMARY KEY
name TEXT
datum_von DATE
datum_bis DATE
status TEXT ('aktiv', 'ausgebucht', 'abgeschlossen')
preis_euro NUMERIC
```

**anmeldungen:**
```sql
id UUID PRIMARY KEY
camp_id UUID REFERENCES camps(id)
vorname TEXT          -- Kind
nachname TEXT         -- Kind
eltern_vorname TEXT
eltern_nachname TEXT
email TEXT
telefon TEXT
zahlungsstatus TEXT
```

### Wichtige Views

**alle_anmeldungen_dashboard:**  
Kombiniert `anmeldungen` + `firmen_anmeldungen`

---

## Performance-Optimierungen

### Batch-Größe
- **Aktuell:** Alle E-Mails in einem Request
- **Bei >100 E-Mails:** In 50er-Batches aufteilen

### Caching
- Camp-Daten werden einmal geladen
- Recipient-Map reduziert Queries

### Rate Limiting
- 2 Sekunden: Sicher für <50 E-Mails
- 1 Sekunde: Möglich für <30 E-Mails
- 0,5 Sekunden: Riskant (Cloudflare!)

---

## Kosten

### Resend
- **Tarif:** Hobby (kostenlos)
- **Limit:** 100 E-Mails/Tag, 3000/Monat
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
- Keine Speicherung von E-Mail-Inhalten
- Nur temporäres Processing in Edge Function
- Logging minimal (Erfolg/Fehler)

### API-Keys
- `RESEND_API_KEY` in Supabase Secrets
- Nie in Code committen
- Rotation bei Bedarf

---

## Kontakt & Support

**Bei Fragen:**
- **Dokumentation:** Diese Datei
- **Edge Function:** `supabase/functions/send-ostercamp2-campaign/index.ts`
- **Erfolgs-Beispiel:** AIX-64 (Ostercamp I→II, 5. April 2026)

**Logs einsehen:**
```bash
supabase functions logs send-[CAMP]-campaign
```

**Weitere Edge Functions:**
```bash
ls supabase/functions/
```

---

**Erstellt:** 5. April 2026  
**Version:** 1.0  
**Erfolgsquote:** 96,8% (30/31 E-Mails)  
**Letzte Kampagne:** Ostercamp II, 30 Familien erreicht
