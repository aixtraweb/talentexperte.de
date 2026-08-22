const SIGNATURE_MARKER = "data-talentexperte-signature";

/**
 * Einheitliche, E-Mail-client-kompatible TALENTEXPERTE-Signatur.
 * Entspricht der in Apple Mail hinterlegten Signatur, jedoch ohne lokale
 * Formatierungsabhängigkeiten und damit auch für Resend verwendbar.
 */
export function talentexperteEmailSignatureHtml(): string {
  return `<div ${SIGNATURE_MARKER}="true" style="max-width:600px;margin:0 auto;padding:0 24px 24px;background:#ffffff;color:#202020;font-family:Helvetica,Arial,sans-serif;">
  <div style="border-top:1px solid #e7e7e7;padding-top:20px;">
    <p style="margin:0 0 14px;font-size:15px;line-height:1.45;color:#202020;">Freundliche Grüße</p>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#202020;"><strong>Elias Medina</strong><br><strong>FUSSBALLSCHULE TALENTEXPERTE</strong></p>
    <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#555555;">Trainingsanschrift: Branderhofer Weg 15 · 52066 Aachen<br><a href="tel:+4915234678108" style="color:#e50000;text-decoration:none;">+49 1523 4678108</a> · <a href="mailto:kontakt@talentexperte.de" style="color:#e50000;text-decoration:none;">kontakt@talentexperte.de</a> · <a href="https://www.talentexperte.de" style="color:#e50000;text-decoration:none;">www.talentexperte.de</a></p>
    <p style="margin:0 0 18px;font-size:13px;line-height:1.5;"><a href="https://de-de.facebook.com/talentexperte" style="color:#e50000;text-decoration:none;">Facebook</a><span style="color:#b8b8b8;"> · </span><a href="https://instagram.com/talentexperte" style="color:#e50000;text-decoration:none;">Instagram</a></p>
    <p style="margin:0;font-size:10px;line-height:1.5;color:#7a7a7a;">Diese E-Mail enthält vertrauliche und/oder rechtlich geschützte Informationen. Wenn Sie nicht der richtige Adressat sind oder diese E-Mail irrtümlich erhalten haben, informieren Sie bitte sofort den Absender und vernichten Sie diese E-Mail. Das unerlaubte Kopieren sowie die unbefugte Weitergabe dieser E-Mail ist nicht gestattet.</p>
  </div>
</div>`;
}

export function appendTalentexperteEmailSignature(html: string): string {
  if (!html || html.includes(SIGNATURE_MARKER)) return html;
  const signature = talentexperteEmailSignatureHtml();
  return /<\/body\s*>/i.test(html)
    ? html.replace(/<\/body\s*>/i, `${signature}</body>`)
    : `${html}${signature}`;
}

export function appendTalentexperteEmailSignatureText(text: string): string {
  if (!text || text.includes("FUSSBALLSCHULE TALENTEXPERTE")) return text;
  return `${text.trim()}\n\nFreundliche Grüße\nElias Medina\nFUSSBALLSCHULE TALENTEXPERTE\nTrainingsanschrift: Branderhofer Weg 15 · 52066 Aachen\n+49 1523 4678108 · kontakt@talentexperte.de · www.talentexperte.de`;
}
