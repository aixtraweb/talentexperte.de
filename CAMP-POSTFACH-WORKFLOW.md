# TALENTEXPERTE – Camp-Postfach-Workflow

Stand: 20. August 2026
Zweck: Eltern- und Einrichtungsanfragen im TALENTEXPERTE-Postfach schnell, korrekt und als unversendete Entwürfe bearbeiten.

## Kurzauftrag

Eine Anweisung wie „Bitte beantworte die offenen Camp-Anfragen“ bedeutet:

1. Im Postfach `kontakt@talentexperte.de` nur relevante Eltern-, Einrichtungs- und Campanfragen auswählen; Werbung, Rechnungen und technische Benachrichtigungen überspringen.
2. Die konkrete Anmeldung live in Supabase prüfen. Für Zahlungsfragen zusätzlich Stripe nach dem verbindlichen Zahlungs-Workflow prüfen.
3. Einen Antwortentwurf im selben Mail-Thread erstellen, aber niemals versenden.
4. Den passenden FAQ-Anhang einfügen und im Text darauf hinweisen.

## Verbindliche Schreibregeln

- Nach der Anrede stehen zwei Zeilenumbrüche. Der erste Buchstabe des folgenden Satzes wird kleingeschrieben, zum Beispiel: `Sehr geehrter Herr Hübsch,` gefolgt von `vielen Dank …`.
- Zwischen dem letzten inhaltlichen Satz und der Signatur steht nur ein Zeilenwechsel; keine zusätzlichen Leerabsätze.
- Klar, freundlich, kurz und in der Sie-Ansprache schreiben.
- Ausschließlich die in Apple Mail hinterlegte, formatierte Signatur `TALENTEXPERTE` nutzen. Keine selbst gebaute Signatur, keine AIXTRA-WEB-Identität.
- Entwürfe bleiben geöffnet oder werden als Entwurf gespeichert. Der Nutzer versendet selbst.
- Daten, Zahlungen, Plätze, Termine und Teilnahme nur nach Live-Abgleich behaupten.
- Zahlungslinks erst nach einem erfolgreichen Abruf des persönlichen Zahlungslinks prüfen. Ein Link, der eine abgelaufene oder inaktive Anmeldung meldet, wird niemals in einen Entwurf übernommen.

## Live-Prüfung vor jeder Antwort

### Teilnahme und Campdaten

In Supabase nach Kind, Elternkontakt und Camp suchen. Prüfen:

- Anmeldung vorhanden und nicht storniert;
- Campname, Zeitraum und Tageszeiten;
- Finanzierungsart (`payer_type`);
- bei Sponsoring: Sponsorpartner und dass `parent_payment_status = not_required` sowie der Elternbetrag 0 ist.

### Zahlung

Für Elternzahlungsfragen gilt zusätzlich `docs/PAYMENT-INQUIRY-WORKFLOW.md`:

- Supabase und Stripe gemeinsam prüfen;
- niemals aus E-Mail, Tabelle oder bloßer Kontobehauptung auf einen Zahlungseingang schließen;
- Sponsor- und Firmenfälle niemals als offene Elternzahlung behandeln.

## FAQ-Anhänge

| Fall | Anhang |
| --- | --- |
| Reguläre Elternzahlung ohne Gutschein | `pdf/faq-camps.pdf` |
| Gutschein-/Sponsoringfall, einschließlich Öcher Fans for Kenger e.V. | `pdf/faq-camps-sponsoring.pdf` |
| Mitarbeiter-/Firmenanmeldung, einschließlich Saint-Gobain | `pdf/faq-camps-mitarbeiter.pdf` |

Der Entwurf enthält einen kurzen Verweis, etwa: „Weitere Informationen finden Sie in der beigefügten FAQ.“

## Antwortbausteine

### Teilnahme bestätigt

> Die Anmeldung von [Kind] für [Camp] ist bei uns eingegangen. [Er/Sie] kann selbstverständlich teilnehmen.

### Sponsoring über Öcher Fans for Kenger e.V.

> Die Anmeldung erfolgt über den Gutscheincode von Öcher Fans for Kenger e.V. Für Sie entsteht daher keine Zahlungspflicht.

### Offene oder unklare Zahlung

Keine Zahlungszusage formulieren. Erst nach dem vollständigen Supabase- und Stripe-Abgleich den tatsächlichen Status nennen; bei Unklarheit freundlich um eine prüfbare Angabe bitten.

### Persönlicher Stripe-Zahlungslink

- Für reaktivierte oder offene Elternzahlungen den sicheren Link aus `zahlung-start.html` verwenden, nicht den bloßen Stripe-Link.
- Den Link vor dem Entwurf mit `register` / `get_confirmation` auf `zahlungsstatus = offen`, `parent_payment_status = open` und fehlende Freigabemarkierung prüfen.
- Der Zahlungsaufruf wird ausschließlich als HTML-Button nach [`templates/parent-payment-response.html`](templates/parent-payment-response.html) dargestellt: TALENTEXPERTE-Rot `#e50000`, weiße fette Schrift, 14 × 32 px Innenabstand und 8 px Rundung.
- Der normale Apple-Mail-Rich-Text-Editor ist keine geeignete Quelle für diesen Button. Für Zahlungsantworten die HTML-Vorlage einsetzen; keine improvisierte Link-Zeile oder farbige Textformatierung verwenden.

## Ablauf im Apple-Mail-Entwurf

1. Auf die relevante Nachricht antworten.
2. Absender `kontakt@talentexperte.de` und Signatur `TALENTEXPERTE` prüfen.
3. Antwort oberhalb der bestehenden Signatur einfügen.
4. Den Cursor ans Ende der formatierten Signatur setzen und erst dort im Menü „Anhang“ die passende FAQ-PDF aus dem Projektordner auswählen. Die PDF wird damit unterhalb der Signatur dargestellt.
5. Empfänger, Betreff, Text, PDF-Anhang und Signatur kurz prüfen.
6. Nicht senden.

## Standardabschluss an den Nutzer

Kurz bestätigen: relevante Anmeldung geprüft, Entwurf mit richtiger FAQ erstellt und nicht versendet. Nur bei fehlenden oder widersprüchlichen Live-Daten eine konkrete Rückfrage stellen.
