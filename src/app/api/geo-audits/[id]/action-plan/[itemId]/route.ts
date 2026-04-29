import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

/* PATCH /api/geo-audits/[id]/action-plan/[itemId]
   Body: { completed: boolean }
   Toggles completed_at — sets to NOW() when true, NULL when false. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    await getAuthContext();
    const { id, itemId } = await params;
    const body = await req.json();
    const completed = body?.completed === true;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("geo_audit_action_items")
      .update({
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
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
