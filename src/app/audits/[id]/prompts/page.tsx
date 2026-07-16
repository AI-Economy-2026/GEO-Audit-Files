"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, tone } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

interface PromptAggregate {
  prompt_id: number;
  prompt_text: string;
  category: string;
  type: string;
  mentionedEngines: string[];
  totalEngines: number;
  difficulty: "easier" | "medium" | "hard";
  activation: number;
}

/* Deterministic activation/difficulty scoring — mirrors existing opportunity engine */
function scorePrompt(p: PromptAggregate, avgClientRate: number): PromptAggregate {
  const text = p.prompt_text.toLowerCase();
  let difficulty = 0;
  if (/best|top|leading/.test(text)) difficulty += 30;
  if (/vs|compar|alternative/.test(text)) difficulty += 10;
  if (p.mentionedEngines.length === 0) difficulty += 20;

  const diffLabel: "easier" | "medium" | "hard" = difficulty >= 40 ? "hard" : difficulty >= 20 ? "medium" : "easier";

  const intentWeight = /who|what|how|compare|best|top|recommend/.test(text) ? 35 : 15;
  const visGap = (100 - (p.mentionedEngines.length / p.totalEngines) * 100) * 0.4;
  const activation = Math.min(100, Math.round(intentWeight + visGap - difficulty * 0.3));

  return { ...p, difficulty: diffLabel, activation };
}

export default function PromptAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);
  const [filter, setFilter] = useState<string>("all");

  const prompts = useMemo(() => {
    const map = new Map<number, PromptAggregate>();
    results.forEach((r) => {
      if (!map.has(r.prompt_id)) {
        map.set(r.prompt_id, {
          prompt_id: r.prompt_id,
          prompt_text: r.prompt_text,
          category: r.category,
          // Backend emits "informational" / "ranking". UI uses INTENT/RANKING — normalise.
          type: r.prompt_type === "ranking" ? "RANKING" : "INTENT",
          mentionedEngines: [],
          totalEngines: 0,
          difficulty: "medium",
          activation: 0,
        });
      }
      const p = map.get(r.prompt_id)!;
      p.totalEngines += 1;
      if (r.brand_mentioned) p.mentionedEngines.push(r.engine_display || r.engine);
    });
    const avg = audit?.visibility_rate ?? 0;
    return Array.from(map.values())
      .map((p) => scorePrompt(p, avg))
      .sort((a, b) => b.activation - a.activation);
  }, [results, audit]);

  const filtered = useMemo(() => {
    if (filter === "all") return prompts;
    if (filter === "commercial") return prompts.filter((p) => p.type === "RANKING");
    if (filter === "informational") return prompts.filter((p) => p.type === "INTENT");
    if (filter === "mentioned") return prompts.filter((p) => p.mentionedEngines.length > 0);
    if (filter === "blind") return prompts.filter((p) => p.mentionedEngines.length === 0);
    return prompts;
  }, [prompts, filter]);

  const appearIn = prompts.filter((p) => p.mentionedEngines.length > 0).length;
  const blindSpots = prompts.filter((p) => p.mentionedEngines.length === 0).length;
  const winnable = prompts.filter((p) => p.difficulty !== "hard" && p.mentionedEngines.length === 0).length;

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Prompt Analysis</h1>
          <p>
            Every prompt buyers ask AI engines in your category, with your current visibility and the recommended next move.
          </p>
        </div>
        <div className="actions">
          <Tooltip label="Download every prompt as a CSV (mention count, engines citing you, difficulty, activation score)">
            <button
              className="btn btn-sm"
              onClick={() => {
                const rows: (string | number)[][] = [
                  ["Prompt", "Type", "Category", "Engines mentioning you", "Total engines", "Engines citing", "Difficulty", "Activation score"],
                  ...prompts.map((p) => [
                    p.prompt_text,
                    p.type,
                    p.category,
                    p.mentionedEngines.length,
                    p.totalEngines,
                    p.mentionedEngines.join("; "),
                    p.difficulty,
                    p.activation,
                  ]),
                ];
                downloadCsv(`${safeFilename(audit.brand_name)}-prompts`, rows);
              }}
            >
              Export CSV
            </button>
          </Tooltip>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Total buyer-intent prompts we ran across every AI engine. A wider prompt set means a more reliable read on how AI engines see your category.">
              Prompts tested
            </InfoTip>
          </div>
          <div className="kpi-number">{prompts.length}</div>
          <div className="kpi-sub">across {audit.engines?.length ?? 0} engines</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">50</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="How many of those prompts mention your brand on at least one engine. This is your raw visibility coverage — the count of conversations you show up in.">
              You appear in
            </InfoTip>
          </div>
          <div className={`kpi-number num-${tone(Math.round((appearIn / Math.max(prompts.length, 1)) * 100))}`}>
            {appearIn}
          </div>
          <div className="kpi-sub">{Math.round((appearIn / Math.max(prompts.length, 1)) * 100)}% of prompts</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">34%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Prompts where NO AI engine mentioned you. Pure gaps — buyers asking these questions never hear about you. Highest-priority targets for content work.">
              Blind spots
            </InfoTip>
          </div>
          <div className="kpi-number num-crit">{blindSpots}</div>
          <div className="kpi-sub">zero-mention prompts</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">31</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Blind-spot prompts that look achievable — medium-or-easier difficulty, no entrenched competitor moat. The fastest wins to ship first.">
              Winnable
            </InfoTip>
          </div>
          <div className="kpi-number num-good">{winnable}</div>
          <div className="kpi-sub">difficulty ≤ medium</div>
          <div className="benchmark">
            <span className="benchmark-label">Addressable</span>
            <span className="benchmark-val">
              {prompts.length ? Math.round((winnable / prompts.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="card pad" style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
          Filter
        </div>
        {[
          { id: "all", label: "All" },
          { id: "commercial", label: "Commercial" },
          { id: "informational", label: "Informational" },
          { id: "mentioned", label: "Mentioned" },
          { id: "blind", label: "Blind spots" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="btn btn-sm"
            style={
              filter === f.id
                ? { background: "var(--mint-weak)", borderColor: "var(--mint-line)", color: "var(--mint)" }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <div className="table-head-bar">
          <div>
            <h3>Priority prompt plan</h3>
            <div className="sub">Ranked by activation score. Highest value first.</div>
          </div>
        </div>
        <div className="scroll">
          <table className="data" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ width: "38%" }}>Search prompt</th>
                <th className="center">Your result</th>
                <th>Engines citing you</th>
                <th className="center">Difficulty</th>
                <th className="center">Activation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 30).map((p) => {
                const mentioned = p.mentionedEngines.length;
                const resultTone = mentioned === 0 ? "crit" : mentioned >= p.totalEngines * 0.6 ? "good" : "warn";
                const diffChip = p.difficulty === "easier" ? "good" : p.difficulty === "medium" ? "warn" : "crit";
                return (
                  <tr key={p.prompt_id}>
                    <td>
                      <div className="cell-prompt">{p.prompt_text}</div>
                      <div className="meta">
                        <span className="tag">{p.type}</span>
                        <span className="tag">{p.category}</span>
                      </div>
                    </td>
                    <td className="center">
                      <span className={`num-big num-${resultTone}`}>
                        {mentioned}
                        <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>/{p.totalEngines}</span>
                      </span>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
                        {mentioned === 0 ? "Not mentioned" : mentioned === p.totalEngines ? "Mentioned everywhere" : "Partial"}
                      </div>
                    </td>
                    <td>
                      {mentioned === 0 ? (
                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>None</div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {p.mentionedEngines.map((e) => (
                            <span
                              key={e}
                              className="tag"
                              style={{ background: "var(--good-weak)", borderColor: "var(--good-line)", color: "var(--good)" }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="center">
                      <span className={`chip chip-${diffChip}`}>
                        {p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1)}
                      </span>
                    </td>
                    <td className="center">
                      <span className={`num-xl num-${tone(p.activation)}`}>{p.activation}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AuditShell>
  );
}
