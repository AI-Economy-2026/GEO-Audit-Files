"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import { useAuditData, type KeywordGap } from "@/components/audit/useAuditData";
import { derivePromptData, type PromptData } from "@/lib/opportunity-engine";

type EffortLabel = "Low" | "Medium" | "High";
type ImpactLabel = "Low" | "Medium" | "High";

interface Opportunity {
  id: string;
  title: string;
  effort: EffortLabel;
  effortIsLow: boolean;
  impact: ImpactLabel;
  impactIsHigh: boolean;
  promptsUnlocked: number;
}

/* Mirrors the Hard/Medium/Easier thresholds used by opportunity-engine's
 * calculateDifficulty, just relabelled for this page's copy. */
function effortFromScore(score: number): EffortLabel {
  if (score >= 50) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

/* Same 30/60 split used by the tone() helper elsewhere in the app, applied
 * to opportunity-engine's activation_score. */
function impactFromScore(score: number): ImpactLabel {
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function impactChipClass(impact: ImpactLabel): string {
  if (impact === "High") return "chip-good";
  if (impact === "Medium") return "chip-warn";
  return "chip-neutral";
}

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, results, loading } = useAuditData(id);
  const [rankFilter, setRankFilter] = useState<"all" | "quick">("all");

  const keywordGaps: KeywordGap[] = audit?.summary_json?.keyword_gap_analysis?.keyword_gaps || [];
  const visRate = audit?.visibility_rate ?? 0;

  const validResults = useMemo(
    () => results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]")),
    [results]
  );

  const totalTracked = useMemo(() => {
    const meta = audit?.summary_json?.audit_metadata?.total_prompts;
    if (meta) return meta;
    return new Set(validResults.map((r) => r.prompt_id)).size;
  }, [audit, validResults]);

  /* Prompts where every engine tested came up blank - the actual gaps a
   * page of content could close. */
  const missedGaps = useMemo(
    () => keywordGaps.filter((g) => g.engines_hit.length === 0),
    [keywordGaps]
  );

  /* Group missed gaps into content plays using the same deterministic
   * difficulty/activation scoring used on the Prioritise tab, so effort and
   * impact here are derived from real audit data rather than invented. */
  const opportunities: Opportunity[] = useMemo(() => {
    if (!missedGaps.length) return [];

    const groups = new Map<string, { gap: KeywordGap; activation: number; effortScore: number }[]>();

    missedGaps.forEach((gap) => {
      const competitorNames = gap.competitors_present.map((c) => c.name);
      const promptData: PromptData = {
        prompt_id: gap.prompt_id,
        prompt_text: gap.prompt_text,
        engines: [
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
        ],
      };
      const derived = derivePromptData(promptData);
      const key = derived.content_suggestion;
      const arr = groups.get(key) ?? [];
      arr.push({ gap, activation: derived.activation_score, effortScore: derived.difficulty.score });
      groups.set(key, arr);
    });

    const built = Array.from(groups.entries()).map(([suggestion, items]) => {
      const avgActivation = items.reduce((s, it) => s + it.activation, 0) / items.length;
      const avgEffortScore = items.reduce((s, it) => s + it.effortScore, 0) / items.length;
      const effort = effortFromScore(avgEffortScore);
      const impact = impactFromScore(avgActivation);

      // Comparison plays read better named after the competitor they're up
      // against, so surface the most-mentioned one for that group.
      let title = suggestion;
      if (suggestion === "Comparison page") {
        const counts = new Map<string, number>();
        items.forEach((it) =>
          it.gap.competitors_present.forEach((c) => counts.set(c.name, (counts.get(c.name) ?? 0) + c.count))
        );
        const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
        if (top) title = `Comparison page vs ${top[0]}`;
      }

      return {
        id: suggestion,
        title,
        effort,
        effortIsLow: effort === "Low",
        impact,
        impactIsHigh: impact === "High",
        promptsUnlocked: items.length,
      };
    });

    return built.sort((a, b) => b.promptsUnlocked - a.promptsUnlocked);
  }, [missedGaps]);

  const doFirst = useMemo(() => opportunities.filter((o) => o.effortIsLow && o.impactIsHigh), [opportunities]);
  const planIn = useMemo(() => opportunities.filter((o) => !o.effortIsLow && o.impactIsHigh), [opportunities]);
  const fillIn = useMemo(() => opportunities.filter((o) => o.effortIsLow && !o.impactIsHigh), [opportunities]);
  const later = useMemo(() => opportunities.filter((o) => !o.effortIsLow && !o.impactIsHigh), [opportunities]);

  const opportunitiesFound = opportunities.length;
  const promptsInPlay = useMemo(
    () => missedGaps.filter((g) => g.competitors_present.length > 0).length,
    [missedGaps]
  );
  const quickWins = doFirst.length;
  const reachCount = missedGaps.length;
  const projectedVisRate = totalTracked > 0
    ? Math.min(95, Math.round(visRate + (reachCount / totalTracked) * 100 * 0.75))
    : Math.round(visRate);

  const rankedRows = rankFilter === "quick" ? doFirst : opportunities;

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  if (opportunities.length === 0) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Opportunity Map</h1>
            <p>Your audit findings turned into practical plays, ranked by reach.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          {audit.status !== "completed"
            ? `The opportunity map will be available once the audit finishes (current status: ${audit.status}).`
            : `No open gaps found - ${audit.brand_name} is already being named on every prompt tracked in this audit.`}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Opportunity Map</h1>
          <p>Your audit findings turned into practical plays, ranked by reach.</p>
        </div>
        <div className="actions no-print">
          <button className="btn btn-sm" onClick={() => window.print()}>
            Export
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`/audits/${id}/activate`)}>
            Build the plan
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Opportunities found</div>
          <div className="kpi-number">{opportunitiesFound}</div>
          <div className="kpi-sub">Mapped by effort and reach</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Prompts in play</div>
          <div className="kpi-number">{promptsInPlay}</div>
          <div className="kpi-sub">Currently answered by competitors</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Quick wins</div>
          <div className="kpi-number num-good">{quickWins}</div>
          <div className="kpi-sub">Single page, high reach</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Reach if all shipped</div>
          <div className="kpi-number">
            {reachCount}<span className="unit"> of {totalTracked}</span>
          </div>
          <div className="kpi-sub">Visibility would move to roughly {projectedVisRate}%</div>
        </div>
      </div>

      {/* EFFORT AGAINST IMPACT */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Effort against impact</h2>
            <div className="sub">Start top left. Every item there is one page of work.</div>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            Everything worth doing, sorted by how hard it is and how many buyer questions it wins.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Do first", sub: "Low effort, high impact", items: doFirst },
            { label: "Plan in", sub: "High effort, high impact", items: planIn },
            { label: "Fill in", sub: "Low effort, lower impact", items: fillIn },
            { label: "Later", sub: "High effort, lower impact", items: later },
          ].map((quad) => (
            <div key={quad.label} className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 150 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text)" }}>
                  {quad.label}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>{quad.sub}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {quad.items.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--text-3)" }}>Nothing here right now.</span>
                ) : (
                  quad.items.map((o) => (
                    <span
                      key={o.id}
                      style={{
                        padding: "7px 12px",
                        border: "1px solid var(--border)",
                        borderRadius: 99,
                        background: "var(--surface-2)",
                        fontSize: 12.5,
                        fontWeight: 500,
                      }}
                    >
                      {o.title}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RANKED BY REACH */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Ranked by reach</h2>
            <div className="sub">Prompts each opportunity would unlock.</div>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            <button
              className="chip"
              onClick={() => setRankFilter("all")}
              style={{
                cursor: "pointer",
                background: rankFilter === "all" ? "var(--surface-3)" : "transparent",
                borderColor: rankFilter === "all" ? "var(--border)" : "transparent",
                color: rankFilter === "all" ? "var(--text)" : "var(--text-3)",
                fontWeight: rankFilter === "all" ? 700 : 500,
              }}
            >
              All {opportunities.length}
            </button>
            <button
              className="chip"
              onClick={() => setRankFilter("quick")}
              style={{
                cursor: "pointer",
                background: rankFilter === "quick" ? "var(--surface-3)" : "transparent",
                borderColor: rankFilter === "quick" ? "var(--border)" : "transparent",
                color: rankFilter === "quick" ? "var(--text)" : "var(--text-3)",
                fontWeight: rankFilter === "quick" ? 700 : 500,
              }}
            >
              Quick wins {quickWins}
            </button>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            The same items as a list, ordered by how many buyer questions each one unlocks.
          </p>
        </div>

        <div className="table-wrap">
          <div className="scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Opportunity</th>
                  <th>Effort</th>
                  <th>Impact</th>
                  <th className="center">Prompts unlocked</th>
                  <th className="center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.title}</td>
                    <td style={{ color: "var(--text-3)" }}>{o.effort} effort</td>
                    <td>
                      <span className={`chip ${impactChipClass(o.impact)}`}>{o.impact} impact</span>
                    </td>
                    <td className="center" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {o.promptsUnlocked} of {totalTracked}
                    </td>
                    <td className="center">
                      <Link href={`/audits/${id}/activate`} className="chip chip-neutral" style={{ cursor: "pointer" }}>
                        Add to plan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          padding: "26px 30px",
          borderRadius: "var(--r-xl)",
          background: "var(--grad-banner)",
          border: "1px solid var(--mint-line)",
          boxShadow: "var(--glow-mint)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Need help delivering this?
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", maxWidth: "68ch" }}>
            Request a fix and we will send you a quote.
          </p>
        </div>
        <a
          className="btn btn-primary"
          style={{ position: "relative", zIndex: 1, whiteSpace: "nowrap", textDecoration: "none" }}
          href={`mailto:hello@gatha.ai?subject=${encodeURIComponent(`Opportunity map fixes for ${audit.brand_name}`)}&body=${encodeURIComponent(`Hi, I'd like a quote for delivering the opportunity map fixes for ${audit.brand_name} (${audit.brand_url}).\n\nAudit ID: ${id}`)}`}
        >
          Request a fix
        </a>
      </div>
    </AuditShell>
  );
}
