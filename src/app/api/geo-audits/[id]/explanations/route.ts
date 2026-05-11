import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import {
  buildTemplate,
  answerFollowUp,
  generateContextualExplanation,
  VALID_TARGET_TYPES,
  type ExplainTargetContext,
  type ExplanationPayload,
  type FollowUpExchange,
  type AuditExplanationContext,
} from "@/lib/explanations";

interface EngineStatsRow {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
}

interface KeywordGapRow {
  prompt_text: string;
  engines_hit: string[];
  competitors_present?: { name: string; count: number }[] | null;
}

interface TopDomainRow {
  domain: string;
  share_percent: number;
}

/** Pulls the minimum audit data the LLM needs to ground its answer in
 *  this brand's actual situation. Returns null if the audit is missing
 *  or not yet completed — caller falls back to deterministic template. */
async function loadAuditContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auditId: string
): Promise<AuditExplanationContext | null> {
  const { data: audit, error } = await supabase
    .from("geo_audits")
    .select(
      "brand_name, brand_url, visibility_rate, total_queries, total_mentioned, status, summary_json"
    )
    .eq("id", auditId)
    .maybeSingle();
  if (error || !audit || audit.status !== "completed") return null;

  const summary = (audit.summary_json || {}) as Record<string, unknown>;
  const engineBreakdownRaw = (summary.engine_breakdown || {}) as Record<string, EngineStatsRow>;
  const competitorAnalysis = (summary.competitor_analysis || {}) as {
    mention_counts?: Record<string, number>;
  };
  const keywordBlock = summary.keyword_gap_analysis as { keyword_gaps?: KeywordGapRow[] } | undefined;
  const topDomainsRaw = (summary.top_cited_domains || []) as TopDomainRow[];

  const engineBreakdown = Object.values(engineBreakdownRaw).map((e) => ({
    engine: e.display_name,
    rate: Number(e.visibility_rate ?? 0),
    mentioned: Number(e.brand_mentioned ?? 0),
    total: Number(e.total_queries ?? 0),
  }));

  const blindSpots = (keywordBlock?.keyword_gaps || [])
    .filter((k) => Array.isArray(k.engines_hit) && k.engines_hit.length === 0)
    .slice(0, 8)
    .map((k) => ({
      prompt: k.prompt_text,
      competitors: (k.competitors_present || []).map((c) => c.name),
    }));

  const competitorMentions = competitorAnalysis.mention_counts || {};
  const topCompetitors = Object.entries(competitorMentions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, mentions]) => ({ name, mentions }));

  return {
    brandName: audit.brand_name,
    brandUrl: audit.brand_url || "",
    visibilityRate: Number(audit.visibility_rate ?? 0),
    totalQueries: Number(audit.total_queries ?? 0),
    totalMentioned: Number(audit.total_mentioned ?? 0),
    engineBreakdown,
    topBlindSpots: blindSpots,
    topCompetitors,
    topCitedDomains: topDomainsRaw.slice(0, 10),
  };
}

/* POST /api/geo-audits/[id]/explanations
 *
 * Body shape:
 *   { target: ExplainTargetContext, followUpQuestion?: string }
 *
 * Behaviour:
 *   - Resolves a stable cache key (audit_id, target.type, target.id|label)
 *   - If no row exists yet: generates the deterministic base via
 *     buildTemplate, inserts a row, returns base + empty follow_ups
 *   - If row exists: returns the persisted base + follow_ups
 *   - If followUpQuestion is provided: runs the LLM follow-up, appends
 *     to follow_ups[], persists, returns the full updated record
 */

function targetKey(target: ExplainTargetContext): string {
  return target.id?.trim() || target.label.trim();
}

interface ExplanationRow {
  id: string;
  audit_id: string;
  target_type: string;
  target_id: string;
  target_label: string;
  target_value: string | null;
  target_meta: Record<string, unknown> | null;
  base_explanation: ExplanationPayload;
  follow_ups: FollowUpExchange[];
  created_at: string;
  updated_at: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext();
    const { id: auditId } = await params;
    const body = await req.json();
    const target = body?.target as ExplainTargetContext | undefined;
    const followUpQuestion = (body?.followUpQuestion as string | undefined)?.trim() || null;

    if (!target?.type || !VALID_TARGET_TYPES.has(target.type)) {
      return NextResponse.json(
        { error: "Invalid or missing target.type." },
        { status: 400 }
      );
    }
    if (!target.label) {
      return NextResponse.json(
        { error: "target.label is required." },
        { status: 400 }
      );
    }

    const key = targetKey(target);
    const supabase = await createClient();

    // 1. Look up existing
    const existing = await supabase
      .from("geo_audit_explanations")
      .select("*")
      .eq("audit_id", auditId)
      .eq("target_type", target.type)
      .eq("target_id", key)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    let row: ExplanationRow;
    // Load audit context once — used both for first-time generation and
    // for grounding follow-up Q&A in real data.
    const auditCtx = await loadAuditContext(supabase, auditId);

    if (existing.data) {
      row = existing.data as ExplanationRow;
    } else {
      // 2. First-time generation. Prefer LLM-grounded contextual
      //    explanation when audit context is available; the generator
      //    silently falls back to the deterministic template on LLM
      //    failure so we never block on a 502.
      const base = auditCtx
        ? await generateContextualExplanation(target, auditCtx)
        : buildTemplate(target);

      const insert = await supabase
        .from("geo_audit_explanations")
        .insert({
          audit_id: auditId,
          target_type: target.type,
          target_id: key,
          target_label: target.label,
          target_value: target.value !== undefined ? String(target.value) : null,
          target_meta: target.meta ?? null,
          base_explanation: base,
          follow_ups: [],
        })
        .select("*")
        .single();

      if (insert.error || !insert.data) {
        return NextResponse.json(
          { error: insert.error?.message || "Failed to persist explanation." },
          { status: 500 }
        );
      }
      row = insert.data as ExplanationRow;
    }

    // 3. Handle follow-up
    if (followUpQuestion) {
      let answer: string;
      try {
        answer = await answerFollowUp(target, row.base_explanation, followUpQuestion, auditCtx || undefined);
      } catch (err) {
        console.error("LLM follow-up failed:", err);
        return NextResponse.json(
          { error: "Failed to generate follow-up answer. Please retry." },
          { status: 502 }
        );
      }
      const nextFollowUps: FollowUpExchange[] = [
        ...(Array.isArray(row.follow_ups) ? row.follow_ups : []),
        { question: followUpQuestion, answer, asked_at: new Date().toISOString() },
      ];
      const update = await supabase
        .from("geo_audit_explanations")
        .update({ follow_ups: nextFollowUps, updated_at: new Date().toISOString() })
        .eq("id", row.id)
        .select("*")
        .single();

      if (update.error || !update.data) {
        return NextResponse.json(
          { error: update.error?.message || "Failed to persist follow-up." },
          { status: 500 }
        );
      }
      row = update.data as ExplanationRow;
    }

    return NextResponse.json({
      explanation: row.base_explanation,
      follow_ups: row.follow_ups,
      cached: !!existing.data && !followUpQuestion,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("/api/geo-audits/[id]/explanations error:", err);
    return NextResponse.json(
      { error: "Failed to load explanation." },
      { status: 500 }
    );
  }
}
