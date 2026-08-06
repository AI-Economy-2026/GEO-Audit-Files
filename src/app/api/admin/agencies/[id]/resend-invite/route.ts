import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePassword, sendInviteEmail } from "@/lib/agency-invite";

/* POST /api/admin/agencies/[id]/resend-invite
 *
 * The original temporary password is never stored in plaintext (Supabase
 * only keeps a hash), so "resend" issues a fresh one, sets it on the auth
 * user, and re-sends the same welcome email. Credentials are always
 * returned in the response too, so the admin can copy/share them even if
 * the email doesn't land.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: agencyId } = await params;
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("app_users")
      .select("email, agency_name, role")
      .eq("id", agencyId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }
    if (profile.role !== "agency") {
      return NextResponse.json(
        { error: "Cannot resend invites for non-agency accounts." },
        { status: 400 }
      );
    }

    const password = generatePassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(agencyId, {
      password,
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      "https://gatha.ai";
    const loginUrl = `${siteUrl}/login`;
    const emailSent = await sendInviteEmail(
      profile.agency_name || profile.email,
      profile.email,
      password,
      loginUrl
    );

    return NextResponse.json({
      email_sent: emailSent,
      credentials: { email: profile.email, password, login_url: loginUrl },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/admin/agencies/[id]/resend-invite POST error:", err);
    return NextResponse.json({ error: "Failed to resend invite." }, { status: 500 });
  }
}
