import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";

/* ════════════════════════════════════════════════════════════════════
 * /api/admin/agencies
 *
 * GET  — list every agency with credits + status + counts
 * POST — invite a new agency by email; sets agency_name + initial credits
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

    const admin = createAdminClient();

    // generateLink({ type: 'invite' }) creates the user + returns the
    // magic-link in properties.action_link. If Supabase SMTP is configured,
    // it ALSO emails the link automatically. Either way, we return the
    // link so the admin can hand-deliver it if email isn't set up.
    const origin =
      req.nextUrl.origin ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000";
    const invite = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${origin}/clients` },
    });

    if (invite.error || !invite.data?.user) {
      const msg = invite.error?.message?.toLowerCase() || "";
      if (msg.includes("already") || msg.includes("exist") || invite.error?.status === 422) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: invite.error?.message || "Failed to invite user." },
        { status: 500 }
      );
    }

    const newUserId = invite.data.user.id;
    const actionLink = invite.data.properties?.action_link ?? null;

    // Backfill profile metadata + credits (trigger already inserted the row)
    const { error: profileErr } = await admin
      .from("app_users")
      .update({
        agency_name,
        contact_name: contact_name || null,
        credits_remaining: initialCredits,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", newUserId);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
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
        // Present even when SMTP is configured (Supabase still sends the
        // email, but exposing the link lets the admin hand-deliver if
        // email delivery fails or isn't set up at all).
        action_link: actionLink,
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
