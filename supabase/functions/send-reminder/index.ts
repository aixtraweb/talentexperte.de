import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createStoredConfirmationToken } from "../_shared/stored-confirmation-token.ts";
import { enqueueEmail } from "../_shared/email-outbox.ts";
import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";
import {
  buildPaymentDeadlineEmail,
  buildSecurePaymentLink,
  calculateFinalDeadline,
  paymentDeadlineSender,
} from "../_shared/payment-deadline-email.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = paymentDeadlineSender();

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
  payment_due_at?: string | null;
  payment_deadline_reminder_sent_at?: string | null;
  notizen?: string | null;
  camp_id: string;
  zahlungsstatus: string;
  camps?: { name: string; datum_von: string; datum_bis: string } | null;
  stripe_link?: string | null;
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
      .select("id, vorname, nachname, eltern_vorname, eltern_nachname, email, parent_amount_euro, payer_type, parent_payment_status, payment_due_at, payment_deadline_reminder_sent_at, notizen, camp_id, zahlungsstatus, camps(name, datum_von, datum_bis, stripe_link)")
      .in("id", anmeldung_ids)
      .eq("payer_type", "parent")
      .eq("parent_payment_status", "open")
      .gt("parent_amount_euro", 0)
      .lte("payment_due_at", new Date().toISOString())
      .is("payment_deadline_reminder_sent_at", null);

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
      const { data: claimed } = await supabase.rpc("claim_payment_deadline_reminder", {
        p_registration_id: row.id,
        p_now: new Date().toISOString(),
      });
      if (claimed !== true) continue;

      const camp = row.camps as any;
      const campName = camp?.name || "Feriencamp";
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
      const securePaymentLink = buildSecurePaymentLink(
        String(row.id),
        confirmationToken,
        String(row.email),
        camp?.stripe_link,
      );
      const expiresAt = calculateFinalDeadline(row.payment_due_at);
      const message = buildPaymentDeadlineEmail(
        row as unknown as Anmeldung,
        { name: campName, datum_von: camp?.datum_von, datum_bis: camp?.datum_bis, stripe_link: camp?.stripe_link },
        securePaymentLink,
        confirmationLink,
        expiresAt,
      );

      try {
        const resendResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `talentexperte-payment-deadline-${row.id}`,
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [row.email],
            bcc: ["kontakt@talentexperte.de"],
            reply_to: "kontakt@talentexperte.de",
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });

        const resendData = await resendResp.json();

        if (resendResp.ok) {
          const sentAt = new Date().toISOString();
          const { data: completed, error: completeError } = await supabase.rpc("complete_payment_deadline_reminder", {
            p_registration_id: row.id,
            p_sent_at: sentAt,
            p_expires_at: expiresAt,
          });
          if (completeError || completed !== true) {
            console.error("Reminder sent but deadline state failed", row.id, completeError?.message);
            results.push({
              id: row.id,
              email: row.email,
              success: false,
              error: "E-Mail versendet, Friststatus konnte nicht gespeichert werden",
            });
          } else {
            results.push({ id: row.id, email: row.email, success: true });
          }
        } else {
          const sendError = resendData?.message || "Resend-Fehler";
          const queued = await enqueueEmail(supabase, "payment_deadline_reminder", row.email, {
            from: FROM_EMAIL, to: [row.email], reply_to: "kontakt@talentexperte.de",
            subject: message.subject, html: message.html, text: message.text,
          }, sendError, {
            relatedRegistrationId: String(row.id),
            paymentDeadlineAt: expiresAt,
          });
          if (queued) {
            await supabase.rpc("queue_payment_deadline_reminder", {
              p_registration_id: row.id,
              p_queued_at: new Date().toISOString(),
            });
          } else {
            await supabase.rpc("fail_payment_deadline_reminder", { p_registration_id: row.id });
          }
          results.push({ id: row.id, email: row.email, success: false, error: sendError });
        }
      } catch (sendErr: any) {
        const queued = await enqueueEmail(supabase, "payment_deadline_reminder", row.email, {
          from: FROM_EMAIL, to: [row.email], reply_to: "kontakt@talentexperte.de",
          subject: message.subject, html: message.html, text: message.text,
        }, sendErr.message, {
          relatedRegistrationId: String(row.id),
          paymentDeadlineAt: expiresAt,
        });
        if (queued) {
          await supabase.rpc("queue_payment_deadline_reminder", {
            p_registration_id: row.id,
            p_queued_at: new Date().toISOString(),
          });
        } else {
          await supabase.rpc("fail_payment_deadline_reminder", { p_registration_id: row.id });
        }
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
