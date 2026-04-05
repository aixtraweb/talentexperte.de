#!/usr/bin/env node

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_G2ujXv1n_FTUDFVHMmvRU8G15Bd6qCdc8'
const GOOGLE_REVIEW_LINK = 'https://g.page/r/CRwplaTKzL7VEBM/review'

function createReviewRequestHTML(familienname, kinderText, campName) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Google-Bewertung</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background-color: #eab308; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #000000; font-size: 28px; font-weight: 700;">
                ⚽ TALENTEXPERTE
              </h1>
              <p style="margin: 8px 0 0; color: #000000; font-size: 14px; opacity: 0.9;">
                Fußballschule
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                Hallo Familie ${familienname},
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                vielen Dank, dass ${kinderText} beim ${campName} dabei war! Wir hoffen, es hat viel Spaß gemacht und ${kinderText} konnte neue Fußball-Tricks lernen.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #333333; line-height: 1.6;">
                Unser Trainer-Team freut sich über jede positive Rückmeldung. Würden Sie uns mit einer kurzen Google-Bewertung unterstützen? Das hilft anderen Eltern bei ihrer Entscheidung.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${GOOGLE_REVIEW_LINK}"
                       style="display: inline-block; background-color: #eab308; color: #000000; text-decoration: none; font-size: 18px; font-weight: 600; padding: 16px 40px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ⭐ Jetzt bewerten
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                Herzlichen Dank für Ihre Unterstützung! 🙏
              </p>

              <p style="margin: 0; font-size: 16px; color: #333333; line-height: 1.6;">
                Sportliche Grüße<br>
                <strong>Ihr TALENTEXPERTE-Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                <strong>TALENTEXPERTE Fußballschule</strong>
              </p>
              <p style="margin: 0 0 15px; font-size: 13px; color: #888888; line-height: 1.5;">
                www.talentexperte.de
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999;">
                Sie erhalten diese E-Mail, weil Ihr Kind am ${campName} teilgenommen hat.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

async function sendTestEmail() {
  const testData = {
    email: 'aixtraweb@icloud.com',
    familienname: 'Mustermann',
    kindname: 'Leo',
    campName: 'Ostercamp I'
  }

  const html = createReviewRequestHTML(
    testData.familienname,
    testData.kindname,
    testData.campName
  )

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'TALENTEXPERTE <noreply@talentexperte.de>',
      to: testData.email,
      subject: `Wie hat ${testData.kindname} das ${testData.campName} gefallen? ⚽`,
      html: html
    })
  })

  if (response.ok) {
    const data = await response.json()
    console.log('✅ Test-E-Mail erfolgreich versendet!')
    console.log('An:', testData.email)
    console.log('Kind:', testData.kindname)
    console.log('Camp:', testData.campName)
    console.log('Message-ID:', data.id)
  } else {
    const error = await response.text()
    console.error('❌ Fehler beim Versand:', error)
    process.exit(1)
  }
}

sendTestEmail()
