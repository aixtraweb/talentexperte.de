import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";

function formatDateDE(iso: string | null): string {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(t: string | null): string {
  if (!t) return "–";
  return String(t).slice(0, 5) + " Uhr";
}

function buildConfirmationHtml(opts: {
  elternVorname: string;
  kindVorname: string;
  campName: string;
  zeitraum: string;
  uhrzeit: string;
  ort: string;
  betrag: number;
  buchungsNr: string;
  payLink: string | null;
  bestaetigungLink: string;
}): string {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:#e50000;padding:24px 32px">
    <h1 style="margin:0;font-size:24px;color:#fff">TALENTEXPERTE</h1>
    <p style="margin:4px 0 0;font-size:14px;color:#fff;opacity:.9">Anmeldebestätigung</p>
  </div>
  <div style="padding:32px">
    <p>Hallo ${opts.elternVorname},</p>
    <p>vielen Dank für die Anmeldung von <strong>${opts.kindVorname}</strong> zum <strong>${opts.campName}</strong>!</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;color:#ddd">
      <tr><td style="padding:6px 0;color:#888">Buchungs-Nr.</td><td style="padding:6px 0"><strong style="letter-spacing:.08em;color:#fff">${opts.buchungsNr}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#888">Zeitraum</td><td style="padding:6px 0">${opts.zeitraum}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Uhrzeit</td><td style="padding:6px 0">${opts.uhrzeit}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Ort</td><td style="padding:6px 0">${opts.ort}</td></tr>
      <tr><td style="padding:6px 0;color:#888">Betrag</td><td style="padding:6px 0"><strong style="color:#fff">${opts.betrag} €</strong></td></tr>
    </table>
    ${opts.payLink ? `<p style="margin:24px 0"><a href="${opts.payLink}" style="display:inline-block;background:#e50000;color:#fff;padding:14px 32px;border-radius:30px;text-decoration:none;font-weight:bold">JETZT BEZAHLEN</a></p>` : ""}
    <p style="font-size:13px;color:#888">Der Platz wird erst nach Zahlungseingang verbindlich reserviert.</p>
    <p style="font-size:13px;color:#888">Deine Bestätigung kannst du jederzeit hier abrufen:<br>
      <a href="${opts.bestaetigungLink}" style="color:#e50000">${opts.bestaetigungLink}</a></p>
    <p style="font-size:13px;color:#888">Bei Fragen erreichst du uns unter <a href="mailto:kontakt@talentexperte.de" style="color:#e50000">kontakt@talentexperte.de</a>.</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Nur POST-Anfragen erlaubt" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const data = await req.json();

    const errors = [];
    if (!data.camp_id) errors.push("Camp nicht ausgewaehlt");
    if (!data.vorname?.trim()) errors.push("Vorname des Kindes fehlt");
    if (!data.nachname?.trim()) errors.push("Nachname des Kindes fehlt");
    if (!data.geburtsdatum) errors.push("Geburtsdatum fehlt");
    if (!data.eltern_vorname?.trim()) errors.push("Vorname Elternteil fehlt");
    if (!data.eltern_nachname?.trim()) errors.push("Nachname Elternteil fehlt");
    if (!data.email?.trim() || !data.email.includes("@")) errors.push("Gueltige E-Mail fehlt");
    if (!data.telefon?.trim()) errors.push("Telefonnummer fehlt");

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: "Validierungsfehler", details: errors }),
        { status: 400, headers: corsHeaders }
      );
    }

    const birthDate = new Date(data.geburtsdatum);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 4 || age > 16) {
      return new Response(
        JSON.stringify({ error: "Das Kind muss zwischen 5 und 14 Jahren alt sein." }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: camp, error: campError } = await supabase
      .from("camp_verfuegbarkeit")
      .select("*")
      .eq("id", data.camp_id)
      .single();

    if (campError || !camp) {
      return new Response(
        JSON.stringify({ error: "Camp nicht gefunden", debug: campError?.message }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (camp.status !== "aktiv") {
      return new Response(
        JSON.stringify({ error: "Dieses Camp ist leider nicht mehr verfuegbar." }),
        { status: 409, headers: corsHeaders }
      );
    }

    if (camp.freie_plaetze <= 0) {
      return new Response(
        JSON.stringify({ error: "Dieses Camp ist leider ausgebucht." }),
        { status: 409, headers: corsHeaders }
      );
    }

    const { data: existing } = await supabase
      .from("anmeldungen")
      .select("id")
      .eq("camp_id", data.camp_id)
      .eq("vorname", data.vorname.trim())
      .eq("nachname", data.nachname.trim())
      .eq("email", data.email.trim().toLowerCase())
      .neq("zahlungsstatus", "storniert")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Dieses Kind ist bereits fuer dieses Camp angemeldet." }),
        { status: 409, headers: corsHeaders }
      );
    }

    const aktueller_preis = camp.aktueller_preis;

    const { data: anmeldung, error: insertError } = await supabase
      .from("anmeldungen")
      .insert({
        camp_id: data.camp_id,
        vorname: data.vorname.trim(),
        nachname: data.nachname.trim(),
        geburtsdatum: data.geburtsdatum,
        trikot_groesse: data.trikot_groesse || null,
        eltern_vorname: data.eltern_vorname.trim(),
        eltern_nachname: data.eltern_nachname.trim(),
        email: data.email.trim().toLowerCase(),
        telefon: data.telefon.trim(),
        adresse: data.adresse?.trim() || null,
        erfahrung: data.erfahrung?.trim() || null,
        allergien: data.allergien?.trim() || null,
        notizen: data.notizen?.trim() || null,
        betrag_euro: aktueller_preis,
        zahlungsstatus: "offen",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert Error:", insertError);
      return new Response(
        JSON.stringify({ error: "Fehler beim Speichern.", debug: insertError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    const buchungsNr = String(anmeldung.id).slice(0, 8).toUpperCase();
    // Stripe-Link mit client_reference_id, damit der Webhook die Zahlung
    // exakt dieser Anmeldung zuordnen kann (statt nur E-Mail + Betrag)
    const payLink = camp.stripe_link
      ? camp.stripe_link + (camp.stripe_link.includes("?") ? "&" : "?") +
        "client_reference_id=" + anmeldung.id +
        "&prefilled_email=" + encodeURIComponent(data.email.trim().toLowerCase())
      : null;

    let emailVersendet = false;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && RESEND_API_KEY !== "") {
      try {
        const mailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + RESEND_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [data.email.trim().toLowerCase()],
            reply_to: "kontakt@talentexperte.de",
            subject: "Anmeldebestätigung – " + camp.name + " (Buchungs-Nr. " + buchungsNr + ")",
            html: buildConfirmationHtml({
              elternVorname: data.eltern_vorname.trim(),
              kindVorname: data.vorname.trim(),
              campName: camp.name,
              zeitraum: formatDateDE(camp.datum_von) + " – " + formatDateDE(camp.datum_bis),
              uhrzeit: formatTime(camp.uhrzeit_von) + " – " + formatTime(camp.uhrzeit_bis),
              ort: camp.ort || "–",
              betrag: aktueller_preis,
              buchungsNr,
              payLink,
              bestaetigungLink: "https://www.talentexperte.de/bestaetigung.html?id=" + anmeldung.id,
            }),
          }),
        });
        if (mailRes.ok) {
          emailVersendet = true;
        } else {
          const errBody = await mailRes.text();
          console.error("Resend-Fehler (" + mailRes.status + "):", errBody);
        }
      } catch (emailErr) {
        console.error("Email-Fehler:", emailErr);
      }
    } else {
      console.error("RESEND_API_KEY fehlt – keine Bestätigungs-E-Mail versendet.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Anmeldung erfolgreich!",
        anmeldung_id: anmeldung.id,
        camp_name: camp.name,
        betrag: aktueller_preis,
        stripe_link: payLink,
        email_versendet: emailVersendet,
        freie_plaetze: camp.freie_plaetze - 1,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err) {
    console.error("Unerwarteter Fehler:", err);
    return new Response(
      JSON.stringify({ error: "Unerwarteter Fehler: " + String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
