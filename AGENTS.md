# Codex Working Rules (Talentexperte)

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt für den Repository-Stand; Betriebsdaten sind live zu prüfen
Geltungsbereich: gesamtes Repository

## Projekt und Prioritäten

- TALENTEXPERTE ist eine deutschsprachige Camp- und Anmeldeplattform für Fußball-Feriencamps in Aachen.
- Der öffentliche Auftritt ist statisches HTML/CSS/JavaScript ohne Framework, Bundler oder CMS. Supabase, Stripe, Resend und Google-Dienste bilden die angebundenen Betriebsstrecken.
- Hauptziele: responsive Website, SEO/GEO, sichere Anmeldung, persönliche Bestätigung, nachgelagerter Google-Kontakte-Sync sowie vollständiges Anmeldungs- und Zahlungscontrolling.
- Produktiv relevant sind insbesondere `*.html`, `css/`, `images/`, `fonts/`, `pdf/`, `favicon/`, `ci/`, `scripts/`, `supabase/` und `code.gs`.
- `drafts/`, `automation-runs/`, `logs/`, Backups, `index Kopie.html`, `*.bak*`, lokale Secrets und private Exporte sind keine produktive Wahrheit und dürfen nicht veröffentlicht werden.

## Verbindliche Projektdokumentation

- Vor fachlichen oder operativen Aufgaben `PROJEKT-HANDBUCH.md` lesen.
- Vor Änderungen zusätzlich `docs/PROJECT.md`, die betroffene Fachdokumentation und `docs/OPEN-QUESTIONS.md` lesen. Dokumentenstatus und Quellenrang stehen in `docs/DOCUMENTATION-INVENTORY.md`.
- Zahlungsstände ausschließlich in Supabase/Admin-Dashboard und Stripe prüfen. Google Drive, Google Sheets, Google Kontakte, Gmail, CSV-Exporte und historische Berichte sind keine verbindlichen Zahlungsquellen.
- Camptermine, Preise, Kapazitäten und Verfügbarkeiten vor Veröffentlichung gegen Supabase und sichtbare Website prüfen.

## Arbeitsregeln

- Bestehende Komponenten, CSS-Tokens, responsive Regeln und Datenflüsse bevorzugen; kein paralleles Designsystem einführen.
- Keine Bibliothek, globale Stiländerung, CI-Änderung, Integration oder Datenmodelländerung ohne begründete Auswirkungsprüfung.
- Keine Funktion entfernen, Dateien umbenennen/verschieben oder produktive Workflows vereinfachen, sofern dies nicht ausdrücklich Teil der Aufgabe ist.
- Keine Inhalte, Preise, Termine, Kapazitäten, Bewertungen, Qualifikationen, Rechtsaussagen oder Betriebsstände erfinden.
- Keine Secrets, Tokens, privaten Schlüssel, Sponsorcodes oder personenbezogenen Anmeldedaten dokumentieren, loggen oder committen.
- Änderungen klein und aufgabenbezogen halten; fremde Worktree-Änderungen schützen. Vor Mehrdateiänderungen Plan und Dateiliste nennen.
- Bei Website-Änderungen Desktop und Mobil, Tastatur/Fokus, Konsole, Links, SEO/Schema und kritische Formzustände prüfen.
- Bei Änderungen an Anmeldung, Zahlung, E-Mail, Dashboard oder Supabase die Sicherheits- und Negativtests ausführen.
- Dokumentation ist Teil der Umsetzung: mindestens betroffene Fachdatei, `docs/DECISIONS.md` bei Entscheidungen, `CHANGELOG.md` und `docs/OPEN-QUESTIONS.md` prüfen.
- Git-Push, Website-Deployment, Supabase-Migration/Function-Deploy, E-Mail-Versand und Social Publishing sind getrennte Aktionen.

## Abschlusskriterien

- Aufgabe erfüllt; Bestand und kritische Pfade nicht verschlechtert.
- Desktop und Mobil geprüft; CI, SEO/GEO, Accessibility und Sicherheit eingehalten.
- Keine unnötigen Duplikate, öffentlichen internen Dateien, Secrets oder erfundenen Angaben.
- Relevante Tests und visuellen Prüfungen dokumentiert; Risiken und offene Punkte sichtbar.
- Nur aufgabenbezogene Dateien selektiv gestaged, Staging-Diff geprüft, committed und zum Upstream gepusht, sofern keine dokumentierte Ausnahme greift.
