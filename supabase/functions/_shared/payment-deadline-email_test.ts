import {
  buildPaymentDeadlineEmail,
  buildSecurePaymentLink,
  calculateFinalDeadline,
} from "./payment-deadline-email.ts";

Deno.test("calculateFinalDeadline grants at least 24 hours", () => {
  const now = new Date("2026-07-19T10:00:00.000Z");
  const deadline = new Date(calculateFinalDeadline(null, now));
  if (deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    throw new Error("Nachfrist ist kuerzer als 24 Stunden");
  }
});

Deno.test("future payment due date is not shortened", () => {
  const now = new Date("2026-07-19T10:00:00.000Z");
  const paymentDueAt = "2026-07-20T10:00:00.000Z";
  const deadline = new Date(calculateFinalDeadline(paymentDueAt, now));
  if (
    deadline.getTime() < new Date(paymentDueAt).getTime() + 24 * 60 * 60 * 1000
  ) {
    throw new Error("Vorzeitiger Adminversand verkuerzt die regulaere Frist");
  }
});

Deno.test("deadline email is explicit and escapes personal data", () => {
  const securePaymentLink = buildSecurePaymentLink(
    "11111111-1111-4111-8111-111111111111",
    "confirmation-token-with-enough-length",
    "eltern@example.com",
    "https://buy.stripe.com/test_link",
  );
  const message = buildPaymentDeadlineEmail(
    {
      id: "11111111-1111-4111-8111-111111111111",
      vorname: "<Kind>",
      nachname: "Test",
      eltern_vorname: "Eltern",
      email: "eltern@example.com",
      parent_amount_euro: 149,
    },
    {
      name: "Sommercamp",
      datum_von: "2026-08-24",
      datum_bis: "2026-08-27",
      stripe_link: "https://buy.stripe.com/test_link",
    },
    securePaymentLink,
    "https://www.talentexperte.de/bestaetigung.html?id=test#token=test",
    "2026-07-20T10:05:00.000Z",
  );
  for (
    const required of [
      "automatisch storniert",
      "ohne weitere Nachricht",
      "149,00 €",
    ]
  ) {
    if (!message.text.includes(required)) {
      throw new Error(`Pflichtaussage fehlt: ${required}`);
    }
  }
  if (message.html.includes("<Kind>")) {
    throw new Error("Personenwert wurde nicht escaped");
  }
  if (!message.html.includes("&lt;Kind&gt;")) {
    throw new Error("Escapeter Personenwert fehlt");
  }
});
