# TODO – TALENTEXPERTE Admin-Dashboard

_Letzte Aktualisierung: 2026-03-29_

---

## ✅ Erledigt (diese Sitzung)

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

- [ ] **ÖF-Anmeldungen einpflegen** – Werden vom Nutzer selbst manuell hinzugefügt (über „Manuell erfassen" → Typ: ÖF)
- [ ] **Manuelle Anmeldung testen** – Speicherfehler trat auf (wahrscheinlich `status`-Feld); mit aktueller Version erneut prüfen
- [ ] **Spalten-Toggle persistieren** – Aktuell nur im Arbeitsspeicher; bei Bedarf per localStorage dauerhaft speichern
- [ ] **Stripe-Webhook Monitoring** – Gelegentlich prüfen ob alle neuen Zahlungen korrekt ankommen (Status-Seite: STRIPE-SUPABASE-STATUS.md)
