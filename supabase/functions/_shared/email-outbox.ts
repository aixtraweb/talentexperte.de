export async function enqueueEmail(
  supabase: any,
  messageType: string,
  recipient: string,
  payload: Record<string, unknown>,
  lastError: string,
  metadata?: {
    relatedRegistrationId?: string | null;
    paymentDeadlineAt?: string | null;
  },
): Promise<boolean> {
  const { error } = await supabase.from("email_outbox").insert({
    message_type: messageType,
    recipient,
    payload,
    status: "failed",
    attempt_count: 1,
    next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    last_error: lastError.slice(0, 1000),
    related_registration_id: metadata?.relatedRegistrationId || null,
    payment_deadline_at: metadata?.paymentDeadlineAt || null,
  });
  if (error && error.code !== "23505") {
    console.error("Email outbox insert failed:", error.message);
    return false;
  }
  return true;
}
