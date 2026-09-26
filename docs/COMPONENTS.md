# Komponenten und Seitentypen

Stand: 26. September 2026
Dokumentationsstatus: bestätigt für den aktuellen HTML-/CSS-Bestand
Geltungsbereich: wiederkehrende UI-Muster und ihre verbindliche Wiederverwendung

## Architekturregel

Es gibt keine Template-Engine oder Komponentenbibliothek. Komponenten sind wiederkehrende HTML-/CSS-Muster. Bestehende Struktur und Klassennamen bevorzugen; bei mehrfach benötigten Änderungen betroffene Seiten synchron prüfen, statt unbemerkt Varianten zu erzeugen.

## Navigation und Footer

| Komponente | Quellen | Regeln |
|---|---|---|
| Hauptnavigation | `index.html`, `css/main.css` (`.nav`, `.nav-links`, `.nav-mobile-btn`) | Logo, Ankerziele und primärer CTA; mobil tastaturbedienbar, Status synchron halten |
| Unterseitennavigation | Anmeldung/Bestätigung + jeweiliges CSS | Logo und klarer Rückweg; keine Navigation zu privaten Zuständen erfinden |
| Admin-Navigation | `admin.html`, `css/admin.css` (`.dash-nav`) | Adminstatus, Zeit, Aktualisieren/Logout erreichbar halten |
| Footer | Start-, Formular-, Bestätigungs-, Legal- und Galerieseiten | Kontakt, Rechtliches, Logo und passende Rückwege; Adresskonflikte nicht eigenmächtig vereinheitlichen |

## Buttons und Links

- `.btn`, `.btn-red`, `.btn-white`, `.btn-outline`: allgemeine Website-Aktionen.
- `.camp-btn`: Anmeldung aus Campkarte.
- `.btn-submit`, `.btn-pay`, `.btn-back`: Formular-/Paymentfluss.
- Adminaktionen besitzen fachliche Klassen wie `.btn-mark-paid`, `.btn-storno`, `.btn-erstattung`, `.bulk-remind`.
- Primäraktion pro Bereich optisch eindeutig; destructive Aktionen nicht wie primäre CTA gestalten.
- Linkziel, `rel`, Fokus, Hover, deaktivierter und Ladezustand prüfen.

## Startseitenkomponenten

### Hero

- Quellen: `.hero`, `.hero-bg`, `.hero-video`, `.hero-content`, `.hero-buttons`, `.hero-stats`.
- Kampagnenvariante `.hero--herbst` (seit 26.09.2026): `.hero-split` (Text links, Plakat `.hero-poster` rechts), `.hero-kicker` in der H1, Terminkarten `.hero-date` (verlinken auf `anmeldung.html?camp=<camp-id>`), `#heroCountdown` (bis Campstart, blendet sich nach Start aus), dekorative `.hero-leaves` (aus bei reduced motion).
- Pflicht: genau eine H1, konkrete lokale Leistung, primäre Anmeldung, vertrauensbildender Kontext.
- Video benötigt Poster/Fallback; Text muss ohne Video verständlich bleiben.

### Inhaltssektionen

- Standard: `.section-pad` + `.container`, `.section-label`, `.section-title`, `.section-subtitle`.
- Bestehende Sektionen: Herbstcamp (`#herbstcamp`), Über uns, Bewertungen, Leistungen, Training, Camps, Ablauf, Videos (`#videos`), Galerie, Instagram, FAQ, Standort und CTA-Banner.
- Hell/Dunkel: helle Sektionen tragen `.theme-light` (optional `.theme-light--white`), siehe [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

### Saisonkampagne (Herbstcamp 2026)

- `#herbstcamp`: `.herbst-grid` (Motiv + Text), `.herbst-duo` (Für Kinder / Für Eltern), `.herbst-facts`, `.herbst-cta`, Motivleiste `.herbst-motif` (Buttons mit `data-full`, öffnen die Lightbox; mobil horizontal wischbar).
- CTA-Banner `.cta-banner--herbst` mit Header-Motiv; mobile Sticky-Leiste `#stickyCta` erscheint zwischen Hero und Footer, verschiebt den WhatsApp-Button.
- Nächste Saison: Motive in `images/<saison>-<jahr>/` ablegen, Texte/Termine/Camp-IDs in Hero, `#herbstcamp`, Campkarten, CTA, Sticky-Leiste, Meta/OG und JSON-LD austauschen.

### Live-Verfügbarkeit

- Elemente mit `data-spots-for="<camp-id>"` werden per `fetch` aus `camp_verfuegbarkeit_public` (anon, nur Aggregate) befüllt: `> 10` „X Plätze frei“, `≤ 10` „Nur noch X Plätze“, `0` „Ausgebucht“ (+ `.is-full` am Container). Ohne Antwort bleibt der statische Fallback-Text stehen.

### Videos und Teamfotos

- `.reels` mit `figure.reel` (Hochkant-`video` mit `controls`, `preload="none"`, Poster; Overlay `.reel-play`); JS pausiert andere Videos beim Abspielen. Mobil horizontal wischbar.
- `.teamfotos-grid` mit `.team-photo`-Buttons (Lightbox wie Herbst-Motive).
- Die Lightbox (`#galerieLightbox`) wird nur für Herbst-Motive und Teamfotos genutzt; die Hauptgalerie bleibt ohne Klick-Vergrößerung.
- Neue Landingpage-Sektionen sollen diese Abstände/Typografie wiederverwenden.

### Bewertungen

- Quellen: `.reviews-grid`, `.review-card`, `.reviews-rating`, `.reviews-google-link`.
- Aktuell drei statische, sichtbare Reviewkarten plus Gesamtwert im HTML.
- Keine Bewertung, Quote oder Zitat ohne belegte Quelle ergänzen. Anzahl und Gesamtwert vor Änderung live verifizieren.

### Campkarten

- Quellen: `.camp-card`, `.camp-card-header`, `.camp-details`, `.camp-footer`, Statusklassen.
- Pflicht: Saison/Name, Datum/Dauer, Ort, Alter, Preis/Leistung, Status und passende Aktion.
- Abgelaufen/abgeschlossen: kein Anmelde-CTA; ausgebucht: nicht buchbar; verfügbar/knapp: Status aus aktueller Quelle.
- Buchbare Camps als `.camp-card--featured` mit Motiv (`.camp-card-media`); vergangene Camps nicht mehr als Karte, sondern gedämpft in `.camps-past` („Rückblick <Jahr>“).
- Campdaten existieren zusätzlich in Supabase und JSON-LD; alle Stellen synchron prüfen.

### FAQ/Akkordeon

- Quellen: `.faq-item`, `.faq-question`, `.faq-answer`, `.faq-icon`.
- Frage als bedienbares Element mit synchronem Offen-/Geschlossen-Zustand.
- Sichtbare Antworten und `FAQPage`-JSON-LD müssen inhaltlich übereinstimmen.

### Galerie

- Quellen: `.galerie-grid`, `.galerie-item`, `.galerie-lightbox` und Galerie-Unterseite.
- Hauptgalerie ist laut Changelog ohne Klick-Vergrößerung; keine Lightbox unbemerkt reaktivieren.
- Bilder benötigen eindeutige Alt-Texte, definierte Maße und mobile Prüfung.

## Anmeldung

### Stepper und Campauswahl

- Quellen: `.form-stepper`, `.camp-select`, `.camp-option`, `.summary-sidebar`.
- Auswahl muss Campname, Zeitraum, Preis und Verfügbarkeit verständlich machen.
- Abgelaufene Camps (seit 26.09.2026) nicht mehr in der Auswahl, nur als Hinweiszeile `.camp-past-note` „Bereits abgeschlossen: …“; Servervalidierung bleibt maßgeblich.
- Vorauswahl per `anmeldung.html?camp=<camp-id>` (nur buchbare Camps; klickt die Option programmatisch, damit Summe/Validierung identisch laufen).
- Kopf kompakt: `.herbst-ribbon` (Saisonhinweis), `.trust-bar` (Sterne + Google-Rezensionen, Link zu Google), `.trust-points`. Vor AGB/Absenden: `.form-reviews` mit zwei echten Google-Elternstimmen. Bewertungsanzahl ist statisch – bei Änderung Startseite, Anmeldung und JSON-LD gemeinsam anpassen.

### Formularfelder

- Quellen: `.form-section`, `.form-grid`, `.field`, `.agb-check`, `.form-honeypot`.
- Honeypots bleiben visuell unsichtbar, aber im Request erhalten.
- Datumsmasken, Pflichtfelder, Fehlermeldungen und Entwurfswiederherstellung nicht entfernen.
- Personenbezogene Daten nie in URL-Query, Logs oder Dokumentation schreiben.

### Sponsorpanel

- Quellen: `.sponsor-code-panel`, `.sponsor-code-status`, `.sponsor-active`, `.sponsor-price-details`.
- Optionaler Code wird automatisch/debounced geprüft und beim Submit erneut validiert.
- Kein stiller Fallback vom ungültigen Sponsorversuch zur Elternzahlung.
- Erfolgszustand zeigt Elternanteil 0 und entfernt den Stripe-Weg.

### Erfolgsoverlay und PDF

- Quellen: `.overlay`, `.overlay-card`, PDF-Funktionen in `anmeldung.html`.
- Buchungsreferenz, Zahlungsstatus, Download und nächster Schritt eindeutig.
- Vor Zahlung: „Zahlung ausstehend“; Sponsor: „vollständig gesponsert/keine Zahlung erforderlich“.

## Bestätigungen

- `bestaetigung.html`: persönliche Eltern-/Sponsorbestätigung mit Status, Campdetails, PDF und Empfehlung/Share.
- `bestaetigung-firma.html`: Firmenbestätigung mit sicherem Token und passendem PDF/FAQ.
- Ohne gültiges Token keine persönlichen Daten anzeigen.
- Storniert/erstattet/gesponsert/bezahlt/offen sind getrennte Darstellungen.
- Seit 26.09.2026 heller Inhaltsbereich (siehe Designsystem); Logik und Tokenprüfung unverändert.

## Standortkarte

- `#map` (Leaflet 1.9.4 von unpkg, lazy per IntersectionObserver) mit OpenStreetMap-Standardkacheln `tile.openstreetmap.org` (Klasse `.map-tiles`, dezent entsättigt) und sichtbarer Namensnennung „© OpenStreetMap-Mitwirkende“ (Pflicht, nicht entfernen). CARTO-Kacheln verlangen seit 2026 einen API-Key und sind entfernt.
- Darunter `.map-route` → Google-Maps-Routenziel Branderhofer Weg 15.

## Admin

### Statistik und Filter

- `.stats-grid`, `.stat-card`, `.table-filters`, `.filter-select`.
- KPIs für Elternzahlungen basieren nur auf kanonischen Elternfällen.
- Camp-, Status-, Sponsor- und Firmenfilter dürfen sich nicht gegenseitig fachlich verfälschen.

### Tabellen und Details

- `.table-wrap`, dynamischer Tabellenkopf, `.detail-panel`, `.modal`.
- Campfilter schaltet Campspalte aus und Anwesenheitstage ein.
- Dialoge benötigen verknüpfte Labels, Fokusführung, Escape/Schließen und sichere Bestätigung destruktiver Aktionen.

### Bulk-Aktionen

- `.bulk-bar` mit Bezahlt, Stornieren, Reminder, Löschen und Auswahl aufheben.
- Server filtert Reminder erneut; Clientauswahl ist keine Autorisierung.
- Löschen nur echte Fehleinträge; Stornieren ist Standard.

### Anwesenheit

- `.anwesenheit-table`, `.aw-checkbox`, `.metric-input`, `.aw-summary`.
- Bei ausgewähltem Camp zeigt auch die Anmeldeliste oberhalb der Tabelle je Tag ausschließlich die Zahl anwesender Kinder ohne Nenner; der Zähler verwendet intern alle aktiven Camp-Anmeldungen unabhängig von Such- und Statusfiltern.
- Jeder Anwesenheitshaken aktualisiert die Tagesgesamtzahl sofort aus dem lokalen Cache, bevor die Offline-Queue mit Supabase synchronisiert wird.
- Jede Änderung zuerst in `teilnahme_q`, dann Upsert; Queueindikator sichtbar halten.
- Tagesberechnung lokalzeitfest; Off-by-one bei UTC vermeiden.

## Nicht als Komponentenbasis verwenden

- `index Kopie.html`, `*.bak*`, Redirect-Stubs und historische Social-Layouts.
- E-Mail-HTML aus stillgelegten Einmalkampagnen.
- Direkt kopierte Admin-Inline-Stile ohne Prüfung der vorhandenen Klasse.

## Abnahme je Komponente

- Einsatzorte und abhängige Seiten gefunden.
- Pflichtinhalt und Statusvarianten geprüft.
- Desktop/Mobil, Tastatur, Fokus und Reduced Motion geprüft.
- Console/Network ohne neue Fehler.
- SEO-/Schema-/Form-/Payment-Abhängigkeiten unverändert oder bewusst aktualisiert.
