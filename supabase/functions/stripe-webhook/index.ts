import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2023-10-16" });
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || Deno.env.get("MY_SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function finishEvent(
  eventId: string,
  status: "processed" | "ignored" | "rejected" | "failed",
  fields: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("stripe_webhook_events").update({
    status,
    processed_at: new Date().toISOString(),
    ...fields,
  }).eq("event_id", eventId);
  if (error) console.error("Stripe event journal update failed:", error.message);
}

serve(async (req) => {
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  if (!endpointSecret) return response({ error: "Webhook not configured" }, 503);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return response({ error: "Missing stripe signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Webhook signature verification failed:", message);
    return response({ error: "Invalid stripe signature" }, 400);
  }

  const { error: journalError } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    status: "received",
  });
  if (journalError?.code === "23505") return response({ received: true, duplicate: true });
  if (journalError) {
    console.error("Stripe event journal insert failed:", journalError.message);
    return response({ error: "Event journal unavailable" }, 500);
  }

  if (event.type !== "checkout.session.completed") {
    await finishEvent(event.id, "ignored", { message: "Event type does not change registrations" });
    return response({ received: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const registrationId = String(session.client_reference_id || "").trim();
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || "";
  const amountCents = session.amount_total;
  const currency = String(session.currency || "").toLowerCase();

  if (
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(registrationId) ||
    !paymentIntentId || !Number.isInteger(amountCents) || currency !== "eur" ||
    session.payment_status !== "paid"
  ) {
    await finishEvent(event.id, "rejected", {
      // Eine syntaktisch korrekte, aber unbekannte UUID darf das Journal nicht
      // an der Fremdschlüsselprüfung scheitern lassen.
      registration_id: null,
      payment_intent_id: paymentIntentId || null,
      amount_cents: amountCents,
      currency,
      message: "Missing or invalid exact payment assignment",
    });
    return response({ received: true, matched: false });
  }

  const { data: registration, error: registrationError } = await supabase
    .from("anmeldungen")
    .select("id,parent_amount_euro,payer_type,parent_payment_status,zahlungsstatus")
    .eq("id", registrationId)
    .maybeSingle();
  const expectedCents = Math.round(Number(registration?.parent_amount_euro || 0) * 100);
  if (
    registrationError || !registration || registration.payer_type !== "parent" ||
    registration.parent_payment_status !== "open" || registration.zahlungsstatus !== "offen" ||
    expectedCents <= 0 || amountCents !== expectedCents
  ) {
    await finishEvent(event.id, "rejected", {
      registration_id: registration?.id || null,
      payment_intent_id: paymentIntentId,
      amount_cents: amountCents,
      currency,
      message: `Registration mismatch; expected ${expectedCents} cents`,
    });
    return response({ received: true, matched: false });
  }

  const { data: updated, error: updateError } = await supabase.from("anmeldungen").update({
    zahlungsstatus: "bezahlt",
    parent_payment_status: "paid",
    zahlung_am: new Date().toISOString(),
    stripe_payment_id: paymentIntentId,
  }).eq("id", registrationId)
    .eq("payer_type", "parent")
    .eq("parent_payment_status", "open")
    .eq("zahlungsstatus", "offen")
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    await finishEvent(event.id, "failed", {
      registration_id: registrationId,
      payment_intent_id: paymentIntentId,
      amount_cents: amountCents,
      currency,
      message: updateError?.message || "Concurrent registration update",
    });
    return response({ error: "Payment update failed" }, 500);
  }

  await finishEvent(event.id, "processed", {
    registration_id: registrationId,
    payment_intent_id: paymentIntentId,
    amount_cents: amountCents,
    currency,
    message: "Exact registration and amount matched",
  });
  return response({ received: true, registration_id: registrationId });
});
