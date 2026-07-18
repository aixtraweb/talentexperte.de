# QA-Checkliste

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt als verbindlicher Prüfrahmen; konkrete Browsermatrix ist offen
Geltungsbereich: Website, Formulare, Admin, Integrationen, SEO/GEO und Deployment

Nur relevante Blöcke abhaken; nicht ausgeführte Prüfungen im Abschluss ausdrücklich nennen.

## Allgemein

- [ ] Aufgabe, betroffene Dateien, Datenflüsse und externe Zustandsänderungen sind klar.
- [ ] Fremde Worktree-Änderungen wurden geschützt.
- [ ] Keine Platzhalter, erfundenen Inhalte, aktuellen Betriebszahlen oder unbelegten Aussagen.
- [ ] Keine Secrets, Tokens, Sponsorcodes, PII, privaten Exporte oder internen Logs im Diff.
- [ ] Browserkonsole ohne neue Fehler/Warnungen; Network-Fehler erklärt.
- [ ] lokale Links, Downloads, Bilder, Redirects und Fehlerseiten geprüft.
- [ ] bestehende Nutzerpfade und nicht beauftragte Funktionen bleiben erhalten.

## Design und Responsiveness

- [ ] bestehende Tokens, Schriften, Komponenten und Abstände wiederverwendet.
- [ ] keine parallele CI oder ungeprüfte globale Styleänderung.
- [ ] Desktop, Tablet und Mobil ohne horizontales Scrollen außerhalb bewusster Tabellen.
- [ ] Navigation, Hero, Karten, Formular, Overlays, Footer und CTA bei 320–480px nutzbar.
- [ ] Hover, Fokus, aktiv, deaktiviert, laden, leer, Fehler und Erfolg sichtbar.
- [ ] `prefers-reduced-motion` respektiert; keine Pflichtinfo nur animiert.
- [ ] Bilder haben geeignete Maße, Zuschnitt, Format, Lazy Loading und Alt-Text.

## Accessibility

- [ ] genau eine sinnvolle H1; H2/H3 folgen semantisch.
- [ ] Formfelder haben sichtbare Labels und verständliche Fehlerzuordnung.
- [ ] Navigation, Akkordeons, Dialoge, Overlays und Aktionen vollständig per Tastatur.
- [ ] Fokus ist sichtbar, sinnvoll geführt und nach Dialogschluss zurückgegeben.
- [ ] Escape/Schließen funktioniert; Hintergrund ist bei Modal nicht bedienbar.
- [ ] Status/Fehler/Erfolg nicht nur durch Farbe oder Emoji vermittelt.
- [ ] Farbkontrast und Touchziele entsprechen bei neuen Änderungen mindestens WCAG-2.2-AA-Ziel.
- [ ] Screenreadertexte/ARIA-Zustände ändern sich synchron mit dem UI.

## Inhalt

- [ ] Rechtschreibung, Zeichensetzung, Marken-/Partnernamen und Anrede konsistent.
- [ ] Campname, Datum, Dauer, Zeit, Alter, Preis, Status und enthaltene Leistung belegt.
- [ ] CTA beschreibt die tatsächliche nächste Handlung.
- [ ] rechtliche, medizinische, sicherheits- und zahlungsbezogene Aussagen fachlich geprüft.
- [ ] Bewertungen/Zitate/Zahlen besitzen eine belegte aktuelle Quelle.
- [ ] Sponsor- und Firmenfall enthalten keine Elternzahlungsaufforderung.

## SEO und GEO

- [ ] eindeutiger Title, Description und selbstreferenzieller Canonical, sofern indexierbar.
- [ ] robots/noindex und Sitemap passen zur Seitenfunktion.
- [ ] interne Links und Breadcrumbs entsprechen der Nutzerhierarchie.
- [ ] sichtbare Antworten sind direkt, belegbar, lokal eindeutig und zitierfähig.
- [ ] Alt-Texte sind bildspezifisch; keine Keywordketten.
- [ ] JSON-LD parsebar und inhaltlich mit Website/Supabase synchron.
- [ ] Eventstatus, Offer-Preis/-Verfügbarkeit und FAQ-Markup geprüft.
- [ ] `robots.txt`, `sitemap.xml` und `llms.txt` bei Bedarf aktualisiert.

## Eltern-/Sponsoranmeldung

- [ ] Tokenabruf, Nonce, Honeypots, Mindest-/Maximalzeit und Rate Limits funktionieren.
- [ ] Pflichtfelder, Datumsmaske, E-Mail, Telefon, AGB und Fehlermeldungen geprüft.
- [ ] verfügbare, knappe, ausgebuchte, abgelaufene und abgeschlossene Camps korrekt.
- [ ] Camp/Kapazität/Duplikat serverseitig erneut geprüft.
- [ ] gültiger Sponsorcode: Elternanteil 0, kein Stripe, richtige Bestätigung/PDF.
- [ ] ungültiger/falscher/verbrauchter Sponsorcode: keine Anmeldung, kein stiller Zahlfallback.
- [ ] Elternfall: offene Zahlung, eindeutiger Stripe-Link, passende Bestätigung.
- [ ] Doppelklick/Replay/Netzwerkabbruch erzeugen keine Doppelbuchung.
- [ ] Resend-Fehler landet in Outbox; UI behauptet keinen falschen Versand.

## Firmenanmeldung

- [ ] direkte anonyme Tabellen-Inserts bleiben gesperrt.
- [ ] Token/Spam-Schutz und serverseitige Campprüfung funktionieren.
- [ ] kanonische Firmenanmeldung wird nicht als Elternumsatz gezählt.
- [ ] Bestätigungslink funktioniert nur mit passendem Token.
- [ ] Firmen-PDF/FAQ enthält keine Elternzahlung.

## Bestätigung und Payment

- [ ] fehlender, falscher, abgelaufener und veränderter Token zeigt keine persönlichen Daten.
- [ ] offen, bezahlt, gesponsert, storniert und erstattet separat dargestellt.
- [ ] Pre-Payment- und finale PDFs zeigen korrekten Status.
- [ ] `zahlung-start.html` akzeptiert nur erlaubte HTTPS-Stripe-Hosts.
- [ ] Stripe-Testevent: gültige Signatur, EUR, Betrag, UUID und Payment Intent.
- [ ] Replay/idempotentes Event verändert keine zweite Anmeldung.
- [ ] terminaler Status wird nicht durch späteres Payment-Event überschrieben.
- [ ] Refund: Stripe zuerst, DB danach, Audit vorhanden.

## Admin-Dashboard

- [ ] Login, 30-Minuten-Inaktivität und Admin-Allowlist.
- [ ] Camps, Eltern, Sponsor und Firma getrennt geladen/normalisiert.
- [ ] KPIs/Umsatz nur aus kanonischen Elternzahlungen.
- [ ] Filter, Suche, Sortierung, Spaltentoggles und Campfilter korrekt.
- [ ] Bearbeiten/Status/Storno/Refund/Löschen mit Berechtigung, Bestätigung und Audit.
- [ ] Bulk-Reminder serverseitig erneut auf echte offene Elternzahlungen gefiltert.
- [ ] CSV-Export enthält nur beabsichtigte Spalten und wird geschützt behandelt.
- [ ] Anwesenheit/Metriken online, offline, nach Login und bei Sessionrefresh.
- [ ] Queueindikator und gerätegebundene Einschränkung verständlich.

## Sicherheit und Datenschutz

- [ ] `npm run test:security` bestanden, falls relevant.
- [ ] private Tabellen anonym 401/403; öffentliche Campview 200.
- [ ] geschützte Functions anonym 401; Stripe ohne Signatur 400.
- [ ] CSP deckt benötigte Quellen ab und öffnet keine unnötigen Origins.
- [ ] interne Dateien/Markdown/Skripte/Supabase/Backups nicht im Webroot.
- [ ] Audit-/Outbox-/Webhook-/Sync-Journale bleiben privat.
- [ ] keine personenbezogenen Daten in URL-Query, Logs, Git oder Dokumentation.

## Performance

- [ ] LCP-Asset/Poster priorisiert; Hero-Video blockiert nicht unnötig.
- [ ] neue Bilder in AVIF/WebP plus Fallback und passenden Abmessungen.
- [ ] keine unnötige neue Bibliothek oder render-blocking Drittquelle.
- [ ] dynamische Bereiche reservieren Platz; kein relevanter CLS.
- [ ] Drittanbieter lazy/bei Bedarf geladen.
- [ ] große Medien/PSDs nicht ungeprüft in Deployment-Allowlist.
- [ ] bei relevanter Änderung Lighthouse/CWV auf Mobil und Desktop neu messen.

## Deployment und Abschluss

- [ ] Website-/Supabase-/E-Mail-/Social-Aktionen getrennt autorisiert.
- [ ] Deployment-Allowlist/Dry-Run und Remoteziel geprüft.
- [ ] Backup erstellt und Rollbackpfad bekannt.
- [ ] Smoke-URLs und interne 403/404-Pfade nach Deployment geprüft.
- [ ] betroffene Fachdoku, `docs/DECISIONS.md`, `CHANGELOG.md`, `docs/OPEN-QUESTIONS.md` geprüft.
- [ ] nur aufgabenbezogene Dateien selektiv gestaged; Staging-Diff geprüft.
- [ ] Commit und Upstream-Push erfolgreich oder konkrete Ausnahme dokumentiert.

## Offene Browsermatrix

> **Offen:** Es ist keine verbindliche Browser-/Geräteliste dokumentiert.
> **Vorläufige Empfehlung:** aktuelle Safari/iOS, Chrome/Android, Chrome/Desktop und Firefox/Desktop; Admin zusätzlich reales iPad.
> **Risiko:** geräteabhängige Formular-, Datepicker-, localStorage- oder Tabellenprobleme.
> **Erforderliche Klärung:** unterstützte Mindestversionen und reale Testgeräte festlegen.
