# Integrationen

Stand: 18. Juli 2026
Dokumentationsstatus: teilweise bestätigt; Zugang und Live-Konfiguration nicht geprüft
Geltungsbereich: externe Systeme, Datenflüsse, Authentifizierungsmethoden und Fehlerverhalten

## Supabase

- **Zweck:** PostgreSQL-Datenbank, RLS, Auth, Edge Functions, Views und RPCs.
- **Browserzugriff:** nur Projekt-URL und öffentlicher Anon-Key; öffentliche Camp-View und Supabase Auth.
- **Serverzugriff:** Service Role nur in geschützter Function-/Operationsumgebung.
- **Dateien:** `admin.html`, Anmelde-/Bestätigungsseiten, `supabase/functions/`, `supabase/migrations/`, Backfill-/Importskripte.
- **Fehlerverhalten:** öffentliche Formulare geben reduzierte Fehlermeldungen aus; private Tabellen bleiben anonym gesperrt; Outbox/Audit sind privat.
- **Test:** `npm run test:security`, Supabase-Logs und gezielte SQL-/Policyprüfung.
- **Einschränkung:** Live-Schema und Deployzustand müssen vor operativen Aussagen geprüft werden.

## Stripe

- **Zweck:** individuelle Eltern-Onlinezahlung und Erstattung.
- **Einstieg:** `register` liefert Stripe-Link mit Anmeldungsreferenz; `zahlung-start.html` akzeptiert nur sichere Stripe-Hosts.
- **Webhook:** `supabase/functions/stripe-webhook/index.ts` mit `STRIPE_WEBHOOK_SECRET` und Eventjournal.
- **Admin:** `admin-payment-action` führt Refund durch; `stripe-payment-search` ist geschützte Operationshilfe.
- **Backfill:** `scripts/stripe-backfill-sync.mjs` ist Dry-Run-first für historische Zuordnung.
- **Invarianten:** EUR, exakter Betrag, eindeutige Anmeldung/Payment Intent; keine E-Mail-Heuristik im aktuellen Webhook.
- **Fehlerverhalten:** DB-Status erst nach bestätigter Stripe-Aktion; bei Stripe-Erfolg/DB-Fehler sofort manuell prüfen.
- **Einschränkung:** Stripe und Supabase gemeinsam prüfen; Markdown/CSV beweist keinen Live-Zahlungsstand.

## PayPal, Bank und Bar

- **Bestätigt:** PayPal ist kein Live-Webhook; Abgleich erfolgt separat über `scripts/paypal-backfill-sync.mjs` mit CSV und Dry Run.
- **Bestätigt:** Bank/Bar können im Admin manuell als bezahlt markiert werden, aber nur nach externer Bestätigung.
- **Risiko:** historische Skripte nutzen Legacy-Felder und heuristisches Matching; Ergebnis vor Apply einzeln prüfen.

## Resend und E-Mail-Outbox

- **Zweck:** Anmeldebestätigungen, Reminder, fehlende Bestätigungen und Review-Anfragen.
- **Authentifizierung:** `RESEND_API_KEY` nur als Supabase-/lokales Secret.
- **Absender/Reply-To:** im Projekt für Transaktionsmails `kontakt@talentexperte.de` belegt.
- **Outbox:** fehlgeschlagene Transaktionsmails in `email_outbox`; `process-email-outbox` beansprucht und verarbeitet atomar.
- **Kampagnenjournal:** `email_campaign_runs` verhindert ungewollte Wiederholung.
- **Test:** Testzustellung, Resultat `sent/failed`, Outbox und Resend-Domain prüfen.
- **Veraltet:** anonyme Einmalkampagne aus `CAMP-EMAIL-WORKFLOW.md`; Endpoint `send-ostercamp2-campaign` ist dauerhaft 410.

## Google Sheets und Kontakte

- **Datenfluss:** Supabase → `google-sheet-sync` → Google Sheet → `code.gs` → Google Kontakte.
- **Zweck:** nachgelagerte Kontaktpflege/Kommunikation, nicht Zahlungscontrolling.
- **Authentifizierung:** Service Account für Sheet-API; Apps Script/People API für Kontakte.
- **Kontaktschema:** Kind als Kontaktname, Elternteil als Organisation; Notizen/Label laut Handbuch.
- **Sicherheit:** `google-sheet-sync` akzeptiert nur Service Role/automatischen Weg oder freigeschalteten Dashboard-Admin und journalisiert Läufe.
- **Einschränkung:** Sheet/Kontakte können veraltet sein und ersetzen weder Supabase noch Stripe.

## Google Business Profile

- **Zweck:** Social-/Local-Post-Publishing über `scripts/social-publish.mjs`.
- **Konfiguration:** `.env.social` mit OAuth-/Account-/Location-Parametern; Werte nie dokumentieren.
- **Status:** historische Setup-Datei nennt einen im Mai 2026 beantragten API-Zugang. Aktueller Zugriff ist **offen**.
- **Regel:** Dry Run, öffentlich erreichbares freigegebenes Bild, danach explizite Publish-Freigabe.

## Meta: Facebook und Instagram

- **Zweck:** Veröffentlichung organischer Bilder/Posts.
- **Dateien:** `scripts/social-auth.mjs`, `scripts/social-publish.mjs`, Social-Guard/Planungsskripte.
- **Konfiguration:** `.env.social`, Professional Account, Page-Verknüpfung und Publishing-Rechte.
- **Fehlerverhalten:** API-Antwort prüfen, Published-Log aktualisieren, keine Wiederholung ohne Idempotenzprüfung.
- **Status:** Live-Rechte und App-Review sind **offen**.

## Website-Drittanbieter

| Dienst | Zweck | Quellen/Risiko |
|---|---|---|
| Leaflet + Carto Tiles | Karte/Standort | lazy geladen; externe Ressourcen/Datenschutz prüfen |
| Elfsight | Instagram-Feed | lazy geladen; Consent/Verfügbarkeit/CLS prüfen |
| jsPDF | PDF-Erzeugung im Browser | CDN mit Integrity auf Bestätigungsseite; Offline-/CSP-Fallback prüfen |
| Supabase JS CDN | Firmenformular | feste Versionsreferenz `2.49.1`; Update nur getestet |
| WhatsApp | Kontakt-CTA | externer Link, keine Formulardaten automatisch mitsenden |

## Integrationsänderung – Pflichtprüfung

1. Zweck und System of Record bestimmen.
2. Datenarten und personenbezogene Felder minimieren.
3. Authentifizierungsmethode ohne Geheimwert dokumentieren.
4. CORS/CSP/RLS/Rate Limit/Idempotenz prüfen.
5. Fehler-, Timeout-, Retry- und Doppelausführung testen.
6. Staging/Testmodus oder Dry Run verwenden.
7. externe Zustandsänderung ausdrücklich freigeben.
8. [`ARCHITECTURE.md`](ARCHITECTURE.md), [`DATA-MODEL.md`](DATA-MODEL.md), `CHANGELOG.md` und offene Punkte aktualisieren.

## Offene Punkte

- aktueller Live-Deploystand einzelner Edge Functions und Migrationen;
- Google Business Profile API-Freigabe;
- Meta-App-/Publishing-Rechte;
- Datenschutz-/Consent-Freigabe für Elfsight, Kartenkacheln und Social-Integrationen;
- Verantwortliche und Rotationsintervalle für Zugangsdaten;
- betriebliche Aufbewahrung/Löschung von Audit-, Outbox- und Sync-Journalen.
