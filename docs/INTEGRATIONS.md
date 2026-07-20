# Integrationen

Stand: 20. Juli 2026
Dokumentationsstatus: teilweise bestätigt; Supabase- und Stripe-Operationszugang am 20. Juli 2026 live geprüft
Geltungsbereich: externe Systeme, Datenflüsse, Authentifizierungsmethoden und Fehlerverhalten

## Verbindliche Konto- und Markentrennung

- **Bestätigt:** TALENTEXPERTE darf in keinem externen Dienst mit AIXTRA-WEB vermischt werden. Einzige Ausnahme ist der korrekte Git-Remote `github.com/aixtraweb/talentexperte.de`.
- Jede andere Integration muss eine eindeutig TALENTEXPERTE zugeordnete Identität verwenden. Das betrifft insbesondere E-Mail, Resend, Gmail, Google, Meta, Supabase, Stripe, Hosting, Cloud-Speicher, Connectoren und API-Projekte.
- AIXTRA-WEB-Konten und -Adressen sind für TALENTEXPERTE weder Produktionsweg noch Testempfänger, Fallback, Zwischenkonto oder zulässige technische Vertretung.
- Vor jedem externen Schreibzugriff müssen Dienst, Konto/Projekt, Ziel und sichtbare Außenidentität geprüft werden. Wenn das aktive Konto AIXTRA-WEB zugeordnet ist, wird nicht geschrieben, gesendet, veröffentlicht, hochgeladen oder deployed. Ausschließlich Fetch/Pull/Push auf dem bestätigten Git-Remote sind zulässig.
- Andere im Repository, in historischen Dokumenten oder in einem Connector vorhandene AIXTRA-WEB-Verweise begründen keine Nutzungserlaubnis.

### E-Mail-Versand-Gate

Vor jeder TALENTEXPERTE-E-Mail sind unmittelbar vor dem Senden zu bestätigen:

1. tatsächliches Versandkonto und From-Adresse;
2. sichtbarer Absendername;
3. Reply-To-Adresse und Signatur;
4. TALENTEXPERTE-konformer Empfänger- und BCC-Umfang;
5. korrekte TALENTEXPERTE-Domain und vorhandene Versandautorisierung;
6. Testdarstellung ohne AIXTRA-WEB-Elemente.

`kontakt@talentexperte.de` im To-Feld ist kein Ersatz für einen korrekten From-Absender. `kontakt@aixtra-web.de` ist als From-Adresse, Alias, Reply-To, Weiterleitung, Signaturbestandteil und technischer Versandweg ausnahmslos unzulässig. Unterstützt ein Werkzeug keine Auswahl oder Prüfung des TALENTEXPERTE-Absenders, ist dieses Werkzeug für den Versand nicht zulässig.

### Bestätigte Git-Ausnahme

- **Remote:** `https://github.com/aixtraweb/talentexperte.de.git`
- **Erlaubt:** Fetch, Pull und Push für dieses TALENTEXPERTE-Repository.
- **Nicht erlaubt:** Ableitung einer AIXTRA-WEB-Freigabe für E-Mail, Connectoren, Hosting, Supabase, Stripe, Resend oder andere Dienste.

## Supabase

- **Zweck:** PostgreSQL-Datenbank, RLS, Auth, Edge Functions, Views und RPCs.
- **Browserzugriff:** nur Projekt-URL und öffentlicher Anon-Key; öffentliche Camp-View und Supabase Auth.
- **Serverzugriff:** Service Role nur in geschützter Function-/Operationsumgebung.
- **Dateien:** `admin.html`, Anmelde-/Bestätigungsseiten, `supabase/functions/`, `supabase/migrations/`, Backfill-/Importskripte.
- **Fehlerverhalten:** öffentliche Formulare geben reduzierte Fehlermeldungen aus; private Tabellen bleiben anonym gesperrt; Outbox/Audit sind privat.
- **Test:** `npm run test:security`, Supabase-Logs und gezielte SQL-/Policyprüfung.
- **Einschränkung:** Live-Schema und Deployzustand müssen vor operativen Aussagen geprüft werden.
- **Bestätigter Operationszugang:** Das Repository ist mit dem produktiven TALENTEXPERTE-Projekt verknüpft; gezielte Live-Abfragen sind über die Supabase CLI möglich. Bei Zahlungsrückfragen diesen Zugang direkt nutzen und den Nutzer nicht erneut nach seiner Verfügbarkeit fragen.

## Stripe

- **Zweck:** individuelle Eltern-Onlinezahlung und Erstattung.
- **Einstieg:** `register` liefert Stripe-Link mit Anmeldungsreferenz; `zahlung-start.html` akzeptiert nur sichere Stripe-Hosts.
- **Webhook:** `supabase/functions/stripe-webhook/index.ts` mit `STRIPE_WEBHOOK_SECRET` und Eventjournal.
- **Admin:** `admin-payment-action` führt Refund durch; `stripe-payment-search` ist geschützte Operationshilfe.
- **Backfill:** `scripts/stripe-backfill-sync.mjs` ist Dry-Run-first für historische Zuordnung.
- **Invarianten:** EUR, exakter Betrag, eindeutige Anmeldung/Payment Intent; keine E-Mail-Heuristik im aktuellen Webhook.
- **Fehlerverhalten:** DB-Status erst nach bestätigter Stripe-Aktion; bei Stripe-Erfolg/DB-Fehler sofort manuell prüfen.
- **Einschränkung:** Stripe und Supabase gemeinsam prüfen; Markdown/CSV beweist keinen Live-Zahlungsstand.
- **Bestätigter Operationszugang:** Das Stripe-Konto wurde am 20.07.2026 als `FUSSBALLSCHULE TALENTEXPERTE` / `talentexperte.de` live verifiziert. Die geschützte Such-Function und die private lokale Operationsumgebung erlauben fokussierte Charge-/Payment-Intent-Prüfungen, ohne Secrets auszugeben.
- **Abweichende Zahlerdaten:** Bei PayPal in Stripe zusätzlich `payment_method_details.paypal` prüfen. PayPal-E-Mail und Zahlername können von Billing- und Anmelde-E-Mail abweichen.
- **Operatives Runbook:** [`PAYMENT-INQUIRY-WORKFLOW.md`](PAYMENT-INQUIRY-WORKFLOW.md) ist für einzelne Elternrückfragen verbindlich.

## PayPal, Bank und Bar

- **Bestätigt:** PayPal ist kein Live-Webhook; Abgleich erfolgt separat über `scripts/paypal-backfill-sync.mjs` mit CSV und Dry Run.
- **Bestätigt:** Bank/Bar können im Admin manuell als bezahlt markiert werden, aber nur nach externer Bestätigung.
- **Risiko:** historische Skripte nutzen Legacy-Felder und heuristisches Matching; Ergebnis vor Apply einzeln prüfen.

## Resend und E-Mail-Outbox

- **Zweck:** Anmeldebestätigungen, Reminder, fehlende Bestätigungen und Review-Anfragen.
- **Authentifizierung:** `RESEND_API_KEY` nur als Supabase-/lokales Secret.
- **Absender/Reply-To:** im Projekt für Transaktionsmails `kontakt@talentexperte.de` belegt.
- **Verbindlicher Versandweg:** TALENTEXPERTE-Mails nur über eine für TALENTEXPERTE bestätigte Resend-Domain oder ein nachweislich als TALENTEXPERTE authentifiziertes Postfach versenden; ein AIXTRA-WEB-Gmail-Konto ist unzulässig.
- **Outbox:** fehlgeschlagene Transaktionsmails in `email_outbox`; `process-email-outbox` beansprucht und verarbeitet atomar.
- **Kampagnenjournal:** `email_campaign_runs` verhindert ungewollte Wiederholung.
- **Test:** Testzustellung, Resultat `sent/failed`, Outbox und Resend-Domain prüfen.
- **Zahlungsfrist:** `process-payment-deadlines` darf nur über einen geheimnisgeschützten geplanten POST-Aufruf gestartet werden. Die Freigabefrist beginnt erst nach erfolgreichem Resend-/Outbox-Versand.
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
- produktive Einrichtung von `PAYMENT_DEADLINE_PROCESSOR_SECRET` und Zeitplan für `process-payment-deadlines`;
- Google Business Profile API-Freigabe;
- Meta-App-/Publishing-Rechte;
- Datenschutz-/Consent-Freigabe für Elfsight, Kartenkacheln und Social-Integrationen;
- Verantwortliche und Rotationsintervalle für Zugangsdaten;
- betriebliche Aufbewahrung/Löschung von Audit-, Outbox- und Sync-Journalen.
