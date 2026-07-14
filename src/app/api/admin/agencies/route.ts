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

    // Create user with a password directly — no magic link needed.
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

    // Upsert profile — handles trigger race condition
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

    // Ask the Python worker to send the welcome email
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      "https://gatha.ai";
    const loginUrl = `${siteUrl}/login`;
    const workerUrl = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
    const workerKey = process.env.GEO_WORKER_API_KEY || "";

    let emailSent = false;
    try {
      const emailRes = await fetch(`${workerUrl}/api/send-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerKey}`,
        },
        body: JSON.stringify({ email, agency_name, password, login_url: loginUrl }),
      });
      emailSent = emailRes.ok;
    } catch {
      // Non-fatal — credentials returned to admin as fallback
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
