import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export type ExplainTargetType =
  | "opportunity_score"
  | "start_here_recommendation"
  | "lock_in_whats_working"
  | "missed_opportunity"
  | "priority_play"
  | "quick_fix";

export interface ExplainTargetContext {
  type: ExplainTargetType;
  id?: string;
  label: string;
  value?: number | string;
  meta?: Record<string, unknown>;
}

export interface ExplanationPayload {
  summary: string;
  whyItMatters: string;
  whatToDoNext: string[];
  effortLevel: "low" | "medium" | "high";
  expectedImpact: "low" | "medium" | "high";
}

const VALID_TYPES = new Set<ExplainTargetType>([
  "opportunity_score",
  "start_here_recommendation",
  "lock_in_whats_working",
  "missed_opportunity",
  "priority_play",
  "quick_fix",
]);

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && !isNaN(v) ? v : fallback;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

/* ════════════════════════════════════════════════════════════════════
   Phase 1 — deterministic templates per target type.
   Each template reads value/meta and returns a contextual explanation.
   ════════════════════════════════════════════════════════════════════ */
function buildTemplate(target: ExplainTargetContext): ExplanationPayload {
  const meta = target.meta || {};

  switch (target.type) {
    case "opportunity_score": {
      const score = num(target.value);
      const categoryAvg = num(meta.categoryAverage, 58);
      const quickFixCount = num(meta.quickFixCount, 0);
      const windowDays = num(meta.windowDays, 30);
      const lift = num(meta.estimatedLiftPoints, 0);
      const aboveAvg = score >= categoryAvg;
      const high = score >= 70;

      return {
        summary: high
          ? `Your opportunity score is ${score}/100 — high for your category (average is ${categoryAvg}). Most of the remaining gap is closable with a few targeted moves.`
          : aboveAvg
            ? `Your opportunity score is ${score}/100, slightly above the category average of ${categoryAvg}. Solid base to build on.`
            : `Your opportunity score is ${score}/100, below the category average of ${categoryAvg}. There's meaningful room to recover.`,
        whyItMatters:
          "A higher opportunity score means more headroom to be cited in AI answers for buyer-intent prompts. That translates to qualified traffic and demos from people already close to choosing.",
        whatToDoNext: [
          quickFixCount > 0
            ? `Ship the ${quickFixCount} quick fixes first — they unlock momentum without heavy lift.`
            : "Identify the technical quick wins (schema, llms.txt) before larger content moves.",
          lift > 0
            ? `The biggest single move is worth an estimated +${lift} points. Start there.`
            : "Pick your highest-activation prompt and build a dedicated page for it.",
          `Re-audit after ${windowDays} days to measure movement and re-prioritise.`,
        ],
        effortLevel: quickFixCount >= 3 ? "low" : "medium",
        expectedImpact: high ? "medium" : "high",
      };
    }

    case "start_here_recommendation": {
      const liftPct = num(meta.liftPotentialPercent, 0);
      const engineName = str(meta.engineName, "this engine");
      const currentRate = num(meta.currentRate, 0);

      return {
        summary: `${target.label} is your highest-impact gap. Currently you appear in ${currentRate}% of relevant prompts; closing this gap is worth roughly +${liftPct} points to your overall rank.`,
        whyItMatters: `${engineName} is a major answer surface for category-discovery questions — being absent means buyers don't see you when they're shopping the category, even if they're searching for what you do.`,
        whatToDoNext: [
          "Add structured data (FAQPage, ItemList) to your priority service pages.",
          "Publish one buyer-intent landing page targeting your highest-activation prompt.",
          "Strengthen third-party citations — directory listings, partner posts, category listicles.",
        ],
        effortLevel: "medium",
        expectedImpact: "high",
      };
    }

    case "lock_in_whats_working": {
      const engineName = str(meta.engineName, "your strongest engine");
      const rate = num(meta.rate, 0);

      return {
        summary: `${engineName} cites you on ${rate}% of prompts — your strongest surface. The pattern there can be replicated across weaker engines.`,
        whyItMatters:
          "Concentrating effort where you already rank multiplies returns: dedicated pages on those prompts lock in the win and capture additional citations within a week.",
        whatToDoNext: [
          "Audit which prompts you currently win and group them into clusters.",
          "Build dedicated comparison and 'vs' pages for those clusters with strong proof blocks.",
          "Mirror the structure (headings, schema, BLUF answers) onto pages targeting weaker engines.",
        ],
        effortLevel: "low",
        expectedImpact: "medium",
      };
    }

    case "missed_opportunity": {
      const compsPresent = num(meta.competitorsPresent, 0);
      const promptText = str(meta.promptText, target.label);

      return {
        summary: `You're absent from "${promptText}". ${compsPresent > 0 ? `${compsPresent} competitor${compsPresent === 1 ? " is" : "s are"} already cited here.` : "No one in your category is cited yet — first-mover advantage is open."}`,
        whyItMatters:
          compsPresent > 0
            ? "When buyers ask this question, AI engines pick from a small set of brands. Each citation you miss is a competitor mention you compound."
            : "Empty AI surfaces in your category mean low-effort wins are still available before competitors catch up.",
        whatToDoNext: [
          "Create or refresh a page targeting this exact phrase, with a direct answer in the first 60 words.",
          "Add FAQ schema and outcome-led proof blocks the model can quote.",
          "Earn one or two third-party mentions to reinforce the entity association.",
        ],
        effortLevel: "medium",
        expectedImpact: compsPresent > 0 ? "high" : "medium",
      };
    }

    case "priority_play": {
      const activation = num(meta.activationScore, 0);
      const difficulty = str(meta.difficulty, "medium");
      const high = activation >= 75;

      return {
        summary: `${target.label} scores ${activation} on activation — ${high ? "high-priority work" : "a worthwhile play"}. Difficulty: ${difficulty}.`,
        whyItMatters: high
          ? "High-activation prompts are the ones buyers actually ask before a purchase decision. Winning these directly increases qualified pipeline."
          : "Each priority play compounds visibility: even mid-activation wins shift you up the ranked list of brands AI surfaces.",
        whatToDoNext: [
          "Map this play to a single owner and a deadline this month.",
          "Draft the page or content piece end-to-end before publishing — partial answers don't get cited.",
          "Add an internal link from your services hub to reinforce relevance.",
        ],
        effortLevel: difficulty === "hard" ? "high" : difficulty === "easier" ? "low" : "medium",
        expectedImpact: high ? "high" : "medium",
      };
    }

    case "quick_fix": {
      const effortDays = str(meta.effortDays, "under 1 week");

      return {
        summary: `${target.label} is a quick fix — ${effortDays} of effort with proportionally high return.`,
        whyItMatters:
          "Quick fixes remove friction AI engines hit when deciding whether to cite you (entity ambiguity, missing schema, no llms.txt). They unlock everything else.",
        whatToDoNext: [
          "Assign this to one engineer and ship it this sprint.",
          "Verify with a re-crawl test or a single search to confirm the change took.",
          "Move to the next quick fix on the list — momentum compounds.",
        ],
        effortLevel: "low",
        expectedImpact: "medium",
      };
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
   Phase 2 — LLM follow-up. Reuses the deterministic explanation as
   grounding, then asks Claude to answer a specific user question.
   ════════════════════════════════════════════════════════════════════ */
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function followUp(
  target: ExplainTargetContext,
  base: ExplanationPayload,
  question: string
): Promise<ExplanationPayload> {
  const systemPrompt = `You are a GEO (Generative Engine Optimisation) advisor.
You are helping a user understand a specific element of their audit report.

Context — this element:
- Type: ${target.type}
- Label: ${target.label}
- Value: ${target.value ?? "n/a"}
- Meta: ${JSON.stringify(target.meta || {})}

The user has already seen this baseline explanation:
- Summary: ${base.summary}
- Why it matters: ${base.whyItMatters}
- Next steps: ${base.whatToDoNext.join(" / ")}

Rules:
- Plain language. No marketing speak. No "As an AI".
- Maximum 2 short paragraphs OR a numbered list of up to 4 items.
- Stay anchored to the element above — refuse questions that drift off-topic.
- If the question is unclear, ask one clarifying question instead of guessing.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  return {
    ...base,
    summary: text || base.summary,
    whyItMatters: "",
    whatToDoNext: [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = body?.target as ExplainTargetContext | undefined;
    const followUpQuestion = body?.followUpQuestion as string | undefined;

    if (!target?.type || !VALID_TYPES.has(target.type)) {
      return NextResponse.json(
        { error: "Invalid or missing target.type." },
        { status: 400 }
      );
    }
    if (!target.label) {
      return NextResponse.json(
        { error: "target.label is required." },
        { status: 400 }
      );
    }

    const base = buildTemplate(target);

    if (!followUpQuestion?.trim()) {
      return NextResponse.json({
        explanation: base,
        debug: { targetType: target.type, mode: "template" },
      });
    }

    const llmAnswer = await followUp(target, base, followUpQuestion.trim());
    return NextResponse.json({
      explanation: llmAnswer,
      debug: { targetType: target.type, mode: "llm" },
    });
  } catch (err) {
    console.error("/api/explain error:", err);
    return NextResponse.json(
      { error: "Failed to generate explanation." },
      { status: 500 }
    );
  }
}
