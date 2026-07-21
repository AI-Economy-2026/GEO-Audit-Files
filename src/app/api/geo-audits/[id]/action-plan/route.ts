import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { generateActionPlan, type AuditPlanInput } from "@/lib/action-plan-generator";

interface EngineStatsRow {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
}

interface KeywordGapRow {
  prompt_id: number;
  prompt_text: string;
  engines_hit: string[];
  competitors_present: { name: string; count: number }[];
}

/* GET /api/geo-audits/[id]/action-plan: returns the plan, generating on first call. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext();
    const { id } = await params;
    const supabase = await createClient();

    // First, return existing plan if present
    const existing = await supabase
      .from("geo_audit_action_items")
      .select("*")
      .eq("audit_id", id)
      .order("week_number", { ascending: true })
      .order("sort_order", { ascending: true });

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    if (existing.data && existing.data.length > 0) {
      return NextResponse.json({ items: existing.data, generated: false });
    }

    // Need to generate. Pull audit + summary so the LLM has context.
    const auditRes = await supabase
      .from("geo_audits")
      .select(
        "id, brand_name, brand_url, visibility_rate, total_queries, total_mentioned, competitors, summary_json, status, created_by"
      )
      .eq("id", id)
      .single();

    if (auditRes.error || !auditRes.data) {
      return NextResponse.json({ error: "Audit not found." }, { status: 404 });
    }
    const audit = auditRes.data;

    if (audit.status !== "completed") {
      return NextResponse.json(
        { error: "Action plan can only be generated for completed audits." },
        { status: 409 }
      );
    }

    const summary = (audit.summary_json || {}) as Record<string, unknown>;
    const engineBreakdown = (summary.engine_breakdown || {}) as Record<string, EngineStatsRow>;
    const keywordGapBlock = summary.keyword_gap_analysis as
      | { keyword_gaps?: KeywordGapRow[] }
      | undefined;
    const keywordGaps = keywordGapBlock?.keyword_gaps || [];

    const blindSpots = keywordGaps
      .filter((k) => Array.isArray(k.engines_hit) && k.engines_hit.length === 0)
      .slice(0, 10)
      .map((k) => ({
        prompt_text: k.prompt_text,
        competitors_present: (k.competitors_present || []).map((c) => c.name),
      }));

    const planInput: AuditPlanInput = {
      brandName: audit.brand_name,
      brandUrl: audit.brand_url,
      visibilityRate: Number(audit.visibility_rate ?? 0),
      totalQueries: Number(audit.total_queries ?? 0),
      totalMentioned: Number(audit.total_mentioned ?? 0),
      engineBreakdown: Object.entries(engineBreakdown).map(([, stats]) => ({
        engine: stats.display_name,
        rate: Number(stats.visibility_rate ?? 0),
        mentioned: Number(stats.brand_mentioned ?? 0),
        total: Number(stats.total_queries ?? 0),
      })),
      topBlindSpots: blindSpots,
      competitors: Array.isArray(audit.competitors) ? audit.competitors : [],
    };

    let seeds;
    try {
      seeds = await generateActionPlan(planInput);
    } catch (err) {
      console.error("Action plan generation failed:", err);
      return NextResponse.json(
        { error: "Failed to generate action plan. Please retry." },
        { status: 502 }
      );
    }

    const rows = seeds.map((s) => ({
      audit_id: id,
      week_number: s.week_number,
      category: s.category,
      title: s.title,
      description: s.description,
      effort_label: s.effort_label,
      sort_order: s.sort_order,
    }));

    const insertRes = await supabase
      .from("geo_audit_action_items")
      .insert(rows)
      .select("*");

    if (insertRes.error) {
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    const sorted = (insertRes.data || []).sort((a, b) => {
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      return a.sort_order - b.sort_order;
    });

    return NextResponse.json({ items: sorted, generated: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
