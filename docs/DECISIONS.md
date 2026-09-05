# Architektur- und Projektentscheidungen

Stand: 23. August 2026
Dokumentationsstatus: bestätigt aus Code, Migrationen und bestehenden Handbüchern
Geltungsbereich: dauerhafte Entscheidungen; keine tagesaktuellen Betriebsstände

## 2026-08-23 – Operative Camp-Aufgaben persistent und admin-geschützt führen

### Status
akzeptiert

### Ausgangslage
Kurzfristige Klärungen zu Barzahlungen, Erstattungen und Partnerabrechnungen waren im Zahlungscontrolling erkennbar, besaßen aber keine gemeinsame, direkt im Admin-Dashboard pflegbare Aufgabenansicht.

### Entscheidung
Das Admin-Dashboard erhält eine persistente Aufgabenliste mit Priorität, Fälligkeit, offen/erledigt und optionaler Verknüpfung zu einer Anmeldung. Die Daten liegen in `admin_todos`, sind anonym vollständig gesperrt und verwenden dieselbe `is_dashboard_admin()`-Allowlist wie die privaten Anmeldedaten. Jede Änderung wird im bestehenden Sicherheitsjournal protokolliert.

### Begründung
Campkritische Punkte bleiben geräteübergreifend sichtbar, können direkt zum Teilnehmerdatensatz führen und werden nicht mit Zahlungsstatus, Teilnehmernotizen oder einem öffentlichen Repository-Backlog vermischt.

### Auswirkungen
Admins können Aufgaben anlegen, bearbeiten, abhaken, wieder öffnen und löschen. Personenbezogene konkrete Aufgaben werden nur als private Live-Daten angelegt; Migration und Git enthalten keine Teilnehmernamen oder tagesaktuellen Zahlungsdetails.

### Betroffene Dateien oder Komponenten
`admin.html`, `css/admin.css`, `admin_todos`, `security_audit_log`, `scripts/security-smoke-test.mjs`

### Alternativen
Statische Aufgaben im HTML, Teilnehmernotizen oder das historische `todo.md`; verworfen, weil sie nicht geräteübergreifend pflegbar, fachlich vermischt oder nicht als aktueller Betriebsstand geeignet sind.

### Ersetzt durch
—

## 2026-07-20 – Zahlungsrückfragen unmittelbar über die bestätigten Live-Zugänge prüfen

### Status
akzeptiert

### Ausgangslage
Bei einzelnen Elternrückfragen wurden vorhandene Zugänge zu Supabase, Admin-Dashboard und Stripe nicht immer vollständig genutzt. Abweichende E-Mail-Adressen zwischen Anmeldung, Stripe Billing und PayPal-Zahler verhinderten dadurch eindeutige automatische Zuordnungen.

### Entscheidung
Jede konkrete Zahlungsrückfrage startet ohne erneute Zugangsklärung mit einem Live-Abgleich in Supabase und Stripe; das Dashboard dient als operative Ansicht. Gesucht wird stufenweise über Anmeldungs-ID, alle bekannten E-Mail-Adressen, Namen, Betrag und ein enges Zeitfenster. Bei PayPal in Stripe werden zusätzlich die PayPal-Zahlerdaten geprüft. Eine Zahlung wird nur bei eindeutiger Zuordnung verbucht.

### Begründung
Der kombinierte Abgleich verhindert unbegründete Erinnerungen, übersieht Zahlungen mit abweichenden Zahlerdaten nicht und schützt vor falschen oder doppelten Zuordnungen.

### Auswirkungen
Einzelzahlungen erhalten den eindeutigen Payment Intent. Gemeinsame Zahlungen über mehrere Kinder werden exakt aufgeteilt und dokumentiert, aber nicht mehrfach als einzeln erstattbare Payment-ID gespeichert. Namen aus der ursprünglichen Anmeldung bleiben maßgeblich; telefonisch verstandene Schreibweisen überschreiben sie nicht ohne Bestätigung. Nach jeder Korrektur werden Reminder-, Outbox- und Stornierungskandidaten erneut geprüft.

### Betroffene Dateien oder Komponenten
`docs/PAYMENT-INQUIRY-WORKFLOW.md`, `PROJEKT-HANDBUCH.md`, `docs/INTEGRATIONS.md`, `anmeldungen`, `email_outbox`, `stripe-payment-search`, Stripe Charges/Payment Intents, `admin.html`

### Alternativen
Nur nach exakter Anmelde-E-Mail suchen oder den Nutzer bei jeder Rückfrage erneut nach Zugängen fragen; verworfen, weil dies bestätigte Zahlungen mit abweichenden Zahlerdaten übersieht und unnötige Rückfragen erzeugt.

### Ersetzt durch
—

## 2026-07-19 – Offene Elternzahlung nach klarer Letztfrist automatisch freigeben

### Status
akzeptiert und seit 20.07.2026 produktiv aktiv

### Ausgangslage
Offene Anmeldungen blockierten Campplätze auch dann weiter, wenn Eltern trotz Erinnerung nicht zahlten. Gleichzeitig war nicht von Anfang an eindeutig kommuniziert, wann die Reservierung endet.

### Entscheidung
Elternanmeldungen, die ab dem expliziten produktiven Aktivierungszeitpunkt neu eingehen, erhalten eine 72-Stunden-Zahlungsfrist. Bleibt die Zahlung offen, folgt genau eine Letzterinnerung mit einer konkreten Nachfrist von mindestens 24 Stunden. Erst nach erfolgreich protokolliertem Versand, erneutem Stripe-Abgleich und Ablauf dieser Frist wird die Anmeldung automatisch storniert und der Platz freigegeben. Alle vor dem Aktivierungszeitpunkt vorhandenen Anmeldungen sowie Sponsor/Firma und laufende oder vergangene Camps sind ausgeschlossen.

### Begründung
Die Regel verbindet Verbindlichkeit für Eltern mit fairer Vorankündigung, schützt knappe Campkapazität und vermeidet eine rein sprachliche Drohung ohne technische Konsequenz.

### Auswirkungen
Anmeldung, Bestätigung, Zahlungsstart, Reminder, Outbox, Dashboard, Datenmodell und zwei geheimnisgeschützte Supabase-Zeitpläne verwenden dieselben Fristen. Eine separate Policy-Tabelle hält den prospektiven Aktivierungszeitpunkt; der Prozessor filtert sowohl in der Datenbankabfrage als auch nochmals im Code auf diesen Zeitpunkt und stoppt bei fehlender Policy. Bestehende Anmeldungs-, Zahlungs-, Camp- und Kapazitätswerte werden nicht nachträglich verändert. Die Job-IDs und ihr Sollstatus liegen privat; anonyme und normale authentifizierte Rollen können die Zeitpläne weder lesen noch schalten.

### Betroffene Dateien oder Komponenten
`anmeldung.html`, `bestaetigung.html`, `zahlung-start.html`, `admin.html`, `register`, `send-reminder`, `process-email-outbox`, `process-payment-deadlines`, `anmeldungen`, `email_outbox`, `payment_deadline_policy`, `pg_cron`, `pg_net`, Supabase Vault

### Alternativen
Unbefristete Reservierung oder sofortige Stornierung nach 72 Stunden; verworfen, weil entweder Kapazität blockiert bleibt oder die ausdrücklich angekündigte faire Letztfrist fehlt.

### Ersetzt durch
—

## 2026-07-20 – TALENTEXPERTE trennen; bestehenden Git-Remote ausnehmen

### Status
akzeptiert

### Ausgangslage
Eine TALENTEXPERTE-Elternmail wurde über ein als AIXTRA-WEB erkennbares Gmail-Konto versendet. Obwohl Inhalt und Empfänger TALENTEXPERTE betrafen, zeigte die zugestellte Nachricht die falsche Marken- und Kontoidentität.

### Entscheidung
TALENTEXPERTE und AIXTRA-WEB werden auf Marken-, Konto-, E-Mail-, Connector-, Publishing-, Zahlungs-, Hosting- und sonstiger Integrationsebene getrennt. Einzige bestätigte Ausnahme ist der bestehende Git-Remote `github.com/aixtraweb/talentexperte.de`; Fetch, Pull und Push dorthin sind korrekt. Diese Ausnahme darf niemals auf Kommunikation oder andere Dienste übertragen werden. `kontakt@aixtra-web.de` ist für TALENTEXPERTE als Absender, Alias, Reply-To, Weiterleitung oder Versandweg verboten.

### Begründung
Ein fachfremder Absender oder Account beschädigt die Markenwirkung, kann Eltern verunsichern und verwischt Verantwortlichkeit, Datenschutzkontext und operative Zuständigkeit.

### Auswirkungen
Vor jedem Versand oder externen Schreibzugriff ist ein Konten- und Identitätscheck Pflicht. Allgemeine Aktionsfreigaben ersetzen diesen Check nicht. Andere AIXTRA-WEB-Verweise werden inventarisiert und kontrolliert bereinigt; der bestätigte Git-Remote bleibt bestehen.

### Betroffene Dateien oder Komponenten
`AGENTS.md`, `PROJEKT-HANDBUCH.md`, `docs/PROJECT.md`, `docs/INTEGRATIONS.md`, E-Mail-/Social-/Google-/Payment-/Hosting-Verbindungen, Git-Remote und operative Connectoren

### Alternativen
AIXTRA-WEB als technischen Fallback mit TALENTEXPERTE-Inhalt oder To-Adresse verwenden; verworfen, weil die tatsächliche Außenidentität dadurch nicht korrigiert wird.

### Ersetzt durch
—

## 2026-07-18 – Fachliche Dokumentation unter `docs/`, Betriebshandbuch bleibt zentral

### Status
akzeptiert

### Ausgangslage
Ein umfangreiches `PROJEKT-HANDBUCH.md` und zahlreiche Spezial-/Historikdateien bestanden bereits, aber keine fachlich gegliederte Entwicklungsdokumentation.

### Entscheidung
Das Betriebshandbuch bleibt zentraler Einstieg. Projekt-, Architektur-, Daten-, Design-, Content-, SEO/GEO-, Integrations-, Entwicklungs-, Deployment- und QA-Regeln liegen ergänzend unter `docs/`. Historische Dateien werden bewertet, nicht gelöscht.

### Begründung
So bleiben gültige Informationen erhalten, während Zuständigkeit, Status und Widersprüche auffindbar werden.

### Auswirkungen
`AGENTS.md`, `README.md`, `PROJEKT-HANDBUCH.md` und `CHANGELOG.md` verweisen auf die Fachstruktur.

### Betroffene Dateien oder Komponenten
`docs/`, Root-Dokumentation

### Alternativen
Ein einziges noch größeres Handbuch; verworfen wegen Pflege- und Konfliktrisiko.

### Ersetzt durch
—

## 2026-07-13 – Website-Deployment als Positivliste

### Status
akzeptiert

### Ausgangslage
Interne Repository-, Supabase- und Finanzdateien waren zuvor potenziell beziehungsweise tatsächlich im öffentlichen Webroot.

### Entscheidung
`ci/deploy.sh` veröffentlicht ausschließlich erlaubte Artefakte, löscht ausgeschlossene Remote-Artefakte und prüft interne Kernpfade.

### Begründung
Der Webroot ist eine Sicherheitsgrenze.

### Auswirkungen
Neue öffentliche Dateien müssen bewusst in die Allowlist; Git-Push ist kein Deployment.

### Betroffene Dateien oder Komponenten
`ci/deploy.sh`, `.htaccess`, `ci/nginx-security-headers.conf`

### Alternativen
breites rsync mit Ausschlussliste; wegen Fehlerrisiko verworfen.

### Ersetzt durch
—

## 2026-07-13 – Sicherheitskritische Aktionen serverseitig und journalisiert

### Status
akzeptiert

### Ausgangslage
Anmeldung, Review-Versand, Zahlung, Refund, Bestätigung und Adminänderungen benötigen Schutz gegen anonyme/mehrfache/uneindeutige Aktionen.

### Entscheidung
Formtoken/Nonce/Rate Limit, Admin-Allowlist, Bestätigungstokens, Stripe-Signatur/Idempotenz, Auditjournal und E-Mail-Outbox sind verbindlich.

### Begründung
Clientzustand und allgemeine JWT-Prüfung allein genügen nicht.

### Auswirkungen
Functions und Migrationen müssen gemeinsam getestet/deployed werden; negative Tests sind Pflicht.

### Betroffene Dateien oder Komponenten
`supabase/functions/`, Migrationen `20260713090000` ff., `scripts/security-smoke-test.mjs`

### Alternativen
direkte Browserzugriffe oder unjournalisierte Adminaktionen; verworfen.

### Ersetzt durch
—

## 2026-07-10 – Elternzahlung, Sponsoring und Firma fachlich trennen

### Status
akzeptiert

### Ausgangslage
Legacy-Typmarker und `zahlungsstatus='bezahlt'` vermischten Finanzierungsarten.

### Entscheidung
Kanonische `payer_type`-/Eltern-/Sponsorstatusfelder verwenden; Firma bleibt eigene kanonische Tabelle. Sponsor und Firma erhalten keine Elternzahlungsaufforderung.

### Begründung
Umsatz, offene Forderungen, Bestätigungen und Sponsorabrechnung brauchen getrennte Bedeutung.

### Auswirkungen
Dashboard, Reminder, Stripe, Migrationen und PDFs müssen die Invarianten erhalten.

### Betroffene Dateien oder Komponenten
`anmeldungen`, `firmen_anmeldungen`, Sponsoringtabellen, `register`, `send-reminder`, `admin.html`

### Alternativen
Legacy-`zahlungsstatus`/Notizmarker allein; verworfen.

### Ersetzt durch
—

## 2026-04-11 – Stornieren statt Löschen

### Status
akzeptiert

### Ausgangslage
Gelöschte Anmeldungen hinterließen verwaiste Teilnahmedaten und zerstörten Nachvollziehbarkeit.

### Entscheidung
Stornieren ist der Standard; Löschen nur für echte Fehleinträge und doppelt bestätigt.

### Begründung
Historie, Anwesenheitsbezug und Audit bleiben erhalten.

### Auswirkungen
Dashboardtexte, Runbooks und Supportablauf müssen Storno bevorzugen.

### Betroffene Dateien oder Komponenten
`admin.html`, `teilnahme`, `dashboard_delete_registration`, `RUNBOOK.md`

### Alternativen
FK-Kaskade/pauschales Löschen; nicht als Standard gewählt.

### Ersetzt durch
—

## 2026-03-31 – Anwesenheitswrites offline-first und gerätegebunden

### Status
akzeptiert

### Ausgangslage
iPad-Eingaben gingen bei Netz-/Sessionproblemen verloren.

### Entscheidung
Jeder Write wird zuerst in `localStorage.teilnahme_q` gespeichert, dann synchronisiert; Session wird erneuert und Queue angezeigt.

### Begründung
Campbetrieb benötigt fehlertolerante Eingabe.

### Auswirkungen
Queue ist pro Browser/Gerät, kein serverweites Syncsystem; reale iPad-Tests sind nötig.

### Betroffene Dateien oder Komponenten
`admin.html`, `teilnahme`

### Alternativen
nur Online-Upsert; verworfen.

### Ersetzt durch
—

## 2026-09-05 – Social-Automation vorläufig pausieren

Status: akzeptiert, ausdrücklicher Nutzerauftrag.

Instagram-/Facebook-Posts für Sommercamp und TALENTEXPERTE bleiben bis zur
erneuten Nutzeranweisung eingestellt. Auch kombinierte Blog-/Social-Zeitpläne
sind gestoppt. Bestehende Inhalte und Zugangsdaten bleiben erhalten.
[Nachweis und Wiederaufnahmegrenze](SOCIAL-PAUSE-2026-09-05.md).
