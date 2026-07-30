import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";

/* ════════════════════════════════════════════════════════════════════
 * /api/admin/agencies
 *
 * GET: list every agency with credits + status + counts
 * POST: invite a new agency by email; sets agency_name + initial credits
 *
 * Every call is guarded by requireAdmin(). All DB work uses the service
 * role client so we don't depend on the caller's RLS.
 * ════════════════════════════════════════════════════════════════════ */

export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const { data: profiles, error } = await admin
      .from("app_users")
      .select(
        "id, email, agency_name, contact_name, role, credits_remaining, credits_used, status, created_at"
      )
      .eq("role", "agency")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Tack on audit counts per agency
    const ids = (profiles ?? []).map((p) => p.id);
    let auditCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: audits } = await admin
        .from("geo_audits")
        .select("created_by")
        .in("created_by", ids);
      auditCounts = (audits || []).reduce<Record<string, number>>((acc, a) => {
        const key = a.created_by as string;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    const agencies = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email,
      agency_name: p.agency_name,
      contact_name: p.contact_name,
      credits_remaining: p.credits_remaining,
      credits_used: p.credits_used,
      status: p.status,
      created_at: p.created_at,
      audits_run: auditCounts[p.id] || 0,
    }));

    return NextResponse.json({ agencies });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

function generatePassword(): string {
  // Avoids visually ambiguous chars (0/O, 1/I/l)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { email, agency_name, contact_name, credits } = body as {
      email?: string;
      agency_name?: string;
      contact_name?: string;
      credits?: number;
    };

    if (!email || !agency_name) {
      return NextResponse.json(
        { error: "email and agency_name are required." },
        { status: 400 }
      );
    }
    const initialCredits = Math.max(0, Number.isInteger(credits) ? (credits as number) : 0);
    const password = generatePassword();

    const admin = createAdminClient();

    // Create user with a password directly; no magic link needed.
    // email_confirm: true skips the confirmation step.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("exist")) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: createErr?.message || "Failed to create user." },
        { status: 500 }
      );
    }

    const newUserId = created.user.id;

    // Upsert profile to handle trigger race condition
    const { error: profileErr } = await admin
      .from("app_users")
      .upsert({
        id: newUserId,
        email,
        role: "agency",
        agency_name,
        contact_name: contact_name || null,
        credits_remaining: initialCredits,
        status: "active",
        updated_at: new Date().toISOString(),
      });

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    // Send the welcome email via Resend (same path as password reset).
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      "https://gatha.ai";
    const loginUrl = `${siteUrl}/login`;
    const resendKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM || "Gatha <onboarding@resend.dev>";

    let emailSent = false;
    if (resendKey) {
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
            html: buildInviteEmail(agency_name, email, password, loginUrl),
          }),
        });
        emailSent = emailRes.ok;
        if (!emailRes.ok) {
          console.error("Resend invite send failed:", emailRes.status, await emailRes.text());
        }
      } catch (e) {
        // Non-fatal; credentials returned to admin as fallback
        console.error("Resend invite error:", e);
      }
    } else {
      console.error("RESEND_API_KEY not set — invite email not sent.");
    }

    return NextResponse.json(
      {
        agency: {
          id: newUserId,
          email,
          agency_name,
          contact_name: contact_name || null,
          credits_remaining: initialCredits,
          credits_used: 0,
          status: "active",
        },
        email_sent: emailSent,
        // Always return so admin can copy-paste as fallback
        credentials: { email, password, login_url: loginUrl },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/admin/agencies POST error:", err);
    return NextResponse.json({ error: "Failed to create agency." }, { status: 500 });
  }
}

function buildInviteEmail(
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
