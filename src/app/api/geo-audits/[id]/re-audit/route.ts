import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

const WORKER_URL = process.env.GEO_WORKER_URL;
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

/**
 * POST /api/geo-audits/[id]/re-audit
 *
 * Clones the original audit (same brand, competitors, engines, keywords, prompts)
 * and creates a new audit row linked via parent_audit_id with an incremented version.
 * Then triggers the worker to run the new audit.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getAuthContext();
    const { id: sourceAuditId } = await params;
    const supabase = await createClient();

    // 1. Load the source audit
    const { data: source, error: sourceErr } = await supabase
      .from("geo_audits")
      .select("*")
      .eq("id", sourceAuditId)
      .single();

    if (sourceErr || !source) {
      return NextResponse.json(
        { error: "Source audit not found." },
        { status: 404 }
      );
    }

    if (source.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed audits can be re-audited." },
        { status: 400 }
      );
    }

    // 2. Determine the root audit and next version number
    // Walk back to the root: if this audit already has a parent, the root is its parent chain's first entry.
    // For simplicity, the root is the audit with no parent_audit_id in the chain.
    const rootAuditId = source.parent_audit_id || sourceAuditId;

    // Count existing versions to determine the next version number
    const { count } = await supabase
      .from("geo_audits")
      .select("id", { count: "exact", head: true })
      .or(`id.eq.${rootAuditId},parent_audit_id.eq.${rootAuditId}`);

    const nextVersion = (count || 1) + 1;

    // 3. Load prompts from the source audit
    const { data: sourcePrompts, error: promptsErr } = await supabase
      .from("geo_audit_prompts")
      .select("prompt_id, category, prompt_text, prompt_type")
      .eq("audit_id", sourceAuditId)
      .order("prompt_id");

    if (promptsErr || !sourcePrompts?.length) {
      return NextResponse.json(
        { error: "No prompts found on source audit." },
        { status: 400 }
      );
    }

    // 4. Create the new audit row
    const { data: newAudit, error: auditErr } = await supabase
      .from("geo_audits")
      .insert({
        created_by: ctx.userId,
        user_name: source.user_name || null,
        user_email: source.user_email || null,
        brand_name: source.brand_name,
        brand_url: source.brand_url,
        competitors: source.competitors || [],
        keywords: source.keywords || [],
        engines: source.engines,
        status: "pending",
        progress_total: sourcePrompts.length * (source.engines?.length || 0),
        parent_audit_id: rootAuditId,
        version: nextVersion,
      })
      .select("id")
      .single();

    if (auditErr || !newAudit) {
      return NextResponse.json(
        { error: auditErr?.message || "Failed to create re-audit." },
        { status: 500 }
      );
    }

    // 5. Clone prompts into the new audit
    const promptRows = sourcePrompts.map((p) => ({
      audit_id: newAudit.id,
      prompt_id: p.prompt_id,
      category: p.category,
      prompt_text: p.prompt_text,
      prompt_type: p.prompt_type || "ranking",
    }));

    const { error: insertPromptsErr } = await supabase
      .from("geo_audit_prompts")
      .insert(promptRows);

    if (insertPromptsErr) {
      return NextResponse.json(
        { error: insertPromptsErr.message },
        { status: 500 }
      );
    }

    // 6. Trigger the worker (same /api/audits/start endpoint)
    if (WORKER_URL && WORKER_API_KEY) {
      try {
        await fetch(`${WORKER_URL}/api/audits/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WORKER_API_KEY}`,
          },
          body: JSON.stringify({ audit_id: newAudit.id }),
        });
      } catch {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const admin = createAdminClient();
        await admin
          .from("geo_audits")
          .update({
            status: "failed",
            error_message: "Failed to reach audit worker. Please try again.",
          })
          .eq("id", newAudit.id);

        return NextResponse.json(
          { error: "Failed to start audit worker." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        audit_id: newAudit.id,
        version: nextVersion,
        parent_audit_id: rootAuditId,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
