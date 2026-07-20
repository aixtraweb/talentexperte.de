# Dokumentationsinventar

Stand: 20. Juli 2026
Dokumentationsstatus: bestätigt durch vollständige Prüfung aller vorhandenen Markdown-Dateien
Geltungsbereich: Dokumentenstatus, Quellenrang, Widersprüche und Pflegeempfehlungen

## Bewertungsmaßstab

- **Weiterhin gültig:** stimmt im Kern mit aktuellem Code/Handbuch überein.
- **Teilweise gültig:** enthält nützliche Informationen und zugleich veraltete/ungeklärte Aussagen.
- **Historisch:** belegt einen früheren Stand, ist keine aktuelle Betriebsanweisung.
- **Entwurf/Plan:** Inhalte sind nicht automatisch veröffentlicht oder umgesetzt.
- **Aktion:** behalten, aktualisieren, zusammenführen, archivieren oder löschen. Es wurde nichts gelöscht.

## Zentrale und operative Dokumente

| Datei | Bewertung | Empfehlung/Begründung |
|---|---|---|
| `AGENTS.md` | weiterhin gültig, lokal vorbestehend geändert | **Aktualisiert und behalten.** Importierte Claude-Cowork-Ziele wurden bewahrt; verbindliche Arbeits-/Abschlussregeln ergänzt. |
| `PROJEKT-HANDBUCH.md` | weiterhin gültig, zentrale Quelle | **Aktualisiert und behalten.** Stand, Dokumentationsstatus und Fachindex ergänzt; Betriebszahlen weiterhin live prüfen. |
| `README.md` | weiterhin gültig | **Aktualisiert und behalten.** Als kurzer Einstieg und Dokumentennavigation. |
| `CHANGELOG.md` | weiterhin gültig, chronologische Hauptquelle | **Aktualisiert und behalten.** Neue Dokumentationsinventur eingetragen. Bleibt kanonischer Changelog im Root; kein redundantes `docs/CHANGELOG.md`. |
| `docs/PAYMENT-INQUIRY-WORKFLOW.md` | weiterhin gültig, operativ verbindlich | **Neu angelegt und behalten.** Definiert den Live-Abgleich einzelner Elternrückfragen über Supabase, Dashboard und Stripe einschließlich abweichender Zahlerdaten und gemeinsamer Zahlungen. |
| `RUNBOOK.md` | teilweise gültig | **Behalten, später gezielt aktualisieren.** Nützliche Diagnose und Vorrangverweis auf das aktuelle Zahlungsrückfragen-Runbook; ältere Payment-Heuristik, direktes Service-Key-curl, `--no-verify-jwt` beim Reminder und `git add .` widersprechen weiterhin aktuellen Regeln/Sicherheitsstand. Vor Anwendung mit Handbuch/Fachdocs abgleichen. |
| `SECURITY-IMPLEMENTATION.md` | weiterhin gültig | **Behalten.** Aktuellste Sicherheits-/Rolloutquelle; Hosting-Header bleiben offen. |
| `SPAM-SCHUTZ-DOKUMENTATION.md` | teilweise gültig | **Behalten und bei nächster Formularänderung aktualisieren.** Grundlogik stimmt; Abschnitt zum nur prozesslokalen Rate Limit ist durch persistente DB-Limits teilweise veraltet. |
| `SPONSORING-RUNBOOK.md` | teilweise gültig, operativ sensibel | **Behalten.** Sichere Reihenfolge und Invarianten sind wertvoll; Deploy-/Import-/Konfliktstände vom Juli müssen live verifiziert werden. Enthält keine Codes in neue Doku übernehmen. |

## Status-, Audit- und SEO-Dokumente

| Datei | Bewertung | Empfehlung/Begründung |
|---|---|---|
| `CHATVERLAUF-KOMPAKT.md` | weiterhin gültige historische Zusammenfassung | **Behalten.** Schneller Kontext; Branch/Commit- und Statusangaben sind zeitgebunden, nicht aktuelle Wahrheit. |
| `STRIPE-SUPABASE-STATUS.md` | historisch/teilweise veraltet | **Behalten, klar historisch behandeln.** März-Reparaturbericht; aktueller Webhook nutzt exakte ID/Betrag/Währung und nicht die dort beschriebene E-Mail-Heuristik. Resend-/Deploy-Offenstände sind überholt oder ungeklärt. |
| `FULL-AUDIT-REPORT.md` | historisches SEO-Audit | **Behalten/bei Gelegenheit nach `docs/archive/` verschieben, aber nicht ungefragt.** Scores und Befunde vom April; zahlreiche Punkte sind umgesetzt (Title/Meta, `llms.txt`, Person-Nodes, Breadcrumb, statische Reviews). |
| `ACTION-PLAN.md` | historischer Maßnahmenplan | **Behalten/archivierungswürdig.** Nicht als offenes Backlog verwenden; enthält veraltete Termine, Preise, Bewertungszahlen und bereits erledigte Maßnahmen. |
| `SEO-UMSETZUNGSBASIS.md` | teilweise gültiges Playbook | **Behalten.** Technische Muster sind nützlich; Sitemap-Aussage zu Firmen-Anmeldung und historische Lighthouse-Werte nicht als aktuellen Stand verwenden. |
| `SEARCH-CONSOLE-REINDEX-CHECKLIST.md` | historische Relaunch-Checkliste | **Behalten/archivierungswürdig.** URL-Liste und Messwerte von Februar; Firmen-Anmeldung ist aktuell noindex und nicht in Sitemap. |
| `seo.md` | veraltetes Audit | **Archivierungswürdig.** Meldet fehlendes Schema/OG/robots/sitemap, die aktuell vorhanden sind. Nicht aktualisieren, sondern als Ausgangsmessung kennzeichnen. |
| `todo.md` | historischer Admin-Backlog | **Behalten/archivierungswürdig.** Letzter Stand März; offene Punkte wurden nicht live verifiziert. Nicht als verbindliches Backlog verwenden. |

## E-Mail-, Social- und Automationsdokumente

| Datei | Bewertung | Empfehlung/Begründung |
|---|---|---|
| `CAMP-EMAIL-WORKFLOW.md` | historisch und operativ veraltet | **Behalten, nicht ausführen.** Empfiehlt anonymen Einmalversand über eine Function, die heute dauerhaft 410 ist; Preis-/Barzahlungs-/Datenschutzannahmen nicht übernehmen. Neue Kampagne braucht aktuellen Empfängerfilter, Adminschutz, Datenschutzprüfung, Test und Versandfreigabe. |
| `GOOGLE-REVIEW-WORKFLOW.md` | teilweise gültig, sicherheitsrelevant veraltet | **Behalten, vor Nutzung aktualisieren.** Aktuelle Function ist admin- und einmaligkeitsgeschützt; dokumentierter anonymer curl/Anon-Key-Weg ist unzulässig. ROI/Response-Prognosen sind unbelegt und keine Projektfakten. |
| `BLOG-SOCIAL-AUTOMATION.md` | weiterhin gültig | **Behalten.** Vorschau als Standard und Freigabegrenzen sind konsistent. Live-Flags bleiben externe Zustandsänderung. |
| `SOCIAL-PUBLISHING-SETUP.md` | teilweise gültig | **Behalten.** Setup und Skripte stimmen im Grundsatz; API-Status, Quoten/Fallnummern und Berechtigungsnamen sind zeitgebunden und live zu prüfen. |
| `SOCIAL-CONTENT-PLAN.md` | Entwurf/Leitlinie | **Behalten.** Marken-/Formatregeln nutzbar; Campfokus/Materialzahlen zeitgebunden. Gold ist nur als Social-Akzent belegt, nicht als Website-Token. |
| `SOCIAL-WEEK-2026-05-04.md` | historischer Wochenplan | **Archivierungswürdig.** Vergangene Termine und Entwürfe; keine aktuelle Veröffentlichungsvorgabe. |

## Tool-spezifisches Dokument

| Datei | Bewertung | Empfehlung/Begründung |
|---|---|---|
| `CLAUDE.md` | teilweise gültig | **Behalten, mittelfristig auf `AGENTS.md`/`docs/` reduzieren.** Architekturüberblick nützlich; Stripe-Matching, alte Typmarker, CSS-Minifizierungsbehauptung und Function-Status sind teilweise veraltet. Keine automatische Löschung, da Tooling es verwenden kann. |

## Neu angelegte Fachstruktur

| Datei | Zweck |
|---|---|
| `docs/PROJECT.md` | Projektprofil, Ziele, Quellenrang und Grenzen |
| `docs/ARCHITECTURE.md` | System-/Datenflüsse und kritische Schnittstellen |
| `docs/DATA-MODEL.md` | Datenobjekte und Finanz-/Sicherheitsinvarianten |
| `docs/DESIGN-SYSTEM.md` | CI, Tokens, Typografie, Layout, Medien, Accessibility |
| `docs/COMPONENTS.md` | Bestandskomponenten und Zustände |
| `docs/CONTENT-GUIDE.md` | Sprache, Strukturen und nicht zu erfindende Inhalte |
| `docs/SEO-GEO.md` | Suchintention, lokale Entität, Citability und Risiken |
| `docs/STRUCTURED-DATA.md` | aktuelles JSON-LD und Pflegeprozess |
| `docs/DEVELOPMENT.md` | lokale Arbeit, Konventionen und Tests |
| `docs/INTEGRATIONS.md` | Supabase, Stripe, Resend, Google, Meta und Drittanbieter |
| `docs/PAYMENT-INQUIRY-WORKFLOW.md` | verbindlicher Ablauf für einzelne Zahlungsrückfragen und sichere Statuskorrekturen |
| `docs/DEPLOYMENT.md` | getrennte Releases, Allowlist und Rollback |
| `docs/QA-CHECKLIST.md` | abhakbare Gesamtprüfung inkl. Accessibility/Performance/Testing |
| `docs/DECISIONS.md` | dauerhafte Entscheidungen |
| `docs/OPEN-QUESTIONS.md` | priorisierte ungeklärte Punkte |
| `docs/DOCUMENTATION-INVENTORY.md` | dieses Inventar |

## Bewusst nicht angelegte Standarddateien

- **Kein `SHOP-GUIDE.md`, `PRODUCT-PAGE-GUIDE.md`, `CATEGORY-PAGE-GUIDE.md`:** kein klassischer Shop/Warenkorb/Katalog; Camps sind Events mit Registrierungs- und Zahlungsübergang.
- **Kein separates `ACCESSIBILITY.md`, `PERFORMANCE.md`, `TESTING.md`:** verbindliche Regeln stehen ohne Duplikation in Designsystem, SEO/GEO, Entwicklung und QA.
- **Kein separates `SECURITY.md`:** `SECURITY-IMPLEMENTATION.md`, `SPAM-SCHUTZ-DOKUMENTATION.md`, Architektur, Integrationen und QA decken den bestätigten Stand ab.
- **Kein `docs/CHANGELOG.md`:** `CHANGELOG.md` im Root bleibt die vorhandene kanonische Historie.
- **Kein `MIGRATION-NOTES.md`:** Migrationen, `CHANGELOG.md`, `DECISIONS.md` und Sicherheitsdokumentation sind ausreichend; vollständige Baseline bleibt als offene Frage sichtbar.

## Wesentliche Widersprüche

1. **Payment-Matching:** ältere Dokumente nennen E-Mail+Betrag; aktueller Webhook verlangt eindeutige ID, Betrag, Währung und Payment Intent.
2. **E-Mail-Kampagnen:** ältere Workflows beschreiben anonym aufrufbare Functions; aktuelle Sicherheitsarchitektur verlangt Adminprüfung/Einmaligkeitsjournal, die alte Ostercamp-Function ist 410.
3. **SEO:** Audits melden fehlende Schema-/OG-/llms-/Review-Inhalte; aktueller Code enthält sie teilweise oder vollständig.
4. **Campdaten:** historische 2026-Termine/Preise weichen untereinander ab; Supabase und aktueller sichtbarer Code sind vor Aktionen zu prüfen.
5. **Adressen:** Impressum, Datenschutz, Personen- und Campadresse sind nicht einheitlich; Rollen/Orte dürfen nicht still zusammengeführt werden.
6. **CI-Farbe:** Social-Plan nennt Gold, produktive Website-Tokens nicht.
7. **Deployment:** Root-Dokumente beschreiben breite Ausschlüsse, aktuelles Skript ist eine Positivliste; `images/` bleibt dennoch zu breit.
8. **Git:** `RUNBOOK.md` empfiehlt `git add .`; verbindlich ist selektives Staging.

## Pflegeentscheidung

- Historische Dateien bleiben aus Nachweisgründen bestehen.
- Vor Nutzung einer teilweise gültigen Datei zuerst die verlinkte Fachdatei und den aktuellen Code prüfen.
- Archivierung/Verschiebung erst in einem eigenen Auftrag, da Pfade und externe Verweise betroffen sein können.
- Bei jeder wesentlichen Änderung mindestens `PROJEKT-HANDBUCH.md`, betroffene Fachdatei, `docs/DECISIONS.md`, `CHANGELOG.md` und `docs/OPEN-QUESTIONS.md` prüfen.
