import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// e.g. "Gatha <noreply@gatha.ai>" once the domain is verified in Resend.
const RESEND_FROM = process.env.RESEND_FROM || "Gatha <onboarding@resend.dev>";

/**
 * POST /api/forgot-password  { email, redirectBase }
 *
 * Sends a password-reset email on OUR domain via Resend, bypassing Supabase's
 * built-in email (which is pinned to the dashboard Site URL / redirect allowlist).
 *
 * Flow: admin.generateLink() mints a recovery token WITHOUT sending an email;
 * we build our own link (redirectBase/reset-password?token_hash=...) and send it
 * with Resend. The reset page calls verifyOtp(token_hash) then updateUser().
 *
 * Always returns { ok: true } — never reveals whether an account exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const base =
      typeof body?.redirectBase === "string" && body.redirectBase
        ? body.redirectBase.replace(/\/+$/, "")
        : req.nextUrl.origin;

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      // Unknown account (or transient) — stay generic, don't leak existence.
      return NextResponse.json({ ok: true });
    }

    const resetUrl = `${base}/reset-password?token_hash=${encodeURIComponent(
      tokenHash
    )}&type=recovery`;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not set — reset email not sent.");
      return NextResponse.json({ ok: true });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject: "Reset your Gatha password",
        html: buildEmail(resetUrl),
      }),
    });

    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("forgot-password error:", e);
    // Never surface internals to the client.
    return NextResponse.json({ ok: true });
  }
}

function buildEmail(resetUrl: string): string {
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
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0e1a2d;">Reset your password</p>
            <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
              We received a request to reset your Gatha password. Click the button below to choose a new one. This link expires in 1 hour.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#5eead4,#2dd4bf);color:#0e1a2d;font-weight:700;font-size:14px;text-decoration:none;padding:13px 28px;border-radius:8px;">
              Reset password &rarr;
            </a>
            <p style="margin:28px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;">
              If you did not request this, you can safely ignore this email. For your security, the link can only be used once.
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
