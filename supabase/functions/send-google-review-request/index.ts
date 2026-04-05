import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const GOOGLE_REVIEW_LINK = 'https://g.page/r/CRwplaTKzL7VEBM/review'

interface Participant {
  id: string
  vorname: string
  nachname: string
  email: string
  camp_name: string
}

interface Recipient {
  email: string
  familienname: string
  kinder: string[]
  camp_name: string
}

Deno.serve(async (req) => {
  try {
    const { campId } = await req.json()

    if (!campId) {
      return new Response(
        JSON.stringify({ error: 'campId required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get all participants from the specified camp
    const { data: participants, error } = await supabase
      .from('anmeldungen')
      .select('id, vorname, nachname, email')
      .eq('camp_id', campId)
      .eq('zahlungsstatus', 'bezahlt')
      .not('email', 'is', null)

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No participants found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get camp name
    const { data: campData } = await supabase
      .from('camps')
      .select('name')
      .eq('id', campId)
      .single()

    const campName = campData?.name || 'Camp'

    // Group by email (combine multiple children per family)
    const recipientMap = new Map<string, Recipient>()

    for (const p of participants) {
      const email = p.email.trim().toLowerCase()

      if (!recipientMap.has(email)) {
        recipientMap.set(email, {
          email: p.email,
          familienname: p.nachname,
          kinder: [],
          camp_name: campName
        })
      }
      recipientMap.get(email)!.kinder.push(p.vorname)
    }

    const recipients = Array.from(recipientMap.values())
    const results = { sent: 0, failed: 0, errors: [] as string[] }

    // Send emails with rate limiting
    for (const recipient of recipients) {
      try {
        const kinderText = recipient.kinder.length > 1
          ? recipient.kinder.slice(0, -1).join(', ') + ' und ' + recipient.kinder[recipient.kinder.length - 1]
          : recipient.kinder[0]

        const html = createReviewRequestHTML(recipient.familienname, kinderText, recipient.camp_name)

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'TALENTEXPERTE <noreply@talentexperte.de>',
            to: recipient.email,
            subject: `Wie hat ${kinderText} das ${recipient.camp_name} gefallen? ⚽`,
            html: html
          })
        })

        if (response.ok) {
          results.sent++
        } else {
          const errorText = await response.text()
          results.failed++
          results.errors.push(`${recipient.email}: ${errorText}`)
          console.error(`Failed to send to ${recipient.email}:`, errorText)
        }

        // Rate limiting: 2 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        results.failed++
        results.errors.push(`${recipient.email}: ${error.message}`)
        console.error(`Error sending to ${recipient.email}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: recipients.length,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

function createReviewRequestHTML(familienname: string, kinderText: string, campName: string): string {
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
