import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  asString,
  checkFormProtection,
  checkTokenRateLimit,
  cleanText,
  createFormToken,
} from "../_shared/form-spam-protection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";
const FORM_TOKEN_PURPOSE = "talentexperte-company-registration";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()/. -]{6,40}$/;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "–";
  return String(t).slice(0, 5) + " Uhr";
}

function buildCompanyConfirmationHtml(opts: {
  parentName: string;
  childName: string;
  companyName: string;
  campName: string;
  zeitraum: string;
  uhrzeit: string;
  ort: string;
}): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#e50000;padding:24px 32px">
    <h1 style="margin:0;font-size:24px;color:#fff">TALENTEXPERTE</h1>
    <p style="margin:4px 0 0;font-size:14px;color:#fff;opacity:.9">Firmen-Anmeldung</p>
  </div>
  <div style="padding:32px">
    <p>Hallo ${escapeHtml(opts.parentName)},</p>
    <p>vielen Dank für die Anmeldung von <strong>${escapeHtml(opts.childName)}</strong> über <strong>${escapeHtml(opts.companyName)}</strong>.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;color:#ddd">
      <tr><td style="padding:6px 0;color:#888">Camp</td><td style="padding:6px 0"><strong style="color:#fff">${escapeHtml(opts.campName)}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Zeitraum</td><td style="padding:6px 0">${escapeHtml(opts.zeitraum)}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Uhrzeit</td><td style="padding:6px 0">${escapeHtml(opts.uhrzeit)}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ort</td><td style="padding:6px 0">${escapeHtml(opts.ort)}</td></tr>
    </table>
    <p style="font-size:13px;color:#888;margin-top:24px">Bei Fragen erreichst du uns unter <a href="mailto:kontakt@talentexperte.de" style="color:#e50000">kontakt@talentexperte.de</a>.</p>
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
      return new Response(
        JSON.stringify({ error: tokenLimit.error || "Bitte versuchen Sie es spaeter erneut." }),
        { status: tokenLimit.status || 429, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, token: await createFormToken(FORM_TOKEN_PURPOSE) }),
      { status: 200, headers: { ...corsHeaders, "Cache-Control": "no-store" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST-Anfragen erlaubt" }),
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const data = await req.json();
    const emailForProtection = cleanText(data.mitarbeiter_email, 200).toLowerCase() ||
      cleanText(data.firma_email, 200).toLowerCase();
    const protectedBody = { ...data, spam_email: emailForProtection };
    const spamCheck = await checkFormProtection(req, protectedBody, {
      purpose: FORM_TOKEN_PURPOSE,
      emailField: "spam_email",
      contentFields: [
        "firma_name",
        "rechnungsadresse",
        "mitarbeiter_vorname",
        "mitarbeiter_nachname",
        "mitarbeiter_email",
        "mitarbeiter_telefon",
        "kind_vorname",
        "kind_nachname",
        "erfahrung",
        "allergien",
        "notizen",
      ],
    });

    if (!spamCheck.ok) {
      return new Response(
        JSON.stringify({ error: spamCheck.error || "Anfrage konnte nicht verarbeitet werden." }),
        { status: spamCheck.status || 400, headers: corsHeaders },
      );
    }

    const registration = {
      camp_id: cleanText(data.camp_id, 80),
      firma_name: cleanText(data.firma_name, 120),
      firma_email: cleanText(data.firma_email, 200).toLowerCase(),
      firma_telefon: cleanText(data.firma_telefon, 80),
      rechnungsadresse: cleanText(data.rechnungsadresse, 400) || null,
      mitarbeiter_vorname: cleanText(data.mitarbeiter_vorname, 80),
      mitarbeiter_nachname: cleanText(data.mitarbeiter_nachname, 80),
      mitarbeiter_email: cleanText(data.mitarbeiter_email, 200).toLowerCase() || null,
      mitarbeiter_telefon: cleanText(data.mitarbeiter_telefon, 80),
      kind_vorname: cleanText(data.kind_vorname, 80),
      kind_nachname: cleanText(data.kind_nachname, 80),
      kind_geburtsdatum: asString(data.kind_geburtsdatum, 20),
      erfahrung: cleanText(data.erfahrung, 500) || null,
      allergien: cleanText(data.allergien, 1000) || null,
      notizen: cleanText(data.notizen, 1200) || null,
      ansprechpartner_vorname: cleanText(data.ansprechpartner_vorname, 80) || null,
      ansprechpartner_nachname: cleanText(data.ansprechpartner_nachname, 80) || null,
      kostenstelle: cleanText(data.kostenstelle, 120) || null,
      trikot_groesse: cleanText(data.trikot_groesse, 20) || null,
    };

    if (!registration.firma_email) {
      registration.firma_email = registration.mitarbeiter_email || "info@firma.de";
    }
    if (!registration.firma_telefon) {
      registration.firma_telefon = registration.mitarbeiter_telefon;
    }

    const errors = [];
    if (!registration.camp_id) errors.push("Camp nicht ausgewaehlt");
    if (!registration.firma_name) errors.push("Firmenname fehlt");
    if (!registration.mitarbeiter_vorname) errors.push("Vorname Mitarbeiter fehlt");
    if (!registration.mitarbeiter_nachname) errors.push("Nachname Mitarbeiter fehlt");
    if (!registration.mitarbeiter_telefon || !PHONE_PATTERN.test(registration.mitarbeiter_telefon)) {
      errors.push("Gueltige Telefonnummer fehlt");
    }
    if (!registration.firma_telefon || !PHONE_PATTERN.test(registration.firma_telefon)) {
      errors.push("Gueltige Firmen-Telefonnummer fehlt");
    }
    if (!registration.kind_vorname) errors.push("Vorname des Kindes fehlt");
    if (!registration.kind_nachname) errors.push("Nachname des Kindes fehlt");
    if (!registration.kind_geburtsdatum) errors.push("Geburtsdatum fehlt");
    if (registration.mitarbeiter_email && !EMAIL_PATTERN.test(registration.mitarbeiter_email)) {
      errors.push("Gueltige E-Mail fehlt");
    }
    if (/[\r\n]/.test(registration.mitarbeiter_email || "")) {
      errors.push("Gueltige E-Mail fehlt");
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Validierungsfehler", details: errors }),
        { status: 400, headers: corsHeaders },
      );
    }

    const birthDate = new Date(registration.kind_geburtsdatum + "T00:00:00");
    if (isNaN(birthDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Geburtsdatum ist ungueltig." }),
        { status: 400, headers: corsHeaders },
      );
    }

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 4 || age > 16) {
      return new Response(
        JSON.stringify({ error: "Das Kind muss zwischen 5 und 14 Jahren alt sein." }),
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: camp, error: campError } = await supabase
      .from("camp_verfuegbarkeit")
      .select("*")
      .eq("id", registration.camp_id)
      .single();

    if (campError || !camp) {
      return new Response(
        JSON.stringify({ error: "Camp nicht gefunden", debug: campError?.message }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (camp.status !== "aktiv" || camp.freie_plaetze <= 0) {
      return new Response(
        JSON.stringify({ error: "Dieses Camp ist leider nicht mehr verfuegbar." }),
        { status: 409, headers: corsHeaders },
      );
    }

    let duplicateQuery = supabase
      .from("firmen_anmeldungen")
      .select("id")
      .eq("camp_id", registration.camp_id)
      .eq("kind_vorname", registration.kind_vorname)
      .eq("kind_nachname", registration.kind_nachname)
      .neq("status", "storniert");

    duplicateQuery = registration.mitarbeiter_email
      ? duplicateQuery.eq("mitarbeiter_email", registration.mitarbeiter_email)
      : duplicateQuery.eq("mitarbeiter_telefon", registration.mitarbeiter_telefon);

    const { data: existing } = await duplicateQuery.maybeSingle();
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Dieses Kind ist bereits fuer dieses Camp angemeldet." }),
        { status: 409, headers: corsHeaders },
      );
    }

    const betragEuro = Number(camp.aktueller_preis ?? camp.preis_euro ?? 0);
    const companyPayload = {
      ...registration,
      betrag_euro: betragEuro,
      status: "bezahlt",
    };

    const { data: firmRow, error: firmError } = await supabase
      .from("firmen_anmeldungen")
      .insert(companyPayload)
      .select()
      .single();

    if (firmError) {
      console.error("Firmen-Anmeldung Insert Error:", firmError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Speichern.", debug: firmError.message }),
        { status: 500, headers: corsHeaders },
      );
    }

    const legacyBase = {
      camp_id: registration.camp_id,
      vorname: registration.kind_vorname,
      nachname: registration.kind_nachname,
      geburtsdatum: registration.kind_geburtsdatum,
      eltern_vorname: registration.mitarbeiter_vorname,
      eltern_nachname: registration.mitarbeiter_nachname,
      email: registration.mitarbeiter_email || registration.firma_email,
      telefon: registration.mitarbeiter_telefon || registration.firma_telefon,
      adresse: registration.rechnungsadresse,
      erfahrung: registration.erfahrung,
      allergien: registration.allergien,
      notizen: registration.notizen,
      betrag_euro: 0,
    };

    let mirrorError: string | null = null;
    let mirror = await supabase
      .from("anmeldungen")
      .insert({
        ...legacyBase,
        zahlungsstatus: "bezahlt",
        list_price_euro: betragEuro,
        parent_amount_euro: 0,
        sponsor_amount_euro: 0,
        payer_type: "company",
        parent_payment_status: "not_required",
        sponsor_settlement_status: null,
        sponsoring_partner_id: null,
        sponsoring_entitlement_id: null,
      });

    if (mirror.error && String(mirror.error.message || "").includes("zahlungsstatus")) {
      mirror = await supabase
        .from("anmeldungen")
        .insert({
          ...legacyBase,
          status: "bezahlt",
          list_price_euro: betragEuro,
          parent_amount_euro: 0,
          sponsor_amount_euro: 0,
          payer_type: "company",
          parent_payment_status: "not_required",
          sponsor_settlement_status: null,
          sponsoring_partner_id: null,
          sponsoring_entitlement_id: null,
        });
    }

    if (mirror.error) {
      mirrorError = mirror.error.message;
      console.warn("Mirror insert failed:", mirror.error);
    }

    const confirmation = {
      firma_name: registration.firma_name,
      email: registration.mitarbeiter_email || registration.firma_email,
      mitarbeiter_vorname: registration.mitarbeiter_vorname,
      mitarbeiter_nachname: registration.mitarbeiter_nachname,
      mitarbeiter_telefon: registration.mitarbeiter_telefon,
      kind_vorname: registration.kind_vorname,
      kind_nachname: registration.kind_nachname,
      kind_geburtsdatum: formatDateDE(registration.kind_geburtsdatum),
      rechnungsadresse: registration.rechnungsadresse,
      betrag_euro: betragEuro,
      camp_name: camp.name || "Camp",
      camp_ort: camp.ort || "",
      camp_datum_von: camp.datum_von || null,
      camp_datum_bis: camp.datum_bis || null,
      camp_uhrzeit_von: camp.uhrzeit_von || "",
      camp_uhrzeit_bis: camp.uhrzeit_bis || "",
    };

    let emailVersendet = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && registration.mitarbeiter_email) {
      try {
        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [registration.mitarbeiter_email],
            reply_to: "kontakt@talentexperte.de",
            subject: "Firmen-Anmeldung bestätigt – " + camp.name,
            html: buildCompanyConfirmationHtml({
              parentName: registration.mitarbeiter_vorname,
              childName: registration.kind_vorname + " " + registration.kind_nachname,
              companyName: registration.firma_name,
              campName: camp.name || "Camp",
              zeitraum: formatDateDE(camp.datum_von) + " – " + formatDateDE(camp.datum_bis),
              uhrzeit: formatTime(camp.uhrzeit_von) + " – " + formatTime(camp.uhrzeit_bis),
              ort: camp.ort || "–",
            }),
          }),
        });
        emailVersendet = mailRes.ok;
        if (!mailRes.ok) {
          console.error("Resend-Fehler Firmen-Anmeldung (" + mailRes.status + "):", await mailRes.text());
        }
      } catch (emailErr) {
        console.error("Email-Fehler Firmen-Anmeldung:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Firmen-Anmeldung erfolgreich!",
        id: firmRow.id,
        confirmation,
        email_versendet: emailVersendet,
        mirror_error: mirrorError,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("Unerwarteter Fehler:", err);
    return new Response(
      JSON.stringify({ error: "Unerwarteter Fehler: " + String(err) }),
      { status: 500, headers: corsHeaders },
    );
  }
});
