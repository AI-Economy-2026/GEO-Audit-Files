import { NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { loadAuditContext } from "@/lib/explanations";
import { generateOverviewInsights, type OverviewInsights } from "@/lib/overview-insights";

/* GET /api/geo-audits/[id]/overview-insights
 *
 * Returns the executive summary + next-steps cards for the audit
 * overview page. Cached in geo_audits.summary_json.overview_insights
 * so it is generated once per audit, not on every page load.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthContext();
    const { id: auditId } = await params;
    const supabase = await createClient();

    const { data: audit, error } = await supabase
      .from("geo_audits")
      .select("summary_json")
      .eq("id", auditId)
      .maybeSingle();
    if (error || !audit) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }

    const summary = (audit.summary_json || {}) as Record<string, unknown>;
    const cached = summary.overview_insights as OverviewInsights | undefined;
    if (cached) {
      return NextResponse.json({ insights: cached, cached: true });
    }

    const auditCtx = await loadAuditContext(supabase, auditId);
    if (!auditCtx) {
      return NextResponse.json({ error: "Audit is not completed yet." }, { status: 409 });
    }

    const insights = await generateOverviewInsights(auditCtx);

    await supabase
      .from("geo_audits")
      .update({ summary_json: { ...summary, overview_insights: insights } })
      .eq("id", auditId);

    return NextResponse.json({ insights, cached: false });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/geo-audits/[id]/overview-insights error:", err);
    return NextResponse.json({ error: "Failed to load overview insights." }, { status: 500 });
  }
}
