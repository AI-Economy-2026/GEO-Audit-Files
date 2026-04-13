"use client";

import { useState } from "react";
import type { SarahPreset } from "@/app/api/ask-sarah/route";
import type { DerivedPromptData } from "@/lib/opportunity-engine";

interface Props {
  brandName: string;
  overallVisibility: number;
  totalQueries: number;
  totalMentioned: number;
  derivedPrompts: DerivedPromptData[];
  engineBreakdown?: Record<string, { display_name: string; visibility_rate: number }>;
}

const PRESETS: { preset: SarahPreset; icon: string; label: string }[] = [
  { preset: "explain", icon: "📊", label: "Explain this report to me" },
  { preset: "priority", icon: "🎯", label: "What should we do first?" },
  { preset: "content", icon: "✏️", label: "What content should we create next?" },
];

export default function AskSarah({
  brandName,
  overallVisibility,
  totalQueries,
  totalMentioned,
  derivedPrompts,
  engineBreakdown,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<SarahPreset | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreset(preset: SarahPreset) {
    setLoading(true);
    setActivePreset(preset);
    setResponse(null);
    setError(null);

    const topPrompts = [...derivedPrompts]
      .sort((a, b) => b.activation_score - a.activation_score)
      .slice(0, 5)
      .map((p) => ({
        prompt_text: p.prompt_text,
        activation_score: p.activation_score,
        difficulty_label: p.difficulty.label,
        client_ratio: p.client_ratio,
        content_suggestion: p.content_suggestion,
      }));

    try {
      const res = await fetch("/api/ask-sarah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          auditContext: {
            brandName,
            overallVisibility,
            totalQueries,
            totalMentioned,
            topPrompts,
            engineBreakdown,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #0f766e, #1d4ed8)" }}>
          S
        </div>
        <div>
          <h4 className="text-base font-bold text-gray-900 leading-none">Ask Sarah</h4>
          <span className="text-xs text-gray-400">Guided report assistant</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        Get a plain-English explanation of your results, what to do next, and which content to create first.
      </p>

      {/* Preset buttons */}
      <div className="flex flex-col gap-2">
        {PRESETS.map(({ preset, icon, label }) => (
          <button
            key={preset}
            onClick={() => handlePreset(preset)}
            disabled={loading}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-semibold transition-all
              ${activePreset === preset && (loading || response)
                ? "bg-teal-50 border-teal-200 text-teal-700"
                : "bg-gray-50 border-gray-200 text-gray-800 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 hover:translate-x-1"
              }
              disabled:opacity-60 disabled:cursor-wait`}
          >
            <span className="text-lg shrink-0">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Response */}
      {(loading || response || error) && (
        <div className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-100 text-sm text-gray-800 leading-relaxed animate-in fade-in duration-300">
          {loading && (
            <div className="flex items-center gap-2 text-teal-700 font-medium">
              <span className="animate-spin">⟳</span> Sarah is thinking…
            </div>
          )}
          {error && <p className="text-red-600">{error}</p>}
          {response && (
            <div className="whitespace-pre-wrap">{response}</div>
          )}
        </div>
      )}
    </div>
  );
}
