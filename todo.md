# TODO – TALENTEXPERTE Admin-Dashboard

_Letzte Aktualisierung: 2026-03-29 (Sitzung 2)_

---

## ✅ Erledigt (Sitzung 2 – Anwesenheit)

- [x] **Anwesenheits-Tab** – Neuer Tab "📅 Anwesenheit" im Admin-Dashboard
- [x] **Anwesenheitsliste** – Alle Kinder eines Camps (privat + SG + ÖF) in einer gemeinsamen Tabelle
- [x] **Tages-Checkboxen** – Automatisch aus Camp-Datum generiert, speichert sofort
- [x] **Sprint / Torschuss / Dribbling** – Zahleneingabe pro Kind, speichert on blur
- [x] **Tageszusammenfassung** – Zähler pro Tag (z.B. 8/12 Kinder anwesend)
- [x] **Sortierung nach Vorname**
- [x] **Timezone-Fix** – Off-by-one-Tag bei UTC+2 behoben
- [x] **Supabase-Tabelle `teilnahme`** – Schema erstellt und deployed

---

## ✅ Erledigt (Sitzung 1)

- [x] **Manuelle Anmeldung erfassen** – Modal im Admin-Dashboard, alle Pflichtfelder, POST direkt in Supabase (`anmeldungen`)
- [x] **Zahlungsstatus manuell ändern** – Dropdown im Detail-Panel: Offen / Bezahlt (Banküberweisung) / Bezahlt (Barzahlung) / Storniert / Erstattet
- [x] **Barzahlung als Zahlungsweg** – Option in Detail-Panel und im manuellen Erfassungsformular
- [x] **Anmeldungsdaten bearbeiten** – Edit-Modal (✏️-Button in Tabelle und Detail-Panel), alle Felder änderbar per PATCH
- [x] **Spalten ausblenden** – Toggle-Buttons „Eltern" und „Betrag"; standardmäßig ausgeblendet
- [x] **„Mitarbeiter" → „Saint-Gobain"** – Filterbutton und Badge umbenannt (Badge-Farbe: lila)
- [x] **ÖF (Förderverein)** – Neuer Typ mit türkisem Badge, eigenem Filterbutton, Betrag 0, Status automatisch „bezahlt"; Marker `[TYP:ÖF]` in `notizen`; Erkennung in normalize()
- [x] **Aktions-Button „✓ Bezahlt" → „→ Bezahlt"** – Kein visueller Widerspruch zum OFFEN-Badge mehr
- [x] **E-Mail-Farbe** – Grau wie Telefon (nicht mehr rot)
- [x] **Deploy-Script Berechtigungen** – Lokale Datei-Permissions auf 644 gesetzt; kein 403-Fehler mehr nach Deploy
- [x] **apiPost-Fehlerbehandlung** – Gibt echten Supabase-Fehlertext im Toast aus

---

## 🔲 Offen

- [ ] **Anwesenheit: Daten aus Google Sheet übertragen** – Bisherige Werte (Sprint, Torschuss, Dribbling) aus dem alten Google Sheet manuell eintragen oder per Script importieren
- [ ] **Anwesenheit: Export** – CSV-Export der Anwesenheits- und Leistungsdaten (analog zu Anmeldungs-Export)
- [ ] **ÖF-Anmeldungen einpflegen** – Werden vom Nutzer selbst manuell hinzugefügt (über „Manuell erfassen" → Typ: ÖF)
- [ ] **Spalten-Toggle persistieren** – Aktuell nur im Arbeitsspeicher; bei Bedarf per localStorage dauerhaft speichern
- [ ] **Stripe-Webhook Monitoring** – Gelegentlich prüfen ob alle neuen Zahlungen korrekt ankommen (Status-Seite: STRIPE-SUPABASE-STATUS.md)
