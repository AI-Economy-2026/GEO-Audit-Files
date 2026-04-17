import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: client, error } = await admin
    .from("geo_clients")
    .select("id, name, url, status, audit_id, report_slug")
    .eq("report_slug", slug)
    .single();

  if (error || !client) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  let audit = null;
  if (client.audit_id) {
    const { data } = await admin
      .from("geo_audits")
      .select(
        "id, status, visibility_rate, total_queries, total_mentioned, dashboard_url, summary_json, engines, completed_at, progress_current, progress_total, progress_message, parent_audit_id, version"
      )
      .eq("id", client.audit_id)
      .single();
    audit = data;
  }

  return NextResponse.json({ client, audit });
}
