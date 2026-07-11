# SEO Full Audit — talentexperte.de
**Datum:** 2026-04-01  
**Business:** TALENTEXPERTE – Fußballschule Aachen  
**Platform:** Static HTML/CSS/JS · Supabase · Stripe · r20.hostingwerk.de

---

## Overall SEO Health Score: 68 / 100

| Kategorie | Gewichtung | Score | Gewichtet |
|-----------|-----------|-------|-----------|
| Technical SEO | 25% | 81 | 20.25 |
| Content Quality | 25% | 61 | 15.25 |
| On-Page SEO | 20% | 65 | 13.00 |
| Schema / Structured Data | 10% | 75 | 7.50 |
| Performance (CWV) | 10% | 55 | 5.50 |
| Images | 5% | 70 | 3.50 |
| AI Search Readiness | 5% | 61 | 3.05 |
| **GESAMT** | | | **68 / 100** |

---

## Executive Summary

**Business-Typ erkannt:** Lokaler Sportdienstleister (Kinderferiencamp) · Saisonales Angebot · Einstandort Aachen · Zielgruppe: Eltern 30–45 Jahre

**Top 5 kritische Issues:**
1. Entity-Name-Konflikt: "Elias Medina" (JSON-LD founder) ≠ "Alejandro Medina" (Impressum) — blockiert Google Knowledge Graph
2. 5,6 MB Hero-Video mit `preload="auto"` — LCP wahrscheinlich >4s auf Mobilgeräten
3. Drei wichtige Seiten sind Redirect-Stubs ohne Inhalt (`teams.html`, `gutschein.html`, `camps-in/index.html`)
4. `anmeldung.html` hat nur 240 Wörter — die wichtigste Conversion-Seite ist critically thin
5. Elfsight-Bewertungswidget ist JavaScript-only — 5,0 Google-Bewertung für alle KI-Crawler unsichtbar

**Top 5 Quick Wins:**
1. `llms.txt` erstellen (~1h) → sofortige GEO-Verbesserung für Perplexity & Claude
2. `<link rel="preload" as="video">` → `<link rel="preload" as="image" fetchpriority="high">` tauschen (~15 min) → LCP -1-2s
3. Titeltext auf <60 Zeichen kürzen und Meta-Description auf <155 Zeichen (~15 min)
4. `AggregateRating` in LocalBusiness JSON-LD eintragen (~30 min) → Sterne in SERPs
5. Dead `preconnect` zu Google Fonts entfernen + `preconnect` zu elfsightcdn.com hinzufügen (~5 min)

---

## 1. Technical SEO — Score: 81 / 100

### 1.1 Crawlability — PASS

`robots.txt` korrekt konfiguriert:
- Disallow für `/admin.html`, `/bestaetigung.html`, `/bestaetigung-firma.html` ✓
- Sitemap-Referenz korrekt ✓
- KI-Crawler (GPTBot, ClaudeBot, PerplexityBot) erlaubt via Wildcard

⚠️ **Medium:** `/anmeldung-saint-gobain.html`, `gutschein.html`, `teams.html` sind live (HTTP 200) aber nicht in `robots.txt` Disallow-Liste — nur `noindex` schützt sie. Für sauberere Signale: auch in robots.txt disallowen.

### 1.2 Indexability — PASS mit einem kritischen Fehler

**Sitemap wurde bereits korrigiert** (Sitemap-Agent): `firmen-anmeldung.html` (noindex,nofollow) war im Sitemap — entfernt. `priority`/`changefreq` entfernt. `lastmod`-Daten hinzugefügt.

Aktueller Zustand nach Korrektur:

| Seite | noindex | Im Sitemap | Korrekt? |
|-------|---------|------------|---------|
| `/` | Nein | Ja | ✓ |
| `/anmeldung.html` | Nein | Ja | ✓ |
| `/impressum.html` | Nein | Ja | Akzeptabel |
| `/datenschutz.html` | Nein | Ja | Akzeptabel |
| `/agb.html` | Nein | Ja | Akzeptabel |
| `/firmen-anmeldung.html` | **JA** | **Nein (korrigiert)** | ✓ |

### 1.3 Security / HTTPS — PARTIAL FAIL

HTTPS aktiv, TLS-Upgrade erzwungen. Aber alle Security-Header fehlen komplett:

| Header | Status | Risiko |
|--------|--------|--------|
| `Strict-Transport-Security` | **FEHLT** | High — HSTS-Downgrade-Angriff möglich |
| `X-Frame-Options` | **FEHLT** | Medium — Clickjacking-Gefahr |
| `X-Content-Type-Options` | **FEHLT** | Medium — MIME-Sniffing |
| `Referrer-Policy` | **FEHLT** | Low |
| `Permissions-Policy` | **FEHLT** | Low |

```nginx
# In nginx.conf hinzufügen:
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 1.4 URL & Redirects — KRITISCH

**2-Hop-Redirect-Chain:**
```
http://talentexperte.de/ → (301) → https://talentexperte.de/ → (301) → https://www.talentexperte.de/
```
Jeder Hop: +100–200ms Latenz + PageRank-Verlust. Fix: HTTP→HTTPS und non-www→www in einem einzigen 301 zusammenfassen (nginx-Konfiguration beim Hoster anpassen).

### 1.5 Mobile — PASS

- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` ✓
- `<html lang="de">` ✓
- Responsive CSS mit `clamp()` und `@media`-Breakpoints ✓
- Kein `user-scalable=no` ✓
- Hreflang: nicht anwendbar (DE-only)

### 1.6 Core Web Vitals

| Metrik | Einschätzung | Hauptursache |
|--------|-------------|-------------|
| LCP | **Kritisch (>4s mobil)** | 5,6 MB Video + `preload="auto"` + kein Poster-Preload |
| INP | Gut (<200ms) | Kein blocking JS, alles lazy |
| CLS | Verbesserungsbedarf (0.1–0.25) | Elfsight-Widgets ohne `min-height`, photo-strip ohne Dimensionen |

---

## 2. Content Quality — Score: 61 / 100

### 2.1 E-E-A-T-Analyse

| Dimension | Score | Hauptproblem |
|-----------|-------|-------------|
| Experience | 12/20 | Keine Ich-Perspektive, Trainer-Seite ist Redirect |
| Expertise | 14/25 | Keine DFB/UEFA-Lizenzen erwähnt, Namenswiderspruch |
| Authoritativeness | 13/25 | Nur Instagram in sameAs, kein YouTube, keine Presse |
| Trustworthiness | 19/30 | Impressum vollständig, aber Namenswiderspruch kritisch |
| **Gesamt** | **58/100** | |

**KRITISCH — Entity-Konflikt:**
- JSON-LD `founder`: "Elias Medina"
- Impressum TMG §5 Verantwortlicher: "Alejandro Medina"

Google behandelt diese als zwei verschiedene Personen. Dies unterdrückt Local Pack- und Knowledge-Card-Eligibility.

### 2.2 Title Tags & Meta Descriptions

| Seite | Problem | Severity |
|-------|---------|---------|
| `index.html` | Title: 80 Zeichen (Limit: 60) | High |
| `index.html` | Meta Description: 194 Zeichen (Limit: 155) | High |
| `index.html` | `<meta name="keywords">` vorhanden (seit 2009 ignoriert) | Low |
| `anmeldung.html` | Title 45 Zeichen ✓, Description 111 Zeichen ✓ | Pass |

**Fix index.html Title:**
```
Fußballcamp Aachen – TALENTEXPERTE | Feriencamp seit 2005
```
(57 Zeichen)

**Fix index.html Description:**
```
Fußballcamp Aachen für Kinder 5–14 Jahre. 4 Tage Training, Mittagessen & Spaß auf Kunstrasen. Oster-, Sommer- & Herbstcamp. Jetzt anmelden!
```
(142 Zeichen)

### 2.3 Heading-Struktur

| Seite | Problem | Severity |
|-------|---------|---------|
| `index.html` | H1 "FUSSBALL FERIENCAMPS IN AACHEN" — stark ✓ | Pass |
| `index.html` | Mehrere keyword-freie H2s ("Camp-Momente hautnah", "Wir halten Sie auf dem Laufenden") | Medium |
| `anmeldung.html` | H1 "JETZT ANMELDEN" — keine Keywords | Medium |
| `anmeldung.html` | Keine H2-Struktur unterhalb von H1 | Low |

### 2.4 Content-Tiefe

| Seite | Wortanzahl | Minimum | Status |
|-------|-----------|---------|--------|
| `index.html` | ~1.085 | 500 | ✓ Ausreichend |
| `anmeldung.html` | **~240** | 800 | **KRITISCH** |
| `teams.html` | **0 (Redirect)** | — | **KRITISCH** |
| `gutschein.html` | **0 (Redirect)** | — | High |
| `camps-in/index.html` | **0 (Redirect)** | 500 | High |

### 2.5 Fehlende Seiten

| Fehlende Seite | Impact | Severity |
|---------------|--------|---------|
| Echte Trainer-/Team-Seite | Kern-E-E-A-T | Kritisch |
| "Über uns" als eigene indexierbare Seite | Authority | High |
| Blog / Ratgeber-Bereich | Informational Traffic | High |
| Gutschein-Seite mit echtem Inhalt | Conversion + "Fußballcamp Gutschein Aachen" | High |
| Jugendschutz / Sicherheitskonzept | Elternvertrauen | Medium |
| FAQ als standalone `/faq.html` | Eigenständiger Rank | Medium |

### 2.6 Interne Verlinkung

Fehlende interne Links:
- Keine Verlinkung zu `firmen-anmeldung.html` von der Homepage
- Keine Breadcrumb-Navigation auf Unterseiten
- `anmeldung.html` verlinkt nicht auf FAQ, AGB, Datenschutz
- `camps-in/index.html` wird nirgendwo verlinkt

### 2.7 Tonalitätsproblem

Instagram-Sektion wechselt zu formalem "Sie": *"Bitte teilen Sie unsere Posts"* — während die gesamte restliche Seite "du" verwendet. Fix: *"Folg uns für die neuesten Camp-Impressionen."*

---

## 3. Schema / Structured Data — Score: 75 / 100

### 3.1 Was vorhanden ist (Gut)

- JSON-LD Format durchgehend ✓
- `@graph`-Struktur mit `@id`-Ankern ✓
- `LocalBusiness` + `SportsActivityLocation` Dual-Type ✓
- 6 × `Event`-Einträge mit `Offer`, `startDate`, `endDate`, `location`, `organizer` ✓
- `FAQPage` mit 7 Q&A-Einträgen ✓
- `WebSite` + `Organization` ✓
- ISO 8601 Datumsangaben mit Timezone-Offset ✓

### 3.2 Validierungsfehler

| Problem | Datei | Severity |
|---------|-------|---------|
| `streetAddress`: "Branderhofer Weg" (kein Hausnummer) in index.html vs. "Branderhoferweg 15" in anmeldung.html | Beide | **Kritisch** |
| `logo` als bare String statt `ImageObject` | index.html | Medium |
| `SearchAction` verweist auf `?s=` — statische Site ohne Suche | index.html | Medium |
| Event-Nodes in anmeldung.html ohne `description`, `image`, `geo` — Duplikate | anmeldung.html | Medium |
| Ostercamp I startDate 2026-03-30 ist vergangen — `eventStatus` aktualisieren | index.html | Low |

### 3.3 Fehlende Schema-Opportunities

| Schema | Priorität | Impact |
|--------|-----------|--------|
| `AggregateRating` auf LocalBusiness | **High** | Sterne in Google SERPs — größter CTR-Hebel |
| `BreadcrumbList` auf anmeldung.html | **High** | URL-Display in SERPs |
| `Person` für Elias Medina mit `jobTitle`, `image`, `sameAs` | Medium | Knowledge Panel, AI-Citation |
| `logo` als `ImageObject` | Medium | Google Organization Logo Eligibility |

**JSON-LD Snippet für AggregateRating** (in LocalBusiness-Node einfügen):
```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "bestRating": "5",
  "worstRating": "1",
  "ratingCount": "87"
}
```

**JSON-LD Snippet für BreadcrumbList** (anmeldung.html `@graph`):
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

## 4. Performance — Score: 55 / 100

### 4.1 Server-Baseline

| Messung | Wert | Bewertung |
|---------|------|----------|
| TTFB | 50ms | Ausgezeichnet |
| Total HTML Transfer | 76ms | Ausgezeichnet |
| HTML-Größe | 60 KB | Akzeptabel |

### 4.2 LCP — KRITISCH

**Hauptproblem:** Hero-Video (`hero-video.mp4`, **5,6 MB**) mit `preload="auto"` + ein `<link rel="preload" as="video">` in `<head>` — beides zusammen lädt 5,6 MB bevor irgendein Inhalt sichtbar ist.

**Fix (3 Schritte):**

1. In `<head>` ersetzen:
```html
<!-- ALT (entfernen): -->
<link rel="preload" as="video" href="images/hero-video.mp4" type="video/mp4">

<!-- NEU (ersetzen durch): -->
<link rel="preload" as="image" href="images/hero.avif" type="image/avif" fetchpriority="high">
```

2. Am `<video>`-Element: `preload="auto"` → `preload="none"`

3. Bebas-Neue-Font preloaden (Hero-H1):
```html
<link rel="preload" as="font" href="fonts/bebas-neue-latin-400-normal.woff2" type="font/woff2" crossorigin>
```

### 4.3 CLS — Verbesserungsbedarf

**Elfsight-Widgets** (größtes CLS-Risiko): Kein `min-height` auf den Container-Divs → Content springt beim Laden.

```css
/* In main.css hinzufügen: */
.reviews-feed { min-height: 400px; }
.insta-feed   { min-height: 350px; }
```

**Photo-Strip-Bilder:** 4 `<img>`-Tags ohne `width`/`height`-Attribute → Layout-Shift beim Laden.

### 4.4 Sonstiges

- Dead `preconnect` zu `fonts.googleapis.com` und `fonts.gstatic.com` entfernen (fonts sind self-hosted)
- Stattdessen `<link rel="preconnect" href="https://elfsightcdn.com" crossorigin>` hinzufügen
- ~60 MB unreferenzierte Originaldateien in `/images/` bereinigen

---

## 5. Images — Score: 70 / 100

| Befund | Status |
|--------|--------|
| AVIF + WebP mit JPEG-Fallback auf allen Hauptbildern | ✓ Pass |
| Responsive `srcset` mit Breakpoints 480w/768w | ✓ Pass |
| `loading="lazy"` auf below-fold Bilder | ✓ Pass |
| `width`/`height` auf fast allen `<img>`-Tags | ✓ Pass |
| **Photo-Strip: 4 `<img>`-Tags ohne `width`/`height`** | ✗ Medium |
| **Gallery alt-Texte alle identisch ("Fußballcamp Aachen")** | ✗ Low |
| **Poster `hero.jpg` (281 KB) kein AVIF/WebP** | ✗ Medium |
| Große ungenutzte Originale in `/images/` (bis 6,5 MB) | ✗ Low |

---

## 6. AI Search Readiness (GEO) — Score: 61 / 100

| Platform | Score | Hauptblocker |
|----------|-------|-------------|
| Google AI Overviews | 55/100 | Kein AggregateRating-Schema; Reviews JS-only |
| ChatGPT Web Browse | 48/100 | Kein llms.txt; kein YouTube; kein Wikipedia-Entity |
| Perplexity | 62/100 | Stärkstes durch statisches HTML + Schema |
| Bing Copilot | 58/100 | Schema gut; AggregateRating fehlt |

### 6.1 KI-Crawler-Zugang

Alle KI-Crawler via Wildcard erlaubt (GPTBot, ClaudeBot, PerplexityBot, CCBot). Keine Differenzierung zwischen Search-Crawlern und Training-Crawlern.

### 6.2 llms.txt — FEHLT (HTTP 404)

Kein `/llms.txt` vorhanden. Schnellster GEO-Gewinn mit niedrigstem Aufwand.

### 6.3 Citability-Gaps

- Kein "Entity-Definition-Satz" auf der Homepage ("TALENTEXPERTE ist eine Fußballschule in Aachen, gegründet 2005...")
- Elfsight-Widget (Google Reviews, 5,0 Sterne) für KI-Crawler vollständig unsichtbar
- FAQ-Antworten zu kurz (40–80 Wörter; optimal: 134–167 Wörter)
- PDF-FAQ (`pdf/faq-camps.pdf`) für KI-Crawler unsichtbar

### 6.4 Brand Signals

| Platform | Status |
|----------|--------|
| YouTube | **Fehlt** — größte Brand-Signal-Lücke (Korrelation 0.737 mit AI-Citation) |
| Wikipedia/Wikidata | **Fehlt** — kein Drittanker für Entity-Resolution |
| Google Business Profile URL | In Schema nicht referenziert |
| Instagram | ✓ In `sameAs` vorhanden |

---

## 7. Sitemap — NACH KORREKTUR DURCH AUDIT

Der Sitemap-Agent hat `sitemap.xml` bereits korrigiert:
- ✓ `firmen-anmeldung.html` entfernt (war noindex, nofollow)
- ✓ `<priority>` und `<changefreq>` entfernt
- ✓ `<lastmod>` mit echten Dateidaten hinzugefügt
- ✓ 5 URLs korrekt: `/`, `/anmeldung.html`, `/impressum.html`, `/datenschutz.html`, `/agb.html`

**Sitemap muss noch deployed werden:** `./ci/deploy.sh`

---

## Dateien die Änderungen benötigen

| Datei | Priorität | Änderungen |
|-------|-----------|-----------|
| `index.html` | Kritisch | Preload-Swap, Font-Preload, Title/Description, AggregateRating, Person-Schema, Dead Preconnects, Elfsight min-height, FAQ-Expansion |
| `anmeldung.html` | Kritisch | 200–300 Wörter Prose, BreadcrumbList-Schema, H1 verbessern |
| `teams.html` | High | Echter Inhalt statt Redirect |
| `gutschein.html` | High | Echter Inhalt statt Redirect |
| `sitemap.xml` | High | Bereits korrigiert — deployen |
| `llms.txt` | High | Neu erstellen |
| nginx-Konfiguration | High | Security Headers, Redirect-Chain |
| `css/main.css` | Medium | Elfsight min-height |
