import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createStoredConfirmationToken } from "../_shared/stored-confirmation-token.ts";
import { enqueueEmail } from "../_shared/email-outbox.ts";
import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReminderRequest {
  anmeldung_ids: string[];
}

interface Anmeldung {
  id: string;
  vorname: string;
  nachname: string;
  eltern_vorname: string;
  eltern_nachname: string;
  email: string;
  parent_amount_euro: number;
  payer_type: string;
  parent_payment_status: string;
  notizen?: string | null;
  camp_id: string;
  zahlungsstatus: string;
  camps?: { name: string; datum_von: string; datum_bis: string } | null;
  stripe_link?: string | null;
}

function formatDate(iso: string): string {
  if (!iso) return "–";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function paymentStartLink(
  registrationId: string,
  confirmationToken: string,
  stripeLink: string,
): string {
  return "https://www.talentexperte.de/zahlung-start.html#" +
    new URLSearchParams({
      id: registrationId,
      token: confirmationToken,
      stripe: stripeLink,
    }).toString();
}

function buildEmailHtml(
  a: Anmeldung,
  campName: string,
  campDates: string,
  securePaymentLink: string | null,
  confirmationLink: string,
): string {
  const amount = formatEuro(Number(a.parent_amount_euro));
  const payButton = securePaymentLink
    ? `<a href="${escapeHtml(securePaymentLink)}" style="display:inline-block;padding:14px 32px;background:#e50000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;margin:16px 0;">Jetzt bezahlen – ${escapeHtml(amount)}</a>`
    : `<p style="font-size:16px;font-weight:700;color:#e50000;">Offener Betrag: ${escapeHtml(amount)}</p>`;

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#0a0a0a;border-radius:12px;overflow:hidden;">
    <!-- Header -->
    <div style="padding:32px 32px 24px;text-align:center;">
      <h1 style="margin:0;font-size:28px;letter-spacing:2px;color:#fff;">TALENT<span style="color:#e50000;">EXPERTE</span></h1>
      <p style="color:#888;font-size:13px;margin:8px 0 0;">Fußballschule</p>
    </div>
    <!-- Content -->
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
        Hallo ${escapeHtml(a.eltern_vorname || "")},
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
        vielen Dank für die Anmeldung von <strong>${escapeHtml(a.vorname)} ${escapeHtml(a.nachname)}</strong> zum <strong>${escapeHtml(campName)}</strong>${campDates ? " (" + escapeHtml(campDates) + ")" : ""}.
      </p>
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 24px;">
        Wir möchten Sie freundlich daran erinnern, dass die Teilnahmegebühr noch aussteht. Bitte begleichen Sie den Betrag zeitnah, damit wir den Platz verbindlich reservieren können.
      </p>
      <div style="text-align:center;margin:24px 0;">
        ${payButton}
      </div>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 18px;">
        Ihre persönliche Bestätigung: <a href="${escapeHtml(confirmationLink)}" style="color:#e50000;">sicher öffnen</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">
        Bei Fragen stehen wir Ihnen gerne zur Verfügung.
      </p>
      <p style="font-size:14px;color:#333;line-height:1.6;margin:16px 0 0;">
        Sportliche Grüße<br>
        <strong>TALENTEXPERTE Fußballschule</strong><br>
        <a href="mailto:kontakt@talentexperte.de" style="color:#e50000;">kontakt@talentexperte.de</a><br>
        <a href="https://www.talentexperte.de" style="color:#e50000;">www.talentexperte.de</a>
      </p>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#999;margin:16px 0 0;">
    Diese E-Mail wurde automatisch versendet. Bitte antworten Sie direkt auf diese E-Mail bei Rückfragen.
  </p>
</div>
</body>
</html>`;
}

function buildPlainText(
  a: Anmeldung,
  campName: string,
  campDates: string,
  securePaymentLink: string | null,
  confirmationLink: string,
): string {
  return `Hallo ${a.eltern_vorname || ""},

vielen Dank für die Anmeldung von ${a.vorname} ${a.nachname} zum ${campName}${campDates ? " (" + campDates + ")" : ""}.

Wir möchten Sie freundlich daran erinnern, dass die Teilnahmegebühr von ${a.parent_amount_euro} € noch aussteht. Bitte begleichen Sie den Betrag zeitnah, damit wir den Platz verbindlich reservieren können.

${securePaymentLink ? "Sicher bezahlen: " + securePaymentLink : ""}
Persönliche Bestätigung: ${confirmationLink}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Sportliche Grüße
TALENTEXPERTE Fußballschule
kontakt@talentexperte.de
www.talentexperte.de`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = await requireDashboardAdmin(req);
    const supabase = admin.serviceClient;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY fehlt" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body: ReminderRequest = await req.json();
    const { anmeldung_ids } = body;

    if (!Array.isArray(anmeldung_ids) || anmeldung_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Keine Anmeldung-IDs übergeben" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (anmeldung_ids.length > 50) {
      return new Response(JSON.stringify({ error: "Maximal 50 Erinnerungen gleichzeitig" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Zahlungserinnerungen werden ausschließlich aus den kanonischen Eltern-
    // Zahlungsfeldern ermittelt. So kann weder ein UI-Fehler noch ein historischer
    // zahlungsstatus eine gesponserte Anmeldung in diesen Versand bringen.
    const { data: anmeldungen, error: fetchError } = await supabase
      .from("anmeldungen")
      .select("id, vorname, nachname, eltern_vorname, eltern_nachname, email, parent_amount_euro, payer_type, parent_payment_status, notizen, camp_id, zahlungsstatus, camps(name, datum_von, datum_bis, stripe_link)")
      .in("id", anmeldung_ids)
      .eq("payer_type", "parent")
      .eq("parent_payment_status", "open")
      .gt("parent_amount_euro", 0);

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Fehler beim Laden: " + fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Die expliziten Zahlungsfelder sind kanonisch. Ein frei eingegebener
    // Notizmarker darf den Zahlungsstatus nicht mehr beeinflussen.
    const openOnes = (anmeldungen || []).filter(
      (a: any) =>
        a.email &&
        a.payer_type === "parent" &&
        a.parent_payment_status === "open" &&
        Number(a.parent_amount_euro) > 0
    );

    if (openOnes.length === 0) {
      return new Response(JSON.stringify({ error: "Keine offenen Anmeldungen mit E-Mail gefunden" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; email: string; success: boolean; error?: string }[] = [];

    for (const row of openOnes) {
      const camp = row.camps as any;
      const campName = camp?.name || "Feriencamp";
      const campDates = camp?.datum_von && camp?.datum_bis
        ? formatDate(camp.datum_von) + " – " + formatDate(camp.datum_bis)
        : "";
      const confirmationToken = await createStoredConfirmationToken(
        supabase,
        "registration",
        String(row.id),
        camp?.datum_bis,
      );
      const confirmationLink =
        "https://www.talentexperte.de/bestaetigung.html?id=" +
        encodeURIComponent(String(row.id)) + "#token=" +
        encodeURIComponent(confirmationToken);
      const directStripeLink = camp?.stripe_link
        ? String(camp.stripe_link) +
          (String(camp.stripe_link).includes("?") ? "&" : "?") +
          "client_reference_id=" + encodeURIComponent(String(row.id)) +
          "&prefilled_email=" + encodeURIComponent(String(row.email))
        : null;
      const securePaymentLink = directStripeLink
        ? paymentStartLink(String(row.id), confirmationToken, directStripeLink)
        : null;

      const html = buildEmailHtml(
        row as unknown as Anmeldung,
        campName,
        campDates,
        securePaymentLink,
        confirmationLink,
      );
      const text = buildPlainText(
        row as unknown as Anmeldung,
        campName,
        campDates,
        securePaymentLink,
        confirmationLink,
      );

      try {
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [row.email],
            reply_to: "kontakt@talentexperte.de",
            subject: `Zahlungserinnerung – ${String(campName).replace(/[\r\n]+/g, " ")} | TALENTEXPERTE`,
            html,
            text,
          }),
        });

        const resendData = await resendResp.json();

        if (resendResp.ok) {
          // Erinnerung in DB protokollieren
          await supabase.from("anmeldungen").update({
            erinnerung_gesendet_am: new Date().toISOString(),
          }).eq("id", row.id);

          results.push({ id: row.id, email: row.email, success: true });
        } else {
          const sendError = resendData?.message || "Resend-Fehler";
          await enqueueEmail(supabase, "payment_reminder", row.email, {
            from: FROM_EMAIL, to: [row.email], reply_to: "kontakt@talentexperte.de",
            subject: `Zahlungserinnerung – ${String(campName).replace(/[\r\n]+/g, " ")} | TALENTEXPERTE`, html, text,
          }, sendError);
          results.push({ id: row.id, email: row.email, success: false, error: sendError });
        }
      } catch (sendErr: any) {
        await enqueueEmail(supabase, "payment_reminder", row.email, {
          from: FROM_EMAIL, to: [row.email], reply_to: "kontakt@talentexperte.de",
          subject: `Zahlungserinnerung – ${String(campName).replace(/[\r\n]+/g, " ")} | TALENTEXPERTE`, html, text,
        }, sendErr.message);
        results.push({ id: row.id, email: row.email, success: false, error: sendErr.message });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ sent, failed, total: results.length, details: results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
