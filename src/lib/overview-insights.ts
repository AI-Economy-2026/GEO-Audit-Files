import Anthropic from "@anthropic-ai/sdk";
import { stripEmDashes } from "@/lib/text-clean";
import { formatAuditContext, type AuditExplanationContext } from "@/lib/explanations";

export interface NextStepCard {
  tag: string;
  title: string;
  body: string;
  promptsWon: number;
  totalPrompts: number;
}

export interface OverviewInsights {
  executiveSummary: string;
  nextSteps: NextStepCard[];
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCHEMA_PROMPT = `Return ONLY a JSON object matching this exact schema (no prose, no code fences):
{
  "executiveSummary": "One paragraph, 3-5 sentences, summarising the whole audit for someone who only reads this. Reference the brand by name, the overall visibility number, at least one named competitor, and one concrete next move.",
  "nextSteps": [
    {"tag": "Biggest gain", "title": "A specific, concrete action (e.g. publish a named comparison page)", "body": "2-3 sentences explaining why, referencing real prompts/competitors from the context", "promptsWon": <integer, how many tracked prompts this would likely win>},
    {"tag": "Quickest win", "title": "...", "body": "...", "promptsWon": <integer>},
    {"tag": "Slower burn", "title": "...", "body": "...", "promptsWon": <integer>}
  ]
}
Each next step must be a distinct, concrete, actionable move grounded in the actual blind spots, competitors, or domains listed above, not generic advice.`;

interface RawNextStep {
  tag?: unknown;
  title?: unknown;
  body?: unknown;
  promptsWon?: unknown;
}

interface RawInsights {
  executiveSummary?: unknown;
  nextSteps?: RawNextStep[];
}

function fallbackInsights(ctx: AuditExplanationContext): OverviewInsights {
  const worst = ctx.topBlindSpots[0];
  const topCompetitor = ctx.topCompetitors[0];
  return {
    executiveSummary: `${ctx.brandName} appears in ${ctx.totalMentioned} of ${ctx.totalQueries} tracked answers, an overall visibility of ${Math.round(ctx.visibilityRate)}%.${topCompetitor ? ` ${topCompetitor.name} is the most-mentioned competitor in this category.` : ""} Closing the blind spots below is the fastest way to move the number.`,
    nextSteps: [
      {
        tag: "Biggest gain",
        title: worst ? `Close the gap on "${worst.prompt}"` : "Close your biggest blind spot",
        body: worst?.competitors.length
          ? `${worst.competitors.join(", ")} is cited here instead of ${ctx.brandName}. A dedicated page targeting this exact question is the highest-leverage fix.`
          : "No page currently answers this question directly.",
        promptsWon: 1,
        totalPrompts: ctx.totalQueries,
      },
      {
        tag: "Quickest win",
        title: "Publish clear pricing or service details",
        body: "Engines favour pages with direct, structured answers. Missing or gated details push engines toward competitors who publish theirs.",
        promptsWon: 1,
        totalPrompts: ctx.totalQueries,
      },
      {
        tag: "Slower burn",
        title: "Get listed in the domains engines already trust",
        body: ctx.topCitedDomains[0]
          ? `${ctx.topCitedDomains[0].domain} is cited across this category; being listed there compounds over time.`
          : "Third-party citations compound over time even without a page rebuild.",
        promptsWon: 1,
        totalPrompts: ctx.totalQueries,
      },
    ],
  };
}

function coerceInsights(raw: RawInsights, fallback: OverviewInsights, totalPrompts: number): OverviewInsights {
  const executiveSummary =
    typeof raw.executiveSummary === "string" && raw.executiveSummary.trim()
      ? raw.executiveSummary.trim()
      : fallback.executiveSummary;

  const nextSteps: NextStepCard[] = Array.isArray(raw.nextSteps)
    ? raw.nextSteps.slice(0, 3).map((step, i) => ({
        tag: typeof step.tag === "string" ? step.tag : fallback.nextSteps[i]?.tag ?? "Next step",
        title: typeof step.title === "string" ? step.title : fallback.nextSteps[i]?.title ?? "",
        body: typeof step.body === "string" ? step.body : fallback.nextSteps[i]?.body ?? "",
        promptsWon: typeof step.promptsWon === "number" ? step.promptsWon : fallback.nextSteps[i]?.promptsWon ?? 1,
        totalPrompts,
      }))
    : fallback.nextSteps;

  return { executiveSummary, nextSteps: nextSteps.length === 3 ? nextSteps : fallback.nextSteps };
}

export async function generateOverviewInsights(ctx: AuditExplanationContext): Promise<OverviewInsights> {
  const fallback = fallbackInsights(ctx);

  const systemPrompt = `You are a GEO (Generative Engine Optimisation) advisor writing the "Next steps" and executive summary for ${ctx.brandName}'s audit overview page.

${formatAuditContext(ctx)}

Rules:
- Plain language, no marketing speak, no "As an AI".
- Every claim must be grounded in the audit context above, not invented.
- Do not use em dashes; use commas or full stops instead.

${SCHEMA_PROMPT}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 900,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: "user", content: `Generate the overview insights JSON for ${ctx.brandName}.` }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "");

    const parsed = JSON.parse(text) as RawInsights;
    const result = coerceInsights(parsed, fallback, ctx.totalQueries);
    return {
      executiveSummary: stripEmDashes(result.executiveSummary),
      nextSteps: result.nextSteps.map((s) => ({ ...s, title: stripEmDashes(s.title), body: stripEmDashes(s.body) })),
    };
  } catch (err) {
    console.error("generateOverviewInsights failed, falling back to template:", err);
    return fallback;
  }
}
