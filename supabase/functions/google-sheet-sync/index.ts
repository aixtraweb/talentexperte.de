/**
 * TALENTEXPERTE - Google Sheets Sync Edge Function
 * ERWEITERTE VERSION - Unterstützt normale + Firmen-Anmeldungen
 *
 * Diese Funktion wird automatisch bei neuen Anmeldungen aufgerufen
 * und schreibt die Daten ins Google Sheet.
 *
 * Trigger: Database Trigger auf INSERT in anmeldungen + firmen_anmeldungen
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  AdminAuthError,
  requireDashboardAdmin,
} from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// ============================================================
// TYPEN
// ============================================================

interface AnmeldungData {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  eltern_vorname: string;
  eltern_nachname: string;
  email: string;
  telefon: string;
  adresse: string | null;
  erfahrung: string | null;
  allergien: string | null;
  status: string;
  betrag_euro: number;
  created_at: string;
  camp_id: string;
}

interface FirmenAnmeldungData {
  id: string;
  firma_name: string;
  kind_vorname: string;
  kind_nachname: string;
  kind_geburtsdatum: string;
  mitarbeiter_vorname: string;
  mitarbeiter_nachname: string;
  mitarbeiter_email: string | null;
  mitarbeiter_telefon: string;
  firma_email: string;
  firma_telefon: string;
  rechnungsadresse: string | null;
  erfahrung: string | null;
  allergien: string | null;
  status: string;
  betrag_euro: number;
  created_at: string;
  camp_id: string;
}

// ============================================================
// JWT FÜR GOOGLE API ERSTELLEN
// ============================================================

async function createGoogleJWT(
  serviceAccountEmail: string,
  privateKey: string,
): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj);
    return btoa(json)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\\n/g, "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(unsignedToken);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    data,
  );

  const signatureBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${unsignedToken}.${signatureBase64}`;
}

// ============================================================
// ACCESS TOKEN HOLEN
// ============================================================

async function getGoogleAccessToken(
  serviceAccountEmail: string,
  privateKey: string,
): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccountEmail, privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// ============================================================
// ZEILE ZU GOOGLE SHEET HINZUFÜGEN
// ============================================================

async function appendRowToSheet(
  accessToken: string,
  sheetId: string,
  values: any[],
): Promise<void> {
  const range = "Formular!A:R"; // Spalten A bis R (mit Typ-Spalte)

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [values],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to append row: ${error}`);
  }
}

// ============================================================
// ALTER BERECHNEN
// ============================================================

function calculateAge(geburtsdatum: string): number {
  const today = new Date();
  const birthDate = new Date(geburtsdatum);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

// ============================================================
// DATUM FORMATIEREN
// ============================================================

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (error) {
    return dateString;
  }
}

// ============================================================
// HAUPTFUNKTION
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Nur POST" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let syncClient: any = null;
  let syncSubject = "";
  let syncRegistrationId = "";
  try {
    const serviceAccountEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const bearer = (req.headers.get("Authorization") || "").replace(
      /^Bearer\s+/i,
      "",
    );
    if (bearer !== supabaseServiceKey) {
      await requireDashboardAdmin(req);
    }

    if (!serviceAccountEmail || !privateKey || !sheetId) {
      throw new Error("Missing Google credentials in environment variables");
    }

    const { anmeldung_id, typ } = await req.json();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(String(anmeldung_id || "")) ||
      !["firma", "privat", undefined].includes(typ)
    ) {
      return new Response(JSON.stringify({ error: "Ungültige Anmeldung" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const isFirma = typ === "firma";
    console.log(
      `Processing ${isFirma ? "Firmen-" : ""}Anmeldung: ${anmeldung_id}`,
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    syncClient = supabase;

    const syncType = isFirma ? "firma" : "privat";
    syncSubject = syncType;
    syncRegistrationId = String(anmeldung_id);
    const { data: previousRun } = await supabase.from("google_sheet_sync_runs")
      .select("status,started_at").eq("subject_type", syncType).eq(
        "registration_id",
        anmeldung_id,
      )
      .maybeSingle();
    if (previousRun?.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, already_synced: true }),
        { headers: corsHeaders },
      );
    }
    if (
      previousRun?.status === "running" &&
      Date.parse(previousRun.started_at) > Date.now() - 15 * 60 * 1000
    ) {
      return new Response(
        JSON.stringify({ error: "Synchronisierung läuft bereits" }),
        { status: 409, headers: corsHeaders },
      );
    }
    const { error: reserveError } = await supabase.from(
      "google_sheet_sync_runs",
    ).upsert({
      subject_type: syncType,
      registration_id: anmeldung_id,
      status: "running",
      started_at: new Date().toISOString(),
      finished_at: null,
      last_error: null,
    }, { onConflict: "subject_type,registration_id" });
    if (reserveError) {
      throw new Error("Synchronisierung konnte nicht reserviert werden");
    }

    let row: any[];
    let participantName: string;
    let campName = "";

    if (isFirma) {
      // FIRMEN-ANMELDUNG
      const { data: firmenAnmeldung, error: anmeldungError } = await supabase
        .from("firmen_anmeldungen")
        .select("*")
        .eq("id", anmeldung_id)
        .maybeSingle();

      if (anmeldungError || !firmenAnmeldung) {
        throw new Error(
          `Failed to fetch Firmen-Anmeldung: ${anmeldungError?.message}`,
        );
      }

      console.log(
        `Firmen-Anmeldung loaded: ${firmenAnmeldung.kind_vorname} ${firmenAnmeldung.kind_nachname} (${firmenAnmeldung.firma_name})`,
      );

      // Camp laden
      const { data: camp } = await supabase
        .from("camps")
        .select("name")
        .eq("id", firmenAnmeldung.camp_id)
        .maybeSingle();

      campName = camp?.name || "";
      const alter = calculateAge(firmenAnmeldung.kind_geburtsdatum);
      participantName =
        `${firmenAnmeldung.kind_vorname} ${firmenAnmeldung.kind_nachname}`;

      // Zeile für Firmen-Anmeldung
      row = [
        firmenAnmeldung.id, // A: ID
        formatDate(firmenAnmeldung.created_at), // B: Anmeldung_Datum
        firmenAnmeldung.kind_vorname, // C: Kind_Vorname
        firmenAnmeldung.kind_nachname, // D: Kind_Nachname
        formatDate(firmenAnmeldung.kind_geburtsdatum), // E: Geburtsdatum
        alter, // F: Alter
        firmenAnmeldung.mitarbeiter_vorname, // G: Kontakt_Vorname (Mitarbeiter)
        firmenAnmeldung.mitarbeiter_nachname, // H: Kontakt_Nachname
        firmenAnmeldung.mitarbeiter_email || firmenAnmeldung.firma_email, // I: Email
        firmenAnmeldung.mitarbeiter_telefon, // J: Telefon
        firmenAnmeldung.rechnungsadresse || "", // K: Adresse
        campName, // L: Camp_Name
        firmenAnmeldung.allergien || "", // M: Allergien
        firmenAnmeldung.erfahrung || "", // N: Erfahrung
        firmenAnmeldung.status, // O: Status
        firmenAnmeldung.betrag_euro, // P: Betrag
        "", // Q: Synced (leer)
        `FIRMA: ${firmenAnmeldung.firma_name}`, // R: Typ/Firma
      ];
    } else {
      // NORMALE ANMELDUNG
      const { data: anmeldung, error: anmeldungError } = await supabase
        .from("anmeldungen")
        .select("*")
        .eq("id", anmeldung_id)
        .maybeSingle();

      if (anmeldungError || !anmeldung) {
        throw new Error(
          `Failed to fetch anmeldung: ${anmeldungError?.message}`,
        );
      }

      console.log(
        `Anmeldung loaded: ${anmeldung.vorname} ${anmeldung.nachname}`,
      );

      // Camp laden
      const { data: camp } = await supabase
        .from("camps")
        .select("name")
        .eq("id", anmeldung.camp_id)
        .maybeSingle();

      campName = camp?.name || "";
      const alter = calculateAge(anmeldung.geburtsdatum);
      participantName = `${anmeldung.vorname} ${anmeldung.nachname}`;

      // Zeile für normale Anmeldung
      row = [
        anmeldung.id, // A: ID
        formatDate(anmeldung.created_at), // B: Anmeldung_Datum
        anmeldung.vorname, // C: Kind_Vorname
        anmeldung.nachname, // D: Kind_Nachname
        formatDate(anmeldung.geburtsdatum), // E: Geburtsdatum
        alter, // F: Alter
        anmeldung.eltern_vorname, // G: Kontakt_Vorname
        anmeldung.eltern_nachname, // H: Kontakt_Nachname
        anmeldung.email, // I: Email
        anmeldung.telefon, // J: Telefon
        anmeldung.adresse || "", // K: Adresse
        campName, // L: Camp_Name
        anmeldung.allergien || "", // M: Allergien
        anmeldung.erfahrung || "", // N: Erfahrung
        anmeldung.status, // O: Status
        anmeldung.betrag_euro, // P: Betrag
        "", // Q: Synced (leer)
        "PRIVAT", // R: Typ
      ];
    }

    console.log(`Row prepared with ${row.length} columns`);

    // Google Access Token holen
    console.log(`Getting Google Access Token...`);
    const accessToken = await getGoogleAccessToken(
      serviceAccountEmail,
      privateKey,
    );
    console.log(`Access Token received`);

    // Zeile zu Sheet hinzufügen
    console.log(`Appending row to Google Sheet: ${sheetId}`);
    await appendRowToSheet(accessToken, sheetId, row);

    await supabase.from("google_sheet_sync_runs").update({
      status: "completed",
      finished_at: new Date().toISOString(),
    }).eq("subject_type", syncType).eq("registration_id", anmeldung_id);

    console.log(
      `Successfully synced ${
        isFirma ? "Firmen-" : ""
      }Anmeldung ${anmeldung_id} to Google Sheet`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `${
          isFirma ? "Firmen-" : ""
        }Anmeldung successfully synced to Google Sheet`,
        anmeldung_id,
        typ: isFirma ? "firma" : "privat",
        camp_name: campName,
        already_synced: false,
      }),
      {
        headers: corsHeaders,
      },
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: corsHeaders,
      });
    }
    if (syncClient && syncSubject && syncRegistrationId) {
      await syncClient.from("google_sheet_sync_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        last_error: (error instanceof Error ? error.message : String(error))
          .slice(0, 1000),
      }).eq("subject_type", syncSubject).eq(
        "registration_id",
        syncRegistrationId,
      );
    }
    console.error(
      "Error in google-sheet-sync:",
      error instanceof Error ? error.message : String(error),
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "Google-Sheets-Synchronisierung fehlgeschlagen.",
      }),
      {
        status: 500,
        headers: corsHeaders,
      },
    );
  }
});
