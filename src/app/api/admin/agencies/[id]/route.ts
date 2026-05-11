import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";

/* PATCH /api/admin/agencies/[id]
 *
 * Body shape (all optional, any subset):
 *   {
 *     agency_name?: string,
 *     contact_name?: string,
 *     credit_delta?: number,     // signed increment (e.g. +5, -2)
 *     set_credits?: number,      // absolute credits_remaining
 *     status?: "active" | "suspended"
 *   }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: agencyId } = await params;
    const body = await req.json();

    const admin = createAdminClient();
    const { data: current, error: readErr } = await admin
      .from("app_users")
      .select("credits_remaining, credits_used, role")
      .eq("id", agencyId)
      .maybeSingle();

    if (readErr || !current) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }
    if (current.role !== "agency") {
      return NextResponse.json(
        { error: "This endpoint only updates agency accounts." },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.agency_name === "string") update.agency_name = body.agency_name;
    if (typeof body.contact_name === "string") update.contact_name = body.contact_name;
    if (body.status === "active" || body.status === "suspended") update.status = body.status;

    let nextCredits: number | null = null;
    if (Number.isInteger(body.set_credits) && body.set_credits >= 0) {
      nextCredits = body.set_credits;
    } else if (Number.isInteger(body.credit_delta)) {
      nextCredits = Math.max(0, (current.credits_remaining ?? 0) + body.credit_delta);
    }
    if (nextCredits !== null) update.credits_remaining = nextCredits;

    const { data, error } = await admin
      .from("app_users")
      .update(update)
      .eq("id", agencyId)
      .select("id, email, agency_name, contact_name, credits_remaining, credits_used, status")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Update failed." },
        { status: 500 }
      );
    }
    return NextResponse.json({ agency: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

/* DELETE /api/admin/agencies/[id] — permanently remove agency + auth user */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: agencyId } = await params;
    const admin = createAdminClient();

    // Verify it's an agency before deleting
    const { data: profile } = await admin
      .from("app_users")
      .select("role")
      .eq("id", agencyId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }
    if (profile.role !== "agency") {
      return NextResponse.json({ error: "Cannot delete non-agency accounts here." }, { status: 400 });
    }

    // Delete their clients and audits first (FK safety), then profile, then auth user
    await admin.from("geo_clients").delete().eq("created_by", agencyId);
    await admin.from("geo_audits").delete().eq("created_by", agencyId);
    await admin.from("app_users").delete().eq("id", agencyId);

    const { error: authErr } = await admin.auth.admin.deleteUser(agencyId);
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

/* GET /api/admin/agencies/[id] — single agency with audits and clients */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: agencyId } = await params;
    const admin = createAdminClient();

    const { data: profile, error } = await admin
      .from("app_users")
      .select(
        "id, email, agency_name, contact_name, role, credits_remaining, credits_used, status, created_at"
      )
      .eq("id", agencyId)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Agency not found." }, { status: 404 });
    }

    const [{ data: audits }, { data: clients }] = await Promise.all([
      admin
        .from("geo_audits")
        .select("id, brand_name, brand_url, status, visibility_rate, engines, created_at, completed_at")
        .eq("created_by", agencyId)
        .order("created_at", { ascending: false }),
      admin
        .from("geo_clients")
        .select("id, name, url, status, intake_token, report_slug, audit_id, intake_completed_at, created_at")
        .eq("created_by", agencyId)
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      agency: { ...profile, audits_run: audits?.length ?? 0 },
      audits: audits ?? [],
      clients: clients ?? [],
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
