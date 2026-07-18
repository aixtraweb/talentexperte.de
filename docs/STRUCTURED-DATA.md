# Strukturierte Daten

Stand: 18. Juli 2026
Dokumentationsstatus: bestätigt durch lokale JSON-Parse-Prüfung; nicht live validiert
Geltungsbereich: JSON-LD in `index.html` und `anmeldung.html`

## Eingesetzte Typen

### `index.html`

| Typ | `@id`/Umfang | Status |
|---|---|---|
| `LocalBusiness` + `SportsActivityLocation` | `/#localbusiness` | eingebunden |
| `Person` Alejandro Medina | `/#inhaber-alejandro-medina` | eingebunden |
| `Person` Elias Medina | `/#trainer-elias-medina` | eingebunden |
| `Organization` | `/#organization` | eingebunden |
| `WebSite` | `/#website` | eingebunden |
| sechs `Event` | Oster I/II, Sommer I/II, Herbst I/II | eingebunden |
| `FAQPage` | `/#faq` | eingebunden |

### `anmeldung.html`

| Typ | Umfang | Status |
|---|---|---|
| `WebPage` | Anmeldeseite | eingebunden |
| sechs `Event` | gleicher Campzyklus | eingebunden |
| `BreadcrumbList` | Startseite → Anmeldung | eingebunden |

## Datenquellen

- **Bestätigt:** Markendaten, Personenrollen, Kontakt und Standort sind derzeit statisch im HTML.
- **Bestätigt:** Eventdaten und Offers sind derzeit statisch in beiden HTML-Dateien dupliziert.
- **Bestätigt:** sichtbare Campauswahl lädt dynamisch aus Supabase.
- **Risiko:** JSON-LD aktualisiert sich nicht automatisch mit Supabase und kann abweichen.

## Verbindliche Regeln

- JSON muss syntaktisch parsebar sein und im `<script type="application/ld+json">` liegen.
- `@id` stabil halten und Beziehungen über IDs statt konkurrierende Entitäten modellieren.
- `Event` benötigt mindestens Name, Start/Ende, Status, Ort, Veranstalter und Offer, soweit tatsächlich belegt.
- Eventstatus: vergangen `EventCompleted`, künftig `EventScheduled`; Verfügbarkeit separat im Offer.
- `Offer.price`, `priceCurrency`, `availability` und Ziel-URL nur nach aktueller Prüfung ändern.
- Sichtbare FAQ-Frage/-Antwort und `FAQPage.mainEntity` wortsinngleich halten.
- Breadcrumb muss der realen Nutzerhierarchie entsprechen.
- Personrollen nicht vermischen; Rechtsverantwortung, Inhaber und sportliche Leitung nur nach belegter Quelle benennen.
- Geschäftsadresse und Camp-Ort nicht zu einer Adresse zusammenziehen.

## Nicht aktuell eingesetzt

- `Product`, `Article`, `WebPage` auf der Startseite und Breadcrumbs außerhalb der Anmeldung sind nicht als produktiv bestätigt.
- Ein klassisches Produkt-/Shop-Schema ist nicht passend, solange Camps als Events/Services über eine Registrierungsstrecke angeboten werden.
- AggregateRating-Felder sind aus der lokalen Typinventur nicht als eigener Typ erkennbar; falls als Eigenschaft vorhanden/geplant, Zahlen nur live belegt einsetzen.

## Änderungsablauf für Camps

1. Camp in Supabase/live prüfen.
2. sichtbare Campkarten in `index.html` prüfen.
3. Eventgraph in `index.html` aktualisieren.
4. Eventgraph in `anmeldung.html` aktualisieren.
5. dynamische Campauswahl und Statusverhalten testen.
6. Sitemap/Detailseiten prüfen.
7. beide JSON-LD-Blöcke lokal parsen und extern validieren.

## Validierung

Lokale Syntaxprüfung:

```bash
node - <<'NODE'
const fs = require('fs');
for (const file of ['index.html', 'anmeldung.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.parse(match[1]);
  }
  console.log(`${file}: JSON-LD parsebar`);
}
NODE
```

Zusätzlich nach Veröffentlichung Google Rich Results Test beziehungsweise Schema.org Validator verwenden. Warnungen nicht automatisch als Fehler oder Freigabe interpretieren; Inhalt und Google-Richtlinien prüfen.

## Offene Punkte

- **Offen:** aktueller Live-Validierungsstatus und Rich-Result-Berichte.
- **Offen:** ob Eventpreise dauerhaft 149 EUR bleiben; Supabase entscheidet.
- **Offen:** ob Bewertungsanzahl/Rating als Markup fachlich und richtlinienkonform gepflegt werden soll.
- **Empfehlung:** Eventdaten künftig aus einer kontrollierten Quelle generieren, ohne einen neuen Build-Schritt einzuführen, bevor Wartungs- und Deploymentprozess geklärt sind.
