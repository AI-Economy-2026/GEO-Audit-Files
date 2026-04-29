"use client";

import { useMemo, useState } from "react";
import type { ResultRow, EngineStats } from "./useAuditData";
import type { SarahPreset } from "@/app/api/ask-sarah/route";

interface Props {
  brandName: string;
  visibilityRate: number;
  totalQueries: number;
  totalMentioned: number;
  results: ResultRow[];
  engineBreakdown?: Record<string, EngineStats>;
}

const BUTTONS: { preset: SarahPreset; label: string }[] = [
  { preset: "explain", label: "What does this mean for us?" },
  { preset: "priority", label: "What should we work on first?" },
  { preset: "content", label: "What's doable in 30 days?" },
];

/** Builds a simple top-5 prompt list from raw results, in the shape /api/ask-sarah expects. */
function buildTopPrompts(results: ResultRow[]) {
  const byPrompt = new Map<
    number,
    { prompt_text: string; total: number; mentioned: number }
  >();
  for (const r of results) {
    const cur = byPrompt.get(r.prompt_id) ?? {
      prompt_text: r.prompt_text,
      total: 0,
      mentioned: 0,
    };
    cur.total += 1;
    if (r.brand_mentioned) cur.mentioned += 1;
    byPrompt.set(r.prompt_id, cur);
  }
  return Array.from(byPrompt.values())
    .map((p) => {
      const ratio = p.total > 0 ? p.mentioned / p.total : 0;
      const text = p.prompt_text.toLowerCase();
      const isHard = /best|top|leading/.test(text);
      const isComp = /vs|compar|alternative/.test(text);
      const difficulty = isHard ? "hard" : isComp ? "medium" : "easier";
      const activation = Math.round((1 - ratio) * 60 + (isComp ? 25 : isHard ? 10 : 20));
      const suggestion = isComp
        ? "Comparison page (vs / alternatives)"
        : isHard
          ? "Buyer-intent landing page"
          : "Informational guide";
      return {
        prompt_text: p.prompt_text,
        activation_score: activation,
        difficulty_label: difficulty,
        client_ratio: ratio,
        content_suggestion: suggestion,
      };
    })
    .sort((a, b) => b.activation_score - a.activation_score)
    .slice(0, 5);
}

export default function AskSarahCard({
  brandName,
  visibilityRate,
  totalQueries,
  totalMentioned,
  results,
  engineBreakdown,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<SarahPreset | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const topPrompts = useMemo(() => buildTopPrompts(results), [results]);

  async function handleClick(preset: SarahPreset) {
    setLoading(true);
    setActivePreset(preset);
    setResponse(null);
    setError(null);

    try {
      const res = await fetch("/api/ask-sarah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          auditContext: {
            brandName,
            overallVisibility: Math.round(visibilityRate),
            totalQueries,
            totalMentioned,
            topPrompts,
            engineBreakdown: engineBreakdown
              ? Object.fromEntries(
                  Object.entries(engineBreakdown).map(([k, v]) => [
                    k,
                    {
                      display_name: v.display_name,
                      visibility_rate: Math.round(v.visibility_rate),
                    },
                  ])
                )
              : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response.");
      setResponse(data.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ask-sarah">
      <div className="ask-avatar">S</div>
      <div className="ask-body">
        <h4>Ask Sarah</h4>
        <p>Want this explained in plain English, or need a steer on what to tackle first?</p>
        <div className="ask-prompts">
          {BUTTONS.map(({ preset, label }) => {
            const isActive = activePreset === preset && (loading || response !== null);
            return (
              <button
                key={preset}
                className="ask-prompt"
                onClick={() => handleClick(preset)}
                disabled={loading}
                style={
                  isActive
                    ? {
                        background: "var(--mint-weak)",
                        borderColor: "var(--mint-line)",
                        color: "var(--mint)",
                      }
                    : undefined
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {(loading || response || error) && (
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              borderRadius: "var(--r-md)",
              background: "var(--mint-weak)",
              border: "1px solid var(--mint-line)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--text)",
            }}
          >
            {loading && (
              <div style={{ color: "var(--mint)", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                Sarah is thinking…
              </div>
            )}
            {error && <div style={{ color: "var(--crit)" }}>{error}</div>}
            {response && <div style={{ whiteSpace: "pre-wrap" }}>{response}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
