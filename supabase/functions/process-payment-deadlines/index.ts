import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createStoredConfirmationToken } from "../_shared/stored-confirmation-token.ts";
import { enqueueEmail } from "../_shared/email-outbox.ts";
import {
  buildPaymentDeadlineEmail,
  buildSecurePaymentLink,
  calculateFinalDeadline,
  isPaymentDeadlinePolicyEligible,
  paymentDeadlineSender,
} from "../_shared/payment-deadline-email.ts";

const FROM_EMAIL = paymentDeadlineSender();

interface DeadlineRow {
  id: string;
  created_at: string;
  vorname: string;
  nachname: string;
  eltern_vorname: string;
  email: string;
  payer_type: string;
  parent_payment_status: string;
  parent_amount_euro: number;
  payment_due_at: string | null;
  payment_deadline_reminder_sent_at: string | null;
  reservation_expires_at: string | null;
  camps?: {
    name: string;
    datum_von: string;
    datum_bis: string;
    stripe_link: string | null;
  } | null;
}

interface StripeState {
  paid: Map<string, Stripe.Checkout.Session>;
  openUntil: Map<string, number>;
  manualReview: Set<string>;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function isFutureCamp(row: DeadlineRow): boolean {
  const campStart = row.camps?.datum_von;
  if (!campStart) return false;
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // Am ersten Camptag und in der Vergangenheit wird nie automatisch storniert.
  return campStart > today;
}

async function loadStripeState(
  stripe: Stripe,
  rows: DeadlineRow[],
): Promise<StripeState> {
  const ids = new Set(rows.map((row) => row.id));
  const paid = new Map<string, Stripe.Checkout.Session>();
  const openUntil = new Map<string, number>();
  const manualReview = new Set<string>();
  if (rows.length === 0) return { paid, openUntil, manualReview };

  const earliestCreated = Math.min(
    ...rows.map((row) => new Date(row.created_at).getTime()),
  );
  const createdGte = Math.floor((earliestCreated - 60 * 60 * 1000) / 1000);

  for await (
    const session of stripe.checkout.sessions.list({
      limit: 100,
      created: { gte: createdGte },
    })
  ) {
    const registrationId = String(session.client_reference_id || "");
    if (!ids.has(registrationId)) continue;
    if (session.status === "open" && session.expires_at) {
      openUntil.set(
        registrationId,
        Math.max(openUntil.get(registrationId) || 0, session.expires_at * 1000),
      );
    }
    if (session.payment_status !== "paid") continue;

    const row = rows.find((candidate) => candidate.id === registrationId);
    const expectedCents = Math.round(
      Number(row?.parent_amount_euro || 0) * 100,
    );
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || "";
    if (
      !row || !paymentIntentId || session.currency !== "eur" ||
      session.amount_total !== expectedCents || expectedCents <= 0
    ) {
      manualReview.add(registrationId);
      continue;
    }
    paid.set(registrationId, session);
  }
  return { paid, openUntil, manualReview };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Nur POST" }, 405);

  const expectedSecret = Deno.env.get("PAYMENT_DEADLINE_PROCESSOR_SECRET") ||
    "";
  const receivedSecret = (req.headers.get("Authorization") || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return json({ error: "Nicht autorisiert" }, 401);
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // Zeitplanaufrufe dürfen weiterhin ohne JSON-Body erfolgen.
  }

  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (!resendKey || !stripeKey) {
    return json({ error: "Resend- oder Stripe-Konfiguration fehlt" }, 503);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: policy, error: policyError } = await supabase
    .from("payment_deadline_policy")
    .select("active_from")
    .eq("id", true)
    .maybeSingle();
  const policyActiveFrom = String(policy?.active_from || "");
  if (
    policyError ||
    !isPaymentDeadlinePolicyEligible(policyActiveFrom, policyActiveFrom)
  ) {
    console.error(
      "Payment deadline policy is unavailable",
      policyError?.message,
    );
    return json({
      error:
        "Zahlungsfrist-Policy fehlt; bestehende Anmeldungen bleiben unverändert",
    }, 503);
  }
  const select =
    "id,created_at,vorname,nachname,eltern_vorname,email,payer_type,parent_payment_status,parent_amount_euro,payment_due_at,payment_deadline_reminder_sent_at,reservation_expires_at,camps!inner(name,datum_von,datum_bis,stripe_link)";

  const [
    { data: reminders, error: reminderError },
    { data: releases, error: releaseError },
  ] = await Promise.all([
    supabase.from("anmeldungen").select(select)
      .eq("payer_type", "parent")
      .eq("parent_payment_status", "open")
      .gt("parent_amount_euro", 0)
      .gte("created_at", policyActiveFrom)
      .lte("payment_due_at", nowIso)
      .is("payment_deadline_reminder_sent_at", null)
      .is("payment_reminder_queued_at", null)
      .order("payment_due_at", { ascending: true })
      .limit(100),
    supabase.from("anmeldungen").select(select)
      .eq("payer_type", "parent")
      .eq("parent_payment_status", "open")
      .gt("parent_amount_euro", 0)
      .gte("created_at", policyActiveFrom)
      .not("payment_deadline_reminder_sent_at", "is", null)
      .lte("reservation_expires_at", nowIso)
      .order("reservation_expires_at", { ascending: true })
      .limit(100),
  ]);

  if (reminderError || releaseError) {
    console.error(
      "Payment deadline query failed",
      reminderError?.message,
      releaseError?.message,
    );
    return json({ error: "Zahlungsfristen konnten nicht geladen werden" }, 500);
  }

  const reminderRows = ((reminders || []) as unknown as DeadlineRow[]).filter(
    (row) =>
      isFutureCamp(row) &&
      isPaymentDeadlinePolicyEligible(row.created_at, policyActiveFrom),
  );
  const releaseRows = ((releases || []) as unknown as DeadlineRow[]).filter(
    (row) =>
      isFutureCamp(row) &&
      isPaymentDeadlinePolicyEligible(row.created_at, policyActiveFrom),
  );
  const uniqueRows = new Map<string, DeadlineRow>();
  [...reminderRows, ...releaseRows].forEach((row) =>
    uniqueRows.set(row.id, row)
  );

  let stripeState: StripeState;
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    stripeState = await loadStripeState(stripe, [...uniqueRows.values()]);
  } catch (error) {
    console.error(
      "Stripe preflight failed",
      error instanceof Error ? error.message : String(error),
    );
    return json({
      error:
        "Stripe-Abgleich fehlgeschlagen; es wurden keine Erinnerungen oder Freigaben ausgeführt",
    }, 503);
  }

  if (dryRun) {
    const reminderDue = reminderRows.filter((row) =>
      !stripeState.paid.has(row.id) &&
      !stripeState.manualReview.has(row.id)
    );
    const releaseEligible = releaseRows.filter((row) =>
      !stripeState.paid.has(row.id) &&
      !stripeState.manualReview.has(row.id)
    );
    const activeCheckout = releaseEligible.filter((row) =>
      (stripeState.openUntil.get(row.id) || 0) > now.getTime()
    ).length;
    const releaseDue = releaseEligible.length - activeCheckout;
    const camps = new Map<
      string,
      { reminders_due: number; releases_due: number }
    >();
    const addCampCount = (
      row: DeadlineRow,
      field: "reminders_due" | "releases_due",
    ) => {
      const name = row.camps?.name || "Unbekanntes Camp";
      const counts = camps.get(name) || {
        reminders_due: 0,
        releases_due: 0,
      };
      counts[field]++;
      camps.set(name, counts);
    };
    reminderDue.forEach((row) =>
      addCampCount(row, "reminders_due")
    );
    releaseEligible
      .filter((row) =>
        (stripeState.openUntil.get(row.id) || 0) <= now.getTime()
      )
      .forEach((row) => addCampCount(row, "releases_due"));

    return json({
      success: true,
      dry_run: true,
      policy_active_from: policyActiveFrom,
      candidates: uniqueRows.size,
      reminders_due: reminderDue.length,
      releases_due: releaseDue,
      already_paid_at_stripe: stripeState.paid.size,
      active_checkout_deferred: activeCheckout,
      manual_review: stripeState.manualReview.size,
      camps: Object.fromEntries(camps),
    });
  }

  let reconciledPaid = 0;
  for (const [registrationId, session] of stripeState.paid) {
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;
    const { data: updated } = await supabase.from("anmeldungen").update({
      zahlungsstatus: "bezahlt",
      parent_payment_status: "paid",
      zahlung_am: new Date(
        (session.created || Math.floor(Date.now() / 1000)) * 1000,
      ).toISOString(),
      stripe_payment_id: paymentIntentId,
      payment_reminder_processing_at: null,
      payment_reminder_queued_at: null,
    }).eq("id", registrationId)
      .eq("payer_type", "parent")
      .eq("parent_payment_status", "open")
      .select("id")
      .maybeSingle();
    if (updated) reconciledPaid++;
  }

  let reminded = 0;
  let queued = 0;
  let failed = 0;
  for (const row of reminderRows) {
    if (stripeState.paid.has(row.id) || stripeState.manualReview.has(row.id)) {
      continue;
    }
    const { data: claimed } = await supabase.rpc(
      "claim_payment_deadline_reminder",
      {
        p_registration_id: row.id,
        p_now: nowIso,
      },
    );
    if (claimed !== true) continue;

    const camp = row.camps!;
    const expiresAt = calculateFinalDeadline(row.payment_due_at, now);
    let retryPayload: Record<string, unknown> | null = null;
    try {
      const confirmationToken = await createStoredConfirmationToken(
        supabase,
        "registration",
        row.id,
        camp.datum_bis,
      );
      const confirmationLink =
        "https://www.talentexperte.de/bestaetigung.html?id=" +
        encodeURIComponent(row.id) + "#token=" +
        encodeURIComponent(confirmationToken);
      const paymentLink = buildSecurePaymentLink(
        row.id,
        confirmationToken,
        row.email,
        camp.stripe_link,
      );
      const message = buildPaymentDeadlineEmail(
        row,
        camp,
        paymentLink,
        confirmationLink,
        expiresAt,
      );
      const payload = {
        from: FROM_EMAIL,
        to: [row.email],
        bcc: ["kontakt@talentexperte.de"],
        reply_to: "kontakt@talentexperte.de",
        subject: message.subject,
        html: message.html,
        text: message.text,
      };
      retryPayload = payload;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `talentexperte-payment-deadline-${row.id}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const sendError = `Resend ${response.status}: ${
          (await response.text()).slice(0, 300)
        }`;
        const didQueue = await enqueueEmail(
          supabase,
          "payment_deadline_reminder",
          row.email,
          payload,
          sendError,
          { relatedRegistrationId: row.id, paymentDeadlineAt: expiresAt },
        );
        if (didQueue) {
          await supabase.rpc("queue_payment_deadline_reminder", {
            p_registration_id: row.id,
            p_queued_at: new Date().toISOString(),
          });
          queued++;
        } else {
          await supabase.rpc("fail_payment_deadline_reminder", {
            p_registration_id: row.id,
          });
          failed++;
        }
        continue;
      }
      const sentAt = new Date().toISOString();
      const { data: completed, error: completeError } = await supabase.rpc(
        "complete_payment_deadline_reminder",
        {
          p_registration_id: row.id,
          p_sent_at: sentAt,
          p_expires_at: expiresAt,
        },
      );
      if (completed === true) reminded++;
      else {
        console.error(
          "Reminder sent but deadline state failed",
          row.id,
          completeError?.message,
        );
        failed++;
      }
    } catch (error) {
      const sendError = error instanceof Error ? error.message : String(error);
      console.error(
        "Payment deadline reminder failed",
        row.id,
        sendError,
      );
      const didQueue = retryPayload
        ? await enqueueEmail(
          supabase,
          "payment_deadline_reminder",
          row.email,
          retryPayload,
          sendError,
          { relatedRegistrationId: row.id, paymentDeadlineAt: expiresAt },
        )
        : false;
      if (didQueue) {
        await supabase.rpc("queue_payment_deadline_reminder", {
          p_registration_id: row.id,
          p_queued_at: new Date().toISOString(),
        });
        queued++;
      } else {
        await supabase.rpc("fail_payment_deadline_reminder", {
          p_registration_id: row.id,
        });
        failed++;
      }
    }
  }

  let released = 0;
  let activeCheckout = 0;
  for (const row of releaseRows) {
    if (stripeState.paid.has(row.id) || stripeState.manualReview.has(row.id)) {
      continue;
    }
    if ((stripeState.openUntil.get(row.id) || 0) > Date.now()) {
      activeCheckout++;
      continue;
    }
    const { data: didRelease } = await supabase.rpc(
      "release_unpaid_registration",
      {
        p_registration_id: row.id,
        p_released_at: new Date().toISOString(),
      },
    );
    if (didRelease === true) released++;
  }

  return json({
    success: true,
    policy_active_from: policyActiveFrom,
    candidates: uniqueRows.size,
    reconciled_paid: reconciledPaid,
    reminded,
    queued,
    reminder_failed: failed,
    released,
    active_checkout_deferred: activeCheckout,
    manual_review: stripeState.manualReview.size,
  });
});
