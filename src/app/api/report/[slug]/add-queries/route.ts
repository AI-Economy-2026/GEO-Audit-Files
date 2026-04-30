import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateAdditionalPrompts } from "@/lib/prompt-generator";

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await req.json();
  const { queries } = body;

  if (!queries?.length) {
    return NextResponse.json(
      { error: "At least one query is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Find the client and audit
  const { data: client, error: clientErr } = await admin
    .from("geo_clients")
    .select("id, audit_id, name, url, keywords")
    .eq("report_slug", slug)
    .single();

  if (clientErr || !client || !client.audit_id) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  // Check audit status
  const { data: audit } = await admin
    .from("geo_audits")
    .select("id, status, engines")
    .eq("id", client.audit_id)
    .single();

  if (!audit || audit.status !== "completed") {
    return NextResponse.json(
      { error: "Audit must be completed before adding queries." },
      { status: 400 }
    );
  }

  // Get highest existing prompt_id
  const { data: existingPrompts } = await admin
    .from("geo_audit_prompts")
    .select("prompt_id")
    .eq("audit_id", audit.id)
    .order("prompt_id", { ascending: false })
    .limit(1);

  const maxPromptId = existingPrompts?.[0]?.prompt_id || 0;

  // Generate new prompts starting after max
  const newPrompts = generateAdditionalPrompts(queries, maxPromptId + 1);

  if (newPrompts.length === 0) {
    return NextResponse.json({ error: "No valid queries." }, { status: 400 });
  }

  // Insert new prompt rows
  const promptRows = newPrompts.map((p) => ({
    audit_id: audit.id,
    prompt_id: p.prompt_id,
    category: p.category,
    prompt_text: p.prompt_text,
  }));
  await admin.from("geo_audit_prompts").insert(promptRows);

  // Update audit status to running
  const newTotal = newPrompts.length * audit.engines.length;
  await admin
    .from("geo_audits")
    .update({
      status: "running",
      progress_current: 0,
      progress_total: newTotal,
      progress_message: "Running additional queries...",
      updated_at: new Date().toISOString(),
    })
    .eq("id", audit.id);

  // Trigger worker with extend endpoint
  if (WORKER_URL && WORKER_API_KEY) {
    try {
      await fetch(`${WORKER_URL}/api/audits/extend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WORKER_API_KEY}`,
        },
        body: JSON.stringify({
          audit_id: audit.id,
          prompt_ids: newPrompts.map((p) => p.prompt_id),
        }),
      });
    } catch {
      // Revert to completed since original data is still valid
      await admin
        .from("geo_audits")
        .update({
          status: "completed",
          progress_message: "Failed to start additional queries.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", audit.id);

      return NextResponse.json(
        { error: "Failed to start additional queries." },
        { status: 502 }
      );
    }
  }

  // Append new keywords to client record
  const mergedKeywords = [
    ...new Set([...(client.keywords || []), ...queries]),
  ];
  await admin
    .from("geo_clients")
    .update({
      keywords: mergedKeywords,
      updated_at: new Date().toISOString(),
    })
    .eq("id", client.id);

  return NextResponse.json(
    {
      message: "Additional queries started.",
      new_prompts: newPrompts.length,
    },
    { status: 201 }
  );
}
