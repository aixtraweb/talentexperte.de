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
  // Alle bestehenden Trigger löschen
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  
  // Neuen Trigger erstellen: Alle 5 Minuten
  ScriptApp.newTrigger('syncToGoogleContacts')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('✅ Trigger eingerichtet: syncToGoogleContacts läuft jetzt alle 5 Minuten.');
}
