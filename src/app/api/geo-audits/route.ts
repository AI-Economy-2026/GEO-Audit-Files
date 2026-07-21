import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

// GET /api/geo-audits — list audits for the user's org
export async function GET() {
  try {
    const ctx = await getAuthContext();
    const supabase = await createClient();

    const query = supabase
      .from("geo_audits")
      .select(
        "id, brand_name, brand_url, status, visibility_rate, total_queries, total_mentioned, engines, created_at, completed_at, duration_seconds, parent_audit_id, version, dashboard_url"
      )
      .order("created_at", { ascending: false });

    query.eq("created_by", ctx.userId);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ audits: data });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

// POST /api/geo-audits — create a new audit and trigger the worker
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    const body = await req.json();

    const {
      user_name,
      user_email,
      brand_name,
      brand_url,
      country,
      competitors,
      keywords,
      prompts,
    }: {
      user_name: string;
      user_email: string;
      brand_name: string;
      brand_url: string;
      country?: string | null;
      competitors: string[];
      keywords: string[];
      prompts: { prompt_id: number; category: string; prompt_text: string; prompt_type: string }[];
    } = body;

    // Validate
    if (!brand_name || !brand_url || !prompts?.length) {
      return NextResponse.json(
        { error: "brand_name, brand_url, and prompts are required." },
        { status: 400 }
      );
    }

    // Credit gate — admins bypass, agencies must have credits + active
    // status. We use the service-role client because app_users isn't
    // writable from the user's own session (RLS denies).
    const admin = createAdminClient();
    const { data: profile, error: profileErr } = await admin
      .from("app_users")
      .select("role, credits_remaining, credits_used, status")
      .eq("id", ctx.userId)
      .maybeSingle();

    if (profileErr || !profile) {
      return NextResponse.json(
        { error: "Account profile not found. Contact your administrator." },
        { status: 403 }
      );
    }
    if (profile.status === "suspended") {
      return NextResponse.json(
        { error: "Your account is suspended. Contact your administrator." },
        { status: 403 }
      );
    }
    if (profile.role === "agency" && (profile.credits_remaining ?? 0) <= 0) {
      return NextResponse.json(
        { error: "No audit credits remaining. Ask your administrator to top up." },
        { status: 402 }
      );
    }

    const supabase = await createClient();

    // The 5 live API engines. The scraper engines (google_ai_mode,
    // google_ai_overview, bing_copilot) need Playwright/SerpAPI infra —
    // without it they fail silently, inflate query counts and drag the
    // visibility score down. Re-enable once scraping infra is deployed.
    const allEngines = [
      "openai",
      "anthropic",
      "google",
      "perplexity",
      "xai",
    ];

    // 1. Create the audit row
    const { data: audit, error: auditErr } = await supabase
      .from("geo_audits")
      .insert({
        created_by: ctx.userId,
        user_name: user_name || null,
        user_email: user_email || null,
        brand_name,
        brand_url,
        // Only sent when a country is chosen — keeps inserts working even
        // before migration 120 adds the column.
        ...(country ? { country } : {}),
        competitors: competitors || [],
        keywords: keywords || [],
        engines: allEngines,
        status: "pending",
        progress_total: prompts.length * allEngines.length,
      })
      .select("id")
      .single();

    if (auditErr || !audit) {
      return NextResponse.json(
        { error: auditErr?.message || "Failed to create audit." },
        { status: 500 }
      );
    }

    // 2. Insert prompts
    const promptRows = prompts.map((p) => ({
      audit_id: audit.id,
      prompt_id: p.prompt_id,
      category: p.category,
      prompt_text: p.prompt_text,
      prompt_type: p.prompt_type || 'ranking',
    }));

    const { error: promptErr } = await supabase
      .from("geo_audit_prompts")
      .insert(promptRows);

    if (promptErr) {
      return NextResponse.json(
        { error: promptErr.message },
        { status: 500 }
      );
    }

    // 3. Trigger the Python worker
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
      } catch (workerErr) {
        // Worker trigger failed — mark audit as failed
        await supabase
          .from("geo_audits")
          .update({
            status: "failed",
            error_message: "Failed to reach audit worker. Please try again.",
          })
          .eq("id", audit.id);

        return NextResponse.json(
          { error: "Failed to start audit worker." },
          { status: 502 }
        );
      }
    }

    // 4. Decrement credits (agencies only — admins run without cost).
    //    Done after worker handoff so failed audits don't consume credits.
    if (profile.role === "agency") {
      await admin
        .from("app_users")
        .update({
          credits_remaining: Math.max(0, (profile.credits_remaining ?? 0) - 1),
          credits_used: (profile.credits_used ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.userId);
    }

    return NextResponse.json({ audit_id: audit.id }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
