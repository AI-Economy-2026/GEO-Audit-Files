import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePrompts } from "@/lib/prompt-generator";

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

// Keep in sync with the wizard (/api/geo-audits). Only the 5 live API
// engines: the scraper engines (google_ai_mode, google_ai_overview,
// bing_copilot) need Playwright infra and otherwise fail silently,
// inflating query counts and dragging visibility to 0%.
const DEFAULT_ENGINES = [
  "openai",
  "anthropic",
  "google",
  "perplexity",
  "xai",
  // "deepseek",           // Enable when DEEPSEEK_API_KEY is set
  // "meta_llama",         // Enable when META_LLAMA_API_KEY is set
  // "google_ai_mode",     // Needs Playwright/SerpAPI scraping infra
  // "google_ai_overview", // Needs Playwright/SerpAPI scraping infra
  // "bing_copilot",       // Needs Playwright/SerpAPI scraping infra
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: client, error } = await admin
    .from("geo_clients")
    .select("id, name, url, status")
    .eq("intake_token", token)
    .single();

  if (error || !client) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 404 }
    );
  }

  if (client.status !== "pending_intake") {
    return NextResponse.json(
      { error: "This intake has already been completed.", status: client.status },
      { status: 409 }
    );
  }

  return NextResponse.json({ client: { name: client.name, url: client.url } });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { competitors, keywords, website_url, queries } = body;

  // Queries drive prompt generation. Older form payloads sent them as
  // `keywords`, so fall back for backward compatibility.
  const queryList: string[] = (
    Array.isArray(queries) && queries.length ? queries : keywords || []
  )
    .map((q: unknown) => String(q).trim())
    .filter(Boolean);

  // Broad topic keywords (optional, separate from queries).
  const keywordList: string[] = (Array.isArray(keywords) ? keywords : [])
    .map((k: unknown) => String(k).trim())
    .filter(Boolean);

  if (!queryList.length) {
    return NextResponse.json(
      { error: "At least one query is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Look up client by token
  const { data: client, error: lookupErr } = await admin
    .from("geo_clients")
    .select("*")
    .eq("intake_token", token)
    .single();

  if (lookupErr || !client) {
    return NextResponse.json({ error: "Invalid link." }, { status: 404 });
  }

  if (client.status !== "pending_intake") {
    return NextResponse.json(
      { error: "Already completed.", report_slug: client.report_slug },
      { status: 409 }
    );
  }

  // Credit gate: the audit is billed to the agency that owns this client.
  // If the agency's credits are exhausted or their account is suspended,
  // refuse to create the audit so the intake form can show a clear error.
  const { data: ownerProfile, error: ownerErr } = await admin
    .from("app_users")
    .select("role, credits_remaining, status")
    .eq("id", client.created_by)
    .maybeSingle();

  if (ownerErr || !ownerProfile) {
    return NextResponse.json(
      { error: "This agency's account is missing. Contact your administrator." },
      { status: 403 }
    );
  }
  if (ownerProfile.status === "suspended") {
    return NextResponse.json(
      { error: "This agency's account is suspended. Contact them directly to resolve." },
      { status: 403 }
    );
  }
  if (ownerProfile.role === "agency" && (ownerProfile.credits_remaining ?? 0) <= 0) {
    return NextResponse.json(
      {
        error:
          "This agency has run out of audit credits. Please ask them to top up before submitting this form.",
      },
      { status: 402 }
    );
  }

  // Generate prompts from user queries
  const brandUrl = website_url || client.url;
  const generatedPrompts = generatePrompts(queryList);
  const engines = DEFAULT_ENGINES;

  // Create audit row (on behalf of the agency user)
  const { data: audit, error: auditErr } = await admin
    .from("geo_audits")
    .insert({
      created_by: client.created_by,
      brand_name: client.name,
      brand_url: brandUrl,
      competitors: competitors || [],
      engines,
      status: "pending",
      progress_total: generatedPrompts.length * engines.length,
      // geo_audits has a keywords column; only include when non-empty.
      ...(keywordList.length > 0 ? { keywords: keywordList } : {}),
    })
    .select("id")
    .single();

  if (auditErr || !audit) {
    return NextResponse.json(
      { error: "Failed to create audit." },
      { status: 500 }
    );
  }

  // Insert prompts
  const promptRows = generatedPrompts.map((p) => ({
    audit_id: audit.id,
    prompt_id: p.prompt_id,
    category: p.category,
    prompt_text: p.prompt_text,
  }));

  await admin.from("geo_audit_prompts").insert(promptRows);

  // Update client record
  await admin
    .from("geo_clients")
    .update({
      url: brandUrl,
      competitors: competitors || [],
      // geo_clients.keywords stores the intake queries (the add-queries
      // route merges further report queries into this same column).
      keywords: queryList,
      audit_id: audit.id,
      status: "auditing",
      intake_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", client.id);

  // Trigger worker
  if (WORKER_URL && WORKER_API_KEY) {
    try {
      await fetch(`${WORKER_URL}/api/audits/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${WORKER_API_KEY}`,
        },
        body: JSON.stringify({ audit_id: audit.id }),
      });
    } catch {
      await admin
        .from("geo_audits")
        .update({
          status: "failed",
          error_message: "Failed to reach audit worker.",
        })
        .eq("id", audit.id);

      await admin
        .from("geo_clients")
        .update({ status: "failed" })
        .eq("id", client.id);

      return NextResponse.json(
        { error: "Failed to start audit." },
        { status: 502 }
      );
    }
  }

  // Decrement agency's credit (only for agencies; admin-owned clients,
  // if any, run free).
  if (ownerProfile.role === "agency") {
    const { data: latest } = await admin
      .from("app_users")
      .select("credits_remaining, credits_used")
      .eq("id", client.created_by)
      .maybeSingle();
    await admin
      .from("app_users")
      .update({
        credits_remaining: Math.max(0, (latest?.credits_remaining ?? 0) - 1),
        credits_used: (latest?.credits_used ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", client.created_by);
  }

  return NextResponse.json(
    {
      message: "Intake received. Your audit is running.",
      report_slug: client.report_slug,
    },
    { status: 201 }
  );
}
