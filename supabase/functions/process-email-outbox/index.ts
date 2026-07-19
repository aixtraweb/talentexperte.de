import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { AdminAuthError, requireDashboardAdmin } from "../_shared/admin-auth.ts";
import { formatDeadline } from "../_shared/payment-deadline-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://www.talentexperte.de",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function refreshPaymentDeadlinePayload(
  payload: Record<string, unknown>,
  previousDeadline: string,
): { payload: Record<string, unknown>; deadline: string } {
  const minimumDeadline = Date.now() + 24 * 60 * 60 * 1000;
  if (new Date(previousDeadline).getTime() >= minimumDeadline) {
    return { payload, deadline: previousDeadline };
  }
  const deadline = new Date(minimumDeadline + 5 * 60 * 1000).toISOString();
  const oldLong = formatDeadline(previousDeadline);
  const newLong = formatDeadline(deadline);
  const refreshed = { ...payload };
  for (const field of ["html", "text"]) {
    if (typeof refreshed[field] === "string") {
      refreshed[field] = String(refreshed[field]).split(oldLong).join(newLong);
    }
  }
  if (typeof refreshed.subject === "string") {
    refreshed.subject = String(refreshed.subject).replace(
      /Platz bis \d{2}\.\d{2}\.\d{4} sichern/,
      `Platz bis ${formatDateShort(deadline)} sichern`,
    );
  }
  return { payload: refreshed, deadline };
}

async function findPaidCheckout(
  stripe: Stripe,
  registration: {
    id: string;
    created_at: string;
    parent_amount_euro: number;
  },
): Promise<Stripe.Checkout.Session | null> {
  const createdGte = Math.floor(
    (new Date(registration.created_at).getTime() - 60 * 60 * 1000) / 1000,
  );
  for await (const session of stripe.checkout.sessions.list({
    limit: 100,
    created: { gte: createdGte },
  })) {
    if (session.client_reference_id !== registration.id) continue;
    if (session.payment_status !== "paid") continue;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || "";
    const expectedCents = Math.round(Number(registration.parent_amount_euro) * 100);
    if (
      !paymentIntentId || session.currency !== "eur" ||
      session.amount_total !== expectedCents || expectedCents <= 0
    ) {
      throw new Error("Stripe-Zahlung ist vorhanden, aber nicht eindeutig zuordenbar");
    }
    return session;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);
  const expected = Deno.env.get("OUTBOX_PROCESSOR_SECRET") || "";
  const received = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!expected || received !== expected) {
    try {
      await requireDashboardAdmin(req);
    } catch (error) {
      if (error instanceof AdminAuthError) return json({ error: error.message }, error.status);
      return json({ error: "Nicht autorisiert" }, 401);
    }
  }
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) return json({ error: "RESEND_API_KEY fehlt" }, 503);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const stripe = stripeKey
    ? new Stripe(stripeKey, { apiVersion: "2023-10-16" })
    : null;
  await supabase.from("email_outbox").update({
    status: "failed",
    last_error: "Abgebrochener Versandlauf wurde wieder aufgenommen.",
    processing_started_at: null,
    next_attempt_at: new Date().toISOString(),
  }).eq("status", "sending")
    .lt("processing_started_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
  const { data: pending, error } = await supabase.from("email_outbox")
    .select("id,message_type,payload,attempt_count,related_registration_id,payment_deadline_at")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return json({ error: "Outbox konnte nicht geladen werden" }, 500);

  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  for (const item of pending || []) {
    const { data: claimed } = await supabase.from("email_outbox").update({
      status: "sending",
      processing_started_at: new Date().toISOString(),
    })
      .eq("id", item.id).in("status", ["pending", "failed"]).select("id").maybeSingle();
    if (!claimed) continue;
    try {
      let sendPayload = item.payload as Record<string, unknown>;
      let paymentDeadlineAt = item.payment_deadline_at as string | null;
      if (item.message_type === "payment_deadline_reminder") {
        const { data: registration } = await supabase.from("anmeldungen")
          .select("id,created_at,payer_type,parent_payment_status,parent_amount_euro,payment_deadline_reminder_sent_at")
          .eq("id", item.related_registration_id)
          .maybeSingle();
        if (registration?.payment_deadline_reminder_sent_at) {
          await supabase.from("email_outbox").update({
            status: "sent",
            sent_at: registration.payment_deadline_reminder_sent_at,
            last_error: null,
            processing_started_at: null,
          }).eq("id", item.id);
          sent++;
          continue;
        }
        if (
          !registration || registration.payer_type !== "parent" ||
          registration.parent_payment_status !== "open"
        ) {
          await supabase.from("email_outbox").update({
            status: "cancelled",
            last_error: "Nicht gesendet: Elternzahlung ist nicht mehr offen oder die Letzterinnerung wurde bereits versendet.",
            processing_started_at: null,
          }).eq("id", item.id);
          cancelled++;
          continue;
        }
        if (!stripe) throw new Error("STRIPE_SECRET_KEY fehlt für den Zahlungsabgleich");
        const paidSession = await findPaidCheckout(stripe, registration);
        if (paidSession) {
          const paymentIntentId = typeof paidSession.payment_intent === "string"
            ? paidSession.payment_intent
            : paidSession.payment_intent?.id || null;
          const { data: paidUpdate, error: paidUpdateError } = await supabase.from("anmeldungen").update({
            zahlungsstatus: "bezahlt",
            parent_payment_status: "paid",
            zahlung_am: new Date().toISOString(),
            stripe_payment_id: paymentIntentId,
            payment_reminder_queued_at: null,
          }).eq("id", registration.id)
            .eq("payer_type", "parent")
            .eq("parent_payment_status", "open")
            .select("id")
            .maybeSingle();
          if (paidUpdateError) throw new Error(paidUpdateError.message);
          if (!paidUpdate) {
            const { data: current } = await supabase.from("anmeldungen")
              .select("parent_payment_status")
              .eq("id", registration.id)
              .maybeSingle();
            if (current?.parent_payment_status !== "paid") {
              throw new Error("Stripe-Zahlung konnte nicht sicher in Supabase übernommen werden");
            }
          }
          await supabase.from("email_outbox").update({
            status: "cancelled",
            last_error: "Nicht gesendet: Stripe-Zahlung wurde vor dem Versand bestätigt.",
            processing_started_at: null,
          }).eq("id", item.id);
          cancelled++;
          continue;
        }
        if (!paymentDeadlineAt) throw new Error("Zahlungsfrist fehlt in der Outbox");
        const refreshed = refreshPaymentDeadlinePayload(sendPayload, paymentDeadlineAt);
        sendPayload = refreshed.payload;
        paymentDeadlineAt = refreshed.deadline;
        if (paymentDeadlineAt !== item.payment_deadline_at) {
          await supabase.from("email_outbox").update({
            payload: sendPayload,
            payment_deadline_at: paymentDeadlineAt,
          }).eq("id", item.id);
        }
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `talentexperte-outbox-${item.id}`,
        },
        body: JSON.stringify(sendPayload),
      });
      if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const sentAt = new Date().toISOString();
      if (
        item.message_type === "payment_deadline_reminder" &&
        item.related_registration_id && paymentDeadlineAt
      ) {
        const { data: completed, error: completeError } = await supabase.rpc("complete_payment_deadline_reminder", {
          p_registration_id: item.related_registration_id,
          p_sent_at: sentAt,
          p_expires_at: paymentDeadlineAt,
        });
        if (completeError || completed !== true) {
          throw new Error(completeError?.message || "Versandfrist konnte nicht gespeichert werden");
        }
      }
      await supabase.from("email_outbox").update({
        status: "sent",
        attempt_count: Number(item.attempt_count || 0) + 1,
        sent_at: sentAt,
        last_error: null,
        processing_started_at: null,
      }).eq("id", item.id);
      sent++;
    } catch (error) {
      const attempt = Number(item.attempt_count || 0) + 1;
      const delayMinutes = Math.min(24 * 60, Math.pow(2, Math.min(attempt, 8)) * 5);
      await supabase.from("email_outbox").update({
        status: "failed",
        attempt_count: attempt,
        next_attempt_at: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString(),
        last_error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
        processing_started_at: null,
      }).eq("id", item.id);
      failed++;
    }
  }
  return json({ success: true, processed: sent + failed + cancelled, sent, failed, cancelled });
});
