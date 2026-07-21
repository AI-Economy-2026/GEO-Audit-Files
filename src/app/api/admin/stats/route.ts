import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";

/* GET /api/admin/stats: top-line numbers for the admin overview. */
export async function GET() {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const [agenciesRes, suspendedRes, creditsRes, auditsRes] = await Promise.all([
      admin.from("app_users").select("id", { count: "exact", head: true }).eq("role", "agency"),
      admin.from("app_users").select("id", { count: "exact", head: true }).eq("role", "agency").eq("status", "suspended"),
      admin.from("app_users").select("credits_remaining, credits_used").eq("role", "agency"),
      admin.from("geo_audits").select("id", { count: "exact", head: true }),
    ]);

    const totalAgencies = agenciesRes.count ?? 0;
    const suspendedAgencies = suspendedRes.count ?? 0;
    const totalAudits = auditsRes.count ?? 0;
    const totalCreditsRemaining = (creditsRes.data || []).reduce(
      (s, r) => s + (r.credits_remaining ?? 0),
      0
    );
    const totalCreditsUsed = (creditsRes.data || []).reduce(
      (s, r) => s + (r.credits_used ?? 0),
      0
    );

    return NextResponse.json({
      totalAgencies,
      suspendedAgencies,
      activeAgencies: totalAgencies - suspendedAgencies,
      totalCreditsRemaining,
      totalCreditsUsed,
      totalAudits,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
