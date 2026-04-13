/**
 * Opportunity Engine — deterministic rules layer.
 *
 * Pure functions only. No API calls, no side effects.
 * Mirrors the scoring logic in the developer handoff doc exactly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromptType = "comparison" | "ranking" | "reviews" | "informational";
export type IntentType = "commercial" | "navigational" | "informational";

export interface EngineResult {
  engine_name: string;
  mentioned_client: boolean;
  mentioned_competitors: string[];
}

export interface PromptData {
  prompt_id: number;
  prompt_text: string;
  prompt_type?: PromptType;
  intent_type?: IntentType;
  engines: EngineResult[];
}

export interface DifficultyResult {
  score: number;
  label: "Easier" | "Medium" | "Hard";
}

export interface DerivedPromptData {
  prompt_id: number;
  prompt_text: string;
  prompt_type: PromptType;
  intent_type: IntentType;
  client_mentions: number;
  total_engines: number;
  client_ratio: number;
  visibility_label: "Strong presence" | "Weak presence" | "Not mentioned";
  top_competitors: string[];
  difficulty: DifficultyResult;
  activation_score: number;
  content_suggestion: string;
  actions: string[];
}

// ---------------------------------------------------------------------------
// Classification (mirrors engine/prompt_classifier.py)
// ---------------------------------------------------------------------------

export function classifyPromptType(promptText: string): PromptType {
  const t = promptText.toLowerCase();
  if (/\b(vs|versus|compared to|comparison|compare)\b/.test(t)) return "comparison";
  if (/\b(best|top|leading|ranked|ranking)\b/.test(t)) return "ranking";
  if (/\b(review|reviews|alternative|alternatives|instead of)\b/.test(t)) return "reviews";
  return "informational";
}

export function classifyIntentType(promptText: string): IntentType {
  const t = promptText.toLowerCase();
  if (/\b(hire|agency|service|services|consultant|buy|pricing|price|cost|recommend|best|top)\b/.test(t))
    return "commercial";
  return "informational";
}

// ---------------------------------------------------------------------------
// Visibility label
// ---------------------------------------------------------------------------

function getVisibilityLabel(ratio: number): DerivedPromptData["visibility_label"] {
  if (ratio > 0.5) return "Strong presence";
  if (ratio > 0) return "Weak presence";
  return "Not mentioned";
}

// ---------------------------------------------------------------------------
// Competitor summary — top 3 by frequency across engines
// ---------------------------------------------------------------------------

function getTopCompetitors(engines: EngineResult[]): string[] {
  const counts: Record<string, number> = {};
  engines.flatMap((e) => e.mentioned_competitors).forEach((c) => {
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a])
    .slice(0, 3);
}

// ---------------------------------------------------------------------------
// Difficulty scoring
// ---------------------------------------------------------------------------

export function calculateDifficulty(
  promptText: string,
  promptType: PromptType,
  intentType: IntentType,
  engines: EngineResult[]
): DifficultyResult {
  let score = 0;
  const t = promptText.toLowerCase();

  if (/\b(best|top|leading)\b/.test(t)) score += 30;
  if (intentType === "commercial") score += 20;

  const distinctCompetitors = new Set(engines.flatMap((e) => e.mentioned_competitors));
  if (distinctCompetitors.size >= 3) score += 10;

  const clientMentions = engines.filter((e) => e.mentioned_client).length;
  const competitorEngines = engines.filter(
    (e) => e.mentioned_competitors.length > 0 && !e.mentioned_client
  ).length;
  if (competitorEngines >= 3 && clientMentions === 0) score += 10;

  if (promptType === "ranking") score += 10;

  const label: DifficultyResult["label"] =
    score >= 50 ? "Hard" : score >= 30 ? "Medium" : "Easier";

  return { score, label };
}

// ---------------------------------------------------------------------------
// Activation scoring
// ---------------------------------------------------------------------------

export function calculateActivation(
  intentType: IntentType,
  clientRatio: number,
  difficultyScore: number,
  promptText: string,
  brandFitKeywords: string[] = []
): number {
  const intentWeight =
    intentType === "commercial" ? 35 : intentType === "navigational" ? 20 : 15;

  const visibilityGap = Math.round((1 - clientRatio) * 40);
  const difficultyPenalty = Math.round(difficultyScore * 0.3);

  const t = promptText.toLowerCase();
  const defaultKeywords = ["ai", "marketing"];
  const keywords = brandFitKeywords.length > 0 ? brandFitKeywords : defaultKeywords;
  const brandFit = keywords.some((kw) => t.includes(kw)) ? 10 : 0;

  return Math.min(100, Math.max(0, intentWeight + visibilityGap + brandFit - difficultyPenalty));
}

// ---------------------------------------------------------------------------
// Content suggestion map
// ---------------------------------------------------------------------------

export function getContentSuggestion(promptType: PromptType, intentType: IntentType): string {
  if (promptType === "comparison") return "Comparison page";
  if (promptType === "ranking") return "Authority / category page";
  if (promptType === "reviews") return "Reviews and alternatives page";
  if (intentType === "commercial") return "Buyer-intent landing page";
  return "Guide or FAQ page";
}

// ---------------------------------------------------------------------------
// Action template map
// ---------------------------------------------------------------------------

export function getActions(promptType: PromptType): string[] {
  const map: Record<PromptType, string[]> = {
    comparison: [
      "Publish comparison page with structured tables",
      "Add comparison schema",
    ],
    ranking: [
      "Create authority content for this category",
      "Add proof blocks and case studies",
    ],
    reviews: [
      "Publish reviews/alternatives page",
      "Add FAQ schema and citations",
    ],
    informational: [
      "Create targeted guide with BLUF intro",
      "Strengthen internal links and citations",
    ],
  };
  return map[promptType];
}

// ---------------------------------------------------------------------------
// Main derive function — call this once per prompt
// ---------------------------------------------------------------------------

export function derivePromptData(
  prompt: PromptData,
  brandFitKeywords: string[] = []
): DerivedPromptData {
  const promptType = prompt.prompt_type ?? classifyPromptType(prompt.prompt_text);
  const intentType = prompt.intent_type ?? classifyIntentType(prompt.prompt_text);

  const clientMentions = prompt.engines.filter((e) => e.mentioned_client).length;
  const totalEngines = prompt.engines.length;
  const clientRatio = totalEngines > 0 ? clientMentions / totalEngines : 0;

  const difficulty = calculateDifficulty(prompt.prompt_text, promptType, intentType, prompt.engines);
  const activationScore = calculateActivation(
    intentType,
    clientRatio,
    difficulty.score,
    prompt.prompt_text,
    brandFitKeywords
  );

  return {
    prompt_id: prompt.prompt_id,
    prompt_text: prompt.prompt_text,
    prompt_type: promptType,
    intent_type: intentType,
    client_mentions: clientMentions,
    total_engines: totalEngines,
    client_ratio: clientRatio,
    visibility_label: getVisibilityLabel(clientRatio),
    top_competitors: getTopCompetitors(prompt.engines),
    difficulty,
    activation_score: activationScore,
    content_suggestion: getContentSuggestion(promptType, intentType),
    actions: getActions(promptType),
  };
}

// ---------------------------------------------------------------------------
// 30-Day Plan generation — from top 3 prompts by activation score
// ---------------------------------------------------------------------------

export interface WeekPlan {
  week: number;
  title: string;
  tasks: string[];
}

export function generateThirtyDayPlan(derivedPrompts: DerivedPromptData[]): WeekPlan[] {
  const top3 = [...derivedPrompts]
    .sort((a, b) => b.activation_score - a.activation_score)
    .slice(0, 3);

  const easiest = derivedPrompts.find((p) => p.difficulty.label === "Easier");
  const topPrompt = top3[0];

  return [
    {
      week: 1,
      title: "Quick wins and basics",
      tasks: [
        easiest ? `Target: "${easiest.prompt_text.slice(0, 60)}…"` : "Audit technical hygiene",
        "Add FAQ schema to top 3 service pages",
        "Create llms.txt file",
        "Fix entity name consistency",
      ],
    },
    {
      week: 2,
      title: "Build highest-value page",
      tasks: [
        topPrompt
          ? `Create ${topPrompt.content_suggestion} for: "${topPrompt.prompt_text.slice(0, 50)}…"`
          : "Build authority page for top prompt",
        "Use BLUF intros and direct question headers",
        "Add outcome snippets and case studies",
      ],
    },
    {
      week: 3,
      title: "Comparisons, citations, proof",
      tasks: [
        top3
          .filter((p) => p.prompt_type === "comparison")
          .map((p) => `Comparison page: "${p.prompt_text.slice(0, 40)}…"`)[0] ??
          "Publish comparison page against named competitors",
        "Secure directory and listicle mentions",
        "Normalise company name across platforms",
      ],
    },
    {
      week: 4,
      title: "Refine, link, and re-check",
      tasks: [
        "Strengthen internal links across new pages",
        "Re-audit top 5 prompts to track movement",
        "Review citation coverage and fill gaps",
      ],
    },
  ];
}
