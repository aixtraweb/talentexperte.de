# Architektur- und Projektentscheidungen

Stand: 20. Juli 2026
Dokumentationsstatus: bestätigt aus Code, Migrationen und bestehenden Handbüchern
Geltungsbereich: dauerhafte Entscheidungen; keine tagesaktuellen Betriebsstände

## 2026-07-19 – Offene Elternzahlung nach klarer Letztfrist automatisch freigeben

### Status
akzeptiert und seit 20.07.2026 produktiv aktiv

### Ausgangslage
Offene Anmeldungen blockierten Campplätze auch dann weiter, wenn Eltern trotz Erinnerung nicht zahlten. Gleichzeitig war nicht von Anfang an eindeutig kommuniziert, wann die Reservierung endet.

### Entscheidung
Neue Elternanmeldungen erhalten eine 72-Stunden-Zahlungsfrist. Bleibt die Zahlung offen, folgt genau eine Letzterinnerung mit einer konkreten Nachfrist von mindestens 24 Stunden. Erst nach erfolgreich protokolliertem Versand, erneutem Stripe-Abgleich und Ablauf dieser Frist wird die Anmeldung automatisch storniert und der Platz freigegeben. Sponsor/Firma sowie laufende oder vergangene Camps sind ausgeschlossen.

### Begründung
Die Regel verbindet Verbindlichkeit für Eltern mit fairer Vorankündigung, schützt knappe Campkapazität und vermeidet eine rein sprachliche Drohung ohne technische Konsequenz.

### Auswirkungen
Anmeldung, Bestätigung, Zahlungsstart, Reminder, Outbox, Dashboard, Datenmodell und zwei geheimnisgeschützte Supabase-Zeitpläne verwenden dieselben Fristen. Bestehende offene Anmeldungen erhalten vor jeder automatischen Freigabe zuerst die neue eindeutige Letztfrist. Die Job-IDs und ihr Sollstatus liegen privat; anonyme und normale authentifizierte Rollen können die Zeitpläne weder lesen noch schalten.

### Betroffene Dateien oder Komponenten
`anmeldung.html`, `bestaetigung.html`, `zahlung-start.html`, `admin.html`, `register`, `send-reminder`, `process-email-outbox`, `process-payment-deadlines`, `anmeldungen`, `email_outbox`, `pg_cron`, `pg_net`, Supabase Vault

### Alternativen
Unbefristete Reservierung oder sofortige Stornierung nach 72 Stunden; verworfen, weil entweder Kapazität blockiert bleibt oder die ausdrücklich angekündigte faire Letztfrist fehlt.

### Ersetzt durch
—

## 2026-07-19 – TALENTEXPERTE vollständig von AIXTRA-WEB trennen

### Status
akzeptiert

### Ausgangslage
Eine TALENTEXPERTE-Elternmail wurde über ein als AIXTRA-WEB erkennbares Gmail-Konto versendet. Obwohl Inhalt und Empfänger TALENTEXPERTE betrafen, zeigte die zugestellte Nachricht die falsche Marken- und Kontoidentität.

### Entscheidung
TALENTEXPERTE und AIXTRA-WEB werden ausnahmslos auf Marken-, Konto-, E-Mail-, Connector-, Speicher-, Publishing-, Zahlungs-, Hosting- und sonstiger Integrationsebene getrennt. Bei einer AIXTRA-WEB-Identität wird jede externe TALENTEXPERTE-Aktion gestoppt, bis ein bestätigter TALENTEXPERTE-Zugang verfügbar ist.

### Begründung
Ein fachfremder Absender oder Account beschädigt die Markenwirkung, kann Eltern verunsichern und verwischt Verantwortlichkeit, Datenschutzkontext und operative Zuständigkeit.

### Auswirkungen
Vor jedem Versand oder externen Schreibzugriff ist ein Konten- und Identitätscheck Pflicht. Allgemeine Aktionsfreigaben ersetzen diesen Check nicht. Bestehende AIXTRA-WEB-Verweise werden inventarisiert und kontrolliert bereinigt.

### Betroffene Dateien oder Komponenten
`AGENTS.md`, `PROJEKT-HANDBUCH.md`, `docs/PROJECT.md`, `docs/INTEGRATIONS.md`, E-Mail-/Social-/Google-/Payment-/Hosting-/GitHub-Verbindungen und operative Connectoren

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
