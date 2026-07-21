import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text-clean";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type SarahPreset = "explain" | "priority" | "content";

interface AuditContext {
  brandName: string;
  overallVisibility: number;
  totalQueries: number;
  totalMentioned: number;
  topPrompts: {
    prompt_text: string;
    activation_score: number;
    difficulty_label: string;
    client_ratio: number;
    content_suggestion: string;
  }[];
  engineBreakdown?: Record<string, { display_name: string; visibility_rate: number }>;
}

const PRESET_INSTRUCTIONS: Record<SarahPreset, string> = {
  explain: "Explain what this GEO audit report means in plain English. Summarise the key findings — where the brand is visible, where it is not, and what that means for the business.",
  priority: "Based on the audit data, what should the client do first? Give a numbered list of the top 3 priority actions. Be specific — reference the actual prompts and engines from the data.",
  content: "Which content should the client create next to improve their GEO visibility? Give a numbered list of the top 3 content pieces to create, with a one-sentence rationale for each.",
};

function buildSystemPrompt(preset: SarahPreset, ctx: AuditContext): string {
  const topPromptsText = ctx.topPrompts
    .map(
      (p, i) =>
        `${i + 1}. "${p.prompt_text}" — ${Math.round(p.client_ratio * 100)}% engine coverage, activation score ${p.activation_score}, difficulty ${p.difficulty_label}, suggested content: ${p.content_suggestion}`
    )
    .join("\n");

  const engineText = ctx.engineBreakdown
    ? Object.values(ctx.engineBreakdown)
        .sort((a, b) => b.visibility_rate - a.visibility_rate)
        .map((e) => `  ${e.display_name}: ${e.visibility_rate}%`)
        .join("\n")
    : "Not available";

  return `You are a GEO (Generative Engine Optimisation) advisor for ${ctx.brandName}.
You explain audit results in plain English and give clear, prioritised action recommendations.

Rules:
- Be direct. No hedging or vague language.
- Use short sentences. Maximum 3 paragraphs or a numbered list (max 3 items).
- Reference specific prompts and engines from the data below.
- Do not use marketing language or upsell.
- Do not say "I" or "As an AI". Just give the answer.
- Do not use em dashes; use commas or full stops instead.

Audit data:
- Overall visibility: ${ctx.overallVisibility}% (${ctx.totalMentioned} mentions / ${ctx.totalQueries} queries)
- Engine breakdown:
${engineText}

Top prompts by activation score:
${topPromptsText}

Task: ${PRESET_INSTRUCTIONS[preset]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { preset, auditContext }: { preset: SarahPreset; auditContext: AuditContext } = body;

    if (!preset || !auditContext) {
      return NextResponse.json({ error: "preset and auditContext are required." }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(preset, auditContext);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: PRESET_INSTRUCTIONS[preset],
        },
      ],
      system: systemPrompt,
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ response: stripEmDashes(text) });
  } catch (err) {
    console.error("Ask Sarah error:", err);
    return NextResponse.json({ error: "Failed to get response." }, { status: 500 });
  }
}
