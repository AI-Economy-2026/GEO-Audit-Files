import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

/* PATCH /api/geo-audits/[id]/action-plan/[itemId]
   Body: { completed?: boolean, owner?: string }
   - completed: toggles completed_at (NOW() when true, NULL when false).
   - owner: sets the free-text owner (trimmed, or NULL when empty).
   Only fields present in the body are updated. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await getAuthContext();
    const { id, itemId } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof body?.completed === "boolean") {
      update.completed_at = body.completed ? new Date().toISOString() : null;
    }
    if (typeof body?.owner === "string") {
      const trimmed = body.owner.trim();
      update.owner = trimmed === "" ? null : trimmed;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("geo_audit_action_items")
      .update(update)
      .eq("id", itemId)
      .eq("audit_id", id)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Action item not found." },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
