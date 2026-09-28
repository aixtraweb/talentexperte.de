# Zahlungsrückfragen prüfen und verbuchen

Stand: 20. Juli 2026
Dokumentationsstatus: bestätigt durch Live-Prüfung von Supabase, Stripe und Admin-Logik
Geltungsbereich: einzelne Rückfragen von Eltern zu Zahlungseingang, Teilnahmefreigabe und fehlerhaften Zahlungserinnerungen

## Verbindlicher Startpunkt

- **Bestätigt:** In diesem Projekt besteht ein funktionsfähiger operativer Zugriff auf das verknüpfte TALENTEXPERTE-Supabase-Projekt und das TALENTEXPERTE-Stripe-Konto. Eine weitere Rückfrage des Nutzers, ob diese Zugänge vorhanden sind, ist nicht erforderlich.
- Eine weitergeleitete Elternmail, ein Name, eine E-Mail-Adresse, ein Betrag oder ein Zahlungsdatum lösen unmittelbar den folgenden Live-Abgleich aus.
- Supabase/Admin-Dashboard und Stripe sind gemeinsam zu prüfen. Gmail, Google Sheets, Kontakte, CSV-Exporte und alte Berichte sind keine verbindlichen Zahlungsquellen.
- Vor jeder Prüfung muss die aktive Identität TALENTEXPERTE sein. Bestätigte Kennzeichen sind das Supabase-Projekt dieses Repositorys und im Stripe-Konto die Geschäftsbezeichnung `FUSSBALLSCHULE TALENTEXPERTE` beziehungsweise der Dashboardname `talentexperte.de`. Eine AIXTRA-WEB-Identität stoppt den Vorgang.
- Zugangsdaten werden nur aus der geschützten lokalen oder serverseitigen Umgebung verwendet. Werte dürfen weder ausgegeben noch in Markdown, Logs, Chat, Shell-Historie oder Git übernommen werden.

## Verfügbare Zugangswege

### Supabase und Admin-Dashboard

- Der Repository-Ordner ist mit dem produktiven Supabase-Projekt verknüpft. Gezielte Read-only-Abfragen sind mit `supabase db query --linked` möglich.
- Das Admin-Dashboard unter `https://www.talentexperte.de/admin.html` ist die operative Oberfläche auf dieselben Supabase-Daten. Eine fehlende Browseranmeldung ist kein Grund, den Zahlungsabgleich abzubrechen, solange der verknüpfte Supabase-Operationszugang funktioniert.
- Änderungen werden bevorzugt über das authentifizierte Dashboard ausgeführt. Wenn dort keine Sitzung verfügbar ist, sind eng begrenzte, transaktionale und vorab geprüfte SQL-Updates über den verknüpften Supabase-Zugang zulässig.

### Stripe einschließlich PayPal in Stripe

- Die geschützte Edge Function `stripe-payment-search` dient der fokussierten Suche nach E-Mail-, Namens- und Beschreibungsfragmenten.
- Für Detailprüfungen steht in der privaten, gitignorierten Operationsumgebung `steuerberater/.env` die Variable `STRIPE_SK` zur Verfügung. Sie darf nur prozessintern verwendet werden.
- Vor einem direkten Stripe-API-Aufruf ist das Konto über `/v1/account` als TALENTEXPERTE zu bestätigen.
- PayPal-Zahlungen können innerhalb von Stripe erscheinen. In diesem Fall stehen die entscheidenden Angaben häufig unter `payment_method_details.paypal`, insbesondere Zahlername und PayPal-E-Mail. Diese können von Stripe-Billing-E-Mail und Anmelde-E-Mail abweichen.

## Ablauf bei jeder Zahlungsrückfrage

### 1. Anmeldung in Supabase bestimmen

Gezielt suchen nach:

1. vollständigem Kindesnamen;
2. der in der Nachricht genannten E-Mail-Adresse;
3. der in der Anmeldung gespeicherten E-Mail-Adresse;
4. Elternname und Camp, falls mehrere Treffer existieren.

Mindestens diese Felder prüfen:

```text
id, vorname, nachname, email, created_at, camp_id,
payer_type, parent_amount_euro, parent_payment_status,
zahlungsstatus, zahlung_am, stripe_payment_id,
erinnerung_gesendet_am, payment_deadline_reminder_sent_at,
storniert_am, storno_grund, notizen
```

Zusätzlich Campname, `datum_von` und `datum_bis` aus `camps` laden. Sponsor- und Firmenanmeldungen nicht in die Elternzahlungsprüfung übernehmen.

### 2. Stripe systematisch durchsuchen

In dieser Reihenfolge suchen:

1. Anmelde-ID, `client_reference_id`, Payment Intent oder vorhandene Stripe-ID;
2. Anmelde-E-Mail;
3. abweichende E-Mail aus der Elternnachricht;
4. Nachname und Kontoinhaber;
5. Betrag in einem engen Zeitfenster um Anmeldung oder genanntes Abbuchungsdatum.

Bei einem möglichen Treffer die einzelne Charge und den Payment Intent prüfen:

```text
amount, currency, status, paid, refunded, created,
billing_details, receipt_email, metadata,
payment_intent, payment_method_details
```

Nur `status='succeeded'`, passender EUR-Betrag und `refunded=false` gelten als erfolgreicher Eingang. Eine Abbuchung auf dem Kontoauszug allein beweist nicht, dass Stripe den Vorgang erfolgreich abgeschlossen und nicht später erstattet hat.

### 3. Eindeutigkeit bewerten

Die Zuordnung ist eindeutig, wenn mindestens einer dieser Fälle vorliegt:

- Stripe enthält die konkrete Anmeldungs-ID und der Betrag stimmt exakt.
- Payment Intent, E-Mail, Betrag und Zeitfenster passen eindeutig zu genau einer Anmeldung.
- Bei abweichender E-Mail passen Kontoinhaber oder PayPal-Zahler, Betrag, Zahlungsdatum, Anmeldezeitpunkt und Kind/Camp ohne konkurrierenden Datensatz zusammen.
- Eine gemeinsame Zahlung entspricht exakt der Summe mehrerer klar zusammengehöriger Geschwisteranmeldungen; Zeitpunkt, Elternkontakt und Campkontext widersprechen der Zuordnung nicht.

Bei mehreren plausiblen Kandidaten, abweichendem Betrag, Erstattung, falscher Währung oder fehlendem Personenbezug bleibt der Status unverändert. Der konkrete Konflikt ist zu nennen; es darf keine Zahlung geraten oder doppelt verwendet werden.

### 4. Zahlung sicher verbuchen

Für eine eindeutige Einzelzahlung werden gemeinsam aktualisiert:

```text
zahlungsstatus = 'bezahlt'
parent_payment_status = 'paid'
zahlung_am = tatsächlicher erfolgreicher Zahlungszeitpunkt
stripe_payment_id = eindeutiger Payment Intent
```

Das Update muss auf die konkrete UUID, `payer_type='parent'`, erwarteten Betrag und bisherigen Status begrenzt sein. Anschließend den zurückgegebenen Datensatz erneut prüfen.

Für eine gemeinsame Zahlung über mehrere Kinder gelten zusätzliche Regeln:

- Gesamtbetrag nur verteilen, wenn er exakt der Summe der einzelnen Elternbeträge entspricht.
- Jeden Datensatz mit seinem Teilbetrag als bezahlt markieren und die gemeinsame Zahlung in `notizen` nachvollziehbar dokumentieren.
- Denselben Payment Intent nicht als einzeln erstattbare `stripe_payment_id` in mehrere Datensätze schreiben. Sonst könnte eine Einzel-Erstattung den Gesamtbetrag mehrfach oder vollständig zurückzahlen.
- Eine Erstattung einer gemeinsamen Zahlung ist anschließend nur als gesonderter, manuell geprüfter Vorgang zulässig.

Bank- oder Barzahlungen dürfen nur nach tatsächlicher externer Bestätigung als bezahlt markiert werden. Wenn Stripe keinen Treffer enthält und kein bestätigter Bank-/Barbeleg zugänglich ist, bleibt die Forderung offen.

### 5. Stammdaten schützen

- Namen aus der ursprünglichen Anmeldung sind maßgeblich. Eine am Telefon verstandene Schreibweise überschreibt die Selbsteingabe der Eltern nicht ohne ausdrückliche Bestätigung.
- Eine Stripe-, PayPal- oder Absender-E-Mail ersetzt nicht automatisch die Kontaktadresse der Anmeldung. Abweichungen werden für die Zahlungszuordnung verwendet und bei Bedarf intern dokumentiert.
- Keine personenbezogenen Einzelfälle, E-Mail-Adressen, Payment IDs oder Transaktionsnummern in dauerhafte Projektdokumentation oder Git übernehmen.

### 6. Erinnerungen und Teilnahme abschließend prüfen

Nach der Verbuchung muss bestätigt sein:

```text
parent_payment_status = 'paid'
zahlungsstatus = 'bezahlt'
storniert_am is null
keine offene email_outbox-Nachricht
kein Treffer im manuellen Reminder-Filter
kein Treffer im automatischen Zahlungsfrist-Filter
```

Bereits versendete Erinnerungen können nicht zurückgerufen werden. Der bezahlte Status verhindert weitere Zahlungsaufforderungen und eine automatische Freigabe des Platzes.

## Antwort an den Nutzer

Das Ergebnis knapp mit folgenden Punkten melden:

1. Zahlung gefunden oder nicht gefunden;
2. Betrag, Zahlungsdatum und Zahlungsweg;
3. zugeordnete Anmeldung und Camp;
4. neuer oder unveränderter Zahlungsstatus;
5. Erinnerungs- und Stornierungsstatus;
6. relevante Ursache, beispielsweise abweichende E-Mail-Adresse.

Eine Elternmail darf nur entworfen werden, wenn dies zur Anfrage passt. Sie darf nicht ohne ausdrücklichen Versandauftrag gesendet werden.

## Verwandte Dokumente

- [`../PROJEKT-HANDBUCH.md`](../PROJEKT-HANDBUCH.md)
- [`INTEGRATIONS.md`](INTEGRATIONS.md)
- [`DATA-MODEL.md`](DATA-MODEL.md)
- [`DECISIONS.md`](DECISIONS.md)
- [`../RUNBOOK.md`](../RUNBOOK.md)
