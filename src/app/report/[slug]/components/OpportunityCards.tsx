"use client";

import type { DerivedPromptData } from "@/lib/opportunity-engine";

interface Props {
  prompts: DerivedPromptData[];
  brandName: string;
  engineBreakdown?: Record<string, { display_name: string; visibility_rate: number }>;
}

interface OppCard {
  tags: { label: string; style: string }[];
  title: string;
  description: string;
  evidence: string;
  fixes: string[];
  effort: string;
}

function buildCards(
  prompts: DerivedPromptData[],
  brandName: string,
  engineBreakdown?: Record<string, { display_name: string; visibility_rate: number }>
): OppCard[] {
  const cards: OppCard[] = [];

  // Card 1 — AI Overview / engine coverage gap
  const notMentioned = prompts.filter((p) => p.client_ratio === 0);
  if (notMentioned.length > 0) {
    cards.push({
      tags: [
        { label: "Critical", style: "bg-red-50 text-red-700 border border-red-100" },
        { label: "High impact", style: "bg-amber-50 text-amber-700 border border-amber-100" },
        { label: "Quick win", style: "bg-green-50 text-green-700 border border-green-100" },
      ],
      title: "AI engine visibility gap",
      description: `${brandName} is absent from ${notMentioned.length} prompt${notMentioned.length > 1 ? "s" : ""} entirely — missing key answer surfaces.`,
      evidence: `0 mentions across ${notMentioned.length} prompt${notMentioned.length > 1 ? "s" : ""} → ${notMentioned.length * (prompts[0]?.total_engines ?? 7)} missed opportunities`,
      fixes: [
        "Add schema-rich FAQ and comparison content to priority service pages",
        "Create one authoritative category page with BLUF intro",
        "Strengthen third-party citations and entity name consistency",
      ],
      effort: "1 to 2 weeks",
    });
  }

  // Card 2 — Commercial intent gap
  const commercialMissed = prompts.filter(
    (p) => p.intent_type === "commercial" && p.client_ratio < 0.3
  );
  if (commercialMissed.length > 0) {
    cards.push({
      tags: [
        { label: "Critical", style: "bg-red-50 text-red-700 border border-red-100" },
        { label: "High impact", style: "bg-amber-50 text-amber-700 border border-amber-100" },
        { label: "30-day play", style: "bg-blue-50 text-blue-700 border border-blue-100" },
      ],
      title: "Buyer-intent content opportunity",
      description: "Missing from high-intent prompts where buyers ask for services. Fixing this unlocks visibility before prospects know your brand.",
      evidence: `${commercialMissed.length} commercial-intent prompt${commercialMissed.length > 1 ? "s" : ""} with <30% engine coverage`,
      fixes: [
        "Publish pages targeting high-intent buyer queries",
        "Use BLUF intros, direct question headers, proof-led explanations",
        "Add case studies and outcome snippets AI models can quote",
      ],
      effort: "2 to 4 weeks",
    });
  }

  // Card 3 — Comparison opportunity
  const compPresent = prompts.filter(
    (p) => p.prompt_type === "comparison" && p.client_ratio > 0
  );
  if (compPresent.length > 0) {
    cards.push({
      tags: [
        { label: "Medium", style: "bg-blue-50 text-blue-700 border border-blue-100" },
        { label: "Quick win", style: "bg-green-50 text-green-700 border border-green-100" },
      ],
      title: "Comparison-page capture",
      description: "Already showing up on comparison prompts — strong chance to own VS and alternative-style queries.",
      evidence: `Mentioned in ${compPresent[0].client_mentions}/${compPresent[0].total_engines} engines on comparison prompts`,
      fixes: [
        "Create comparison pages against named competitors",
        "Use structured comparison tables with FAQ schema",
        "Link from core service and case study pages",
      ],
      effort: "3 to 5 days",
    });
  }

  // Card 4 — Citation / authority building
  const weakPresence = prompts.filter(
    (p) => p.client_ratio > 0 && p.client_ratio < 0.5 && p.top_competitors.length > 0
  );
  if (weakPresence.length > 0) {
    cards.push({
      tags: [
        { label: "Medium", style: "bg-blue-50 text-blue-700 border border-blue-100" },
        { label: "30-day play", style: "bg-blue-50 text-blue-700 border border-blue-100" },
      ],
      title: "Citation and authority building",
      description: "AI engines need more trusted external signals to confidently cite your brand in broad recommendation prompts.",
      evidence: `Strong on brand-led queries, weak on broad discovery prompts`,
      fixes: [
        "Secure directory, listicle, podcast, and partner mentions",
        "Normalise company name and entity references across platforms",
        "Publish founder authority page with credentials and media mentions",
      ],
      effort: "2 to 6 weeks",
    });
  }

  // Card 5 — Best-performing engine: replicate patterns
  const bestEngineEntry = engineBreakdown
    ? Object.entries(engineBreakdown).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate)[0]
    : null;
  const bestEngine = bestEngineEntry ? bestEngineEntry[1].display_name : null;
  const bestEngineRate = bestEngineEntry ? Math.round(bestEngineEntry[1].visibility_rate) : 0;
  if (bestEngine && bestEngineRate > 0) {
    const rate = bestEngineRate;
    cards.push({
      tags: [
        { label: "Leverage", style: "bg-purple-100 text-purple-700" },
        { label: "Quick win", style: "bg-green-50 text-green-700 border border-green-100" },
      ],
      title: `Replicate ${bestEngine} success patterns`,
      description: `${bestEngine} is the strongest engine — existing content patterns are already resonating and can be reused elsewhere.`,
      evidence: `${bestEngine} ${rate}% mention rate — highest performing engine`,
      fixes: [
        `Analyse pages currently being cited by ${bestEngine}`,
        "Reuse structure and evidence style on weaker service pages",
        "Prioritise similar formatting for other engine targets",
      ],
      effort: "2 to 3 days",
    });
  }

  // Card 6 — Technical / structured data (always recommended)
  cards.push({
    tags: [
      { label: "Technical", style: "bg-gray-100 text-gray-600" },
      { label: "Quick win", style: "bg-green-50 text-green-700 border border-green-100" },
    ],
    title: "Structured data and indexability cleanup",
    description: "Technical hygiene makes it easier for AI systems to understand, trust, and retrieve the right pages.",
    evidence: "Supporting growth lever across all engine types",
    fixes: [
      "Audit robots.txt, sitemap health, and crawl/indexability",
      "Add organisation, FAQ, and comparison schema markup",
      "Create llms.txt and improve page summaries for machine readability",
    ],
    effort: "1 week",
  });

  return cards;
}

export default function OpportunityCards({ prompts, brandName, engineBreakdown }: Props) {
  const cards = buildCards(prompts, brandName, engineBreakdown);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-6 gap-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {card.tags.map((t) => (
              <span key={t.label} className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${t.style}`}>
                {t.label}
              </span>
            ))}
          </div>

          {/* Title + description */}
          <h4 className="text-[15px] font-bold text-gray-900 leading-snug">{card.title}</h4>
          <p className="text-sm text-gray-500 leading-relaxed">{card.description}</p>

          {/* Evidence */}
          <div className="px-3 py-2 rounded-lg bg-gray-50 border border-dashed border-gray-200 font-mono text-xs text-gray-500 leading-relaxed">
            {card.evidence}
          </div>

          {/* Fix list */}
          <ul className="space-y-1">
            {card.fixes.map((fix) => (
              <li key={fix} className="text-sm text-gray-700 flex gap-2">
                <span className="mt-0.5 text-teal-600 shrink-0">•</span>
                {fix}
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">{card.effort}</span>
            <div className="flex gap-2">
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                View fixes
              </button>
              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-700 text-white hover:bg-teal-800">
                Add to sprint
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
