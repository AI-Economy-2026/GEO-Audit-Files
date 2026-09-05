import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/geo-audits/[id]/history
 *
 * Returns all versions of an audit chain (the root audit + all re-audits),
 * ordered by version ascending. Includes key metrics for comparison.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext();
    const { id } = await params;
    const supabase = await createClient();

    // Load the target audit to find the root
    const { data: audit, error: auditErr } = await supabase
      .from("geo_audits")
      .select("id, parent_audit_id, version")
      .eq("id", id)
      .single();

    if (auditErr || !audit) {
      return NextResponse.json(
        { error: "Audit not found." },
        { status: 404 }
      );
    }

    // Determine root audit id
    const rootId = audit.parent_audit_id || audit.id;

    // Fetch the root + all children
    const { data: versions, error: versionsErr } = await supabase
      .from("geo_audits")
      .select(
        "id, version, status, visibility_rate, total_queries, total_mentioned, summary_json, created_at, completed_at, parent_audit_id"
      )
      .or(`id.eq.${rootId},parent_audit_id.eq.${rootId}`)
      .order("version", { ascending: true });

    if (versionsErr) {
      return NextResponse.json(
        { error: versionsErr.message },
        { status: 500 }
      );
    }

    // Build comparison data: extract per-engine visibility from summary_json
    const history = (versions || []).map((v) => {
      const engineBreakdown = v.summary_json?.engine_breakdown || {};
      const engines: Record<string, number> = {};
      for (const [engineKey, engineData] of Object.entries(engineBreakdown)) {
        engines[engineKey] = (engineData as { visibility_rate: number })?.visibility_rate ?? 0;
      }

      return {
        id: v.id,
        version: v.version || 1,
        status: v.status,
        visibility_rate: v.visibility_rate,
        total_queries: v.total_queries,
        total_mentioned: v.total_mentioned,
        engines,
        created_at: v.created_at,
        completed_at: v.completed_at,
      };
    });

    return NextResponse.json({ root_audit_id: rootId, history });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
