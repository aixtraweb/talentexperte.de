export interface PaymentDeadlineRegistration {
  id: string;
  vorname: string;
  nachname: string;
  eltern_vorname: string;
  email: string;
  parent_amount_euro: number;
  payment_due_at?: string | null;
}

export interface PaymentDeadlineCamp {
  name: string;
  datum_von?: string | null;
  datum_bis?: string | null;
  stripe_link?: string | null;
}

export interface PaymentDeadlineEmail {
  subject: string;
  html: string;
  text: string;
  expiresAt: string;
}

import {
  appendTalentexperteEmailSignature,
  appendTalentexperteEmailSignatureText,
} from "./talentexperte-email-signature.ts";

const FROM_EMAIL = "TALENTEXPERTE Fußballschule <kontakt@talentexperte.de>";

export function paymentDeadlineSender(): string {
  return FROM_EMAIL;
}

export function isPaymentDeadlinePolicyEligible(
  registrationCreatedAt: string | null | undefined,
  policyActiveFrom: string | null | undefined,
): boolean {
  if (!registrationCreatedAt || !policyActiveFrom) return false;
  const registrationTime = new Date(registrationCreatedAt).getTime();
  const policyTime = new Date(policyActiveFrom).getTime();
  return Number.isFinite(registrationTime) && Number.isFinite(policyTime) &&
    registrationTime >= policyTime;
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const value = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + "T12:00:00Z" : iso;
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function calculateFinalDeadline(
  paymentDueAt: string | null | undefined,
  now = new Date(),
): string {
  const due = paymentDueAt ? new Date(paymentDueAt) : now;
  const start = Number.isFinite(due.getTime()) && due > now ? due : now;
  // Fünf Minuten technischer Puffer verhindern, dass Versandlatenz die
  // zugesagte volle 24-Stunden-Nachfrist verkürzt.
  return new Date(start.getTime() + (24 * 60 + 5) * 60 * 1000).toISOString();
}

export function buildSecurePaymentLink(
  registrationId: string,
  confirmationToken: string,
  email: string,
  stripeLink: string | null | undefined,
): string | null {
  if (!stripeLink) return null;
  const directStripeLink = String(stripeLink) +
    (String(stripeLink).includes("?") ? "&" : "?") +
    "client_reference_id=" + encodeURIComponent(registrationId) +
    "&prefilled_email=" + encodeURIComponent(email);
  return "https://www.talentexperte.de/zahlung-start.html#" +
    new URLSearchParams({
      id: registrationId,
      token: confirmationToken,
      stripe: directStripeLink,
    }).toString();
}

export function buildPaymentDeadlineEmail(
  registration: PaymentDeadlineRegistration,
  camp: PaymentDeadlineCamp,
  securePaymentLink: string | null,
  confirmationLink: string,
  expiresAt: string,
): PaymentDeadlineEmail {
  const amount = formatEuro(Number(registration.parent_amount_euro));
  const deadline = formatDeadline(expiresAt);
  const campDates = camp.datum_von && camp.datum_bis
    ? `${formatDate(camp.datum_von)} – ${formatDate(camp.datum_bis)}`
    : "";
  const subjectCamp = String(camp.name || "Feriencamp").replace(
    /[\r\n]+/g,
    " ",
  );
  const payButton = securePaymentLink
    ? `<a href="${
      escapeHtml(securePaymentLink)
    }" style="display:inline-block;padding:14px 32px;background:#e50000;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;margin:16px 0;">Jetzt ${
      escapeHtml(amount)
    } sicher bezahlen</a>`
    : `<p style="font-size:17px;font-weight:700;color:#e50000;">Offener Betrag: ${
      escapeHtml(amount)
    }</p>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <div style="background:#0a0a0a;border-radius:12px;overflow:hidden;">
    <div style="padding:32px 32px 24px;text-align:center;">
      <h1 style="margin:0;font-size:28px;letter-spacing:2px;color:#fff;">TALENT<span style="color:#e50000;">EXPERTE</span></h1>
      <p style="color:#aaa;font-size:13px;margin:8px 0 0;">Fußballschule</p>
    </div>
    <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">Guten Tag ${
    escapeHtml(registration.eltern_vorname || "")
  },</p>
      <p style="font-size:16px;color:#333;line-height:1.6;margin:0 0 16px;">
        für die Anmeldung von <strong>${escapeHtml(registration.vorname)} ${
    escapeHtml(registration.nachname)
  }</strong>
        zum <strong>${escapeHtml(camp.name || "Feriencamp")}</strong>${
    campDates ? ` (${escapeHtml(campDates)})` : ""
  }
        ist die Teilnahmegebühr von <strong>${
    escapeHtml(amount)
  }</strong> noch offen.
      </p>
      <div style="margin:20px 0;padding:18px;border-left:4px solid #e50000;background:#fff3f3;color:#2b1a1a;line-height:1.6;">
        <strong>Letzte Zahlungsfrist: ${escapeHtml(deadline)}</strong><br>
        Bitte zahlen Sie bis zu diesem Zeitpunkt. Geht bis dahin kein Zahlungseingang ein,
        wird die Anmeldung automatisch storniert und der Platz ohne weitere Nachricht wieder freigegeben.
      </div>
      <div style="text-align:center;margin:24px 0;">${payButton}</div>
      <p style="font-size:13px;color:#666;line-height:1.6;margin:0 0 18px;">
        Ihre persönliche Bestätigung: <a href="${
    escapeHtml(confirmationLink)
  }" style="color:#e50000;">sicher öffnen</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">
        Falls Sie bereits über Stripe gezahlt haben, ist nichts weiter zu tun. Der Zahlungsstatus wird automatisch abgeglichen.
        Bei einer Überweisung antworten Sie bitte bis zur Frist mit einem Zahlungsbeleg, damit der Zahlungseingang geprüft werden kann. Bei Barzahlung oder Rückfragen antworten Sie bitte ebenfalls direkt auf diese E-Mail.
      </p>
      <p style="font-size:14px;color:#333;line-height:1.6;margin:16px 0 0;">
        Sportliche Grüße<br>
        <strong>TALENTEXPERTE Fußballschule</strong><br>
        <a href="mailto:kontakt@talentexperte.de" style="color:#e50000;">kontakt@talentexperte.de</a><br>
        <a href="https://www.talentexperte.de" style="color:#e50000;">www.talentexperte.de</a>
      </p>
    </div>
  </div>
  <p style="text-align:center;font-size:11px;color:#888;margin:16px 0 0;">
    Diese E-Mail wurde automatisch versendet. Bitte antworten Sie direkt auf diese E-Mail bei Rückfragen.
  </p>
</div>
</body>
</html>`;

  const text = `Guten Tag ${registration.eltern_vorname || ""},

für die Anmeldung von ${registration.vorname} ${registration.nachname} zum ${
    camp.name || "Feriencamp"
  }${
    campDates ? ` (${campDates})` : ""
  } ist die Teilnahmegebühr von ${amount} noch offen.

LETZTE ZAHLUNGSFRIST: ${deadline}

Bitte zahlen Sie bis zu diesem Zeitpunkt. Geht bis dahin kein Zahlungseingang ein, wird die Anmeldung automatisch storniert und der Platz ohne weitere Nachricht wieder freigegeben.

${
    securePaymentLink
      ? `Sicher bezahlen: ${securePaymentLink}\n`
      : ""
  }Persönliche Bestätigung: ${confirmationLink}

Falls Sie bereits über Stripe gezahlt haben, ist nichts weiter zu tun. Der Zahlungsstatus wird automatisch abgeglichen. Bei einer Überweisung antworten Sie bitte bis zur Frist mit einem Zahlungsbeleg, damit der Zahlungseingang geprüft werden kann. Bei Barzahlung oder Rückfragen antworten Sie bitte ebenfalls direkt auf diese E-Mail.

Sportliche Grüße
TALENTEXPERTE Fußballschule
kontakt@talentexperte.de
www.talentexperte.de`;

  return {
    subject: `Zahlung erforderlich: Platz bis ${
      formatDate(expiresAt)
    } sichern – ${subjectCamp} | TALENTEXPERTE`,
    html: appendTalentexperteEmailSignature(html),
    text: appendTalentexperteEmailSignatureText(text),
    expiresAt,
  };
}
