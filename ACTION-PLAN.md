# SEO Action Plan — talentexperte.de
**Erstellt:** 2026-04-01 | **Basis:** Full SEO Audit  
**Aktueller Score: 68 / 100** | **Ziel: 85+ / 100**

---

## KRITISCH — Sofort beheben (< 1 Tag)

### K-1: Hero-Video-Preload tauschen → LCP -1–2s
**Datei:** `index.html`  
**Aufwand:** 15 min

```html
<!-- ENTFERNEN: -->
<link rel="preload" as="video" href="images/hero-video.mp4" type="video/mp4">

<!-- ERSETZEN DURCH: -->
<link rel="preload" as="image" href="images/hero.avif" type="image/avif" fetchpriority="high">
```
Außerdem am `<video>`-Tag: `preload="auto"` → `preload="none"`

---

### K-2: Bebas-Neue Font preloaden → Hero-FOUT eliminieren
**Datei:** `index.html` `<head>`  
**Aufwand:** 5 min

```html
<link rel="preload" as="font" href="fonts/bebas-neue-latin-400-normal.woff2" type="font/woff2" crossorigin>
```

---

### K-3: Dead preconnects entfernen, nützliche hinzufügen
**Datei:** `index.html` `<head>`  
**Aufwand:** 5 min

```html
<!-- ENTFERNEN (fonts sind self-hosted, diese Verbindungen sind nutzlos): -->
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- HINZUFÜGEN: -->
<link rel="preconnect" href="https://elfsightcdn.com" crossorigin>
```

---

### K-4: Title und Meta Description kürzen
**Datei:** `index.html`  
**Aufwand:** 10 min

```html
<title>Fußballcamp Aachen – TALENTEXPERTE | Feriencamp seit 2005</title>
<meta name="description" content="Fußballcamp Aachen für Kinder 5–14 Jahre. 4 Tage Training, Mittagessen & Spaß auf Kunstrasen. Oster-, Sommer- & Herbstcamp. Jetzt anmelden!">
```

Außerdem entfernen:
```html
<!-- ENTFERNEN (seit 2009 ignoriert): -->
<meta name="keywords" content="...">
```

---

### K-5: Entity-Namenskonflikt klären — Elias vs. Alejandro Medina
**Datei:** `index.html` JSON-LD + Impressum  
**Aufwand:** 30 min

Im Impressum sind zwei Personen: Elias Medina (Trainer/Cheftrainer) und Alejandro Medina (Betreiber/Geschäftsführer). Die JSON-LD `founder`-Angabe "Elias Medina" und der TMG §5-Verantwortliche "Alejandro Medina" kollidieren.

**Lösung:** Einen `Person`-Node für beide anlegen und Rollen klar trennen:
- `founder`: Elias Medina (Gründer, Cheftrainer)
- `contactPoint`/Betreiber: Alejandro Medina (Geschäftsführer)

Mindestens die `founder`-Angabe im JSON-LD mit einem vollständigen `Person`-Node ersetzen, der auch `jobTitle` und `sameAs` enthält.

---

### K-6: Sitemap deployen (bereits korrigiert)
**Aufwand:** 2 min

`./ci/deploy.sh` — die bereinigte `sitemap.xml` ist lokal fertig, muss nur deployed werden.

---

## HOCH — Diese Woche (< 7 Tage)

### H-1: llms.txt erstellen und deployen
**Datei:** `llms.txt` (neu)  
**Aufwand:** 1–2 Stunden

Erstellt Sichtbarkeit in Perplexity, Claude, Gemini, Bing Copilot sofort nach dem nächsten Crawl.

```
# TALENTEXPERTE – Fußballschule Aachen
# https://www.talentexperte.de/

> TALENTEXPERTE ist eine Fußballschule und Feriencampanbieter in Aachen, gegründet 2005 von Elias Medina.
> Das Angebot richtet sich an Kinder von 5 bis 14 Jahren und umfasst Oster-, Sommer- und Herbstcamps.
> Seit 2005 haben über 4.000 Kinder in mehr als 150 Camps auf dem Kunstrasen des JSC Blau-Weiss Aachen (Branderhofer Weg 15, 52066 Aachen-Burtscheid) trainiert.

## Camps 2026

- Ostercamp I: 30.03.–02.04.2026
- Ostercamp II: 07.04.–09.04.2026
- Sommercamp I: 29.06.–03.07.2026
- Sommercamp II: 06.07.–10.07.2026
- Herbstcamp I: 12.10.–16.10.2026
- Preis: 149 EUR inkl. Mittagessen, Trinkpause, Trikot
- Alter: 5–14 Jahre, alle Spielstärken

## Anmeldung
- Online: https://www.talentexperte.de/anmeldung.html
- Telefon: +49 1523 4678108
- E-Mail: kontakt@talentexperte.de

## Trainingsort
JSC Blau-Weiss Aachen 1946 e.V., Branderhofer Weg 15, 52066 Aachen-Burtscheid

## Optional: Firmen-Anmeldung (Saint-Gobain Mitarbeiter)
https://www.talentexperte.de/firmen-anmeldung.html
```

---

### H-2: AggregateRating in JSON-LD eintragen
**Datei:** `index.html` JSON-LD LocalBusiness-Node  
**Aufwand:** 30 min

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "bestRating": "5",
  "worstRating": "1",
  "ratingCount": "87"
}
```
Echte Zahlen aus Google Business Profile einsetzen. Dies schaltet Sterne-Snippets in Google SERPs frei — höchster CTR-Hebel dieser gesamten Liste.

---

### H-3: streetAddress konsistent machen
**Datei:** `index.html` + `anmeldung.html`  
**Aufwand:** 15 min

Überall einheitlich:
```json
"streetAddress": "Branderhofer Weg 15"
```
(Index hatte "Branderhofer Weg" ohne Hausnummer; anmeldung.html hatte "Branderhoferweg 15" — falscher Straßenname)

---

### H-4: SearchAction aus WebSite-Schema entfernen
**Datei:** `index.html` JSON-LD  
**Aufwand:** 5 min

Der `potentialAction`-Block mit `SearchAction` zeigt auf `?s={search_term_string}` — eine WordPress-Suche die es nicht gibt. Google erkennt das als inaktiv und unterdrückt den Sitelinks Search Box. Entfernen.

---

### H-5: Elfsight-Widgets min-height setzen → CLS fix
**Datei:** `css/main.css`  
**Aufwand:** 15 min

```css
.reviews-feed { min-height: 400px; }
.insta-feed   { min-height: 350px; }
```

---

### H-6: Photo-Strip-Bilder mit width/height versehen → CLS fix
**Datei:** `index.html`  
**Aufwand:** 20 min

Alle 4 `<img>`-Tags im `.photo-strip-inner` mit echten Pixelmaßen ergänzen. Genaue Maße aus den Quelldateien entnehmen.

---

### H-7: 4–6 echte Reviews als HTML hard-coden
**Datei:** `index.html`  
**Aufwand:** 1–2 Stunden

Vor dem Elfsight-Widget: statischen Block mit 4–6 repräsentativen Eltern-Zitaten (aus Google Reviews kopiert) als lesbares HTML einfügen. Elfsight-Widget bleibt für den vollen Feed. Statischer Block sorgt dafür, dass KI-Crawler und Screenreader immer Social Proof sehen.

---

### H-8: logo als ImageObject in JSON-LD
**Datei:** `index.html`  
**Aufwand:** 10 min

```json
"logo": {
  "@type": "ImageObject",
  "url": "https://www.talentexperte.de/ci/logo.png"
}
```

---

### H-9: BreadcrumbList auf anmeldung.html
**Datei:** `anmeldung.html` JSON-LD `@graph`  
**Aufwand:** 15 min

```json
{
  "@type": "BreadcrumbList",
  "@id": "https://www.talentexperte.de/anmeldung.html#breadcrumb",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Startseite", "item": "https://www.talentexperte.de/"},
    {"@type": "ListItem", "position": 2, "name": "Anmeldung", "item": "https://www.talentexperte.de/anmeldung.html"}
  ]
}
```

---

### H-10: nginx Security-Headers beim Hoster beantragen
**Aufwand:** 30 min (Support-Ticket an Hostingwerk)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### H-11: Redirect-Chain auf eine einzige Hop reduzieren
**Aufwand:** 30 min (Hoster-Konfiguration)

`http://talentexperte.de/` → direkt → `https://www.talentexperte.de/` (eine 301, nicht zwei).

---

## MITTEL — Diesen Monat (< 30 Tage)

### M-1: anmeldung.html — Prose-Content hinzufügen
**Aufwand:** 2–3 Stunden

200–300 Wörter Introtext über dem Formular: Camp-Zusammenfassung, Trust-Signale (seit 2005, 4.000+ Kinder), Links zu FAQ und AGB. H1 von "JETZT ANMELDEN" auf "Anmeldung – Fußballcamp Aachen 2026" ändern.

---

### M-2: teams.html — echte Trainer-Seite erstellen
**Aufwand:** 3–5 Stunden

Statt `location.replace('/')`: echte Seite mit:
- Elias Medinas Biografie (150–200 Wörter aus Ich-Perspektive)
- Coaching-Lizenzen (DFB, UEFA, DOSB o.ä.)
- Foto mit sprechendem `alt`-Text
- `Person`-Schema mit `jobTitle`, `image`, `sameAs` (LinkedIn)
- `noindex` entfernen, in Sitemap aufnehmen, von Homepage verlinken

---

### M-3: gutschein.html — echte Gutschein-Seite
**Aufwand:** 2–3 Stunden

Statt Redirect: eigene Seite für "Fußballcamp Gutschein Aachen" mit:
- Produktbeschreibung, Einlösungsanleitung
- Eigener Title/H1/Meta
- Von Homepage verlinken

---

### M-4: Person-Schema für Elias Medina (vollständig)
**Datei:** `index.html` JSON-LD  
**Aufwand:** 1 Stunde

```json
{
  "@type": "Person",
  "@id": "https://www.talentexperte.de/#founder-elias-medina",
  "name": "Elias Medina",
  "jobTitle": "Gründer und Cheftrainer",
  "image": "https://www.talentexperte.de/images/trainer-elias-medina-urkunden.jpg",
  "worksFor": {"@id": "https://www.talentexperte.de/#organization"},
  "url": "https://www.talentexperte.de/"
}
```

---

### M-5: FAQ erweitern — Länge und Abdeckung
**Datei:** `index.html`  
**Aufwand:** 2–3 Stunden

- Jede FAQ-Antwort auf 134–167 Wörter erweitern (aktuell: 40–80)
- 3 neue Fragen hinzufügen:
  1. "Wo genau findet das Camp statt?" (mit vollständiger Adresse + ÖPNV)
  2. "Welche Trainer leiten das Camp?"
  3. "Wie lange gibt es TALENTEXPERTE schon?"
- FAQ-Antworten im HTML mit JSON-LD synchronisieren

---

### M-6: Instagram-Sektion — "Sie" → "du"
**Datei:** `index.html`  
**Aufwand:** 5 min

*"Bitte teilen Sie unsere Posts"* → *"Folg uns für die neuesten Camp-Impressionen"*

---

### M-7: Gallery alt-Texte individualisieren
**Datei:** `index.html`  
**Aufwand:** 30 min

Alle 10 Gallery-Bilder haben `alt="Fußballcamp Aachen"`. Jedes Bild mit sprechendem, einzigartigem Alt-Text versehen (z.B. "Kinder beim Dribbling-Training Fußballcamp Aachen").

---

### M-8: Vergangenheits-Events aus Schema bereinigen
**Datei:** `index.html` + `anmeldung.html`  
**Aufwand:** 20 min nach jedem Camp

Ostercamp I (2026-03-30) ist vergangen → `eventStatus` auf `EventScheduled` lassen oder entfernen sobald ausgebucht. Nach 2026-04-02 entfernen. Für zukünftige Camps: `validThrough` zu allen `Offer`-Einträgen hinzufügen.

---

## NIEDRIG — Backlog (Wann immer Zeit ist)

### N-1: YouTube-Kanal erstellen
**Aufwand:** 1–2 Tage (Content-Erstellung)

YouTube-Präsenz korreliert 0.737 mit AI-Citation. Kurzfilm (60–90s) "Fußballcamp Aachen 2025 – TALENTEXPERTE" erstellen. Kanal-URL in `sameAs` eintragen, Video auf Homepage einbetten (kein JS-Inject, direkt `<iframe>`).

---

### N-2: Google Business Profile URL in sameAs
**Datei:** `index.html`  
**Aufwand:** 10 min

Wenn Google Business Profile verifiziert: URL in `sameAs`-Array eintragen.

---

### N-3: IndexNow einrichten
**Aufwand:** 1 Stunde

Key generieren auf indexnow.org → Key-Datei ins Root-Verzeichnis → `./ci/deploy.sh` um API-Ping erweitern. Aktiviert Near-Instant-Indexierung bei Bing nach jedem Deploy.

---

### N-4: Blog / Ratgeber-Bereich (2–3 Artikel)
**Aufwand:** 1–2 Tage pro Artikel

Ziel-Keywords:
- "Was bringt ein Fußballcamp meinem Kind?" 
- "Worauf achten beim Feriencamp Aachen?"
- "Fußballcamp Aachen: Trikot, Ausrüstung, was mitnehmen?"

---

### N-5: Große ungenutzte Bilddateien bereinigen
**Aufwand:** 30 min

Dateien prüfen und löschen (total ~60 MB):  
`IMG_0530.jpeg`, `IMG_4445.jpeg`, `IMG_5996.jpeg`, `IMG_9420.jpeg`,  
`fussballcamp-aachen-start.MOV` (35 MB!),  
`kinder-beim-fussballcamp-in-aachen.png` (4,7 MB),  
`viele-kinder-beim-fussballcamp-in-aachen.png` (4,3 MB),  
`fussballcamps-aachen-elias-medina-talentexperte.png` (2,3 MB)

---

### N-6: PDF-FAQ in HTML duplizieren
**Datei:** `index.html` oder neue `/faq.html`  
**Aufwand:** 1 Stunde

`pdf/faq-camps.pdf` ist für alle Crawler unsichtbar. Inhalt als HTML-Text zugänglich machen.

---

## Zusammenfassung: Erwartete Score-Verbesserungen

| Maßnahme | Kategorie | Score-Impact |
|----------|-----------|-------------|
| K-1 bis K-3 (Performance) | CWV | +8–12 Punkte Performance |
| K-5 (Entity fix) | E-E-A-T | +5–8 Punkte Content |
| H-1 (llms.txt) | GEO | +10 Punkte AI |
| H-2 (AggregateRating) | Schema + CTR | +5 Punkte Schema |
| H-3 (streetAddress fix) | Local SEO | +5 Punkte Technical |
| M-2 (teams.html) | E-E-A-T | +8 Punkte Content |
| M-1 (anmeldung.html content) | Content | +6 Punkte Content |

**Realistisches Ziel nach Kritisch + Hoch: 79–82 / 100**  
**Ziel nach allen Maßnahmen: 87–90 / 100**
