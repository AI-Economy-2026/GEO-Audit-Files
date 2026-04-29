import Anthropic from "@anthropic-ai/sdk";

export interface ActionItemSeed {
  week_number: number;
  category: "technical" | "non_technical";
  title: string;
  description: string;
  effort_label: string;
  sort_order: number;
}

export interface AuditPlanInput {
  brandName: string;
  brandUrl: string;
  visibilityRate: number;
  totalQueries: number;
  totalMentioned: number;
  engineBreakdown: { engine: string; rate: number; mentioned: number; total: number }[];
  topBlindSpots: { prompt_text: string; competitors_present: string[] }[];
  competitors: string[];
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a Generative Engine Optimisation (GEO) strategist building a 90-day action plan for an agency client based on their audit results.

Output rules:
- Return JSON only, no prose, no code fences.
- Schema: { "items": ActionItem[] } where ActionItem has fields:
  - week_number (integer 1-13)
  - category ("technical" or "non_technical")
  - title (string, max 80 chars, imperative form e.g. "Add FAQPage schema to /pricing")
  - description (string, max 220 chars, what to do and why it matters in plain English)
  - effort_label (string, e.g. "2 hrs", "1 day", "3-5 days")
  - sort_order (integer, 0-based within the week)

Plan rules:
- 13 weeks (≈90 days), grouped roughly: Weeks 1-2 quick technical fixes, Weeks 3-6 priority pages and content, Weeks 7-10 authority and citation work, Weeks 11-13 refine and re-audit.
- 25-35 items total. Distribute across all 13 weeks. Mix technical and non-technical.
- Reference the actual brand, engines and blind-spot prompts you're given. Do not invent generic items.
- Easiest items first within each week (lower sort_order = easier).
- Technical = schema, llms.txt, structured data, sitemaps, indexability, robots, server-side rendering.
- Non-technical = content, comparison pages, landing pages, citations, partnerships, PR, reviews, entity normalisation across socials.
- Do NOT mention specific dollar amounts or pricing.
- Final week (13) must include "Re-run the audit and compare to baseline" as the last item.`;

function buildUserPrompt(input: AuditPlanInput): string {
  const engineLines = input.engineBreakdown
    .sort((a, b) => a.rate - b.rate)
    .map((e) => `  - ${e.engine}: ${Math.round(e.rate)}% (${e.mentioned}/${e.total})`)
    .join("\n");

  const blindSpotLines = input.topBlindSpots
    .slice(0, 8)
    .map(
      (b, i) =>
        `  ${i + 1}. "${b.prompt_text}"${b.competitors_present.length ? ` — competitors cited: ${b.competitors_present.join(", ")}` : " — no one cited"}`
    )
    .join("\n");

  return `Brand: ${input.brandName} (${input.brandUrl})
Overall visibility: ${Math.round(input.visibilityRate)}% (${input.totalMentioned} mentions / ${input.totalQueries} queries)

Engine performance (worst first):
${engineLines || "  (no engine breakdown available)"}

Top blind spots — prompts where the brand is missing:
${blindSpotLines || "  (no blind spots identified)"}

Competitors tracked: ${input.competitors.join(", ") || "(none)"}

Build the 90-day action plan as JSON.`;
}

interface ParsedItem {
  week_number?: unknown;
  category?: unknown;
  title?: unknown;
  description?: unknown;
  effort_label?: unknown;
  sort_order?: unknown;
}

function coerceItem(raw: ParsedItem, fallbackOrder: number): ActionItemSeed | null {
  const week = Number(raw.week_number);
  if (!Number.isInteger(week) || week < 1 || week > 13) return null;
  const cat = raw.category === "technical" || raw.category === "non_technical" ? raw.category : null;
  if (!cat) return null;
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim().slice(0, 200) : null;
  if (!title) return null;
  const description =
    typeof raw.description === "string" ? raw.description.trim().slice(0, 500) : "";
  const effort = typeof raw.effort_label === "string" ? raw.effort_label.trim().slice(0, 40) : "";
  const sort = Number.isInteger(Number(raw.sort_order)) ? Number(raw.sort_order) : fallbackOrder;
  return {
    week_number: week,
    category: cat,
    title,
    description,
    effort_label: effort,
    sort_order: sort,
  };
}

export async function generateActionPlan(input: AuditPlanInput): Promise<ActionItemSeed[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    temperature: 0.4,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // Strip code fences if Claude added them anyway.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: { items?: ParsedItem[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Action plan generator returned invalid JSON.");
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("Action plan generator returned no items array.");
  }

  const items: ActionItemSeed[] = [];
  parsed.items.forEach((raw, idx) => {
    const coerced = coerceItem(raw, idx);
    if (coerced) items.push(coerced);
  });

  if (items.length === 0) {
    throw new Error("Action plan generator returned no valid items.");
  }
  return items;
}
