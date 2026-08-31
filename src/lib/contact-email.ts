/* Sends the public contact-form submission to the Gatha inbox via Resend,
 * following the same send pattern as agency-invite.ts. */

export interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

function buildContactEmail(sub: ContactSubmission): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0e1a2d,#1a2f4a);padding:32px 40px;text-align:center;">
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Gatha</div>
            <div style="color:#5eead4;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">New contact form submission</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;">
              <tr><td style="padding:20px 24px;">
                <div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Name</div><div style="font-size:14px;color:#0e1a2d;font-weight:600;">${sub.name}</div></div>
                <div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Email</div><div style="font-size:14px;color:#0e1a2d;font-weight:600;">${sub.email}</div></div>
                <div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Company</div><div style="font-size:14px;color:#0e1a2d;font-weight:600;">${sub.company || "—"}</div></div>
                <div><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;">Enquiring about</div><div style="font-size:14px;color:#0e1a2d;font-weight:600;">${sub.topic || "—"}</div></div>
              </td></tr>
            </table>
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">Message</div>
            <p style="margin:0;font-size:14px;color:#0e1a2d;line-height:1.6;white-space:pre-wrap;">${sub.message}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Sends a contact-form submission to the Gatha inbox. Returns whether it
 *  succeeded; never throws — the caller still confirms to the visitor
 *  either way, matching sendInviteEmail's fallback behaviour. */
export async function sendContactEmail(sub: ContactSubmission): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || "Gatha <onboarding@resend.dev>";
  const inbox = process.env.CONTACT_INBOX || "hello@gatha.ai";

  if (!resendKey) {
    console.error("RESEND_API_KEY not set — contact email not sent.");
    return false;
  }

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [inbox],
        reply_to: sub.email,
        subject: `Contact form: ${sub.name}${sub.company ? ` (${sub.company})` : ""}`,
        html: buildContactEmail(sub),
      }),
    });
    if (!emailRes.ok) {
      console.error("Resend contact send failed:", emailRes.status, await emailRes.text());
    }
    return emailRes.ok;
  } catch (e) {
    console.error("Resend contact error:", e);
    return false;
  }
}
