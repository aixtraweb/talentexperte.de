import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabase = createClient(
  Deno.env.get("MY_SUPABASE_URL")!,
  Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature =
    req.headers.get("Stripe-Signature") ||
    req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  console.log("Received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email?.toLowerCase() || null;
    const amountPaid = session.amount_total ? session.amount_total / 100 : null;
    const refId = session.client_reference_id || null;

    console.log(`Checkout completed: ${email}, ${amountPaid} EUR, ref=${refId}`);

    const paymentFields = {
      zahlungsstatus: "bezahlt",
      parent_payment_status: "paid",
      zahlung_am: new Date().toISOString(),
      stripe_payment_id: session.payment_intent?.toString() || null,
    };

    // Bevorzugt: exakte Zuordnung über client_reference_id (= anmeldungen.id),
    // wird von anmeldung.html / register-Function an den Payment-Link angehängt
    if (refId) {
      const { data, error } = await supabase
        .from("anmeldungen")
        .update(paymentFields)
        .eq("id", refId)
        .eq("payer_type", "parent")
        .eq("parent_payment_status", "open")
        .eq("zahlungsstatus", "offen")
        .select();

      if (error) {
        console.error("Supabase update error (refId):", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (data && data.length > 0) {
        console.log(`Updated registration ${refId} via client_reference_id`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log(`client_reference_id ${refId} matched no open registration, falling back to email match`);
    }

    if (email) {
      let query = supabase
        .from("anmeldungen")
        .update(paymentFields)
        .eq("payer_type", "parent")
        .eq("parent_payment_status", "open")
        .eq("zahlungsstatus", "offen")
        .ilike("email", email);

      if (amountPaid !== null) {
        query = query.eq("betrag_euro", amountPaid);
      }

      const { data, error } = await query.select();

      if (error) {
        console.error("Supabase update error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`Updated ${data?.length || 0} registration(s) for ${email}`);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const email = intent.receipt_email?.toLowerCase() || null;
    const amountPaid = intent.amount / 100;

    console.log(`PaymentIntent succeeded: ${email}, ${amountPaid} EUR`);

    if (email) {
      const { data, error } = await supabase
        .from("anmeldungen")
        .update({
          zahlungsstatus: "bezahlt",
          parent_payment_status: "paid",
          zahlung_am: new Date().toISOString(),
          stripe_payment_id: intent.id,
        })
        .eq("payer_type", "parent")
        .eq("parent_payment_status", "open")
        .eq("zahlungsstatus", "offen")
        .ilike("email", email)
        .eq("betrag_euro", amountPaid)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`Updated ${data?.length || 0} registration(s) for ${email}`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
