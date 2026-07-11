import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  asString,
  checkFormProtection,
  checkTokenRateLimit,
  cleanText,
  createFormToken,
  getClientIp,
} from "../_shared/form-spam-protection.ts";
import {
  hashSponsorCode,
  hashSponsorRateLimitIdentity,
  isUuid,
  normalizeChildName,
  normalizeSponsorCode,
  SponsorConfigurationError,
} from "../_shared/sponsoring.ts";
import {
  assertConfirmationTokenConfiguration,
  ConfirmationConfigurationError,
  confirmationExpiryForCamp,
  createConfirmationToken,
  verifyConfirmationToken,
} from "../_shared/confirmation-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";
const FORM_TOKEN_PURPOSE = "talentexperte-registration";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()/. -]{6,40}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type SponsorValidationRow = {
  valid: boolean;
  reason: "valid" | "already_used" | "invalid_or_mismatch";
  entitlement_id: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_slug: string | null;
};

type SponsorRedemptionRow = {
  registration_id: string;
  entitlement_id: string;
  sponsor_partner_id: string;
  partner_name: string;
  partner_slug: string;
  list_price_euro: number | string;
  parent_amount_euro: number | string;
  sponsor_amount_euro: number | string;
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso + (ISO_DATE_PATTERN.test(iso) ? "T00:00:00" : ""));
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(t: string | null): string {
  if (!t) return "–";
  return String(t).slice(0, 5) + " Uhr";
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

function stripReservedNoteMarkers(value: string | null): string | null {
  if (!value) return null;
  const stripped = value
    .replace(/\[TYP:(?:ÖF|OEF|SG)\]/giu, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return stripped || null;
}

function sponsorErrorFromReason(
  reason: string,
): { status: number; code: string; error: string } {
  if (reason.includes("ALREADY_USED") || reason === "already_used") {
    return {
      status: 409,
      code: "sponsor_code_used",
      error:
        "Diese Gutschein-Nummer wurde bereits verwendet. Bitte wenden Sie sich an Öcher Fans for Kenger e.V. oder an uns.",
    };
  }
  return {
    status: 422,
    code: "sponsor_code_mismatch",
    error:
      "Die Gutschein-Nummer passt nicht zu den Angaben oder zum gewählten Camp. Bitte prüfen Sie die Nummer (die letzten 4 Ziffern genügen) und die Camp-Auswahl.",
  };
}

/**
 * ÖF-Nummernformat: "Talent <TTMMJJJJ Camp-Start> <4 Ziffern>". Eltern dürfen
 * nur die letzten 4 Ziffern angeben; der Camp-Teil wird aus dem gewählten Camp
 * ergänzt. Andere Codeformate bleiben unverändert.
 */
function expandSponsorCode(rawCode: string, campDatumVon: unknown): string {
  const normalized = normalizeSponsorCode(rawCode);
  const datumVon = typeof campDatumVon === "string" ? campDatumVon : "";
  const datePart = ISO_DATE_PATTERN.test(datumVon)
    ? datumVon.slice(8, 10) + datumVon.slice(5, 7) + datumVon.slice(0, 4)
    : "";
  if (/^\d{4}$/.test(normalized) && datePart) {
    return "TALENT" + datePart + normalized;
  }
  if (/^\d{12}$/.test(normalized)) {
    return "TALENT" + normalized;
  }
  return normalized;
}

/**
 * Berechtigungen aus Listen ohne Kindesnamen (z. B. ÖF-Gutscheinliste) werden
 * beim Import mit dem kleingeschriebenen normalisierten Code als Namensfeld
 * gespeichert (import-sponsoring-entitlements.mjs --code-only). Deshalb wird
 * zuerst der echte Kindesname und danach die Code-Identität geprüft.
 */
function sponsorNameCandidates(
  vorname: string,
  nachname: string,
  expandedCode: string,
): string[] {
  const candidates = [normalizeChildName(vorname, nachname)];
  const codeIdentity = expandedCode.toLowerCase();
  if (codeIdentity && !candidates.includes(codeIdentity)) {
    candidates.push(codeIdentity);
  }
  return candidates.filter((candidate) => candidate);
}

async function checkPersistentSponsorRateLimit(
  supabase: any,
  req: Request,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const identityHash = await hashSponsorRateLimitIdentity(getClientIp(req));
  const { data, error } = await supabase.rpc(
    "consume_sponsoring_validation_attempt",
    {
      p_identity_hash: identityHash,
      p_max_attempts: 20,
      p_window_seconds: 900,
    },
  );
  if (error) {
    console.error("Sponsor rate-limit RPC failed:", error.message);
    return {
      ok: false,
      status: 503,
      error:
        "Der Vereinscode konnte gerade nicht sicher geprüft werden. Bitte versuchen Sie es später erneut.",
    };
  }
  return data === true
    ? { ok: true }
    : {
      ok: false,
      status: 429,
      error:
        "Zu viele Codeprüfungen. Bitte warten Sie 15 Minuten oder wenden Sie sich an uns.",
    };
}

function buildConfirmationHtml(opts: {
  elternVorname: string;
  kindVorname: string;
  campName: string;
  zeitraum: string;
  uhrzeit: string;
  ort: string;
  listPrice: number;
  parentAmount: number;
  sponsorAmount: number;
  partnerName: string | null;
  buchungsNr: string;
  payLink: string | null;
  bestaetigungLink: string;
}): string {
  const sponsored = Boolean(opts.partnerName);
  const paymentBlock = sponsored
    ? `<div style="margin:24px 0;padding:18px;border-radius:10px;background:#e8f7ef;color:#123d27">
        <strong style="display:block;font-size:17px;margin-bottom:6px">Vollständig gesponsert</strong>
        <span>Die Teilnahme wird vollständig durch <strong>${
      escapeHtml(opts.partnerName)
    }</strong> finanziert. Für Sie entstehen keine Kosten. Eine Zahlung ist nicht erforderlich.</span>
      </div>
      <p style="font-size:14px;color:#ddd"><strong>Der Platz ist verbindlich reserviert.</strong></p>
      <p style="font-size:13px;color:#888">Alle Informationen zum gesponserten Camp-Platz finden Sie im PDF-Anhang dieser E-Mail.</p>`
    : `${
      opts.payLink
        ? `<p style="margin:24px 0"><a href="${
          escapeHtml(opts.payLink)
        }" style="display:inline-block;background:#e50000;color:#fff;padding:14px 32px;border-radius:30px;text-decoration:none;font-weight:bold">JETZT BEZAHLEN</a></p>`
        : ""
    }
      <p style="font-size:13px;color:#888">Der Platz wird erst nach Zahlungseingang verbindlich reserviert.</p>`;

  const amountRows = sponsored
    ? `<tr><td style="padding:6px 0;color:#888">Teilnahmebeitrag</td><td style="padding:6px 0">${
      escapeHtml(formatEuro(opts.listPrice))
    }</td></tr>
      <tr><td style="padding:6px 0;color:#888">Übernimmt ${
      escapeHtml(opts.partnerName)
    }</td><td style="padding:6px 0">${
      escapeHtml(formatEuro(opts.sponsorAmount))
    }</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ihr Elternanteil</td><td style="padding:6px 0"><strong style="color:#7de3a8">${
      escapeHtml(formatEuro(opts.parentAmount))
    }</strong></td></tr>`
    : `<tr><td style="padding:6px 0;color:#888">Betrag</td><td style="padding:6px 0"><strong style="color:#fff">${
      escapeHtml(formatEuro(opts.parentAmount))
    }</strong></td></tr>`;

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#e50000;padding:24px 32px">
    <h1 style="margin:0;font-size:24px;color:#fff">TALENTEXPERTE</h1>
    <p style="margin:4px 0 0;font-size:14px;color:#fff;opacity:.9">Anmeldebestätigung</p>
  </div>
  <div style="padding:32px">
    <p>Hallo ${escapeHtml(opts.elternVorname)},</p>
    <p>vielen Dank für die Anmeldung von <strong>${
    escapeHtml(opts.kindVorname)
  }</strong> zum <strong>${escapeHtml(opts.campName)}</strong>!</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;color:#ddd">
      <tr><td style="padding:6px 0;color:#888">Buchungs-Nr.</td><td style="padding:6px 0"><strong style="letter-spacing:.08em;color:#fff">${
    escapeHtml(opts.buchungsNr)
  }</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Zeitraum</td><td style="padding:6px 0">${
    escapeHtml(opts.zeitraum)
  }</td></tr>
      <tr><td style="padding:6px 0;color:#888">Uhrzeit</td><td style="padding:6px 0">${
    escapeHtml(opts.uhrzeit)
  }</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ort</td><td style="padding:6px 0">${
    escapeHtml(opts.ort)
  }</td></tr>
      ${amountRows}
    </table>
    ${paymentBlock}
    <p style="font-size:13px;color:#888">Ihre Bestätigung können Sie jederzeit hier abrufen:<br>
      <a href="${escapeHtml(opts.bestaetigungLink)}" style="color:#e50000">${
    escapeHtml(opts.bestaetigungLink)
  }</a></p>
    <p style="font-size:13px;color:#888">Bei Fragen erreichen Sie uns unter <a href="mailto:kontakt@talentexperte.de" style="color:#e50000">kontakt@talentexperte.de</a>.</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const tokenLimit = checkTokenRateLimit(req);
    if (!tokenLimit.ok) {
      return jsonResponse({
        error: tokenLimit.error || "Bitte versuchen Sie es spaeter erneut.",
      }, tokenLimit.status || 429);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        token: await createFormToken(FORM_TOKEN_PURPOSE),
      }),
      { status: 200, headers: { ...corsHeaders, "Cache-Control": "no-store" } },
    );
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Nur POST-Anfragen erlaubt" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const data = await req.json();
    const action = cleanText(data.action, 40).toLowerCase();

    if (action === "get_confirmation") {
      const tokenLimit = checkTokenRateLimit(req);
      if (!tokenLimit.ok) {
        return jsonResponse({
          error: tokenLimit.error || "Bitte versuchen Sie es später erneut.",
        }, tokenLimit.status || 429);
      }

      const registrationId = cleanText(data.registration_id, 80);
      const confirmationToken = asString(data.confirmation_token, 160);
      if (
        !isUuid(registrationId) ||
        !await verifyConfirmationToken(registrationId, confirmationToken)
      ) {
        return jsonResponse({
          code: "confirmation_link_invalid",
          error: "Dieser Bestätigungslink ist ungültig oder abgelaufen.",
        }, 403);
      }

      const { data: confirmation, error: confirmationError } = await supabase
        .from("anmeldungen")
        .select(
          "id,vorname,nachname,geburtsdatum,eltern_vorname,eltern_nachname,email,telefon,camp_id,betrag_euro,zahlungsstatus,payer_type,parent_payment_status,list_price_euro,parent_amount_euro,sponsor_amount_euro,sponsoring_partners(name,slug),camps(name,datum_von,datum_bis,uhrzeit_von,uhrzeit_bis,ort,adresse)",
        )
        .eq("id", registrationId)
        .maybeSingle();

      if (confirmationError || !confirmation) {
        if (confirmationError) {
          console.error(
            "Confirmation lookup failed:",
            confirmationError.message,
          );
        }
        return jsonResponse({
          code: "confirmation_not_found",
          error: "Die Bestätigung konnte nicht geladen werden.",
        }, 404);
      }

      return jsonResponse({ success: true, registration: confirmation });
    }

    const spamCheck = await checkFormProtection(req, data, {
      purpose: FORM_TOKEN_PURPOSE,
      emailField: "email",
      contentFields: [
        "vorname",
        "nachname",
        "eltern_vorname",
        "eltern_nachname",
        "email",
        "telefon",
        "adresse",
        "erfahrung",
        "allergien",
        "notizen",
      ],
    });

    if (!spamCheck.ok) {
      return jsonResponse(
        {
          error: spamCheck.error || "Anfrage konnte nicht verarbeitet werden.",
        },
        spamCheck.status || 400,
      );
    }

    const sponsorCode = asString(data.sponsor_code, 160);
    const registration = {
      camp_id: cleanText(data.camp_id, 80),
      vorname: cleanText(data.vorname, 80),
      nachname: cleanText(data.nachname, 80),
      geburtsdatum: asString(data.geburtsdatum, 20),
      trikot_groesse: cleanText(data.trikot_groesse, 20) || null,
      eltern_vorname: cleanText(data.eltern_vorname, 80),
      eltern_nachname: cleanText(data.eltern_nachname, 80),
      email: cleanText(data.email, 200).toLowerCase(),
      telefon: cleanText(data.telefon, 80),
      adresse: cleanText(data.adresse, 250) || null,
      erfahrung: cleanText(data.erfahrung, 500) || null,
      allergien: cleanText(data.allergien, 1000) || null,
      // Dashboard-Typen sind ausschliesslich server-/adminseitig. Ein freies
      // Elternfeld darf niemals Sponsor- oder Firmenstatus erzeugen.
      notizen: stripReservedNoteMarkers(cleanText(data.notizen, 1200) || null),
    };

    if (
      action &&
      !["validate_sponsor", "register_sponsor", "register"].includes(action)
    ) {
      return jsonResponse({ error: "Unbekannte Aktion." }, 400);
    }

    if (action === "validate_sponsor") {
      // Die Vorprüfung braucht nur Nummer + Camp. Kindesname und Geburtsdatum
      // sind optional und dienen nur namensgebundenen Berechtigungen; die
      // ÖF-Gutscheine sind rein code-gebunden.
      const validationErrors: string[] = [];
      if (!sponsorCode) validationErrors.push("Gutschein-Nummer fehlt");
      if (!isUuid(registration.camp_id)) {
        validationErrors.push("Camp ist ungueltig");
      }

      if (validationErrors.length > 0) {
        return jsonResponse({
          valid: false,
          error: "Validierungsfehler",
          details: validationErrors,
        }, 400);
      }

      const birthDateForValidation =
        isValidIsoDate(registration.geburtsdatum)
          ? registration.geburtsdatum
          : null;

      const sponsorLimit = await checkPersistentSponsorRateLimit(supabase, req);
      if (!sponsorLimit.ok) {
        return jsonResponse({ error: sponsorLimit.error }, sponsorLimit.status || 429);
      }

      const { data: sponsorCamp } = await supabase
        .from("camps")
        .select("datum_von")
        .eq("id", registration.camp_id)
        .maybeSingle();
      const expandedCode = expandSponsorCode(
        sponsorCode,
        sponsorCamp?.datum_von ?? null,
      );

      let codeHash: string;
      try {
        codeHash = await hashSponsorCode(expandedCode);
      } catch (error) {
        if (error instanceof SponsorConfigurationError) throw error;
        const sponsorError = sponsorErrorFromReason("invalid_or_mismatch");
        return jsonResponse({
          valid: false,
          code: sponsorError.code,
          error: sponsorError.error,
        }, sponsorError.status);
      }

      let validation: SponsorValidationRow | null = null;
      let failureReason = "invalid_or_mismatch";
      for (
        const nameCandidate of sponsorNameCandidates(
          registration.vorname,
          registration.nachname,
          expandedCode,
        )
      ) {
        const { data: validationData, error: validationError } = await supabase
          .rpc(
            "validate_sponsoring_entitlement",
            {
              p_code_hash: codeHash,
              p_child_name_normalized: nameCandidate,
              p_birth_date: birthDateForValidation,
              p_camp_id: registration.camp_id,
            },
          );

        if (validationError) {
          console.error(
            "Sponsor validation RPC failed:",
            validationError.message,
          );
          return jsonResponse({
            valid: false,
            error:
              "Die Gutschein-Nummer konnte gerade nicht geprüft werden. Bitte versuchen Sie es erneut.",
          }, 503);
        }

        const row = (validationData?.[0] || null) as
          | SponsorValidationRow
          | null;
        if (row?.valid) {
          validation = row;
          break;
        }
        if (row?.reason === "already_used") failureReason = "already_used";
      }

      if (!validation?.valid) {
        const sponsorError = sponsorErrorFromReason(failureReason);
        return jsonResponse({
          valid: false,
          code: sponsorError.code,
          error: sponsorError.error,
        }, sponsorError.status);
      }

      return jsonResponse({
        valid: true,
        partner_name: validation.partner_name,
        partner_slug: validation.partner_slug,
        parent_amount: 0,
        parent_amount_euro: 0,
        payment_required: false,
        message:
          `Finanzierung durch ${validation.partner_name} bestätigt. Für Sie entstehen keine Kosten.`,
      });
    }

    const sponsorRequested = action === "register_sponsor" ||
      sponsorCode !== "";
    if (action === "register_sponsor" && !sponsorCode) {
      return jsonResponse({
        code: "sponsor_code_missing",
        error:
          "Für die gesponserte Anmeldung fehlt der Vereinscode. Es wurde keine kostenpflichtige Anmeldung angelegt.",
      }, 400);
    }

    const errors: string[] = [];
    if (!registration.camp_id || !isUuid(registration.camp_id)) {
      errors.push("Camp nicht ausgewaehlt");
    }
    if (!registration.vorname) errors.push("Vorname des Kindes fehlt");
    if (!registration.nachname) errors.push("Nachname des Kindes fehlt");
    if (
      !registration.geburtsdatum || !isValidIsoDate(registration.geburtsdatum)
    ) errors.push("Geburtsdatum fehlt oder ist ungueltig");
    if (!registration.eltern_vorname) errors.push("Vorname Elternteil fehlt");
    if (!registration.eltern_nachname) errors.push("Nachname Elternteil fehlt");
    if (!registration.email || !EMAIL_PATTERN.test(registration.email)) {
      errors.push("Gueltige E-Mail fehlt");
    }
    if (!registration.telefon || !PHONE_PATTERN.test(registration.telefon)) {
      errors.push("Gueltige Telefonnummer fehlt");
    }
    if (/[\r\n]/.test(registration.email)) errors.push("Gueltige E-Mail fehlt");

    if (errors.length > 0) {
      return jsonResponse(
        { error: "Validierungsfehler", details: errors },
        400,
      );
    }

    const birthDate = new Date(registration.geburtsdatum + "T00:00:00");
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate())
    ) age -= 1;
    if (age < 4 || age > 16) {
      return jsonResponse({
        error: "Das Kind muss zwischen 5 und 14 Jahren alt sein.",
      }, 400);
    }

    // Vor jedem schreibenden Pfad sicherstellen, dass anschließend ein
    // geschützter Bestätigungslink erzeugt werden kann.
    assertConfirmationTokenConfiguration();

    if (sponsorRequested) {
      const sponsorLimit = await checkPersistentSponsorRateLimit(supabase, req);
      if (!sponsorLimit.ok) {
        return jsonResponse({ error: sponsorLimit.error }, sponsorLimit.status || 429);
      }
    }

    const { data: camp, error: campError } = await supabase
      .from("camp_verfuegbarkeit")
      .select("*")
      .eq("id", registration.camp_id)
      .single();

    if (campError || !camp) {
      return jsonResponse({ error: "Camp nicht gefunden" }, 404);
    }
    if (camp.status !== "aktiv") {
      return jsonResponse({
        error: "Dieses Camp ist leider nicht mehr verfuegbar.",
      }, 409);
    }
    const campEnde = camp.datum_bis && ISO_DATE_PATTERN.test(camp.datum_bis)
      ? new Date(camp.datum_bis + "T23:59:59")
      : null;
    if (campEnde && campEnde.getTime() < Date.now()) {
      return jsonResponse({
        error:
          "Dieses Camp liegt in der Vergangenheit und kann nicht mehr gebucht werden.",
      }, 409);
    }
    if (Number(camp.freie_plaetze) <= 0) {
      return jsonResponse({ error: "Dieses Camp ist leider ausgebucht." }, 409);
    }

    const { data: existing } = await supabase
      .from("anmeldungen")
      .select("id")
      .eq("camp_id", registration.camp_id)
      .eq("vorname", registration.vorname)
      .eq("nachname", registration.nachname)
      .eq("email", registration.email)
      .neq("zahlungsstatus", "storniert")
      .maybeSingle();

    if (existing) {
      return jsonResponse({
        error: "Dieses Kind ist bereits fuer dieses Camp angemeldet.",
      }, 409);
    }

    const aktuellerPreis = Number(camp.aktueller_preis);
    if (!Number.isFinite(aktuellerPreis) || aktuellerPreis < 0) {
      console.error("Invalid camp price for camp", camp.id);
      return jsonResponse({
        error: "Der Camp-Preis konnte nicht ermittelt werden.",
      }, 503);
    }

    let anmeldungId: string;
    let partnerName: string | null = null;
    let parentAmount = aktuellerPreis;
    let sponsorAmount = 0;
    let payerType: "parent" | "sponsor" = "parent";
    let parentPaymentStatus: "open" | "not_required" = "open";

    if (sponsorRequested) {
      const expandedCode = expandSponsorCode(sponsorCode, camp.datum_von);

      let codeHash: string;
      try {
        codeHash = await hashSponsorCode(expandedCode);
      } catch (error) {
        if (error instanceof SponsorConfigurationError) throw error;
        const sponsorError = sponsorErrorFromReason("invalid_or_mismatch");
        return jsonResponse({
          code: sponsorError.code,
          error: sponsorError.error,
        }, sponsorError.status);
      }

      let redemptionData: SponsorRedemptionRow[] | null = null;
      let redemptionError: { message?: string } | null = null;
      for (
        const nameCandidate of sponsorNameCandidates(
          registration.vorname,
          registration.nachname,
          expandedCode,
        )
      ) {
        const { data, error } = await supabase
          .rpc(
            "redeem_sponsoring_entitlement_and_register",
            {
              p_code_hash: codeHash,
              p_child_name_normalized: nameCandidate,
              p_birth_date: registration.geburtsdatum,
              p_camp_id: registration.camp_id,
              p_list_price_euro: aktuellerPreis,
              p_registration: registration,
            },
          );

        if (!error) {
          redemptionData = data as SponsorRedemptionRow[] | null;
          redemptionError = null;
          break;
        }
        redemptionError = error;
        // Nur bei Namens-/Datenmismatch den nächsten Kandidaten versuchen;
        // "bereits verwendet" und technische Fehler sind endgültig.
        if (!String(error.message || "").includes("SPONSOR_ENTITLEMENT_INVALID")) {
          break;
        }
      }

      if (redemptionError) {
        const message = String(redemptionError.message || "");
        if (message.includes("SPONSOR_ENTITLEMENT_")) {
          const sponsorError = sponsorErrorFromReason(message);
          return jsonResponse({
            code: sponsorError.code,
            error: sponsorError.error,
          }, sponsorError.status);
        }
        console.error("Sponsor redemption RPC failed:", message);
        return jsonResponse({
          error:
            "Die gesponserte Anmeldung konnte gerade nicht gespeichert werden. Es wurde keine kostenpflichtige Anmeldung angelegt.",
        }, 503);
      }

      const redemption = (redemptionData?.[0] || null) as
        | SponsorRedemptionRow
        | null;
      if (!redemption?.registration_id) {
        console.error("Sponsor redemption RPC returned no registration id");
        return jsonResponse({
          error:
            "Die gesponserte Anmeldung konnte gerade nicht gespeichert werden. Es wurde keine kostenpflichtige Anmeldung angelegt.",
        }, 503);
      }

      anmeldungId = redemption.registration_id;
      partnerName = redemption.partner_name;
      parentAmount = Number(redemption.parent_amount_euro);
      sponsorAmount = Number(redemption.sponsor_amount_euro);
      payerType = "sponsor";
      parentPaymentStatus = "not_required";
    } else {
      const { data: anmeldung, error: insertError } = await supabase
        .from("anmeldungen")
        .insert({
          ...registration,
          betrag_euro: aktuellerPreis,
          zahlungsstatus: "offen",
          list_price_euro: aktuellerPreis,
          parent_amount_euro: aktuellerPreis,
          sponsor_amount_euro: 0,
          payer_type: "parent",
          parent_payment_status: "open",
          sponsor_settlement_status: null,
          sponsoring_partner_id: null,
          sponsoring_entitlement_id: null,
        })
        .select("id")
        .single();

      if (insertError || !anmeldung) {
        console.error("Insert Error:", insertError?.message);
        return jsonResponse({ error: "Fehler beim Speichern." }, 500);
      }
      anmeldungId = anmeldung.id;
    }

    const buchungsNr = String(anmeldungId).slice(0, 8).toUpperCase();
    const confirmationToken = await createConfirmationToken(
      anmeldungId,
      confirmationExpiryForCamp(camp.datum_bis),
    );
    const payLink = payerType === "parent" && camp.stripe_link
      ? camp.stripe_link + (camp.stripe_link.includes("?") ? "&" : "?") +
        "client_reference_id=" + anmeldungId +
        "&prefilled_email=" + encodeURIComponent(registration.email)
      : null;
    const paymentStartLink = payLink
      ? "https://www.talentexperte.de/zahlung-start.html#" +
        new URLSearchParams({
          id: anmeldungId,
          token: confirmationToken,
          stripe: payLink,
        }).toString()
      : null;
    const bestaetigungLink =
      "https://www.talentexperte.de/bestaetigung.html?id=" + anmeldungId +
      "#token=" + encodeURIComponent(confirmationToken);

    let emailVersendet = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      try {
        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [registration.email],
            reply_to: "kontakt@talentexperte.de",
            subject: payerType === "sponsor"
              ? `Anmeldebestätigung – vollständig gesponsert – ${camp.name} (Buchungs-Nr. ${buchungsNr})`
              : `Anmeldebestätigung – ${camp.name} (Buchungs-Nr. ${buchungsNr})`,
            attachments: payerType === "sponsor"
              ? [{
                path:
                  "https://www.talentexperte.de/pdf/faq-camps-sponsoring.pdf",
                filename: "So-funktioniert-ein-gesponserter-Platz.pdf",
              }]
              : undefined,
            html: buildConfirmationHtml({
              elternVorname: registration.eltern_vorname,
              kindVorname: registration.vorname,
              campName: camp.name,
              zeitraum: formatDateDE(camp.datum_von) + " – " +
                formatDateDE(camp.datum_bis),
              uhrzeit: formatTime(camp.uhrzeit_von) + " – " +
                formatTime(camp.uhrzeit_bis),
              ort: camp.ort || "–",
              listPrice: aktuellerPreis,
              parentAmount,
              sponsorAmount,
              partnerName,
              buchungsNr,
              payLink: paymentStartLink,
              bestaetigungLink,
            }),
          }),
        });
        if (mailRes.ok) {
          emailVersendet = true;
        } else {
          console.error(
            "Resend-Fehler (" + mailRes.status + "):",
            await mailRes.text(),
          );
        }
      } catch (emailError) {
        console.error("Email-Fehler:", emailError);
      }
    } else {
      console.error(
        "RESEND_API_KEY fehlt – keine Bestätigungs-E-Mail versendet.",
      );
    }

    return jsonResponse({
      success: true,
      message: payerType === "sponsor"
        ? `Anmeldung erfolgreich. Vollständig durch ${partnerName} gesponsert; keine Zahlung erforderlich.`
        : "Anmeldung erfolgreich!",
      anmeldung_id: anmeldungId,
      confirmation_token: confirmationToken,
      camp_name: camp.name,
      betrag: parentAmount,
      list_price: aktuellerPreis,
      list_price_euro: aktuellerPreis,
      parent_amount: parentAmount,
      parent_amount_euro: parentAmount,
      sponsor_amount: sponsorAmount,
      sponsor_amount_euro: sponsorAmount,
      payer_type: payerType,
      parent_payment_status: parentPaymentStatus,
      sponsor_settlement_status: payerType === "sponsor" ? "open" : null,
      partner_name: partnerName,
      payment_required: payerType === "parent",
      stripe_link: payLink,
      email_versendet: emailVersendet,
      freie_plaetze: Math.max(Number(camp.freie_plaetze) - 1, 0),
    });
  } catch (error) {
    if (error instanceof ConfirmationConfigurationError) {
      console.error(error.message);
      return jsonResponse({
        error:
          "Der sichere Bestätigungsdienst ist noch nicht vollständig eingerichtet. Es wurde keine Anmeldung angelegt.",
      }, 503);
    }
    if (error instanceof SponsorConfigurationError) {
      console.error(error.message);
      return jsonResponse({
        error:
          "Der Vereinscode-Service ist noch nicht vollständig eingerichtet. Es wurde keine kostenpflichtige Anmeldung angelegt.",
      }, 503);
    }
    console.error("Unerwarteter Fehler:", error);
    return jsonResponse(
      { error: "Unerwarteter Fehler bei der Anmeldung." },
      500,
    );
  }
});
