"use client";

import { useMemo } from "react";
import { derivePromptData } from "@/lib/opportunity-engine";
import type { PromptData } from "@/lib/opportunity-engine";
import PromptTable from "./PromptTable";
import OpportunityCards from "./OpportunityCards";
import AskSarah from "./AskSarah";
import ThirtyDayPlan from "./ThirtyDayPlan";

interface KeywordGap {
  prompt_id: number;
  prompt_text: string;
  category: string;
  engines_missed: string[];
  engines_hit: string[];
  engines_tested: number;
  gap_severity: string;
  competitors_present: { name: string; count: number }[];
}

interface EngineStats {
  display_name: string;
  visibility_rate: number;
}

interface Props {
  brandName: string;
  overallVisibility: number;
  totalQueries: number;
  totalMentioned: number;
  keywordGaps: KeywordGap[];
  engineBreakdown?: Record<string, EngineStats>;
}

export default function PrioritiseTab({
  brandName,
  overallVisibility,
  totalQueries,
  totalMentioned,
  keywordGaps,
  engineBreakdown,
}: Props) {
  const derivedPrompts = useMemo(() => {
    return keywordGaps.map((gap) => {
      // Build per-engine result objects from the gap data
      const competitorNames = gap.competitors_present.map((c) => c.name);

      const engines = [
        ...gap.engines_hit.map((name) => ({
          engine_name: name,
          mentioned_client: true,
          mentioned_competitors: competitorNames,
        })),
        ...gap.engines_missed.map((name) => ({
          engine_name: name,
          mentioned_client: false,
          mentioned_competitors: competitorNames,
        })),
      ];

      const promptData: PromptData = {
        prompt_id: gap.prompt_id,
        prompt_text: gap.prompt_text,
        engines,
      };

      return derivePromptData(promptData);
    });
  }, [keywordGaps]);

  if (keywordGaps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No prompt data available yet. Run an audit to see the Opportunity Map.
      </div>
    );
  }

  // Hero stats
  const missedCount = derivedPrompts.filter((p) => p.client_ratio === 0).length;
  const quickWins = derivedPrompts.filter((p) => p.difficulty.label === "Easier").length;
  const priorityPlays = derivedPrompts.filter((p) => p.activation_score >= 60).length;
  const avgActivation = Math.round(
    derivedPrompts.reduce((sum, p) => sum + p.activation_score, 0) / derivedPrompts.length
  );

  return (
    <div className="space-y-8">
      {/* Hero summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: summary + stats */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 leading-snug">
            Turn your visibility gaps into a prioritised action plan.
          </h2>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Each prompt has been scored for difficulty and activation potential using a deterministic rules engine.
            No AI model — just your audit data.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: missedCount, label: "Missed opportunities" },
              { value: priorityPlays, label: "Priority plays" },
              { value: quickWins, label: "Quick wins" },
              { value: "30–60d", label: "Execution window" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                <div className="text-2xl font-extrabold text-gray-900 leading-none mb-1">{value}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: opportunity score */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div
            className="flex-1 rounded-xl p-6 flex flex-col justify-center text-white"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f766e 100%)" }}
          >
            <div className="text-5xl font-extrabold leading-none tracking-tight">{avgActivation}</div>
            <div className="text-sm font-semibold opacity-90 mt-1">Avg. Opportunity Score</div>
            <div className="text-xs opacity-60 mt-2 leading-relaxed">
              Based on {derivedPrompts.length} scored prompts · {Math.round(overallVisibility)}% current visibility
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {engineBreakdown &&
              Object.entries(engineBreakdown)
                .sort((a, b) => b[1].visibility_rate - a[1].visibility_rate)
                .slice(0, 4)
                .map(([key, stats]) => {
                  const rate = stats.visibility_rate;
                  const style =
                    rate === 0
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : rate < 30
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-green-50 text-green-700 border border-green-100";
                  return (
                    <span key={key} className={`text-xs font-bold px-2.5 py-1 rounded-full ${style}`}>
                      {Math.round(rate)}% {stats.display_name}
                    </span>
                  );
                })}
          </div>
        </div>
      </div>

      {/* Prompt table */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Prompt-level opportunities</h3>
        <p className="text-sm text-gray-500 mb-4">
          Each prompt scored by difficulty and activation potential. Derived from your audit data using deterministic rules.
        </p>
        <PromptTable prompts={derivedPrompts} />
      </div>

      {/* Opportunity cards */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">Priority opportunities</h3>
        <p className="text-sm text-gray-500 mb-4">
          Each gap converted into a practical plan your team can act on or hand over.
        </p>
        <OpportunityCards prompts={derivedPrompts} brandName={brandName} engineBreakdown={engineBreakdown} />
      </div>

      {/* Ask Sarah + 30-Day Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AskSarah
          brandName={brandName}
          overallVisibility={overallVisibility}
          totalQueries={totalQueries}
          totalMentioned={totalMentioned}
          derivedPrompts={derivedPrompts}
          engineBreakdown={engineBreakdown}
        />
        <ThirtyDayPlan prompts={derivedPrompts} />
      </div>

      {/* CTA banner */}
      <div
        className="rounded-xl px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-5 text-white"
        style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}
      >
        <div>
          <h4 className="text-base font-bold mb-1">Ready to activate the plan?</h4>
          <p className="text-sm opacity-70 max-w-md">
            Talk to Balmer Agency about running a GEO Fix Sprint — we implement the recommendations for you.
          </p>
        </div>
        <a
          href="https://balmeragency.com.au/contact"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-6 py-2.5 bg-white text-teal-700 font-bold rounded-lg hover:bg-teal-50 transition-colors text-sm"
        >
          Start GEO Fix Sprint →
        </a>
      </div>
    </div>
  );
}
