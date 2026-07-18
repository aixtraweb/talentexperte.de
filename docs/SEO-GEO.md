# SEO und GEO

Stand: 18. Juli 2026
Dokumentationsstatus: teilweise bestätigt; kein aktueller Live-Crawl
Geltungsbereich: organische Suche, lokale Sichtbarkeit und KI-Suchsysteme

## Ziele und Suchintentionen

- **Bestätigt:** Fokusleistungen: Fußball-Feriencamps/Fußballschule für Kinder.
- **Bestätigt:** Fokusregion: Aachen, besonders Aachen-Burtscheid.
- **Bestätigt:** Kernbegriffe im Projekt: `Fußballcamp Aachen`, `Feriencamp Aachen`, `Fußballschule Aachen`.
- **Abgeleitet:** primäre Intention ist lokal-transaktional (Termin, Leistung, Preis, Anmeldung), sekundär informativ (Ablauf, Alter, Betreuung, Ort, FAQ).
- **Bestätigt:** Conversionziel: `anmeldung.html`; Kontakt und Campübersicht sind Sekundärziele.

## Indexierbare und nicht indexierbare Seiten

| Typ | Aktueller Stand |
|---|---|
| Indexierbar | `/`, `anmeldung.html`, `impressum.html`, `datenschutz.html`, `agb.html` |
| noindex | Admin, Bestätigungen, Firmen-Anmeldung, Payment-Übergang, Galerie und Redirect-Stubs |
| Sitemap | fünf indexierbare URLs in `sitemap.xml` |
| robots | Admin, Bestätigungen und Payment-Übergang gesperrt; Sitemap referenziert |

- Canonical je indexierbarer Seite selbstreferenziert halten.
- Redirect-Stubs nicht als Contentseiten dokumentieren oder in die Sitemap aufnehmen.
- Bei echter neuer Inhaltsseite: `noindex`, Canonical, Navigation, Sitemap und interne Links gemeinsam entscheiden.

## Onpage-Regeln

- Genau eine sinnvolle sichtbare H1 je indexierbarer Seite.
- Title und Description eindeutig, faktenbasiert und auf Suchintention ausgerichtet.
- H2/H3 bilden die tatsächliche Informationshierarchie; keine Überschrift nur für Optik.
- Campname, Datum, Dauer, Preis, Ort und Status zwischen sichtbarem Inhalt, Supabase, Formular und Schema abgleichen.
- Bilder: eindeutiger Alt-Text, feste Maße, moderne Formate, keine Keyword-Wiederholung.
- Interne Links verbinden Startseite, Campübersicht, Anmeldung, FAQ und Rechtstexte verständlich.

## Lokale Entität

- Organisation: `TALENTEXPERTE – Fußballschule Aachen`.
- Personen sind im aktuellen JSON-LD getrennt: Alejandro Medina und Elias Medina mit unterschiedlichen Rollen.
- Camp-Ort: Branderhofer Weg 15, 52066 Aachen-Burtscheid im aktuellen JSON-LD/Website-Kontext.
- Geschäfts-/Verantwortlichenadressen weichen in den Rechtstexten ab. Diese sind nicht mit dem Camp-Ort gleichzusetzen und nicht ohne Klärung zu vereinheitlichen.
- Telefonnummer, E-Mail, Instagram und Website-URL konsistent halten.

## GEO-/Citability-Regeln

- Leistung, Zielgruppe, Ort und Ablauf in vollständigen direkten Sätzen erklären.
- Fragen zuerst beantworten, dann Details und Einschränkungen nennen.
- Belegbare Zahlen und klare Entitäten verwenden; Aktualitätsdatum/Stand bei veränderlichen Angaben nennen.
- Sichtbares HTML hat Vorrang vor Informationen, die nur in Widgets, PDFs oder JavaScript erscheinen.
- FAQ, Campfakten und strukturierte Daten müssen inhaltlich übereinstimmen.
- `llms.txt` ist ergänzend, nicht das System of Record und kein Ersatz für sichtbare Website-Inhalte.

## Aktueller bestätigter Code-Stand

- `index.html`: LocalBusiness/SportsActivityLocation, zwei Person-Nodes, Organization, WebSite, sechs Events und FAQPage.
- `anmeldung.html`: WebPage, sechs Events und BreadcrumbList.
- Startseite enthält statische, crawlbare Google-Reviewkarten statt des früheren reinen Bewertungswidgets.
- Fonts sind lokal; Bilder nutzen auf Hauptmotiven AVIF/WebP/JPEG.
- `llms.txt`, `robots.txt` und `sitemap.xml` sind in der Deployment-Allowlist.

## Historische Audits

- `seo.md` vom 12.02.2026 und `FULL-AUDIT-REPORT.md` vom 01.04.2026 sind Momentaufnahmen.
- Mehrere damalige Punkte sind im aktuellen Code bereits umgesetzt: `llms.txt`, Title/Description, Personentrennung, Breadcrumb, statische Reviews und Eventstatus.
- Historische Scorewerte und Maßnahmenlisten nie als aktuellen Livebefund ausgeben.
- Jede neue SEO-Umsetzung zuerst gegen Code und bei Live-Fragen gegen die ausgelieferte Website prüfen.

## Risiken und offene Punkte

- **Offen:** aktuelle Search-Console-, Ranking-, Indexierungs- und Core-Web-Vitals-Daten wurden nicht live geprüft.
- **Offen:** Hosting-Security-Header sind laut Sicherheitsdokumentation noch freigabepflichtig.
- **Offen:** Consent-/Datenschutzbewertung externer Instagram-/Map-Ressourcen benötigt fachliche Prüfung.
- **Risiko:** feste Preise/Events in `llms.txt` und JSON-LD können von Supabase abweichen.
- **Risiko:** `sitemap.xml`-`lastmod`-Werte sind älter als mehrere relevante Seitenänderungen.
- **Risiko:** große öffentlich deploybare Medien können Crawlbudget, Bandbreite und Performance belasten.

## Prüfung bei SEO-relevanten Änderungen

- Meta, Canonical, robots/noindex, H1 und Überschriftenhierarchie.
- sichtbarer Inhalt gegen JSON-LD und Supabase.
- Rich Results/Schema-Validierung.
- interne Links und 404/Redirects.
- mobile Darstellung, LCP-Asset, CLS-Dimensionen und Konsole.
- `sitemap.xml`, `robots.txt`, `llms.txt` und Dokumentation aktualisieren, falls betroffen.

## Verwandte Dokumente

- [`STRUCTURED-DATA.md`](STRUCTURED-DATA.md)
- [`CONTENT-GUIDE.md`](CONTENT-GUIDE.md)
- [`QA-CHECKLIST.md`](QA-CHECKLIST.md)
