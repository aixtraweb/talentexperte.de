export async function enqueueEmail(
  supabase: any,
  messageType: string,
  recipient: string,
  payload: Record<string, unknown>,
  lastError: string,
): Promise<void> {
  const { error } = await supabase.from("email_outbox").insert({
    message_type: messageType,
    recipient,
    payload,
    status: "failed",
    attempt_count: 1,
    next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    last_error: lastError.slice(0, 1000),
  });
  if (error) console.error("Email outbox insert failed:", error.message);
}
