"use client";

import { useState, type ReactNode } from "react";
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

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PRESETS: { preset: SarahPreset; icon: ReactNode; label: string }[] = [
  {
    preset: "explain",
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
    label: "Explain this report to me",
  },
  {
    preset: "priority",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    label: "What should we do first?",
  },
  {
    preset: "content",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    ),
    label: "What content should we create next?",
  },
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
    <div className="glass-card rounded-xl shadow-sm p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-on-primary-fixed font-bold text-sm"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--tertiary))" }}>
          S
        </div>
        <div>
          <h4 className="text-base font-bold text-on-surface leading-none">Ask Sarah</h4>
          <span className="text-xs text-on-surface-variant">Guided report assistant</span>
        </div>
      </div>

      <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
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
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-surface-container border-outline-variant text-on-surface hover:bg-primary/10 hover:border-primary/30 hover:text-primary"
              }
              disabled:opacity-60 disabled:cursor-wait`}
          >
            <span className="shrink-0 text-primary">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Response */}
      {(loading || response || error) && (
        <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-sm text-on-surface leading-relaxed animate-in fade-in duration-300">
          {loading && (
            <div className="flex items-center gap-2 text-primary font-medium">
              <span className="animate-spin">⟳</span> Sarah is thinking…
            </div>
          )}
          {error && <p className="text-error">{error}</p>}
          {response && (
            <div className="whitespace-pre-wrap">{response}</div>
          )}
        </div>
      )}
    </div>
  );
}
