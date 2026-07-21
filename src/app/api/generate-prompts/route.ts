import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { stripEmDashes } from "@/lib/text-clean";

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

interface GeneratedPrompts {
  intent_prompts: string[];
  ranking_prompts: string[];
}

/** Direct-LLM fallback so prompt generation keeps working even when the
 *  Python worker is unreachable (the #1 cause of "AI prompt creation
 *  doesn't work"). Produces the same response shape as the worker. */
async function generateWithAnthropic(
  brandName: string,
  brandUrl: string,
  competitors: string[],
  keywords: string[]
): Promise<GeneratedPrompts> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    messages: [
      {
        role: "user",
        content: `You are helping run an AI-visibility audit for the brand "${brandName}" (${brandUrl}).
Competitors: ${competitors.join(", ") || "unknown"}. Keywords: ${keywords.join(", ") || "unknown"}.

Generate realistic buyer search queries. Do not use em dashes; use commas or full stops instead.
Return ONLY JSON, no markdown fences:
{"intent_prompts": [3 questions a buyer would ask an AI assistant when researching this category],
 "ranking_prompts": [6 "best/top providers" style queries where a brand could be recommended]}`,
      },
    ],
  });
  const raw = msg.content
    .map((b) => ("text" in b ? b.text : ""))
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  const parsed = JSON.parse(raw) as GeneratedPrompts;
  return {
    intent_prompts: (parsed.intent_prompts || []).filter(Boolean).map(stripEmDashes),
    ranking_prompts: (parsed.ranking_prompts || []).filter(Boolean).map(stripEmDashes),
  };
}

/** Sanitize LLM-generated prompt strings before returning them to the client. */
function sanitizePrompts<T extends Record<string, unknown>>(data: T): T {
  for (const key of ["intent_prompts", "ranking_prompts"]) {
    const value = data?.[key];
    if (Array.isArray(value)) {
      (data as Record<string, unknown>)[key] = value.map((p: unknown) =>
        typeof p === "string" ? stripEmDashes(p) : p
      );
    }
  }
  return data;
}

export async function POST(req: NextRequest) {
  try {
    // Ensure the user is authenticated
    await getAuthContext();

    const body = await req.json();
    const { brand_name, brand_url, competitors, keywords } = body;

    // Validate
    if (!brand_name || !brand_url) {
      return NextResponse.json(
        { error: "brand_name and brand_url are required." },
        { status: 400 }
      );
    }

    // 1. Preferred path — the Python worker
    if (WORKER_URL && WORKER_API_KEY) {
      try {
        const response = await fetch(`${WORKER_URL}/api/generate-prompts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${WORKER_API_KEY}`,
          },
          body: JSON.stringify({
            brand_name,
            brand_url,
            competitors: competitors || [],
            keywords: keywords || [],
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(sanitizePrompts(data), { status: 200 });
        }
        console.error(
          "generate-prompts worker returned",
          response.status,
          await response.text().catch(() => "")
        );
      } catch (workerErr) {
        console.error("generate-prompts worker unreachable:", workerErr);
      }
    }

    // 2. Fallback — generate directly with Anthropic
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Prompt generation is unavailable. Please try again shortly." },
        { status: 502 }
      );
    }
    const data = await generateWithAnthropic(
      brand_name,
      brand_url,
      competitors || [],
      keywords || []
    );
    if (data.intent_prompts.length === 0 && data.ranking_prompts.length === 0) {
      return NextResponse.json(
        { error: "Could not generate prompts. Please try again." },
        { status: 502 }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("Error in generate-prompts:", err);
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Prompt generation failed. Please try again." },
      { status: 500 }
    );
  }
}
