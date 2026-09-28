/**
 * TALENTEXPERTE - Automatische Google Kontakte Synchronisation
 * 
 * Dieses Script läuft automatisch alle 5-10 Minuten und synchronisiert
 * neue Anmeldungen aus dem Google Sheet in Google Kontakte.
 * 
 * Setup: Siehe GOOGLE-KONTAKTE-SYNC-ANLEITUNG.md
 */

// ============================================================
// KONFIGURATION
// ============================================================

const SHEET_NAME = 'Formular'; // Name des Sheets (meist "Tabelle1")
const CONTACT_LABEL = 'TALENTEXPERTE'; // Label für die Kontakte
const SYNCED_COLUMN = 17; // Spalte Q (0-basiert: Q = 16+1 = 17)

// ============================================================
// HAUPTFUNKTION - Wird automatisch alle 5-10 Min ausgeführt
// ============================================================

function syncToGoogleContacts() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      Logger.log('❌ Sheet "' + SHEET_NAME + '" nicht gefunden!');
      return;
    }
    
    // Alle Daten laden (ab Zeile 2, ohne Header)
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    const numRows = data.length;
    
    if (numRows <= 1) {
      Logger.log('ℹ️ Keine Daten zum Synchronisieren.');
      return;
    }
    
    // Label erstellen/finden
    const labelId = getOrCreateContactLabel(CONTACT_LABEL);
    
    let syncCount = 0;
    let skipCount = 0;
    
    // Durch alle Zeilen (außer Header) iterieren
    for (let i = 1; i < numRows; i++) {
      const row = data[i];
      
      // Spalten gemäß Template
      const id = row[0];                    // A: ID
      const anmeldungDatum = row[1];        // B: Anmeldung_Datum
      const kindVorname = row[2];           // C: Kind_Vorname
      const kindNachname = row[3];          // D: Kind_Nachname
      const geburtsdatum = row[4];          // E: Geburtsdatum
      const alter = row[5];                 // F: Alter
      const elternVorname = row[6];         // G: Eltern_Vorname
      const elternNachname = row[7];        // H: Eltern_Nachname
      const email = row[8];                 // I: Email
      const telefon = row[9];               // J: Telefon
      const adresse = row[10];              // K: Adresse
      const campName = row[11];             // L: Camp_Name
      const allergien = row[12];            // M: Allergien
      const erfahrung = row[13];            // N: Erfahrung
      const status = row[14];               // O: Status
      const betrag = row[15];               // P: Betrag
      const synced = row[16];               // Q: Synced
      
      // Überspringen wenn bereits synchronisiert
      if (synced === 'JA' || synced === 'YES') {
        skipCount++;
        continue;
      }
      
      // Überspringen wenn Pflichtfelder fehlen
      if (!kindVorname || !elternVorname || !elternNachname || !telefon) {
        Logger.log('⚠️ Zeile ' + (i+1) + ' übersprungen: Pflichtfelder fehlen');
        skipCount++;
        continue;
      }
      
      // Kontakt erstellen
      try {
        createGoogleContact({
          kindVorname: kindVorname,
          kindNachname: kindNachname,
          elternVorname: elternVorname,
          elternNachname: elternNachname,
          email: email,
          telefon: telefon,
          adresse: adresse,
          geburtsdatum: geburtsdatum,
          alter: alter,
          campName: campName,
          allergien: allergien,
          erfahrung: erfahrung,
          status: status,
          betrag: betrag,
          anmeldungDatum: anmeldungDatum
        }, labelId);
        
        // In Spalte Q "JA" eintragen
        sheet.getRange(i + 1, SYNCED_COLUMN).setValue('JA');
        
        syncCount++;
        Logger.log('✅ Zeile ' + (i+1) + ' synchronisiert: ' + kindVorname + ' ' + kindNachname + ' (Eltern: ' + elternVorname + ' ' + elternNachname + ')');
        
      } catch (error) {
        Logger.log('❌ Fehler bei Zeile ' + (i+1) + ': ' + error.message);
      }
    }
    
    Logger.log('📊 Synchronisation abgeschlossen: ' + syncCount + ' neu, ' + skipCount + ' übersprungen');
    
  } catch (error) {
    Logger.log('❌ Fehler in syncToGoogleContacts: ' + error.message);
  }
}

// ============================================================
// GOOGLE KONTAKT ERSTELLEN
// ============================================================

function createGoogleContact(data, labelId) {
  // Name = Kind, Unternehmen = Elternteil
  const displayName = data.kindVorname + ' ' + data.kindNachname;

  // Notizen mit allen wichtigen Infos
  let notes = '';
  notes += '🏕️ Camp: ' + (data.campName || '—') + '\n';
  notes += '👦 Kind: ' + data.kindVorname + ' ' + (data.kindNachname || '') + '\n';
  notes += '🎂 Geboren: ' + formatDate(data.geburtsdatum) + ' (' + (data.alter || '—') + ' Jahre)\n';

  if (data.allergien) {
    notes += '⚠️ ALLERGIEN: ' + data.allergien + '\n';
  }

  if (data.erfahrung) {
    notes += '⚽ Erfahrung: ' + data.erfahrung + '\n';
  }

  if (data.adresse) {
    notes += '📍 Adresse: ' + data.adresse + '\n';
  }

  notes += '💰 Betrag: ' + (data.betrag || '—') + ' € (' + (data.status || '—') + ')\n';
  notes += '📅 Angemeldet: ' + formatDate(data.anmeldungDatum);

  // Telefonnummer formatieren (falls nötig)
  let phoneNumber = String(data.telefon || '');

  // People API Kontakt erstellen
  const contact = {
    names: [{
      givenName: data.kindVorname,
      familyName: data.kindNachname,
      displayName: displayName
    }],
    phoneNumbers: [{
      value: phoneNumber,
      type: 'mobile'
    }],
    biographies: [{
      value: notes,
      contentType: 'TEXT_PLAIN'
    }],
    organizations: [{
      name: data.elternVorname + ' ' + data.elternNachname,
      type: 'work'
    }]
  };
  
  // E-Mail hinzufügen wenn vorhanden
  if (data.email) {
    contact.emailAddresses = [{
      value: data.email,
      type: 'work'
    }];
  }
  
  // Kontakt erstellen
  const createdContact = People.People.createContact(contact);
  
  // Label zuweisen (falls vorhanden)
  if (labelId && createdContact.resourceName) {
    try {
      People.ContactGroups.Members.modify({
        resourceNamesToAdd: [createdContact.resourceName]
      }, labelId);
    } catch (error) {
      Logger.log('⚠️ Label konnte nicht zugewiesen werden: ' + error.message);
    }
  }
  
  return createdContact;
}

// ============================================================
// LABEL ERSTELLEN ODER FINDEN
// ============================================================

function getOrCreateContactLabel(labelName) {
  try {
    // Alle Contact Groups (Labels) abrufen
    const response = People.ContactGroups.list();
    const contactGroups = response.contactGroups || [];
    
    // Suche nach bestehendem Label
    for (let group of contactGroups) {
      if (group.name === labelName) {
        Logger.log('✅ Label "' + labelName + '" gefunden: ' + group.resourceName);
        return group.resourceName;
      }
    }
    
    // Label existiert nicht → neu erstellen
    const newGroup = People.ContactGroups.create({
      contactGroup: {
        name: labelName
      }
    });
    
    Logger.log('✅ Label "' + labelName + '" erstellt: ' + newGroup.resourceName);
    return newGroup.resourceName;
    
  } catch (error) {
    Logger.log('⚠️ Fehler beim Label-Management: ' + error.message);
    return null;
  }
}

// ============================================================
// HILFSFUNKTIONEN
// ============================================================

function formatDate(dateValue) {
  if (!dateValue) return '—';
  
  try {
    let date;
    
    // Wenn es bereits ein Date-Objekt ist
    if (dateValue instanceof Date) {
      date = dateValue;
    } 
    // Wenn es ein String ist
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    }
    // Wenn es eine Zahl ist (Excel Serial Number)
    else if (typeof dateValue === 'number') {
      // Excel Serial to Date
      date = new Date((dateValue - 25569) * 86400 * 1000);
    }
    else {
      return String(dateValue);
    }
    
    // Formatierung: TT.MM.JJJJ
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return day + '.' + month + '.' + year;
    
  } catch (error) {
    return String(dateValue);
  }
}

// ============================================================
// KOMPLETT-RESYNC (alte Kontakte löschen + neu einlesen)
// ============================================================

/**
 * Führt einen vollständigen Resync durch:
 * 1. Alle Kontakte mit Label "TALENTEXPERTE" aus Google Kontakten löschen
 * 2. Spalte "Synced" im Sheet zurücksetzen
 * 3. Alle Zeilen neu synchronisieren
 *
 * ACHTUNG: Löscht alle bisherigen TALENTEXPERTE-Kontakte unwiderruflich.
 * Danach werden alle Zeilen mit dem neuen Format (Kind = Name, Eltern = Unternehmen) neu angelegt.
 */
function fullResync() {
  Logger.log('🔄 Starte vollständigen Resync...');

  // Schritt 1: Alte Kontakte löschen
  const deleted = deleteAllTalentexperteContacts();
  Logger.log('🗑️ ' + deleted + ' Kontakte gelöscht.');

  // Schritt 2: Synced-Spalte zurücksetzen
  resetSyncedColumn();
  Logger.log('🔁 Synced-Spalte zurückgesetzt.');

  // Schritt 3: Neu einlesen
  syncToGoogleContacts();
  Logger.log('✅ Resync abgeschlossen.');
}

/**
 * Löscht alle Google-Kontakte mit dem Label "TALENTEXPERTE".
 * Gibt die Anzahl gelöschter Kontakte zurück.
 */
function deleteAllTalentexperteContacts() {
  let deleted = 0;

  try {
    // Label-ID ermitteln
    const labelId = getOrCreateContactLabel(CONTACT_LABEL);
    if (!labelId) {
      Logger.log('⚠️ Label nicht gefunden, nichts zu löschen.');
      return 0;
    }

    // Alle Kontakte des Labels laden (max. 1000)
    const groupResponse = People.ContactGroups.get(labelId, {
      maxMembers: 1000
    });
    const members = (groupResponse.memberResourceNames || []);

    if (members.length === 0) {
      Logger.log('ℹ️ Keine Kontakte im Label gefunden.');
      return 0;
    }

    Logger.log('🗑️ Lösche ' + members.length + ' Kontakte...');

    // Stapelweise löschen (max. 500 pro Request)
    const chunkSize = 500;
    for (let i = 0; i < members.length; i += chunkSize) {
      const chunk = members.slice(i, i + chunkSize);
      People.People.batchDeleteContacts({ resourceNames: chunk });
      deleted += chunk.length;
      Utilities.sleep(500); // kurze Pause zwischen Stapeln
    }

  } catch (error) {
    Logger.log('❌ Fehler beim Löschen: ' + error.message);
  }

  return deleted;
}

/**
 * Setzt alle "JA"-Einträge in der Synced-Spalte auf leer,
 * damit der nächste Sync-Lauf alle Zeilen neu verarbeitet.
 */
function resetSyncedColumn() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][16] === 'JA' || data[i][16] === 'YES') {
      sheet.getRange(i + 1, SYNCED_COLUMN).setValue('');
    }
  }
}

// ============================================================
// MANUELLE TEST-FUNKTION
// ============================================================

function testSync() {
  Logger.log('🧪 Teste Synchronisation...');
  syncToGoogleContacts();
  Logger.log('✅ Test abgeschlossen. Siehe Logs oben.');
}

// ============================================================
// EINMALIGE SETUP-FUNKTION
// ============================================================

function setupTrigger() {
  // Nur den bisherigen Sync-Trigger ersetzen (andere Trigger, z. B. die
  // Allergie-Bereinigung, bleiben erhalten).
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'syncToGoogleContacts')
    .forEach(t => ScriptApp.deleteTrigger(t));
  
  // Neuen Trigger erstellen: Alle 5 Minuten
  ScriptApp.newTrigger('syncToGoogleContacts')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('✅ Trigger eingerichtet: syncToGoogleContacts läuft jetzt alle 5 Minuten.');
}


// ============================================================
// DATENSCHUTZ: ALLERGIEANGABEN 3 MONATE NACH CAMPENDE LEEREN
// ============================================================
//
// Betreiberentscheidung 28.09.2026 (docs/LOESCHKONZEPT.md): Nur die
// Allergie-/Gesundheitsangaben werden 3 Monate nach dem letzten Camptag
// entfernt – in Spalte M der Tabelle und als Zeile "⚠️ ALLERGIEN: …" in der
// Notiz der Google-Kontakte. Alle anderen Angaben bleiben unverändert.
// Dieselbe Regel läuft in Supabase (clear_expired_health_data).
//
// Einrichtung (einmalig): previewAllergyCleanup() ausführen und Log prüfen,
// dann setupAllergyCleanupTrigger() ausführen (täglich ca. 4 Uhr).

const ALLERGY_COLUMN = 13;          // Spalte M
const ALLERGY_RETENTION_MONTHS = 3;
const CAMP_API = 'https://yxygwwoocsdnneqykiym.supabase.co/rest/v1/camp_verfuegbarkeit_public?select=name,datum_bis';
const CAMP_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eWd3d29vY3Nkbm5lcXlraXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTE3ODAsImV4cCI6MjA4NjA2Nzc4MH0.DaFBgiJYfA_cFoRv-P9u_Bqjn-SnFaOJo8fRNe066-U'; // öffentlicher Anon-Key (wie auf der Website)

function previewAllergyCleanup() { return clearExpiredAllergies_(true); }
function clearExpiredAllergies() { return clearExpiredAllergies_(false); }

function setupAllergyCleanupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'clearExpiredAllergies')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('clearExpiredAllergies').timeBased().everyDays(1).atHour(4).create();
  Logger.log('✅ Trigger eingerichtet: clearExpiredAllergies läuft täglich gegen 4 Uhr.');
}

function clearExpiredAllergies_(dryRun) {
  const camps = loadCampEnds_();
  if (!camps.length) { Logger.log('❌ Keine Campdaten erhalten – Abbruch ohne Änderung.'); return; }
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - ALLERGY_RETENTION_MONTHS);
  const expired = (campName, regDate) => {
    const end = resolveCampEnd_(camps, campName, regDate);
    return end !== null && end < cutoff;
  };

  // 1) Tabelle
  let sheetCount = 0;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const allergien = String(data[i][ALLERGY_COLUMN - 1] || '').trim();
      if (!allergien) continue;
      if (!expired(data[i][11], parseDeDate_(data[i][1]))) continue;
      sheetCount++;
      if (!dryRun) sheet.getRange(i + 1, ALLERGY_COLUMN).setValue('');
    }
  }

  // 2) Google-Kontakte mit Label TALENTEXPERTE
  let contactCount = 0;
  const labelId = getOrCreateContactLabel(CONTACT_LABEL);
  if (labelId) {
    const members = People.ContactGroups.get(labelId, { maxMembers: 1000 }).memberResourceNames || [];
    for (let i = 0; i < members.length; i += 200) {
      const batch = People.People.getBatchGet({ resourceNames: members.slice(i, i + 200), personFields: 'biographies' });
      (batch.responses || []).forEach(r => {
        const person = r.person;
        const bio = person && person.biographies && person.biographies[0];
        if (!bio || bio.value.indexOf('⚠️ ALLERGIEN:') === -1) return;
        const camp = (bio.value.match(/🏕️ Camp: (.+)/) || [])[1];
        const reg = parseDeDate_((bio.value.match(/📅 Angemeldet: (\d{2}\.\d{2}\.\d{4})/) || [])[1]);
        if (!expired(camp ? camp.trim() : '', reg)) return;
        contactCount++;
        if (dryRun) return;
        const cleaned = bio.value.split('\n').filter(line => line.indexOf('⚠️ ALLERGIEN:') !== 0).join('\n');
        People.People.updateContact(
          { etag: person.etag, biographies: [{ value: cleaned, contentType: 'TEXT_PLAIN' }] },
          person.resourceName,
          { updatePersonFields: 'biographies' });
        Utilities.sleep(300);
      });
    }
  }

  Logger.log((dryRun ? '🔎 Vorschau – nichts geändert. ' : '🧹 Bereinigt. ') +
    'Tabelle: ' + sheetCount + ' Zeilen, Kontakte: ' + contactCount + ' (Campende vor ' + formatDate(cutoff) + ').');
  return { sheet: sheetCount, contacts: contactCount, dryRun: dryRun };
}

function loadCampEnds_() {
  const res = UrlFetchApp.fetch(CAMP_API, {
    headers: { apikey: CAMP_API_KEY, Authorization: 'Bearer ' + CAMP_API_KEY },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) return [];
  return JSON.parse(res.getContentText())
    .map(c => ({ name: String(c.name || '').trim(), end: new Date(c.datum_bis + 'T23:59:59') }));
}

// Camp mit passendem Namen, das als erstes nach der Anmeldung endet
// (Campnamen wiederholen sich jährlich). Unklar → null (nichts ändern).
function resolveCampEnd_(camps, campName, regDate) {
  const name = String(campName || '').trim();
  if (!name || !regDate) return null;
  const candidates = camps.filter(c => c.name === name && c.end >= regDate).sort((a, b) => a.end - b.end);
  return candidates.length ? candidates[0].end : null;
}

function parseDeDate_(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const m = String(value).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}
