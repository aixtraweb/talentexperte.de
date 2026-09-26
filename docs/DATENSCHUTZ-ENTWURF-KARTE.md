# Entwurf: Datenschutzerklärung – Karte und Live-Verfügbarkeit

Stand: 26. September 2026
Dokumentationsstatus: **Entwurf – nicht veröffentlicht.** Vor Übernahme in `datenschutz.html` durch den Betreiber bzw. eine Rechtsberatung prüfen und freigeben.
Geltungsbereich: `index.html` (Abschnitt „Standort“ und Camp-Termine), `datenschutz.html`

## Technischer Ist-Stand (geprüft 26.09.2026)

| Funktion | Was passiert beim Besuch | Empfänger |
|---|---|---|
| Kartenbibliothek Leaflet 1.9.4 | wird seit 26.09.2026 **vom eigenen Server** geladen (`vendor/leaflet-1.9.4/`) | keine Übermittlung an Dritte |
| Kartenkacheln | werden automatisch geladen, sobald der Abschnitt „Standort“ in den sichtbaren Bereich kommt (Lazy Load, keine Einwilligung) | OpenStreetMap Foundation (Kachelserver `tile.openstreetmap.org`, ausgeliefert über ein CDN) |
| Button „Route planen“ | nur beim Anklicken: Weiterleitung zu Google Maps mit der Zieladresse | Google (erst nach Klick, Seite wird verlassen) |
| Live-Anzeige „X Plätze frei“ | beim Laden der Startseite wird die Zahl freier Plätze abgefragt; es werden keine personenbezogenen Formulardaten gesendet | Supabase (Datenbank-Dienstleister, Projekt in der EU-Region zu prüfen) |

Übermittelte Daten an den Kachelserver: IP-Adresse, Datum/Uhrzeit, angefragter Kartenausschnitt, Browser-/Geräteinformationen (User-Agent), Referrer (`www.talentexperte.de`). Es werden durch die Karte keine Cookies gesetzt.

## Textvorschlag (neuer Abschnitt, z. B. „8. Karten und Plugins“)

> **8. Plugins und Tools**
>
> **OpenStreetMap**
>
> Auf unserer Website zeigen wir den Standort unserer Camps (Branderhofer Weg 15, 52066 Aachen) auf einer Karte an. Die Kartendarstellung erfolgt mit der Open-Source-Bibliothek Leaflet, die wir auf unserem eigenen Server bereitstellen. Die Kartenbilder (Kacheln) werden vom Kartendienst OpenStreetMap geladen. Anbieter ist die OpenStreetMap Foundation (OSMF), St John's Innovation Centre, Cowley Road, Cambridge, CB4 0WS, Vereinigtes Königreich.
>
> Sobald Sie den Kartenbereich unserer Website aufrufen, stellt Ihr Browser eine Verbindung zu den Servern der OpenStreetMap Foundation her. Dabei werden insbesondere Ihre IP-Adresse, Datum und Uhrzeit des Abrufs, der angefragte Kartenausschnitt sowie technische Informationen zu Ihrem Browser übermittelt. Die OSMF nutzt für die Auslieferung der Kartenkacheln Dienstleister (Content-Delivery-Netzwerk). Cookies werden durch die Kartendarstellung auf unserer Website nicht gesetzt.
>
> Die Nutzung von OpenStreetMap erfolgt im Interesse einer ansprechenden Darstellung unseres Angebots und einer leichten Auffindbarkeit des Trainingsgeländes. Dies stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f DSGVO dar. Für die Übermittlung in das Vereinigte Königreich besteht ein Angemessenheitsbeschluss der EU-Kommission. *[Prüfen: aktueller Stand des Angemessenheitsbeschlusses für das Vereinigte Königreich.]*
>
> Weitere Informationen finden Sie in der Datenschutzerklärung der OpenStreetMap Foundation: https://osmfoundation.org/wiki/Privacy_Policy
>
> **Routenplanung über Google Maps**
>
> Unter der Karte bieten wir einen Link „Route planen“ an. Erst wenn Sie diesen Link anklicken, werden Sie zu Google Maps weitergeleitet (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Ab diesem Zeitpunkt gilt die Datenschutzerklärung von Google: https://policies.google.com/privacy. Vor dem Klick werden keine Daten an Google übermittelt.
>
> **Anzeige freier Camp-Plätze**
>
> Auf der Startseite zeigen wir die aktuell freien Plätze der Camps an. Dazu fragt Ihr Browser beim Laden der Seite die Platzzahlen bei unserem Datenbank-Dienstleister Supabase ab (Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992 *[Anschrift prüfen]*). Dabei wird technisch bedingt Ihre IP-Adresse übermittelt; weitere personenbezogene Daten werden nicht gesendet. Die Verarbeitung erfolgt auf Grundlage unseres berechtigten Interesses an einer aktuellen und korrekten Information über verfügbare Plätze (Art. 6 Abs. 1 lit. f DSGVO). *[Prüfen: Serverregion des Supabase-Projekts, Auftragsverarbeitungsvertrag (DPA) und – falls Übermittlung in Drittländer – Standardvertragsklauseln; ggf. gemeinsam mit dem Abschnitt zur Camp-Anmeldung formulieren.]*

## Alternative mit Einwilligung (datensparsamer)

Statt automatischem Laden kann die Karte erst nach Klick auf „Karte anzeigen“ geladen werden (Zwei-Klick-Lösung). Dann genügt im Text: „Die Karte wird erst geladen, wenn Sie dies durch Klick ausdrücklich wünschen (Art. 6 Abs. 1 lit. a DSGVO bzw. § 25 Abs. 1 TDDDG).“ Technisch ist das eine kleine Änderung in `index.html` (Platzhalterbild + Button statt IntersectionObserver). Auf Wunsch umsetzbar.

## Weitere Lücken in `datenschutz.html` (außerhalb dieses Entwurfs)

Die Datenschutzerklärung nennt bislang **keinen** der eingesetzten Dienstleister namentlich. Nicht bzw. nur allgemein beschrieben sind unter anderem:

- Hoster (r20.hostingwerk.de) – Abschnitt „Externes Hosting“ ohne Namen/Anschrift;
- Supabase (Speicherung der Anmeldungen), Resend (Bestätigungs-E-Mails), Stripe (Zahlung; Abschnitt 7 nennt nur „Kreditinstitut“);
- Elfsight (Instagram-Widget, lädt Skripte von `elfsightcdn.com`, aktuell deaktiviert);
- Abschnitt „Newsletter“, obwohl kein Newsletter-Formular erkennbar ist.

Empfehlung: Datenschutzerklärung insgesamt mit einem aktuellen Generator oder einer Rechtsberatung neu aufsetzen und dabei die obigen Abschnitte übernehmen.
