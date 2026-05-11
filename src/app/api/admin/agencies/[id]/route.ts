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

/* GET /api/admin/agencies/[id] — single agency with audit count */
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

    const { count } = await admin
      .from("geo_audits")
      .select("id", { count: "exact", head: true })
      .eq("created_by", agencyId);

    return NextResponse.json({ agency: { ...profile, audits_run: count ?? 0 } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
