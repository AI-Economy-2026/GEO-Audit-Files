import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

// GET /api/geo-audits/[id]: get a single audit with summary
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext();
    const { id } = await params;
    const supabase = await createClient();

    const { data: audit, error } = await supabase
      .from("geo_audits")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !audit) {
      return NextResponse.json(
        { error: "Audit not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ audit });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

// PATCH /api/geo-audits/[id]: cancel a running audit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthContext();
    const { id } = await params;
    const body = await req.json();
    const supabase = await createClient();

    if (body.action === "cancel") {
      // Use admin client to bypass RLS for updates
      const { createAdminClient } = await import("@/lib/supabase/server");
      const admin = createAdminClient();

      const { error } = await admin
        .from("geo_audits")
        .update({ status: "cancelled" })
        .eq("id", id)
        .in("status", ["pending", "running"]);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ status: "cancelled" });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
