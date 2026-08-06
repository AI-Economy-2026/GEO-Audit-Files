/* Shared by the "invite agency" and "resend invite" admin endpoints so the
 * password rules and email template can't drift apart between the two. */

export function generatePassword(): string {
  // Avoids visually ambiguous chars (0/O, 1/I/l)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export function buildInviteEmail(
  agencyName: string,
  email: string,
  password: string,
  loginUrl: string
): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0e1a2d,#1a2f4a);padding:32px 40px;text-align:center;">
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Gatha</div>
            <div style="color:#5eead4;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:4px;">Be Seen in AI Search</div>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0e1a2d;">Welcome to Gatha, ${agencyName}!</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              Your agency account is ready. Use the credentials below to log in and start running AI visibility audits.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <div style="margin-bottom:14px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Login URL</div>
                  <div style="font-size:14px;color:#0e1a2d;font-weight:600;">${loginUrl}</div>
                </div>
                <div style="margin-bottom:14px;">
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Email</div>
                  <div style="font-size:14px;color:#0e1a2d;font-weight:600;">${email}</div>
                </div>
                <div>
                  <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">Temporary Password</div>
                  <div style="font-size:16px;color:#0e1a2d;font-weight:700;font-family:monospace;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;display:inline-block;">${password}</div>
                </div>
              </td></tr>
            </table>
            <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#5eead4,#2dd4bf);color:#0e1a2d;font-weight:700;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;">
              Log in to Gatha &rarr;
            </a>
            <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
              Please change your password after your first login. If you have any questions, reply to this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">Gatha &middot; Be Seen in AI Search &middot; gatha.ai</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Sends the welcome/invite email via Resend. Returns whether it succeeded;
 *  never throws — a delivery failure shouldn't block returning credentials
 *  to the admin as a fallback. */
export async function sendInviteEmail(
  agencyName: string,
  email: string,
  password: string,
  loginUrl: string
): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM || "Gatha <onboarding@resend.dev>";

  if (!resendKey) {
    console.error("RESEND_API_KEY not set — invite email not sent.");
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
        to: [email],
        subject: "Welcome to Gatha: your login details",
        html: buildInviteEmail(agencyName, email, password, loginUrl),
      }),
    });
    if (!emailRes.ok) {
      console.error("Resend invite send failed:", emailRes.status, await emailRes.text());
    }
    return emailRes.ok;
  } catch (e) {
    console.error("Resend invite error:", e);
    return false;
  }
}
